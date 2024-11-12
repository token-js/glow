# Standard library imports
import os
from typing import List, Optional
import jwt

from openai.types.chat import ChatCompletionMessageParam
import tiktoken
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from openai.types.completion_usage import CompletionUsage

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
def num_tokens_from_messages(messages: List[ChatCompletionMessageParam], model: str):
    """Return the number of tokens used by a list of messages."""
    encoding = tiktoken.encoding_for_model(model)
    tokens_per_message = 3
    tokens_per_name = 1
    num_tokens = 0
    for message in messages:
        num_tokens += tokens_per_message
        for key, value in message.items():
            num_tokens += len(encoding.encode(value))
            if key == "name":
                num_tokens += tokens_per_name
    num_tokens += 3  # every reply is primed with <|start|>assistant<|message|>
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
