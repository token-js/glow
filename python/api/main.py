import os
import sentry_sdk
import logging
from fastapi import FastAPI
from python.api.routes import (
    chat,
    auth
)

from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=os.getenv("NEXT_PUBLIC_SENTRY_ENVIRONMENT"),
    # Sample rate for transactions (performance).
    traces_sample_rate=1.0,
    # Sample rate for exceptions / crashes.
    sample_rate=1.0,
    max_request_body_size="always",
    integrations=[
        AsyncioIntegration(),
        LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
    ],
)

app = FastAPI()

# Route for the chat service
app.include_router(chat.router)
app.include_router(auth.router)