import base64
import os
import threading
import uuid
import json
import asyncio
from typing import Any, List, Optional
from elevenlabs import ElevenLabs, VoiceSettings
import httpx
from pydantic import BaseModel
from fastapi.responses import JSONResponse, StreamingResponse, Response
from openai import AsyncStream, OpenAI
from openai.types.chat import ChatCompletionChunk
from fastapi import APIRouter, Depends, HTTPException
from server.api.supabase import fetch_supabase
from server.api.constants import SUPABASE_AUDIO_MESSAGES_BUCKET_NAME, LLM
from server.api.utils import add_memories, authorize_user, get_stream_content
from prisma import Prisma, enums, types
from pydantic import BaseModel
from datetime import datetime, timedelta
from server.api.analytics import track_sent_message
from server.agent.index import generate_response
from server.logger.index import fetch_logger
from server.livekit_worker.voices import VoiceSettingMapping

logger = fetch_logger()


class ClientAttachment(BaseModel):
    name: str
    contentType: str
    url: str


class ToolInvocation(BaseModel):
    toolCallId: str
    toolName: str
    args: dict
    result: dict


class ClientMessage(BaseModel):
    id: str
    role: str
    content: str
    created: str


class Request(BaseModel):
    messages: List[ClientMessage]
    chat_id: str
    timezone: str
    # Audio messages are disabled by default to be backwards compatible with clients that don't
    # specify the field
    audio_messages_enabled: Optional[bool] = False


router = APIRouter()


def convert_to_openai_messages(
    messages: List[Any],
) -> List[dict]:
    openai_messages = []

    for message in messages:
        parts = []

        parts.append({"type": "text", "text": message.content})

        openai_messages.append({"role": message.role, "content": parts})

    return openai_messages


# Converts an openai message (which may have a content that is a list of parts) to a message with a fixed string content
def message_to_fixed_string_content(message: dict) -> dict:
    if isinstance(message["content"], str):
        return message
    else:
        return {
            "role": message["role"],
            "content": "".join([part["text"] for part in message["content"]]),
        }


async def call_update_chat(
    messages: List[dict],
    agent_response: str,
    user_message_timestamp: datetime,
    agent_message_timestamp: datetime,
    chat_id: str,
    audio_messages_enabled: bool,
    audio_id: Optional[str],
):
    # We default the new_user_message to empty if the length of the messages array is 1
    # This handles the case where the agent is sending the first message in the conversation to greet the user
    new_user_message = ""
    if len(messages) > 1:
        new_user_message = next(
            msg for msg in reversed(messages) if msg["role"] == "user"
        )
        new_user_message = message_to_fixed_string_content(new_user_message)["content"]

    data = {
        "new_user_message": new_user_message,
        "new_agent_message": agent_response,
        "user_message_timestamp": user_message_timestamp.timestamp(),
        "agent_message_timestamp": agent_message_timestamp.timestamp(),
        "chat_id": chat_id,
        "audio_messages_enabled": audio_messages_enabled,
        "audio_id": audio_id,
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {os.environ.get('CRON_SECRET')}",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://{os.environ.get('EXPO_PUBLIC_API_URL')}/api/updateChat",
            json=data,
            headers=headers,
        )
        response.raise_for_status()


def stream_and_update_chat(
    messages: List[dict],
    chat_id: str,
    user_id: str,
    chat_type: str,
    timezone: str,
    ai_first_name: str,
    user_first_name: str,
    user_gender: str,
    audio_messages_enabled: bool,
    audio_id: str,
    skip_final_processing: bool,
):
    client = OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY"),
    )

    ai_first_name = ai_first_name.strip()
    user_first_name = user_first_name.strip()
    user_gender = user_gender.strip()

    # This implementation uses the vercel text streaming protocol
    # https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#text-stream-protocol
    # We could also use the data streaming protocol. The data streaming protocol is better for sending structured data
    # to the client. I don't think we need it in this case, but here is the link to the documentation:
    # https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#data-stream-protocol
    # Here is an example of implementing it:
    # https://github.com/vercel/ai/blob/main/examples/next-fastapi/api/index.py#L72
    stream = None
    agent_response = ""
    stream = asyncio.run(
        generate_response(
            llm=client,
            messages=messages,
            user_id=user_id,
            timezone=timezone,
            ai_first_name=ai_first_name,
            user_first_name=user_first_name,
            user_gender=user_gender,
        )
    )

    if stream is not None:
        agent_response = ""
        for chunk in stream:
            yield chunk
            for choice in chunk.choices:
                if choice.finish_reason != "stop":
                    content = choice.delta.content
                    agent_response += content

    user_message_timestamp = datetime.now()
    agent_message_timestamp = user_message_timestamp - timedelta(seconds=1)
    # Run asynchronous operations in a separate thread, which is necessary to prevent the main
    # thread from getting blocked during synchronous tasks with high latency, like network requests.
    # This is important when streaming voice responses because the voice will pause in the middle of
    # its response if a synchronous task is running. The voice can pause midway in the following
    # scenario:
    # 1. The conversational LLM's response finishes streaming very quickly, causing the stream
    #    processing logic to also finish quickly. (I.e. all of the chunks are yielded).
    # 2. While the voice is speaking, synchronous tasks such as analytics calls execute, causing the
    #    voice response to halt until the synchronous task ends.
    if not skip_final_processing:
        thread = threading.Thread(
            target=lambda: asyncio.run(
                final_processing_coroutine(
                    messages=messages,
                    agent_response=agent_response,
                    chat_id=chat_id,
                    user_id=user_id,
                    chat_type=chat_type,
                    user_message_timestamp=user_message_timestamp,
                    audio_messages_enabled=audio_messages_enabled,
                    audio_id=audio_id,
                    agent_message_timestamp=agent_message_timestamp,
                )
            ),
            daemon=True,
        )
        thread.start()


