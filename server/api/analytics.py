import os

import segment.client as analytics
from prisma import enums

analytics.write_key = os.getenv("NEXT_PUBLIC_SEGMENT_WRITE_KEY")

def track_sent_message(
    user_id: str,
    chat_id: str,
    is_intake_session: bool,
):
    if os.getenv("NEXT_PUBLIC_SEGMENT_WRITE_KEY") is None:
        return

    analytics.track(
        user_id=user_id,
        event="Chat Message Sent",
        properties={
            "chat_id": chat_id,
            "kind": "intake" if is_intake_session else "regular",
        },
    )
