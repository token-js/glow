import logging
import os
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
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, deepgram, silero, elevenlabs
from server.livekit_worker.llm import LLM
import sys
from pathlib import Path
from fastapi import HTTPException, status
from prisma import Prisma
from datetime import datetime
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

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
    return f"""
Hey there, great to meet you. I'm {agent_name}, your personal AI. My goal is to be useful, friendly and fun. 
Ask me for advice, for answers, or let's talk about whatever's on your mind. How's your day going?
"""

async def get_chat(user_id: str, user_name: str, agent_name: str):
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL environment variable not set")

    # Establish a connection to the database using DATABASE_URL
    conn = await asyncpg.connect(database_url, statement_cache_size=0)

    send_first_chat_message = False
    first_chat_message = ''
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

        if (len(messages) == 0):
            message_id = cuid.cuid()
            first_chat_message = fetch_initial_chat_message(agent_name=agent_name)
            message_role = 'assistant'
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
                modified
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

    # Fetch the voice for this user
    voice_id = participant.attributes.get("voice_id")
    agent_name = participant.attributes.get("agent_name")
    name = participant.attributes.get("name")
    user_id = participant.identity

    # Fetch chat data asynchronously
    chat, send_first_chat_message, first_chat_message = await get_chat(
        user_id=user_id,
        agent_name=agent_name,
        user_name=name
    )

    chat_messages = [
        llm.ChatMessage(role=message["role"], content=message["content"], id=message["id"])
        for message in chat["messages"]
    ]
    chat_id = chat["id"]

    initial_ctx = llm.ChatContext(messages=chat_messages)

    assistant = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        llm=LLM(
            model="inflection_3_pi",
            user_id=participant.identity,
            chat_id=chat_id,
            user_name=name,
            agent_name=agent_name
        ),
        preemptive_synthesis=True,
        # tts=openai.TTS(),
        tts=elevenlabs.TTS(
            model_id="eleven_turbo_v2_5",
            voice=elevenlabs.Voice(
                id=voice_id,
                name=agent_name,
                category="premade",
                settings=elevenlabs.VoiceSettings(
                    stability=0.5,
                    similarity_boost=0.75,
                    style=0.0,
                    use_speaker_boost=False,
                ),
            ),
            api_key=os.environ.get("ELEVEN_LABS_API_KEY"),
        ),
        chat_ctx=initial_ctx,
    )

    assistant.start(ctx.room, participant)

    if (send_first_chat_message):
      await assistant.say(first_chat_message, allow_interruptions=True)        


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
