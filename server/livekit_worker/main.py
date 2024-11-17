import asyncio
import logging
import os
from typing import AsyncIterable
import uuid
import asyncpg
import cuid
import sentry_sdk
from dotenv import load_dotenv
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
)
from livekit.plugins import openai, deepgram, silero, elevenlabs
from pydub import AudioSegment
from livekit import rtc
from server.livekit_worker.llm import LLM
import sys
from pathlib import Path
from fastapi import HTTPException, status
from datetime import datetime
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from .voices import VoiceSettingMapping
from .TODO import VoicePipelineAgent

sentry_sdk.init(
    dsn=os.getenv("EXPO_PUBLIC_SENTRY_DSN"),
    environment=os.getenv("EXPO_PUBLIC_SENTRY_ENV"),
    # Sample rate for transactions (performance).
    traces_sample_rate=1.0,
    # Sample rate for exceptions / crashes.
    sample_rate=1.0,
    max_request_body_size="always",
    integrations=[
        AsyncioIntegration(),
        LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
    ],
)

# Add the parent directory to the system path
parent_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(parent_dir))

load_dotenv(dotenv_path=".env")
logger = logging.getLogger("voice-agent")


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


def fetch_initial_chat_message(agent_name: str):
    return f"""Hey there, great to meet you. I'm {agent_name}, your personal AI. My goal is to be useful, friendly and fun.
Ask me for advice, for answers, or let's talk about whatever's on your mind. How's your day going?"""


async def get_chat(user_id: str, user_name: str, agent_name: str):
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL environment variable not set")

    # Establish a connection to the database using DATABASE_URL
    conn = await asyncpg.connect(database_url, statement_cache_size=0)

    send_first_chat_message = False
    first_chat_message = ""
    try:
        logger.info(f"Fetching chat for user_id: {user_id}")

        # Fetch the chat record
        chat = await conn.fetchrow(
            """
            SELECT *
            FROM chats
            WHERE "user_id" = $1
            LIMIT 1
            """,
            user_id,
        )

        if chat is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid token",
            )

        chat_id = chat["id"]

        # Fetch associated messages
        messages = await conn.fetch(
            """
            SELECT *
            FROM chat_messages
            WHERE "chat_id" = $1
            ORDER BY "created" ASC
            """,
            chat_id,
        )

        if len(messages) == 0:
            message_id = str(uuid.uuid4())
            first_chat_message = fetch_initial_chat_message(agent_name=agent_name)
            message_role = "assistant"
            created = datetime.now()
            modified = datetime.now()
            await conn.fetch(
                """
                INSERT INTO chat_messages (id, chat_id, content, role, created, modified)
                VALUES ($1, $2, $3, $4, $5, $6);
                """,
                message_id,
                chat_id,
                first_chat_message,
                message_role,
                created,
                modified,
            )
            send_first_chat_message = True

        # Convert records to dictionaries
        chat_dict = dict(chat)
        chat_dict["messages"] = [dict(message) for message in messages]

        logger.info("Chat data fetched successfully")
        return (chat_dict, send_first_chat_message, first_chat_message)

    except Exception as e:
        logger.error(f"Error fetching chat data: {e}")
        raise e

    finally:
        await conn.close()


async def entrypoint(ctx: JobContext):

    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for the first participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"Starting voice assistant for participant {participant.identity}")

    # Fetch the users settings
    voice = participant.attributes.get("voice")
    agent_name = participant.attributes.get("agent_name")
    user_gender = participant.attributes.get("user_gender")
    name = participant.attributes.get("name")
    timezone = participant.attributes.get("timezone")
    user_id = participant.identity

    # Fetch the detailed voice settings
    voice_settings = VoiceSettingMapping["voice_1"]  # TODO(end): undo

    # Fetch chat data asynchronously
    chat, send_first_chat_message, first_chat_message = await get_chat(
        user_id=user_id, agent_name=agent_name, user_name=name
    )

    chat_id = chat["id"]

    chat_messages = [
        llm.ChatMessage(
            role=message["role"], content=message["content"], id=message["id"]
        )
        for message in chat["messages"]
    ]
    initial_ctx = llm.ChatContext(messages=chat_messages)

    assistant = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        llm=LLM(
            user_id=participant.identity,
            chat_id=chat_id,
            user_name=name,
            user_gender=user_gender,
            agent_name=agent_name,
            timezone=timezone,
        ),
        preemptive_synthesis=True,
        tts=elevenlabs.TTS(
            model_id=voice_settings.model,
            voice=elevenlabs.Voice(
                id=voice_settings.voice_id,
                name=agent_name,
                category="premade",
                settings=elevenlabs.VoiceSettings(
                    stability=voice_settings.stability,
                    similarity_boost=voice_settings.similarity,
                    style=voice_settings.style,
                    use_speaker_boost=voice_settings.speaker_boost,
                ),
            ),
            api_key=os.environ.get("ELEVEN_LABS_API_KEY"),
        ),
        chat_ctx=initial_ctx,
    )

    # Initialize the filler sound player
    filler_sound_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "assets",
        "filler_sound.wav",
    )
    filler_sound_player = FillerSoundPlayer(
        room=ctx.room, filler_sound_path=filler_sound_path
    )
    await filler_sound_player.initialize()

    assistant.start(ctx.room, participant)

    @assistant.on("user_started_speaking")
    def on_user_started_speaking():
        asyncio.create_task(filler_sound_player.stop())

    @assistant.on("user_stopped_speaking")
    def on_user_stopped_speaking():
        asyncio.create_task(filler_sound_player.start())

    # Event handler for when the agent starts speaking
    @assistant.on("agent_started_speaking")
    def on_agent_started_speaking():
        asyncio.create_task(filler_sound_player.stop())

    if send_first_chat_message:
        await assistant.say(first_chat_message, allow_interruptions=True)


