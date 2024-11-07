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
from livekit.plugins import openai, deepgram, silero
from server.livekit_worker.llm import LLM
import sys
from pathlib import Path
import asyncpg
from fastapi import HTTPException, status

# Add the parent directory to the system path
parent_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(parent_dir))

load_dotenv(dotenv_path=".env")
logger = logging.getLogger("voice-agent")


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


async def get_chat(user_id: str):
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL environment variable not set")

    # Establish a connection to the database using DATABASE_URL
    conn = await asyncpg.connect(database_url, statement_cache_size=0)

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

        # Convert records to dictionaries
        chat_dict = dict(chat)
        chat_dict["messages"] = [dict(message) for message in messages]

        logger.info("Chat data fetched successfully")
        return chat_dict

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

    # Fetch the voice for this user
    voice_id = participant.attributes.get("voice_id")
    user_id = participant.identity

    # Fetch chat data asynchronously
    chat = await get_chat(user_id=user_id)

    logger.info(f"Chat: {chat}")

    chat_messages = [
        llm.ChatMessage(role=message["role"], content=message["content"])
        for message in chat["messages"]
    ]
    chat_id = chat["id"]

    logger.info(f"Chat messages: {chat_messages}")

    initial_ctx = llm.ChatContext(messages=chat_messages)

    logger.info("Starting pipeline")

    assistant = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        llm=LLM(
            model="inflection_3_pi",
            user_id=participant.identity,
            chat_id=chat_id,
        ),
        preemptive_synthesis=True,
        tts=openai.TTS(),
        # tts=elevenlabs.TTS(
        #     model_id="eleven_turbo_v2_5",
        #     voice=elevenlabs.Voice(
        #         id=voice_id,
        #         name="Charlotte",
        #         category="premade",
        #         settings=elevenlabs.VoiceSettings(
        #             stability=0.5,
        #             similarity_boost=0.75,
        #             style=0.0,
        #             use_speaker_boost=False,
        #         ),
        #     ),
        #     api_key=os.environ.get("ELEVEN_LABS_API_KEY"),
        # ),
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