async def final_processing_coroutine(
    messages: List[dict],
    agent_response: str,
    chat_id: str,
    user_id: str,
    chat_type: str,
    user_message_timestamp: datetime,
    audio_messages_enabled: bool,
    audio_id: Optional[str],
    agent_message_timestamp: datetime,
) -> None:
    await call_update_chat(
        messages=messages,
        agent_response=agent_response,
        chat_id=chat_id,
        user_message_timestamp=user_message_timestamp,
        agent_message_timestamp=agent_message_timestamp,
        audio_messages_enabled=audio_messages_enabled,
        audio_id=audio_id,
    )

    await add_memories(
        messages=messages + [{"role": "assistant", "content": agent_response}],
        user_id=user_id,
        model=LLM,
    )

    await track_sent_message(
        user_id=user_id,
        chat_id=chat_id,
        chat_type=chat_type,
    )


def stream_text(
    messages: List[dict],
    chat_id: str,
    user_id: str,
    timezone: str,
    ai_first_name: str,
    user_first_name: str,
    user_gender: str,
    audio_messages_enabled: bool,
    audio_id: Optional[str],
):
    stream = stream_and_update_chat(
        messages=messages,
        chat_id=chat_id,
        user_id=user_id,
        chat_type="text",
        timezone=timezone,
        ai_first_name=ai_first_name,
        user_first_name=user_first_name,
        user_gender=user_gender,
        audio_messages_enabled=audio_messages_enabled,
        audio_id=audio_id,
        skip_final_processing=False,
    )
    for chunk in stream:
        for choice in chunk.choices:
            if choice.finish_reason == "stop":
                break
            else:
                content = choice.delta.content
                yield "{text}".format(text=content)


