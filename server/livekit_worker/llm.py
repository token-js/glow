from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from typing import Any, Awaitable, MutableSet

import httpx
from livekit.agents import llm

import openai
from openai.types.chat import ChatCompletionChunk, ChatCompletionMessageParam
from openai.types.chat.chat_completion_chunk import Choice

from livekit.plugins.openai.log import logger
from livekit.plugins.openai.utils import AsyncAzureADTokenProvider, build_oai_message
from livekit.plugins.openai.llm import LLMOptions, _build_oai_context, LLMStream, ChatModels, CerebrasChatModels, XAIChatModels, GroqChatModels, DeepSeekChatModels, OctoChatModels, PerplexityChatModels, TogetherChatModels, TelnyxChatModels

import aiohttp
import asyncio
import json
import uuid
from typing import AsyncGenerator, List, Dict, Optional
from typing_extensions import Literal
from livekit.agents import llm
from openai.types.chat.chat_completion_chunk import ChatCompletionChunk, Choice, ChoiceDelta
from openai import OpenAI
from server.agent.index import stream_inflection_response

class AsyncStream:
    def __init__(self, async_gen):
        self._async_gen = async_gen

    def __aiter__(self):
        return self._async_gen.__aiter__()

    async def aclose(self):
        await self._async_gen.aclose()

async def get_stream(messages: List[ChatCompletionMessageParam], opts: LLMOptions):
    async_gen = stream_inflection_response(
        token=os.getenv("INFLECTION_API_KEY"),
        context=messages,
        config=opts.model,
    )
    return AsyncStream(async_gen)


class InflectionLLM(llm.LLM):
    def __init__(
        self,
        *,
        model: str,
        api_key: str | None = None,
        user: str | None = None,
        temperature: float | None = None,
    ) -> None:
        api_key = api_key or os.environ.get("INFLECTION_API_KEY")
        if api_key is None:
            raise ValueError("Inflection API key is required")

        self._opts = LLMOptions(model=model, user=user, temperature=temperature)
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
        if fnc_ctx and len(fnc_ctx.ai_functions) > 0:
          raise ValueError('Functions are not supported')

        messages = _build_oai_context(chat_ctx, id(self))

        # client = OpenAI(
        #     api_key=os.environ.get("OPENAI_API_KEY"),
        # )        
        # stream = client.chat.completions.create(
        #     messages=messages, model='gpt-4o-mini', stream=True
        # )

        return LLMStream(oai_stream=get_stream(messages, self._opts), chat_ctx=chat_ctx, fnc_ctx=fnc_ctx)
