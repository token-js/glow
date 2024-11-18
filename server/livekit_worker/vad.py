import logging
import asyncio
from dataclasses import dataclass
import time
from typing import Literal, Union
import numpy as np
from livekit import agents, rtc
from livekit.agents import utils, vad
from livekit.plugins import silero
from livekit.plugins.silero import onnx_model, VADStream
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger("voice-agent")

SLOW_INFERENCE_THRESHOLD = 0.2  # late by 200ms

@dataclass
class _VADOptions:
    min_speech_duration: float
    min_silence_duration: float
    prefix_padding_duration: float
    max_buffered_speech: float
    activation_threshold: float
    sample_rate: int

class VAD(silero.VAD):
    """
    Extended Silero Voice Activity Detection (VAD) class with enhanced streaming logic.
    """

    @classmethod
    def load(
        cls,
        *,
        min_speech_duration: float = 0.05,
        min_silence_duration: float = 0.55,
        prefix_padding_duration: float = 0.5,
        max_buffered_speech: float = 60.0,
        activation_threshold: float = 0.5,
        sample_rate: Literal[8000, 16000] = 16000,
        force_cpu: bool = True,
        padding_duration: Union[float, None] = None,
    ) -> "VAD":
        """
        Load and initialize the Extended Silero VAD model.

        Args:
            (Same as the original VAD.load method)

        Returns:
            ExtendedVAD: An instance of the ExtendedVAD class ready for streaming.
        """
        return super().load(
            min_speech_duration=min_speech_duration,
            min_silence_duration=min_silence_duration,
            prefix_padding_duration=prefix_padding_duration,
            max_buffered_speech=max_buffered_speech,
            activation_threshold=activation_threshold,
            sample_rate=sample_rate,
            force_cpu=force_cpu,
            padding_duration=padding_duration,
        )

    def stream(self) -> "ExtendedVADStream":
        """
        Create a new ExtendedVADStream for processing audio data.

        Returns:
            ExtendedVADStream: A stream object for processing audio input and detecting speech with enhanced logic.
        """
        stream = ExtendedVADStream(
            opts=self._opts,
            model=onnx_model.OnnxModel(
                onnx_session=self._onnx_session, sample_rate=self._opts.sample_rate
            ),
        )
        self._streams.append(stream)
        return stream

    def update_options(
        self,
        *,
        min_speech_duration: Union[float, None] = None,
        min_silence_duration: Union[float, None] = None,
        prefix_padding_duration: Union[float, None] = None,
        max_buffered_speech: Union[float, None] = None,
        activation_threshold: Union[float, None] = None,
    ) -> None:
        """
        Update the VAD options.

        Args:
            (Same as the original VAD.update_options method)
        """
        super().update_options(
            min_speech_duration=min_speech_duration,
            min_silence_duration=min_silence_duration,
            prefix_padding_duration=prefix_padding_duration,
            max_buffered_speech=max_buffered_speech,
            activation_threshold=activation_threshold,
        )