@router.post("/api/chat")
async def handle_chat_data(request: Request, user=Depends(authorize_user)):
    new_user_message = request.messages[-1]
    user_id = user["sub"]
    chat_id = request.chat_id
    timezone = request.timezone
    audio_messages_enabled = request.audio_messages_enabled

    prisma = Prisma()
    await prisma.connect()

    chat, settings = await asyncio.gather(
        prisma.chats.find_unique(
            where={"id": chat_id},
            include={"messages": True},
        ),
        prisma.settings.find_unique(
            where={"id": user_id},
        ),
    )

    if chat.userId != user_id:
        await prisma.disconnect()
        raise HTTPException(status_code=403, detail="Unauthorized")

    if chat is None:
        await prisma.disconnect()
        raise HTTPException(status_code=404, detail="Chat not found")

    openai_messages = convert_to_openai_messages(
        request.messages
    ) + convert_to_openai_messages([new_user_message])

    ai_first_name = settings.agentName
    user_first_name = settings.name
    user_gender = settings.gender

    # The generate_response_intake_session doesn't handle the case where the content is a list of parts, so we need to
    # convert the messages to a fixed string content format for now. We should probably update the function to handle this
    # case nativly.
    chat_history = [
        message_to_fixed_string_content(element) for element in openai_messages
    ]
    audio_id = str(uuid.uuid4()) if audio_messages_enabled else None

    response = None
    if audio_messages_enabled:
        user_message_timestamp = datetime.now()

        # Define a synchronous function to run in a separate thread. Necessary because
        # `stream_and_update_chat` contains an `asyncio.run` call, which causes an error if executed
        # in the current thread.
        def sync_function():
            stream = stream_and_update_chat(
                messages=chat_history,
                chat_id=chat_id,
                user_id=user_id,
                chat_type="text",
                timezone=timezone,
                ai_first_name=ai_first_name,
                user_first_name=user_first_name,
                user_gender=user_gender,
                audio_messages_enabled=audio_messages_enabled,
                audio_id=audio_id,
                skip_final_processing=True,
            )
            agent_response_text = get_stream_content(stream)
            return agent_response_text

        # Run the synchronous function in a separate thread
        agent_response = await asyncio.to_thread(sync_function)

        # Run the final processing logic outside of `stream_and_update_chat` because including it in
        # `sync_function` will cause `final_processing_coroutine` to fully execute before we can
        # continue with this logic, which adds significant latency to this call.
        asyncio.create_task(
            final_processing_coroutine(
                messages=chat_history,
                agent_response=agent_response,
                chat_id=chat_id,
                user_id=user_id,
                chat_type="type",
                user_message_timestamp=user_message_timestamp,
                agent_message_timestamp=datetime.timestamp(),
                audio_messages_enabled=audio_messages_enabled,
                audio_id=audio_id,
            )
        )

        voice_settings = VoiceSettingMapping[settings.voice]

        elevenlabs = ElevenLabs(api_key=os.environ.get("ELEVEN_LABS_API_KEY"))
        audio = elevenlabs.generate(
            text=agent_response,
            model=voice_settings.model,
            voice=voice_settings.voice_id,
            voice_settings=VoiceSettings(
                stability=voice_settings.stability,
                similarity_boost=voice_settings.similarity,
                style=voice_settings.style,
                use_speaker_boost=voice_settings.speaker_boost,
            ),
        )
        file_name = f"{audio_id}.mp3"
        audio_bytes = b"".join(audio)

        supabase = fetch_supabase()
        response = supabase.storage.from_(SUPABASE_AUDIO_MESSAGES_BUCKET_NAME).upload(
            file=audio_bytes,
            path=file_name,
            file_options={"content-type": "audio/mpeg"},
        )
        if response.is_error:
            raise HTTPException(
                status_code=405, detail=f"Audio upload failed: {response.content}"
            )

        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        # Create JSON response
        response_data = {
            "text": agent_response,
            "audioId": audio_id,
            "audioBase64": audio_base64,
        }
        response = JSONResponse(content=response_data)
    else:
        response = StreamingResponse(
            stream_text(
                chat_history,
                chat_id,
                user_id,
                timezone,
                ai_first_name,
                user_first_name,
                user_gender,
                audio_messages_enabled,
                audio_id,
            ),
            media_type="text/event-stream",
        )

    await prisma.disconnect()

    return response


class UpdateChatRequest(BaseModel):
    new_user_message: str
    user_message_timestamp: float
    new_agent_message: str
    agent_message_timestamp: float
    chat_id: str
    audio_messages_enabled: bool
    audio_id: Optional[str] = None


@router.post("/api/updateChat")
async def handle_update_chat(request: UpdateChatRequest):
    prisma = Prisma()
    await prisma.connect()

    async with prisma.tx():
        new_user_message = request.new_user_message
        agent_response = request.new_agent_message
        chat_id = request.chat_id
        audio_id = request.audio_id
        audio_messages_enabled = request.audio_messages_enabled

        # Create new user chat message
        if len(new_user_message) > 0:
            await prisma.chatmessages.create(
                data=types.ChatMessagesCreateInput(
                    chatId=chat_id,
                    role=enums.OpenAIRole.user,
                    content=new_user_message,
                    created=datetime.fromtimestamp(request.user_message_timestamp),
                    displayType="text",
                )
            )

        display_type = "audio" if audio_messages_enabled else "text"

        await prisma.chatmessages.create(
            data=types.ChatMessagesCreateInput(
                chatId=chat_id,
                role=enums.OpenAIRole.assistant,
                content=agent_response,
                created=datetime.fromtimestamp(request.agent_message_timestamp),
                displayType=display_type,
                audioId=audio_id,
            )
        )

        await prisma.chats.update(
            where={"id": chat_id},
            data=types.ChatsUpdateInput(lastMessageTime=datetime.now()),
        )

    await prisma.disconnect()


@router.get("/api/fetchAudio")
async def fetch_audio(audioId: str, user=Depends(authorize_user)):
    user_id = user["sub"]
    prisma = Prisma()
    await prisma.connect()

    # Find the chat message with the given audioId and ensure it belongs to the authorized user
    message = await prisma.chatmessages.find_first(
        where={"audioId": audioId, "chat": {"is": {"userId": user_id}}}
    )

    if not message:
        await prisma.disconnect()
        raise HTTPException(status_code=404, detail="Audio not found or unauthorized")

    await prisma.disconnect()

    audio_path = f"{audioId}.mp3"

    supabase = fetch_supabase()
    audio = supabase.storage.from_(SUPABASE_AUDIO_MESSAGES_BUCKET_NAME).download(
        audio_path
    )

    # Return the audio as a streaming response
    return Response(content=audio, media_type="audio/mpeg")


@router.get("/api/health")
async def handle_health_check():
    return JSONResponse(status_code=200, content={"message": "Alive"})
