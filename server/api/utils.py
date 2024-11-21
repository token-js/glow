# Standard library imports
import copy
from datetime import datetime, timedelta
import os
from typing import Any, Dict, List, Optional, Tuple
import zoneinfo
import jwt

from openai.types.chat import ChatCompletionMessageParam
import tiktoken
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from server.api.constants import CONTEXT_WINDOWS
from supabase import create_client, Client
from openai.types.completion_usage import CompletionUsage
from mem0 import AsyncMemoryClient, MemoryClient
from server.logger.index import fetch_logger

logger = fetch_logger()


# Verifies the cron secret token in the authorization header
async def authorize_cron(request: Request):
    # Get the token from the environment variable
    cron_secret = os.getenv("CRON_SECRET")

    # Get the authorization header value
    authorization = request.headers.get("Authorization")

    # Ensure the authorization header is in the correct format
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")

    # Extract the token from the header
    token = authorization.split("Bearer ")[1]

    # Check if the token matches the one stored in the environment variable
    if token != cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return request


# Verifies the user JWT token in the authorization header
def authorize_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    secret_key = os.environ.get("SUPABASE_JWT_SECRET")
    algo = "HS256"
    try:
        payload = jwt.decode(
            credentials.credentials,
            secret_key,
            algorithms=[algo],
            audience="authenticated",
        )
        return payload
    except:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid token",
        )


def create_supabase_admin_client():
    url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(url, key)
    return supabase


def create_supabase_client():
    url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    supabase: Client = create_client(url, key)
    return supabase


# Taken from: https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken
def estimate_tokens_for_messages(
    messages: List[ChatCompletionMessageParam], encoding: tiktoken.Encoding
) -> int:
    # Check that each message is a ChatCompletionMessageParam. Particularly, it's important to check
    # that `messages` does not contain entries that are a superset of the ChatCompletionMessageParam
    # type because extraneous fields would be counted as tokens, which is not desirable.
    if not all(is_chat_completion_message_param(message) for message in messages):
        raise ValueError("All messages must be of type ChatCompletionMessageParam")

    tokens_per_message = 3
    tokens_per_name = 1
    num_tokens = 0

    for message in messages:
        num_tokens += tokens_per_message
        for key, value in message.items():
            num_tokens += len(encoding.encode(value))
            if key == "name":
                num_tokens += tokens_per_name

    num_tokens += 3  # Every reply is primed with <|start|>assistant<|message|>
    return num_tokens


def find_last_agent_message(conversation: List[ChatCompletionMessageParam]) -> str:
    for msg in reversed(conversation):
        if msg["role"] == "assistant":
            return msg["content"]
    raise Exception("No agent message found.")


def calculate_cost(usage: CompletionUsage, model: str):
    if model == "gpt-4o-mini-2024-07-18":
        prompt_token_cost = 0.15 / 1_000_000
        completion_token_cost = 0.6 / 1_000_000
    else:
        return {
            "cost": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
        }
        # raise Exception("Model usage cost calculation not implemented")

    cost = (
        usage.prompt_tokens * prompt_token_cost
        + usage.completion_tokens * completion_token_cost
    )
    return {
        "cost": cost,
        "prompt_tokens": usage.prompt_tokens,
        "completion_tokens": usage.completion_tokens,
    }


def is_chat_completion_system_message_param(obj: Any) -> bool:
    if not isinstance(obj, dict):
        return False
    allowed_keys = {"content", "role", "name"}
    return all(key in allowed_keys for key in obj.keys())


def is_chat_completion_user_message_param(obj: Any) -> bool:
    if not isinstance(obj, dict):
        return False
    allowed_keys = {"content", "role", "name"}
    return all(key in allowed_keys for key in obj.keys())


def is_chat_completion_assistant_message_param(obj: Any) -> bool:
    if not isinstance(obj, dict):
        return False
    allowed_keys = {
        "role",
        "audio",
        "content",
        "function_call",
        "name",
        "refusal",
        "tool_calls",
    }
    return all(key in allowed_keys for key in obj.keys())


def is_chat_completion_tool_message_param(obj: Any) -> bool:
    if not isinstance(obj, dict):
        return False
    allowed_keys = {"content", "role", "tool_call_id"}
    return all(key in allowed_keys for key in obj.keys())


