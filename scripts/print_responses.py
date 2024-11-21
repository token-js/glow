import asyncio
import os

from openai import AsyncOpenAI
import tiktoken

from scripts.utils import fetch_response
from dotenv import load_dotenv

load_dotenv()


# Insert values:
messages_with_system_prompts =
model =


if messages_with_system_prompts[-1]["role"] != "system":
    raise Exception("Messages must end with system prompt")


async def main() -> None:
    llm = AsyncOpenAI(
        api_key=os.environ.get("OPENAI_API_KEY"),
    )
    encoding = tiktoken.get_encoding("cl100k_base")

    # Generate responses asynchronously
    num_responses = 25
    tasks = [
        fetch_response(
            llm=llm,
            model=model,
            encoding=encoding,
            messages_with_system_prompts=messages_with_system_prompts,
        )
        for _ in range(num_responses)
    ]
    responses = await asyncio.gather(*tasks)

    print("-------------------------------------------------")
    print("-------------------------------------------------")
    print("-------------------------------------------------")

    print(f"----------- {num_responses} RESPONSES ---------------")

    # Print all responses
    for i, response in enumerate(responses, start=1):
        print(f"{response}")
        print("--------------------------")


asyncio.run(main())
