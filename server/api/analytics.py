import os

import segment.analytics as analytics
from prisma import enums

analytics.write_key = os.getenv("EXPO_PUBLIC_SEGMENT_WRITE_KEY")

def track_sent_message(
    user_id: str,
    chat_id: str,
    chat_type: str
):
    if os.getenv("EXPO_PUBLIC_SEGMENT_WRITE_KEY") is None:
        return

    analytics.track(
        user_id=user_id,
        event="Chat Message Sent",
        properties={
            "chat_id": chat_id,
            "chat_type": chat_type
        },
    )
