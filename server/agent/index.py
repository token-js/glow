import asyncio
import os
from openai.types.chat import ChatCompletionMessageParam, ChatCompletionChunk
from typing import Any, List
from openai import OpenAI, AsyncOpenAI
from openai import Stream
from typing import AsyncGenerator, List, Dict, Optional

from prisma import Prisma
import tiktoken
from livekit.plugins.openai.log import logger
from openai.types.chat.chat_completion_chunk import (
    ChatCompletionChunk,
    Choice,
    ChoiceDelta,
)
import aiohttp
import json
import uuid

from server.api.constants import FINE_TUNED_MODEL
from server.api.utils import (
    get_final_messages_by_token_limit,
    make_system_prompt,
    search_memories,
)
from mem0 import AsyncMemoryClient


async def generate_response(
    llm: AsyncOpenAI,
    messages: List[ChatCompletionMessageParam],
    user_id: str,
    timezone: str,
    ai_first_name: str,
    user_first_name: str,
    user_gender: str,
):
    mem0 = AsyncMemoryClient(api_key=os.environ.get("MEM0_API_KEY"))

    (relevant_memories_with_preferences, encoding), all_memories = await asyncio.gather(
        search_memories(
            mem0=mem0,
            messages=messages,
            user_id=user_id,
            model=FINE_TUNED_MODEL,
        ),
        mem0.get_all(
            filters={"user_id": user_id},
            version="v2",
        ),
    )
    memories = [
        memory
        for memory in relevant_memories_with_preferences
        if memory["categories"] == None
        or "conversation_preferences" not in memory["categories"]
    ]

    preferences = [
        memory
        for memory in all_memories
        if memory["categories"] != None
        and "conversation_preferences" in memory["categories"]
    ]

    system_prompt = make_system_prompt(
        ai_first_name=ai_first_name,
        user_first_name=user_first_name,
        user_gender=user_gender,
        timezone=timezone,
        memories=memories,
        preferences=preferences,
    )
    messages_with_system_prompt = messages + [
        {"role": "system", "content": system_prompt}
    ]
    truncated_messages = get_final_messages_by_token_limit(
        messages=messages_with_system_prompt,
        model=FINE_TUNED_MODEL,
        encoding=encoding,
        token_limit=125000,
    )

    # Get the last 2048 elements of the array because OpenAI throws an error if the array is larger.
    truncated_messages = truncated_messages[-2048:]

    return llm.chat.completions.create(
        messages=truncated_messages, model=FINE_TUNED_MODEL, stream=True, store=True
    )
