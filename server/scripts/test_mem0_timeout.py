import asyncio
import os
import time
import inspect
from functools import partial
from dotenv import load_dotenv
from mem0 import AsyncMemoryClient

load_dotenv()


async def run_with_timeout(func, *args, timeout=None, **kwargs):
    if asyncio.iscoroutinefunction(func):
        # The function is asynchronous
        try:
            return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout)
        except asyncio.TimeoutError:
            print(
                f"TimeoutError: Function '{func.__name__}' timed out after {timeout} seconds."
            )
            return None
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
            return None


# Define your functions
def sync_create_mem0():
    # Blocking call using time.sleep()
    return AsyncMemoryClient(api_key=os.environ.get("MEM0_API_KEY"))


async def async_create_mem0():
    # Non-blocking call using asyncio.sleep()
    return AsyncMemoryClient(api_key=os.environ.get("MEM0_API_KEY"))


async def main():
    # Test with the synchronous function
    print("Testing with sync_create_mem0:")
    mem0_sync = await run_with_timeout(sync_create_mem0, timeout=0.5)
    if mem0_sync:
        print("sync_create_mem0 completed successfully.")
    else:
        print("sync_create_mem0 did not complete.")

    # Test with the asynchronous function
    print("\nTesting with async_create_mem0:")
    mem0_async = await run_with_timeout(async_create_mem0, timeout=0.5)
    if mem0_async:
        print("async_create_mem0 completed successfully.")
    else:
        print("async_create_mem0 did not complete.")

    # Proceed with further operations if needed
    # ...


asyncio.run(main())
