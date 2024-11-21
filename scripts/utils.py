import asyncio
import json
import os

from dotenv import load_dotenv
from openai import AsyncOpenAI

from server.api.utils import (
    add_memories,
    add_system_prompts,
    search_memories,
    get_final_messages_by_token_limit,
)
from mem0 import AsyncMemoryClient

from typing import Any, Dict, List
import tiktoken

load_dotenv()


async def fetch_response(
    llm: AsyncOpenAI,
    model: str,
    encoding: tiktoken.Encoding,
    messages_with_system_prompts: List[Dict[str, Any]],
) -> str:
    truncated_messages = get_final_messages_by_token_limit(
        messages=messages_with_system_prompts,
        model=model,
        encoding=encoding,
        token_limit=125000,
    )

    truncated_messages = truncated_messages[-2048:]

    response = await llm.chat.completions.create(
        messages=messages_with_system_prompts, model=model, store=True
    )

    return response.choices[0].message.content


async def run_dialogue(
    user_id: str,
    model: str,
    messages: List[Dict[str, str]],
    num_responses: int,
) -> None:
    mem0 = AsyncMemoryClient(api_key=os.environ.get("MEM0_API_KEY"))
    llm = AsyncOpenAI(
        api_key=os.environ.get("OPENAI_API_KEY"),
    )

    while True:
        messages = [message for message in messages if message["role"] != "system"]

        if len(messages) == 0 or messages[-1]["role"] == "assistant":
            user_input = ""
            while not user_input.strip():
                user_input = input("Enter your message: ").strip()

            messages.append({"role": "user", "content": user_input})

        # Much of this logic is copied from production. We duplicate it so that we call the Mem0
        # functions one time per iteration instead of `num_responses` times.
        (relevant_memories_with_preferences, encoding), all_memories = (
            await asyncio.gather(
                search_memories(
                    mem0=mem0,
                    messages=messages,
                    user_id=user_id,
                    model=model,
                ),
                mem0.get_all(
                    filters={"user_id": user_id},
                    version="v2",
                ),
            )
        )
        memories = [
            memory
            for memory in relevant_memories_with_preferences
            if "conversation_preferences" not in memory["categories"]
        ]

        preferences = [
            memory
            for memory in all_memories
            if "conversation_preferences" in memory["categories"]
        ]

        messages_with_system_prompts = add_system_prompts(
            messages=messages,
            timezone="America/New_York",
            ai_first_name="Charlotte",
            user_first_name="Sam",
            user_gender="male",
            memories=memories,
            preferences=preferences,
        )
        json.dump(messages_with_system_prompts, open("output.json", "w"))

        # Generate responses asynchronously
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

        print(f"----------- {num_responses} RESPONSES ---------------")

        # Print all responses
        for i, response in enumerate(responses):
            print(f"{i}: {response}")
            print("--------------------------")

        assistant_message_index_str = ""
        while True:
            # Allow the user to choose which assistant message is selected to be part of the chat
            # history. Important to choose wisely, since it'll determine the rest of the
            # conversation, and be committed to Mem0.
            assistant_message_index_str = input(
                "Select assistant message index (e.g. 0): "
            ).strip()
            if assistant_message_index_str.isdigit():
                break
            else:
                print("Enter an integer.")

        selected_response = responses[int(assistant_message_index_str)]
        messages_with_system_prompts.append(
            {"role": "assistant", "content": selected_response}
        )
        messages.append({"role": "assistant", "content": selected_response})

        # Display the selected response
        print("\nSelected Assistant Message:")
        print(selected_response)
        print("\n--------------------------")

        json.dump(messages_with_system_prompts, open("output.json", "w"))

        await add_memories(
            messages=messages,
            user_id=user_id,
            model=model,
        )

        print("-------------------------------------------------")
        print("-------------------------------------------------")
        print("-------------------------------------------------")