def is_chat_completion_message_param(obj: Any) -> bool:
    return (
        is_chat_completion_assistant_message_param(obj)
        or is_chat_completion_user_message_param(obj)
        or is_chat_completion_system_message_param(obj)
        or is_chat_completion_tool_message_param(obj)
    )


def get_final_messages_by_token_limit(
    messages: List[ChatCompletionMessageParam],
    model: str,
    encoding: tiktoken.Encoding,
    token_limit: int,
) -> List[ChatCompletionMessageParam]:
    max_context_window = CONTEXT_WINDOWS[model]
    if token_limit > max_context_window:
        raise ValueError(
            "Token limit exceeds the maximum context window for the model."
        )

    messages_copy = copy.deepcopy(messages)

    # Estimating tokens using tiktoken is slow if the messages array is large (e.g. tens of
    # thousands of tokens), so the following code has performance optimizations. If the token limit
    # is small, it's fastest to loop through the array, starting from the smallest possible array of
    # messages. Otherwise, we use binary search.
    if token_limit <= 1000:
        # Start with the smallest current_messages length
        for num_messages in range(1, len(messages_copy) + 1):
            current_messages = messages_copy[-num_messages:]
            tokens_count = estimate_tokens_for_messages(current_messages, encoding)
            if tokens_count > token_limit:
                # Return the previous set of messages that fit within the token limit
                if num_messages == 1:
                    return []
                else:
                    return messages_copy[-(num_messages - 1) :]
        # All messages fit within the token limit
        return messages_copy
    else:
        # Use binary search as before
        low = 0
        high = len(messages_copy)
        ans = len(messages_copy)

        def is_valid(start_index: int) -> bool:
            current_messages = messages_copy[start_index:]
            tokens_count = estimate_tokens_for_messages(current_messages, encoding)
            return tokens_count <= token_limit

        while low <= high:
            mid = (low + high) // 2

            if is_valid(mid):
                ans = mid
                high = mid - 1  # Try to find a smaller starting index
            else:
                low = mid + 1  # Need to remove more messages from the start

        return messages_copy[ans:]


async def search_memories(
    mem0: AsyncMemoryClient,
    messages: List[ChatCompletionMessageParam],
    user_id: str,
    model: str,
) -> Tuple[List[Dict[str, Any]], tiktoken.Encoding]:
    encoding = tiktoken.get_encoding("cl100k_base")

    # Get the number of messages to use in the search query. We use the final messages in the array.
    # If these final messages don't contain many words, we include more messages, up until 150
    # tokens, to provide more context for the search query. We always use at least 4 messages in the
    # query.
    num_messages = max(
        4,
        len(
            get_final_messages_by_token_limit(
                messages=messages, model=model, encoding=encoding, token_limit=150
            )
        ),
    )

    truncated_messages = messages[-num_messages:]
    message_content = "\n".join(msg["content"] for msg in truncated_messages[-4:])

    # Search for the most relevant memories.
    #
    # We don't filter memories that were created very recently because our fine-tuned model
    # (ARBGesfJ) can't consistently incorporate knowledge into its responses unless the knowledge
    # was mentioned in the most recent few messages. For example, if the user says, "My aunt is a
    # fan of Ottolenghi" a few dozen messages earlier, then asks for gift ideas for the aunt in the
    # current message, and if there's the max amount of context, the AI will only suggest Ottolenghi
    # gifts ~10-20% of the time, as opposed to basically every time if this knowledge is in the most
    # recent system prompt, or in the previous user message. I manually tested that this is the case
    # when there's 125k tokens of context in the chat history. The non- fine-tuned version GPT 4o
    # mini performs slightly better in this regard, but still not very good. Note: the fine-tuned
    # model can recall facts from basically anywhere in the context window; for example, if the user
    # says "My aunt's name is Susie" at the beginning of the chat history, then 125k tokens later,
    # the user asks, "What is my aunt's name?", the model will produce the right answer. This is
    # different from incorporating knowledge into the response though.
    #
    # Mem0's `search` function won't return facts that have been deleted, so we don't need to filter
    # those out manually.
    logger.info(
        "Searching mem0 for relevant memories",
        {
            "query": message_content,
            "top_k": 25,
            "rerank": True,
            "filters": {"user_id": user_id},
            "version": "v2",
        },
    )
    memories = await mem0.search(
        query=message_content,
        top_k=25,
        rerank=True,
        filters={"user_id": user_id},
        version="v2",
    )
    return memories, encoding


