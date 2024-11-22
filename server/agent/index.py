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

from server.api.constants import LLM
from server.api.utils import (
    add_system_prompts,
    get_final_messages_by_token_limit,
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

    relevant_memories_with_preferences = []
    all_memories = []
    try:
        (relevant_memories_with_preferences, encoding), all_memories = (
            await asyncio.gather(
                search_memories(
                    mem0=mem0,
                    messages=messages,
                    user_id=user_id,
                    model=LLM,
                ),
                mem0.get_all(
                    filters={"user_id": user_id},
                    version="v2",
                ),
            )
        )
    except Exception as e:
        # Log the exception this will send it to sentry, but we'll still process the response
        # We do this because mem0 isn't always the most stable...
        logger.error(e, exc_info=True)

    memories = [
        memory
        for memory in relevant_memories_with_preferences
        if memory["categories"] == None
        or "conversation_preferences" not in memory["categories"]
    ]

    all_memories = all_memories['results'] if isinstance(all_memories, dict) else all_memories
    preferences = [
        memory
        for memory in all_memories
        if memory["categories"] != None
        and "conversation_preferences" in memory["categories"]
    ]

    messages_with_system_prompts = add_system_prompts(
        messages=messages,
        ai_first_name=ai_first_name,
        user_first_name=user_first_name,
        user_gender=user_gender,
        timezone=timezone,
        memories=memories,
        preferences=preferences,
    )
    truncated_messages = get_final_messages_by_token_limit(
        messages=messages_with_system_prompts,
        model=LLM,
        encoding=encoding,
        token_limit=125000,
    )

    # Get the last 2048 elements of the array because OpenAI throws an error if the array is larger.
    truncated_messages = truncated_messages[-2048:]

    return llm.chat.completions.create(
        messages=truncated_messages, model=LLM, stream=True, store=True
    )
