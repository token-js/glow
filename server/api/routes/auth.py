import os
import jwt
from livekit import api
from fastapi import APIRouter, Depends, HTTPException, status, FastAPI
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from prisma import Prisma
from datetime import datetime
from ..supabase import fetch_user_profile

router = APIRouter()


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


class Request(BaseModel):
    timezone: str


@router.post("/api/generateToken")
async def fetchToken(request: Request, user=Depends(authorize_user)):
    user_id = user["sub"]
    timezone = request.timezone

    user = fetch_user_profile(user_id=user_id)
    user_voice = user["settings"]["voice"]
    user_name = user["settings"]["name"]
    agent_name = user["settings"]["name"]
    gender = user["settings"]["gender"]

    token = (
        api.AccessToken(os.getenv("LIVEKIT_API_KEY"), os.getenv("LIVEKIT_API_SECRET"))
        .with_identity(user_id)
        .with_name(user_id)
        .with_attributes(
            {
                "voice": user_voice,
                "name": user_name,
                "agent_name": agent_name,
                "timezone": timezone,
                "user_gender": gender,
            }
        )
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=f"{user_id}-{datetime.now().timestamp()}",
            )
        )
    )
    return token.to_jwt()
