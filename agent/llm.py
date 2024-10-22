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

async def stream_inflection_response(
    token: str,
    context: List[Dict],
    config: str,
    metadata: Optional[Dict] = None
) -> AsyncGenerator[ChatCompletionChunk, None]:
    """
    Streams responses from the InflectionAI API and yields ChatCompletionChunk objects.

    :param token: The API token provided by Inflection AI.
    :param context: The past turns of conversation as a list of messages.
    :param config: The model configuration to use ("inflection_3_pi" or "inflection_3_productivity").
    :param metadata: Optional user metadata for the AI to utilize.
    :return: An asynchronous generator yielding ChatCompletionChunk instances.
    """
    # Map the messages to the format expected by InflectionAI API
    def map_message(msg):
        role_to_type = {
            'system': 'Instruction',
            'user': 'Human',
            'assistant': 'AI'
        }
        return {
            'type': role_to_type.get(msg['role'], 'Human'),
            'text': msg['content']
        }

    mapped_context = [map_message(msg) for msg in context]

    url = 'https://layercake.pubwestus3.inf7ks8.com/external/api/inference/streaming'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    payload = {
        'config': config,
        'context': mapped_context
    }
    if metadata:
        payload['metadata'] = metadata

    # Generate a unique ID for the chat completion
    completion_id = str(uuid.uuid4())
    model_name = config

    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, json=payload) as resp:
            if resp.status != 200:
                error_text = await resp.text()
                raise Exception(f"Request failed with status {resp.status}: {error_text}")
            async for line in resp.content:
                line = line.decode('utf-8').strip()
                if not line:
                    continue  # Skip empty lines
                if line.startswith('data: '):
                    line = line[len('data: '):]  # Remove 'data: ' prefix
                else:
                    continue  # Skip lines that don't start with 'data: '
                if line == '[DONE]':
                    break  # End of the stream
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    # Optionally log the error or handle it
                    logger.warning(f"Failed to parse JSON: {line}")
                    continue  # Skip invalid JSON lines
                # Create the ChoiceDelta with the content from the response
                delta = ChoiceDelta(content=data['text'], role='assistant')
                # Create the Choice object
                choice = Choice(
                    delta=delta,
                    index=data.get('idx'),
                    finish_reason=None,
                    logprobs=None
                )
                # Create the ChatCompletionChunk object
                chunk = ChatCompletionChunk(
                    id=completion_id,
                    choices=[choice],
                    created=int(data.get('created')),
                    model=model_name,
                    object='chat.completion.chunk'
                )
                yield chunk


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

        return LLMStream(oai_stream=get_stream(messages, self._opts), chat_ctx=chat_ctx, fnc_ctx=fnc_ctx)
