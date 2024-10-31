import logging
import os
from dotenv import load_dotenv
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, deepgram, silero, elevenlabs
from server.livekit_worker.llm import InflectionLLM
import sys
from pathlib import Path

# Add the parent directory to the system path
parent_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(parent_dir))

load_dotenv(dotenv_path=".env")
logger = logging.getLogger("voice-agent")

from server.agent.index import stream_inflection_response

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

async def entrypoint(ctx: JobContext):
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(''),
    )

    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for the first participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"starting voice assistant for participant {participant.identity}")

    # Fetch the voice for this user
    voice_id = participant.attributes['voice_id']

    # This project is configured to use Deepgram STT, OpenAI LLM and TTS plugins
    # Other great providers exist like Cartesia and ElevenLabs
    # Learn more and pick the best one for your app:
    # https://docs.livekit.io/agents/plugins
    assistant = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        # llm=openai.LLM(model='gpt-4o-mini'),
        llm=InflectionLLM(model="inflection_3_pi", user=participant.identity),
        # tts=openai.TTS(),
        tts=elevenlabs.TTS(
            model_id="eleven_turbo_v2_5",
            voice=elevenlabs.Voice(
                id=voice_id,
                name='Charlotte',
                category="premade",
                settings=elevenlabs.VoiceSettings(
                    stability=0.5, similarity_boost=0.75, style=0.0, use_speaker_boost=False,
                ),
            ),
            api_key=os.environ.get("ELEVEN_LABS_API_KEY")
        ),
        chat_ctx=initial_ctx,
    )

    assistant.start(ctx.room, participant)

    # The agent should be polite and greet the user when it joins :)
    await assistant.say("Hey, how can I help you today?", allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