async def add_memories(
    messages: List[ChatCompletionMessageParam], user_id: str, model: str
):
    mem0 = AsyncMemoryClient(api_key=os.environ.get("MEM0_API_KEY"))

    encoding = tiktoken.get_encoding("cl100k_base")

    # Get the number of messages to include when creating the latest memories. We include some
    # messages immediately before the latest user and assistant message to give Mem0 more
    # conversational context, which it wouldn't get if we just submitted the latest user and
    # assistant message. We always include at least four messages total. If the messages don't
    # contain many tokens, we include more messages, up until 150 tokens.
    num_messages = max(
        4,
        len(
            get_final_messages_by_token_limit(
                messages=messages, model=model, encoding=encoding, token_limit=150
            )
        ),
    )

    custom_categories = [
        {
            "conversation_preferences": "The user's preferences for how the AI should respond."
        },
    ]
    # A string mentioning an additional rule for Mem0 to use when creating facts. These instructions
    # say that the resulting facts should mention the assistant explicitly because this is important
    # for the preferences to get categorized as a "conversation_preferences".
    includes = "The user's preferences for how the AI should respond. These facts must mention the assistant explicitly; for example, say 'User prefers the assistant to respond with emojis', not 'User prefers responses with emojis'."

    truncated_messages = messages[-num_messages:]

    logger.info(
        "Adding memory to mem0",
        {
            "messages": truncated_messages,
            "user_id": user_id,
            "includes": includes,
            "custom_categories": custom_categories,
        },
    )

    try:
        await mem0.add(
            messages=truncated_messages,
            user_id=user_id,
            includes=includes,
            custom_categories=custom_categories,
        )
    except Exception as e:
        # Log the exception this will send it to sentry, but we'll still process the response
        # We do this because mem0 isn't always the most stable...
        logger.error(e, exc_info=True)


