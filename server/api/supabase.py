import os
import cuid
from datetime import datetime
from supabase import create_client, Client

url: str = os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SECRET_KEY")
supabase: Client = create_client(url, key)


def fetch_user_profile(user_id: str):
    user_profile = (
        supabase.table("user_profiles")
        .select("*, settings(*)")
        .eq("id", user_id)
        .execute()
    ).data

    if len(user_profile) == 0:
        raise Exception(f"Failed to find user profile for user: {user_id}")

    return user_profile[0]


def fetch_settings(user_id: str):
    return supabase.table("settings").select("*").eq("id", user_id).execute()