class ExtendedVADStream(agents.vad.VADStream):
    def __init__(self, opts: _VADOptions, model: onnx_model.OnnxModel) -> None:
        super().__init__()
        self._opts, self._model = opts, model
        self._loop = asyncio.get_event_loop()

        self._executor = ThreadPoolExecutor(max_workers=1)
        self._task.add_done_callback(lambda _: self._executor.shutdown(wait=False))
        self._exp_filter = utils.ExpFilter(alpha=0.35)

        self._input_sample_rate = 0
        self._speech_buffer: np.ndarray | None = None
        self._speech_buffer_max_reached = False
        self._prefix_padding_samples = 0  # (input_sample_rate)

        self._max_attempts = 10
        self._attempt_interval = 1

    def update_options(
        self,
        *,
        min_speech_duration: Union[float, None] = None,
        min_silence_duration: Union[float, None] = None,
        prefix_padding_duration: Union[float, None] = None,
        max_buffered_speech: Union[float, None] = None,
        activation_threshold: Union[float, None] = None,
    ) -> None:
        """
        Update the VAD options.

        This method allows you to update the VAD options after the VAD object has been created.

        Args:
            min_speech_duration (float): Minimum duration of speech to start a new speech chunk.
            min_silence_duration (float): At the end of each speech, wait this duration before ending the speech.
            prefix_padding_duration (float): Duration of padding to add to the beginning of each speech chunk.
            max_buffered_speech (float): Maximum duration of speech to keep in the buffer (in seconds).
            activation_threshold (float): Threshold to consider a frame as speech.
        """
        old_max_buffered_speech = self._opts.max_buffered_speech

        self._opts = _VADOptions(
            min_speech_duration=min_speech_duration or self._opts.min_speech_duration,
            min_silence_duration=min_silence_duration
            or self._opts.min_silence_duration,
            prefix_padding_duration=prefix_padding_duration
            or self._opts.prefix_padding_duration,
            max_buffered_speech=max_buffered_speech or self._opts.max_buffered_speech,
            activation_threshold=activation_threshold
            or self._opts.activation_threshold,
            sample_rate=self._opts.sample_rate,
        )

        if self._input_sample_rate:
            assert self._speech_buffer is not None

            self._prefix_padding_samples = int(
                self._opts.prefix_padding_duration * self._input_sample_rate
            )

            self._speech_buffer.resize(
                int(self._opts.max_buffered_speech * self._input_sample_rate)
                + self._prefix_padding_samples
            )

            if self._opts.max_buffered_speech > old_max_buffered_speech:
                self._speech_buffer_max_reached = False

    @agents.utils.log_exceptions(logger=logger)
    async def _main_task(self):
        inference_f32_data = np.empty(self._model.window_size_samples, dtype=np.float32)
        speech_buffer_index: int = 0

        # "pub_" means public, these values are exposed to the users through events
        pub_speaking = False
        pub_speech_duration = 0.0
        pub_silence_duration = 0.0
        pub_current_sample = 0
        pub_timestamp = 0.0

        speech_threshold_duration = 0.0
        silence_threshold_duration = 0.0

        input_frames = []
        inference_frames = []
        resampler: rtc.AudioResampler | None = None

        # used to avoid drift when the sample_rate ratio is not an integer
        input_copy_remaining_fract = 0.0

        extra_inference_time = 0.0

        async for input_frame in self._input_ch:
            if not isinstance(input_frame, rtc.AudioFrame):
                continue  # ignore flush sentinel for now

            if not self._input_sample_rate:
                self._input_sample_rate = input_frame.sample_rate

                # alloc the buffers now that we know the input sample rate
                self._prefix_padding_samples = int(
                    self._opts.prefix_padding_duration * self._input_sample_rate
                )

                self._speech_buffer = np.empty(
                    int(self._opts.max_buffered_speech * self._input_sample_rate)
                    + self._prefix_padding_samples,
                    dtype=np.int16,
                )

                if self._input_sample_rate != self._opts.sample_rate:
                    # resampling needed: the input sample rate isn't the same as the model's
                    # sample rate used for inference
                    resampler = rtc.AudioResampler(
                        input_rate=self._input_sample_rate,
                        output_rate=self._opts.sample_rate,
                        quality=rtc.AudioResamplerQuality.QUICK,  # VAD doesn't need high quality
                    )

            elif self._input_sample_rate != input_frame.sample_rate:
                logger.error("a frame with another sample rate was already pushed")
                continue

            assert self._speech_buffer is not None

            input_frames.append(input_frame)
            if resampler is not None:
                # the resampler may have a bit of latency, but it is OK to ignore since it should be
                # negligible
                inference_frames.extend(resampler.push(input_frame))
            else:
                inference_frames.append(input_frame)

            while True:
                start_time = time.perf_counter()

                available_inference_samples = sum(
                    [frame.samples_per_channel for frame in inference_frames]
                )
                if available_inference_samples < self._model.window_size_samples:
                    break  # not enough samples to run inference

                input_frame = utils.combine_frames(input_frames)
                inference_frame = utils.combine_frames(inference_frames)

                # convert data to f32
                np.divide(
                    inference_frame.data[: self._model.window_size_samples],
                    np.iinfo(np.int16).max,
                    out=inference_f32_data,
                    dtype=np.float32,
                )

                # run the inference
                p = await self._loop.run_in_executor(
                    self._executor, self._model, inference_f32_data
                )
                p = self._exp_filter.apply(exp=1.0, sample=p)

                window_duration = (
                    self._model.window_size_samples / self._opts.sample_rate
                )

                pub_current_sample += self._model.window_size_samples
                pub_timestamp += window_duration

                resampling_ratio = self._input_sample_rate / self._model.sample_rate
                to_copy = (
                    self._model.window_size_samples * resampling_ratio
                    + input_copy_remaining_fract
                )
                to_copy_int = int(to_copy)
                input_copy_remaining_fract = to_copy - to_copy_int

                # copy the inference window to the speech buffer
                available_space = len(self._speech_buffer) - speech_buffer_index
                to_copy_buffer = min(to_copy_int, available_space)
                if to_copy_buffer > 0:
                    self._speech_buffer[
                        speech_buffer_index : speech_buffer_index + to_copy_buffer
                    ] = input_frame.data[:to_copy_buffer]
                    speech_buffer_index += to_copy_buffer
                elif not self._speech_buffer_max_reached:
                    # reached self._opts.max_buffered_speech (padding is included)
                    speech_buffer_max_reached = True
                    logger.warning(
                        "max_buffered_speech reached, ignoring further data for the current speech input"
                    )

                inference_duration = time.perf_counter() - start_time
                extra_inference_time = max(
                    0.0,
                    extra_inference_time + inference_duration - window_duration,
                )
                if inference_duration > SLOW_INFERENCE_THRESHOLD:
                    logger.warning(
                        "inference is slower than realtime",
                        extra={"delay": extra_inference_time},
                    )

                def _reset_write_cursor():
                    nonlocal speech_buffer_index, speech_buffer_max_reached
                    assert self._speech_buffer is not None

                    if speech_buffer_index <= self._prefix_padding_samples:
                        return

                    padding_data = self._speech_buffer[
                        speech_buffer_index
                        - self._prefix_padding_samples : speech_buffer_index
                    ]

                    self._speech_buffer_max_reached = False
                    self._speech_buffer[: self._prefix_padding_samples] = padding_data
                    speech_buffer_index = self._prefix_padding_samples

                def _copy_speech_buffer() -> rtc.AudioFrame:
                    # copy the data from speech_buffer
                    assert self._speech_buffer is not None
                    speech_data = self._speech_buffer[:speech_buffer_index].tobytes()

                    return rtc.AudioFrame(
                        sample_rate=self._input_sample_rate,
                        num_channels=1,
                        samples_per_channel=speech_buffer_index,
                        data=speech_data,
                    )

                if pub_speaking:
                    pub_speech_duration += window_duration
                else:
                    pub_silence_duration += window_duration

                self._event_ch.send_nowait(
                    agents.vad.VADEvent(
                        type=agents.vad.VADEventType.INFERENCE_DONE,
                        samples_index=pub_current_sample,
                        timestamp=pub_timestamp,
                        silence_duration=pub_silence_duration,
                        speech_duration=pub_speech_duration,
                        probability=p,
                        inference_duration=inference_duration,
                        frames=[
                            rtc.AudioFrame(
                                data=input_frame.data[:to_copy_int].tobytes(),
                                sample_rate=self._input_sample_rate,
                                num_channels=1,
                                samples_per_channel=to_copy_int,
                            )
                        ],
                        speaking=pub_speaking,
                    )
                )

                if p >= self._opts.activation_threshold:
                    speech_threshold_duration += window_duration
                    silence_threshold_duration = 0.0

                    if not pub_speaking:
                        if speech_threshold_duration >= self._opts.min_speech_duration:
                            pub_speaking = True
                            pub_silence_duration = 0.0
                            pub_speech_duration = speech_threshold_duration

                            self._event_ch.send_nowait(
                                agents.vad.VADEvent(
                                    type=agents.vad.VADEventType.START_OF_SPEECH,
                                    samples_index=pub_current_sample,
                                    timestamp=pub_timestamp,
                                    silence_duration=pub_silence_duration,
                                    speech_duration=pub_speech_duration,
                                    frames=[_copy_speech_buffer()],
                                    speaking=True,
                                )
                            )

                else:
                    silence_threshold_duration += window_duration
                    speech_threshold_duration = 0.0

                    if not pub_speaking:
                        _reset_write_cursor()

                    if (
                        pub_speaking
                        and silence_threshold_duration
                        >= self._opts.min_silence_duration
                    ):
                        pub_speaking = False
                        pub_speech_duration = 0.0
                        pub_silence_duration = silence_threshold_duration

                        # await self._confirm_speech_finished()

                        self._event_ch.send_nowait(
                            agents.vad.VADEvent(
                                type=agents.vad.VADEventType.END_OF_SPEECH,
                                samples_index=pub_current_sample,
                                timestamp=pub_timestamp,
                                silence_duration=pub_silence_duration,
                                speech_duration=pub_speech_duration,
                                frames=[_copy_speech_buffer()],
                                speaking=False,
                            )
                        )

                        _reset_write_cursor()

                # remove the frames that were used for inference from the input and inference frames
                input_frames = []
                inference_frames = []

                # add the remaining data
                if len(input_frame.data) - to_copy_int > 0:
                    data = input_frame.data[to_copy_int:].tobytes()
                    input_frames.append(
                        rtc.AudioFrame(
                            data=data,
                            sample_rate=self._input_sample_rate,
                            num_channels=1,
                            samples_per_channel=len(data) // 2,
                        )
                    )

                if len(inference_frame.data) - self._model.window_size_samples > 0:
                    data = inference_frame.data[
                        self._model.window_size_samples :
                    ].tobytes()
                    inference_frames.append(
                        rtc.AudioFrame(
                            data=data,
                            sample_rate=self._opts.sample_rate,
                            num_channels=1,
                            samples_per_channel=len(data) // 2,
                        )
                    )

    async def _confirm_speech_finished(self):
        """
        Confirm if the speech has truly finished by calling `is_finished_speaking`.
        Retry up to 10 times with 1-second intervals if necessary.
        """
        for attempt in range(1, self._max_attempts + 1):
            if await self.is_finished_speaking():
                logger.info(f"Speech confirmed finished on attempt {attempt}.")
                self._finished_speaking = True
                return
            else:
                logger.info(f"Speech not finished on attempt {attempt}, retrying in {self._attempt_interval} second(s).")
                await asyncio.sleep(self._attempt_interval)
        logger.info("Max attempts reached. Considering speech as finished.")
        self._finished_speaking = True

    async def is_finished_speaking(self) -> bool:
        """
        Placeholder method to determine if the voice has truly finished speaking.
        Implement your custom logic here.

        Returns:
            bool: True if speaking has finished, False otherwise.
        """
        await asyncio.sleep(5)
        # TODO: Implement your actual logic here
        # For example, you might analyze additional audio frames, check external signals, etc.
        # Here's a simple placeholder implementation that always returns True
        return True