def add_system_prompts(
    messages: List[ChatCompletionMessageParam],
    ai_first_name: str,
    user_first_name: str,
    user_gender: str,
    timezone: str,
    memories: List[Dict[str, Any]],
    preferences: List[Dict[str, Any]],
) -> List[ChatCompletionMessageParam]:
    current_time = datetime.now()

    memories_system_prompt = ""
    if memories:
        memories_with_time = []
        for fact in memories:
            memory = fact["memory"]
            if not memory:
                continue

            if fact["updated_at"]:
                time_ago_formatted = time_ago(
                    current_time, datetime.fromisoformat(fact["updated_at"]), timezone
                )
            elif fact["created_at"]:
                time_ago_formatted = time_ago(
                    current_time, datetime.fromisoformat(fact["created_at"]), timezone
                )
            else:
                time_ago_formatted = "Unknown"

            memories_with_time.append(
                f"<MEMORY>\nMemory: {memory}\nTime: {time_ago_formatted}\n</MEMORY>"
            )

        formatted_memories = "\n".join(memories_with_time)
        memories_system_prompt = f"""This system prompt contains a list of memories from your previous conversations with {user_first_name}. You must only incorporate a memory if it is relevant to the user's latest message; for example, if the user's latest message says that they're looking for a gift for their mom, and a memory mentions that their mom loves Ottolenghi, you can incorporate this memory into your response by suggesting a gift such as an Ottolenghi cookbook. Each memory is enclosed within <MEMORY> tags and includes a relative time reference (e.g., 'One week ago') indicating when the memory was created.\n{formatted_memories}"""

    preferences_str = ""
    if preferences:
        preferences_with_tags = []
        for preference in preferences:
            preference_memory = preference["memory"]
            if not preference_memory:
                continue
            preferences_with_tags.append(
                f"<PREFERENCE>\n{preference_memory}\n</PREFERENCE>"
            )

        formatted_preferences = "\n".join(preferences_with_tags)
        preferences_str = f"""\n\nBelow is a list of preferences for how {user_first_name} prefers you to respond. Each preference is enclosed within <PREFERENCE> tags.\n{formatted_preferences}"""

    # The instructions that say "Do not hallucinate content" and "Don't repeat yourself across
    # consecutive messages" may not have any effect.
    instructions_and_preferences_system_prompt = f"""You are an AI whose name is {ai_first_name}. You are talking to {user_first_name}, whose gender is {user_gender}. Match the user's energy and tone: if the user is relaxed, respond casually; if excited, mirror their enthusiasm; if they're talking about something personal, be empathetic; if they're being goofy and making jokes, do the same, etc. Always leave the user with something to respond to. Avoid asking multiple separate questions at once, since this can overwhelm the user and disrupt the natural flow of conversation. Avoid combining multiple questions into one; for example, instead of asking, 'Do you have a favorite sports team or player?', ask 'Do you have a favorite sports team?' or 'Do you have a favorite player?'. Do not ask the user a question that they answered earlier in the conversation; for example, if the user already mentioned their favorite sports team, don't ask something like, "Which sports team do you like the most?". Do not hallucinate content; for example, if the user says 'Good morning', do not hallucinate that they are asking for the current time. Don't repeat yourself across consecutive messages because this feels redundant; for example, if you say, \"Hey, how's it going?\" and the user replies \"Hey\", your response should not start with "Hey" because you already said this in the previous message. Unless you're stating an absolute fact, like "the sky is blue", you must express your responses as your own opinions using phrases like "I think", "In my opinion", "I feel like", etc; for example, instead of saying, "Dogs are the best pets", or, "people think dogs are the best pets" you should say something like, "I think dogs are the best pets"... it's not enough to say phrases like "it's understandable" or "it's fascinating" that only imply your perspective; you need to explicitly express it as your own opinion. Accordingly, if the user asks for your opinion by saying something like, "What's an interesting fact", your response must be expressed as your opinion, like "I think an interesting fact is...", and not something like, "An interesting fact is..." or "People think an interesting fact is...". Continue the conversation based on the user's latest response; for example, if the user asked you a question, answer their question.{preferences_str}"""
    message_copy = copy.deepcopy(messages)

    message_copy.append(
        {
            "role": "system",
            "content": instructions_and_preferences_system_prompt,
        }
    )

    # Include the system prompt for the long-term memories. We put this prompt a few messages before
    # the end of the array because putting it at the end of the array causes the model to
    # incorporate irrelevant memories into its response. Putting the system prompt a few messages
    # earlier solves this problem without worsening the model's ability to incorporate relevant
    # memories into its response. To see an example demonstrating how the model incorporates
    # irrelevant memories when the system prompt is at the end of the array, check out the messages
    # in the following Gist: https://gist.github.com/sam-goldman/3d2876c9e37a484bfe399968cc675072.
    # If you use the messages in the Gist as inputs to an LLM, you'll notice that the model mentions
    # Shazam tracks ~25-50% of the time, which should be closer to 0% because Shazam isn't relevant
    # to the current conversation. If you put the memories into a separate system prompt a few
    # messages earlier, you'll see the percentage drop to 0%. To see an example demonstrating how
    # putting the system prompt for memories earlier doesn't impact the model's ability to
    # incorporate relevant memories into its responses, run the messages in the following Gist as
    # inputs to an LLM: https://gist.github.com/sam-goldman/34a08da2792e57c8c21543bb48544cdd. You'll
    # notice that every response from the LLM mentions Mediterranean food or Ottolenghi, which is
    # information stored as a memory.
    if memories_system_prompt:
        memories_message = {
            "role": "system",
            "content": memories_system_prompt,
        }

        # If array is too small, insert the memories system prompt at the beginning. Otherwise,
        # insert it three elements behind the last message.
        insert_index = 0 if len(message_copy) < 4 else len(message_copy) - 3
        message_copy.insert(insert_index, memories_message)

    return message_copy


