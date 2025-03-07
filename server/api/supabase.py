import os
from typing import Union
import cuid
from datetime import datetime
from supabase import create_client, Client

supabase: Union[Client, None] = None


def fetch_supabase():
    global supabase

    if supabase is None:
        url: str = os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
        key: str = os.environ.get("SUPABASE_SECRET_KEY")
        supabase = create_client(url, key)

    return supabase


def fetch_user_profile(user_id: str):
    fetch_supabase()

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
    fetch_supabase()

    return supabase.table("settings").select("*").eq("id", user_id).execute()
