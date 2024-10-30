import os
import json
from typing import Any, List
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from server.api.utils import authorize_user
from prisma import Prisma, enums, types, models
from pydantic import BaseModel
from datetime import datetime
from server.api.analytics import track_sent_message
from fastapi.responses import JSONResponse
from server.agent.index import stream_inflection_response
import asyncio


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
    role: str
    content: str
    experimental_attachments: Optional[List[ClientAttachment]] = None
    toolInvocations: Optional[List[ToolInvocation]] = None


class Request(BaseModel):
    messages: List[ClientMessage]
    chat_id: str


router = APIRouter()

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)


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

def stream_text(
    messages: List[dict],
    chat_id: str,
    chat: models.Chats,
    user_id: str,
):
    # This implementation uses the vercel text streaming protocol
    # https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#text-stream-protocol
    # We could also use the data streaming protocol. The data streaming protocol is better for sending structured data
    # to the client. I don't think we need it in this case, but here is the link to the documentation:
    # https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#data-stream-protocol
    # Here is an example of implementing it:
    # https://github.com/vercel/ai/blob/main/examples/next-fastapi/api/index.py#L72
    stream = None
    agent_response = ""
    message_history = messages
    stream = asyncio.run(
        stream_inflection_response(
            llm=client, conversation=messages,
        )
    )

    if stream is not None:
        agent_response = ""
        for chunk in stream:
            for choice in chunk.choices:
                if choice.finish_reason == "stop":
                    break
                else:
                    content = choice.delta.content
                    agent_response += content
                    yield "{text}".format(text=content)

    asyncio.run(
        update_chat(
            message_history,
            chat_id,
            agent_response,
        )
    )

    # Would be nice to record usage here
    track_sent_message(
        user_id=user_id,
        chat_id=chat_id,
        is_intake_session=chat.isIntroSession,
    )


@router.post("/api/chat")
async def handle_chat_data(request: Request, user=Depends(authorize_user)):
    new_user_message = request.messages[-1]
    chat_id = request.chat_id
    user_id = user["sub"]

    if chat_id is None:
        raise HTTPException(status_code=400, detail="chat_id is required")

    prisma = Prisma()
    await prisma.connect()

    # confirm the chat exists and belongs to the user
    chat = await prisma.chats.find_unique(
        where={"id": chat_id, "userId": user_id},
        include={
            "messages": True,
        },
    )

    # get the last completed chat which will be used to get the previous session form and action plan
    previous_chat = await prisma.chats.find_first(
        where={"userId": user_id, "completedSession": True},
        order={
            "created": "desc",
        },
    )

    # get the intake chat
    intake_chat = await prisma.chats.find_first(
        where={"userId": user_id, "isIntroSession": True},
        order={
            "created": "desc",
        },
    )

    if chat is None:
        await prisma.disconnect()
        raise HTTPException(status_code=404, detail="Chat not found")

    openai_messages = convert_to_openai_messages(
        chat.messages
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
            chat,
            previous_chat,
            intake_chat,
            user_id,
        )
    )
    response.headers["x-vercel-ai-data-stream"] = "v1"
    return response


@router.get("/api/health")
async def handle_chat_data():
    return JSONResponse(status_code=200, content={"message": "Alive"})