def time_ago(current_time: datetime, previous_time: datetime, time_zone: str) -> str:
    # Convert times to the specified timezone
    current_time_tz = current_time.astimezone(zoneinfo.ZoneInfo(time_zone))
    previous_time_tz = previous_time.astimezone(zoneinfo.ZoneInfo(time_zone))

    # Get the start of the current day (midnight)
    current_date = current_time_tz.replace(hour=0, minute=0, second=0, microsecond=0)

    # Calculate the difference in calendar days
    diff_days = (current_time_tz.date() - previous_time_tz.date()).days

    # Define time ranges for today in the specified timezone
    five_am_today = current_date.replace(hour=5)
    twelve_pm_today = current_date.replace(hour=12)
    five_pm_today = current_date.replace(hour=17)
    eight_pm_today = current_date.replace(hour=20)
    midnight_tonight = current_date + timedelta(days=1)

    # Define time ranges for yesterday in the specified timezone
    yesterday_date = current_date - timedelta(days=1)

    five_am_yesterday = yesterday_date.replace(hour=5)
    twelve_pm_yesterday = yesterday_date.replace(hour=12)
    five_pm_yesterday = yesterday_date.replace(hour=17)
    eight_pm_yesterday = yesterday_date.replace(hour=20)
    midnight_last_night = yesterday_date + timedelta(days=1)

    # Define last night range (8pm yesterday to 5am today)
    last_night_start = eight_pm_yesterday
    last_night_end = five_am_today

    # Check "Last night"
    if last_night_start <= previous_time_tz < last_night_end:
        return "Last night"

    # Check "Tonight"
    if eight_pm_today <= previous_time_tz < midnight_tonight:
        return "Tonight"

    # Check if previous_time is today
    if diff_days == 0:
        if five_am_today <= previous_time_tz < twelve_pm_today:
            return "This morning"
        elif twelve_pm_today <= previous_time_tz < five_pm_today:
            return "This afternoon"
        elif five_pm_today <= previous_time_tz < eight_pm_today:
            return "This evening"
        elif eight_pm_today <= previous_time_tz < midnight_tonight:
            return "Tonight"
        elif current_date <= previous_time_tz < five_am_today:
            return "Last night"
    elif diff_days == 1:
        if five_am_yesterday <= previous_time_tz < twelve_pm_yesterday:
            return "Yesterday morning"
        elif twelve_pm_yesterday <= previous_time_tz < five_pm_yesterday:
            return "Yesterday afternoon"
        elif five_pm_yesterday <= previous_time_tz < eight_pm_yesterday:
            return "Yesterday evening"
        elif eight_pm_yesterday <= previous_time_tz < midnight_last_night:
            return "Last night"
        else:
            return "Yesterday"

    # Calculate the exact time differences in milliseconds
    diff_ms = (current_time_tz - previous_time_tz).total_seconds() * 1000
    diff_days_exact = diff_ms / (1000 * 60 * 60 * 24)

    # Check days ago
    if diff_days == 2:
        return "Two days ago"
    elif 3 <= diff_days <= 6:
        return "A few days ago"
    elif 7 <= diff_days_exact < 10.5:
        return "One week ago"
    elif 10.5 <= diff_days_exact < 14:
        return "A week and a half ago"
    elif 14 <= diff_days_exact < 20:
        return "Two weeks ago"
    elif 21 <= diff_days_exact < 27:
        return "Three weeks ago"
    elif 27 <= diff_days_exact < 45:
        return "A month ago"
    elif 45 <= diff_days_exact < 60:
        return "A month and a half ago"
    else:
        # Calculate months difference more precisely
        months_difference_exact = diff_days_exact / 30.44  # Average days in a month
        months_difference = int(months_difference_exact)

        if 2 <= months_difference < 3:
            return "Two months ago"
        elif 3 <= months_difference < 4:
            return "Three months ago"
        elif 4 <= months_difference < 5:
            return "Four months ago"
        elif 5 <= months_difference < 6:
            return "Five months ago"
        elif 6 <= months_difference < 7:
            return "Six months ago"
        elif 7 <= months_difference < 8:
            return "Seven months ago"
        elif 8 <= months_difference < 9:
            return "Eight months ago"
        elif 9 <= months_difference < 10:
            return "Nine months ago"
        elif 10 <= months_difference < 11:
            return "Ten months ago"
        elif 11 <= months_difference < 12:
            return "Eleven months ago"
        else:
            years_difference_exact = diff_days_exact / 365.25  # Average days in a year
            years_difference = int(years_difference_exact)
            if years_difference == 1:
                return "A year ago"
            elif years_difference >= 2:
                return f"{years_difference} years ago"

    return ""