class FillerSoundPlayer:
    def __init__(self, room, filler_sound_path):
        self.room = room
        self.filler_sound_path = filler_sound_path
        self.audio_source = rtc.AudioSource(
            sample_rate=48000,
            num_channels=1,
            queue_size_ms=1000,
        )
        self.audio_track = rtc.LocalAudioTrack.create_audio_track(
            "filler_sound", self.audio_source
        )
        self.is_playing = False
        self.play_task = None
        self.publication = None  # Store the publication here
        self.lock = asyncio.Lock()
        self.frames = None  # Preloaded frames

    async def initialize(self):
        # Publish the audio track once
        self.publication = await self.room.local_participant.publish_track(
            self.audio_track
        )
        logger.info("Filler sound track published.")

    async def start(self):
        async with self.lock:
            if not self.is_playing:
                self.is_playing = True
                if self.play_task is None or self.play_task.done():
                    self.play_task = asyncio.create_task(self._play_filler_sound())
                logger.info("Filler sound started.")

    async def stop(self):
        async with self.lock:
            if self.is_playing:
                self.is_playing = False
                # Clear the audio queue to stop playback immediately
                self.audio_source.clear_queue()
                logger.info("Filler sound stopped.")

    async def close(self):
        # Call this when shutting down to unpublish the track
        async with self.lock:
            if self.publication is not None:
                try:
                    await self.room.local_participant.unpublish_track(
                        self.publication.sid
                    )
                    logger.info("Filler sound track unpublished.")
                except Exception as e:
                    logger.error(f"Error unpublishing track: {e}")
                self.publication = None

    async def _play_filler_sound(self):
        if self.frames is None:
            # Preload frames
            audio = AudioSegment.from_file(self.filler_sound_path)
            if audio.channels != 1:
                audio = audio.set_channels(1)
            if audio.frame_rate != 48000:
                audio = audio.set_frame_rate(48000)
            if audio.sample_width != 2:
                audio = audio.set_sample_width(2)

            audio_data = audio.raw_data
            sample_rate = audio.frame_rate
            num_channels = audio.channels
            sample_width = audio.sample_width
            frames_per_buffer = int(sample_rate * 0.02)  # 20ms frames
            frame_size = frames_per_buffer * sample_width * num_channels

            # Prepare frames
            self.frames = []
            position = 0
            while position + frame_size <= len(audio_data):
                frame_data = audio_data[position : position + frame_size]
                position += frame_size
                samples_per_channel = len(frame_data) // (num_channels * sample_width)
                frame = rtc.AudioFrame(
                    data=frame_data,
                    sample_rate=sample_rate,
                    num_channels=num_channels,
                    samples_per_channel=samples_per_channel,
                )
                self.frames.append(frame)

            # Include any remaining data
            if position < len(audio_data):
                frame_data = audio_data[position:]
                samples_per_channel = len(frame_data) // (num_channels * sample_width)
                frame = rtc.AudioFrame(
                    data=frame_data,
                    sample_rate=sample_rate,
                    num_channels=num_channels,
                    samples_per_channel=samples_per_channel,
                )
                self.frames.append(frame)

        # Initialize frame index
        frame_index = 0

        while True:
            if self.is_playing:
                # Feed frames continuously
                frame = self.frames[frame_index]
                await self.audio_source.capture_frame(frame)
                frame_index = (frame_index + 1) % len(self.frames)
            else:
                # Sleep briefly to prevent CPU overutilization
                await asyncio.sleep(0.01)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
