from __future__ import annotations

import os
import asyncio
import logging

from prisma import Prisma
from dataclasses import dataclass
from typing import Any, MutableSet
from livekit.agents import llm
from openai.types.chat import ChatCompletionChunk
from openai.types.chat import ChatCompletionChunk
from livekit.plugins.openai.llm import _build_oai_context, LLMStream, ChatModels
from livekit.agents import llm
from openai.types.chat.chat_completion_chunk import ChatCompletionChunk
from server.api.routes.chat import stream_and_update_chat
from typing import Any, Coroutine
from dataclasses import dataclass

logger = logging.getLogger("voice-agent")

class AsyncStream:
    def __init__(self, async_gen):
        self._async_gen = async_gen

    def __aiter__(self):
        return self._async_gen.__aiter__()

    async def aclose(self):
        await self._async_gen.aclose()


def get_next_item(it):
    try:
        return next(it)
    except StopIteration:
        return None


def convert_stream_to_coroutine(messages, chat_id, user_id, timezone: str, ai_first_name: str, user_first_name: str, user_gender: str) -> Coroutine[Any, Any, 'AsyncStream[ChatCompletionChunk]']:
    async def wrapper():
        sync_gen = stream_and_update_chat(messages=messages, chat_id=chat_id, user_id=user_id, chat_type='voice', timezone=timezone, ai_first_name=ai_first_name, user_first_name=user_first_name, user_gender=user_gender)
        it = iter(sync_gen)

        async def async_gen():
            while True:
                # Use a helper function to handle StopIteration
                s = await asyncio.get_event_loop().run_in_executor(None, get_next_item, it)
                if s is None:
                    break
                yield s

        return AsyncStream(async_gen())

    return wrapper()


@dataclass
class Options:
    user: str | None
    user_name: str
    user_gender: str
    agent_name: str
    timezone: str
    chat_id: str | None
    temperature: float | None


class LLM(llm.LLM):
    def __init__(
        self,
        *,
        api_key: str | None = None,
        user_id: str,
        chat_id: str,
        user_name: str,
        agent_name: str,
        user_gender: str,
        timezone: str,
        temperature: float | None = None,
    ) -> None:
        api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if api_key is None:
            raise ValueError("OpenAI API key is required")

        self._opts = Options(
            user=user_id,
            chat_id=chat_id,
            temperature=temperature,
            agent_name=agent_name,
            user_name=user_name,
            user_gender=user_gender,
            timezone=timezone
        )
        self._running_fncs: MutableSet[asyncio.Task[Any]] = set()

    def chat(
        self,
        *,
        chat_ctx: llm.ChatContext,
        fnc_ctx: llm.FunctionContext | None = None,
        temperature: float | None = None,
        n: int | None = 1,
        parallel_tool_calls: bool | None = None,
    ) -> "LLMStream":
        logger.info("chat function")

        if fnc_ctx and len(fnc_ctx.ai_functions) > 0:
          raise ValueError('Functions are not supported')

        messages = _build_oai_context(chat_ctx, id(self))
        stream = convert_stream_to_coroutine(messages=messages, chat_id=self._opts.chat_id, user_id=self._opts.user, timezone=self._opts.timezone, ai_first_name=self._opts.agent_name, user_first_name=self._opts.user_name, user_gender=self._opts.user_gender)

        return LLMStream(oai_stream=stream, chat_ctx=chat_ctx, fnc_ctx=fnc_ctx)
