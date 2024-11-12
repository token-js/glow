import os
from typing import Any, List
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from server.api.utils import authorize_user
from prisma import Prisma, enums, types
from pydantic import BaseModel
from datetime import datetime
from server.api.analytics import track_sent_message
from fastapi.responses import JSONResponse
from server.agent.index import generate_response
import asyncio
import logging
import requests

logger = logging.getLogger("voice-agent")

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


async def update_chat(
    messages: List[dict],
    chat_id: str,
    agent_response: str,
):
    prisma = Prisma()
    await prisma.connect()

    async with prisma.tx():
        # Get the last user message (pop if the last message is a system message)
        new_user_message = messages.pop()
        while new_user_message["role"] == "system":
            new_user_message = messages.pop()

        content = message_to_fixed_string_content(new_user_message)["content"]

        # Create new user chat message
        await prisma.chatmessages.create(
            data=types.ChatMessagesCreateInput(
                chatId=chat_id,
                role=enums.OpenAIRole.user,
                content=content,
            )
        )

        # Create new agent chat message
        await prisma.chatmessages.create(
            data=types.ChatMessagesCreateInput(
                chatId=chat_id,
                role=enums.OpenAIRole.assistant,
                content=agent_response,
            )
        )

        await prisma.chats.update(
            where={"id": chat_id},
            data=types.ChatsUpdateInput(lastMessageTime=datetime.now()),
        )

    await prisma.disconnect()

def call_update_chat(
    messages: List[dict], 
    agent_response: str, 
    user_message_timestamp: datetime,
    agent_message_timestamp: datetime,
    chat_id: str
):
    new_user_message = messages.pop()
    while new_user_message["role"] == "system":
        new_user_message = messages.pop()
    new_user_message = message_to_fixed_string_content(new_user_message)["content"]
    
    data = {
        'new_user_message': new_user_message,
        'new_agent_message': agent_response,
        'user_message_timestamp': user_message_timestamp.timestamp(),
        'agent_message_timestamp': agent_message_timestamp.timestamp(),
        'chat_id': chat_id
    }
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {os.environ.get('CRON_SECRET')}"
    }
    requests.post(f"https://{os.environ.get('EXPO_PUBLIC_API_URL')}/api/updateChat", json=data, headers=headers)

def stream_and_update_chat(
    messages: List[dict],
    chat_id: str,
    user_id: str,
):
    user_message_timestamp = datetime.now()
    client = OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY"),
    )

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
            llm=client, conversation=messages,
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

    # Append new messages to the chat
    agent_message_timestamp = datetime.now()
    call_update_chat(
        messages=messages,
        agent_response=agent_response,
        chat_id=chat_id,
        user_message_timestamp=user_message_timestamp,
        agent_message_timestamp=agent_message_timestamp
    )

    # Would be nice to record usage here
    track_sent_message(
        user_id=user_id,
        chat_id=chat_id,
    )


def stream_text(
    messages: List[dict],
    chat_id: str,
    user_id: str,
):
    stream = stream_and_update_chat(messages, chat_id, user_id)
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

    prisma = Prisma()
    await prisma.connect()

    # confirm the chat exists and belongs to the user
    chat = await prisma.chats.find_unique(
        where={"id": chat_id},
        include={
            "messages": True,
        },
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
        ),
        media_type="text/event-stream"
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
                created=datetime.fromtimestamp(request.user_message_timestamp)
            )
        )

        # Create new agent chat message
        await prisma.chatmessages.create(
            data=types.ChatMessagesCreateInput(
                chatId=chat_id,
                role=enums.OpenAIRole.assistant,
                content=agent_response,
                created=datetime.fromtimestamp(request.agent_message_timestamp)
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