from openai.types.chat import ChatCompletionMessageParam, ChatCompletionChunk
from typing import Any, List
from openai import OpenAI
from openai import Stream

async def generate_response(
  llm: OpenAI,
  conversation: List[ChatCompletionMessageParam],
) -> Stream[ChatCompletionChunk]:
  MODEL_NAME = "gpt-4o-mini-2024-07-18"
  return llm.chat.completions.create(
      messages=conversation, model=MODEL_NAME, stream=True
  )