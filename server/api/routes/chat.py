import os
import threading
from typing import Any, List
import httpx
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from server.api.constants import LLM
from server.api.utils import add_memories, authorize_user
from prisma import Prisma, enums, types
from pydantic import BaseModel
from datetime import datetime
from server.api.analytics import track_sent_message
from fastapi.responses import JSONResponse
from server.agent.index import generate_response
import asyncio
from server.logger.index import fetch_logger

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
):
    new_user_message = next(msg for msg in reversed(messages) if msg["role"] == "user")
    new_user_message = message_to_fixed_string_content(new_user_message)["content"]

    data = {
        "new_user_message": new_user_message,
        "new_agent_message": agent_response,
        "user_message_timestamp": user_message_timestamp.timestamp(),
        "agent_message_timestamp": agent_message_timestamp.timestamp(),
        "chat_id": chat_id,
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
):
    user_message_timestamp = datetime.now()
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

    # Run asynchronous operations in a separate thread, which is necessary to prevent the main
    # thread from getting blocked during synchronous tasks with high latency, like network requests.
    # This is important when streaming voice responses because the voice will pause in the middle of
    # its response if a synchronous task is running. The voice can pause midway in the following
    # scenario:
    # 1. The conversational LLM's response finishes streaming very quickly, causing the stream
    #    processing logic to also finish quickly. (I.e. all of the chunks are yielded).
    # 2. While the voice is speaking, synchronous tasks such as analytics calls execute, causing the
    #    voice response to halt until the synchronous task ends.
    thread = threading.Thread(
        target=lambda: asyncio.run(
            final_processing_coroutine(
                messages=messages,
                agent_response=agent_response,
                chat_id=chat_id,
                user_id=user_id,
                chat_type=chat_type,
                user_message_timestamp=user_message_timestamp,
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
) -> None:
    agent_message_timestamp = datetime.now()

    await call_update_chat(
        messages=messages,
        agent_response=agent_response,
        chat_id=chat_id,
        user_message_timestamp=user_message_timestamp,
        agent_message_timestamp=agent_message_timestamp,
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

    await prisma.disconnect()

    ai_first_name = settings.agentName
    user_first_name = settings.name
    user_gender = settings.gender

    # The generate_response_intake_session doesn't handle the case where the content is a list of parts, so we need to
    # convert the messages to a fixed string content format for now. We should probably update the function to handle this
    # case nativly.
    chat_history = [
        message_to_fixed_string_content(element) for element in openai_messages
    ]
    response = StreamingResponse(
        stream_text(
            chat_history,
            chat_id,
            user_id,
            timezone,
            ai_first_name,
            user_first_name,
            user_gender,
        ),
        media_type="text/event-stream",
    )
    return response


class UpdateChatRequest(BaseModel):
    new_user_message: str
    user_message_timestamp: float
    new_agent_message: str
    agent_message_timestamp: float
    chat_id: str


@router.post("/api/updateChat")
async def handle_update_chat(request: UpdateChatRequest):
    prisma = Prisma()
    await prisma.connect()

    async with prisma.tx():
        # Get the last user message (pop if the last message is a system message)
        new_user_message = request.new_user_message
        agent_response = request.new_agent_message
        chat_id = request.chat_id

        # Create new user chat message
        await prisma.chatmessages.create(
            data=types.ChatMessagesCreateInput(
                chatId=chat_id,
                role=enums.OpenAIRole.user,
                content=new_user_message,
                created=datetime.fromtimestamp(request.user_message_timestamp),
            )
        )

        # Create new agent chat message
        await prisma.chatmessages.create(
            data=types.ChatMessagesCreateInput(
                chatId=chat_id,
                role=enums.OpenAIRole.assistant,
                content=agent_response,
                created=datetime.fromtimestamp(request.agent_message_timestamp),
            )
        )

        await prisma.chats.update(
            where={"id": chat_id},
            data=types.ChatsUpdateInput(lastMessageTime=datetime.now()),
        )

    await prisma.disconnect()


@router.get("/api/health")
async def handle_health_check():
    return JSONResponse(status_code=200, content={"message": "Alive"})
