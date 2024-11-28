import asyncio
import logging
import os
import uuid
import asyncpg
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
from pydub import AudioSegment
from livekit import rtc
from server.livekit_worker.llm import LLM
import sys
from pathlib import Path
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from .voices import VoiceSettingMapping
from server.logger.index import fetch_logger
from dotenv import load_dotenv
from livekit.plugins.openai.llm import _build_oai_context, build_oai_message
from ..api.routes.chat import (
    final_processing_coroutine,
    message_to_fixed_string_content,
)

load_dotenv()

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

logger = fetch_logger()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


def fetch_initial_chat_message(user_name: str):
    return f"""Hey, great to meet you, {user_name}! How's it going?"""


async def get_chat(user_id: str, user_name: str, agent_name: str, display_type: str):
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
            first_chat_message = fetch_initial_chat_message(user_name=user_name)
            message_role = "assistant"
            created = datetime.now()
            modified = datetime.now()
            await conn.fetch(
                """
                INSERT INTO chat_messages (id, chat_id, content, role, created, modified, display_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7);
                """,
                message_id,
                chat_id,
                first_chat_message,
                message_role,
                created,
                modified,
                display_type,
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
    voice_settings = VoiceSettingMapping[voice]

    # Fetch chat data asynchronously
    chat, send_first_chat_message, first_chat_message = await get_chat(
        user_id=user_id, agent_name=agent_name, user_name=name, display_type="text"
    )

    chat_messages = [
        llm.ChatMessage(
            role=message["role"], content=message["content"], id=message["id"]
        )
        for message in chat["messages"]
    ]
    chat_id = chat["id"]

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
        min_endpointing_delay=2,
        chat_ctx=initial_ctx,
    )

    def handle_update_conversation(msg: llm.ChatMessage):
        messages = _build_oai_context(assistant.chat_ctx, id(assistant))
        new_agent_message = build_oai_message(msg, id(assistant))
        new_agent_message: str = message_to_fixed_string_content(new_agent_message)[
            "content"
        ]

        user_message_timestamp = datetime.now()
        agent_message_timestamp = datetime.now() + timedelta(seconds=1)

        # Use asyncio.create_task to schedule the coroutine
        asyncio.create_task(
            final_processing_coroutine(
                messages=messages,
                agent_response=new_agent_message.strip(),
                chat_id=chat_id,
                user_id=user_id,
                chat_type="voice",
                user_message_timestamp=user_message_timestamp,
                agent_message_timestamp=agent_message_timestamp,
                audio_messages_enabled=False,
                audio_id=None,
            )
        )

    # We update the database when the agent is interrupted and when the agent finishes talking
    # We include the interruption because this event reliably only fires when the agent has actually
    # Started talking, it does not fire if the agent has not started talking at all and the user simply
    # paused long enough for the response process to begin.
    @assistant.on("agent_speech_interrupted")
    def on_agent_speech_interrupted(msg: llm.ChatMessage):
        handle_update_conversation(msg)

    @assistant.on("agent_speech_committed")
    def on_agent_speech_committed(msg: llm.ChatMessage):
        handle_update_conversation(msg)

    assistant.start(ctx.room, participant)

    if send_first_chat_message:
        await assistant.say(first_chat_message, allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
