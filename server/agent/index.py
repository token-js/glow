from openai.types.chat import ChatCompletionMessageParam, ChatCompletionChunk
from typing import Any, List
from openai import OpenAI, AsyncOpenAI
from openai import Stream
from typing import AsyncGenerator, List, Dict, Optional
from livekit.plugins.openai.log import logger
from openai.types.chat.chat_completion_chunk import ChatCompletionChunk, Choice, ChoiceDelta
import aiohttp
import json
import uuid

async def generate_response(
  llm: AsyncOpenAI,
  conversation: List[ChatCompletionMessageParam],
):
  MODEL_NAME = "gpt-4o-mini-2024-07-18"
  return llm.chat.completions.create(
      messages=conversation, model=MODEL_NAME, stream=True
  )

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