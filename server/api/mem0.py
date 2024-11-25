import asyncio
import os
from mem0 import AsyncMemoryClient, MemoryClient
from server.logger.index import fetch_logger
from functools import partial

logger = fetch_logger()


async def run_with_timeout(func, *args, timeout=None, timeout_response=None, **kwargs):
    if asyncio.iscoroutinefunction(func):
        # The function is asynchronous
        try:
            return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout)
        except asyncio.TimeoutError:
            print(
                f"TimeoutError: Function '{func.__name__}' timed out after {timeout} seconds."
            )
            return timeout_response
    else:
        # The function is synchronous
        loop = asyncio.get_running_loop()
        try:
            partial_func = partial(func, *args, **kwargs)
            return await asyncio.wait_for(
                loop.run_in_executor(None, partial_func), timeout=timeout
            )
        except asyncio.TimeoutError:
            print(
                f"TimeoutError: Function '{func.__name__}' timed out after {timeout} seconds."
            )
            return timeout_response


def unsafe_fetch_mem0():
    try:
        return AsyncMemoryClient(api_key=os.environ.get("MEM0_API_KEY"))
    except Exception as e:
        logger.error(e, exc_info=True)
        return None


async def fetch_mem0() -> AsyncMemoryClient | None:
    return await run_with_timeout(unsafe_fetch_mem0, timeout=0.5)


async def call_add_memory(
    truncated_messages, user_id: str, includes, custom_categories
):
    mem0 = await fetch_mem0()

    if mem0 != None:
        try:
            await run_with_timeout(
                mem0.add,
                (
                    truncated_messages,
                    user_id,
                    includes,
                    custom_categories,
                ),
                timeout=5,
            )
        except Exception as e:
            # Log the exception this will send it to sentry, but we'll still process the response
            # We do this because mem0 isn't always the most stable...
            logger.error(e, exc_info=True)

    return


async def fetch_all_memories(user_id: str):
    mem0 = await fetch_mem0()

    if mem0 != None:
        return await run_with_timeout(
            mem0.get_all,
            (
                {"user_id": user_id},
                "v2",
            ),
            timeout=0.3,
        )

    return []


async def call_search_memories(message_content: str, user_id: str):
    mem0 = await fetch_mem0()

    if mem0 != None:
        return await run_with_timeout(
            mem0.search,
            (
                message_content,
                25,
                True,
                {"user_id": user_id},
                "v2",
            ),
            timeout=0.3,
        )

    return []
