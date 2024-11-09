import os
import jwt
from livekit import api
from fastapi import APIRouter, Depends, HTTPException, status, FastAPI
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from prisma import Prisma
from datetime import datetime

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

CharlotteVoice = 'XB0fDUnXU5powFXDhCwa'
JessicaVoice = 'XB0fDUnXU5powFXDhCwa'
MatildaVoice = 'XB0fDUnXU5powFXDhCwa'
BrianVoice = 'XB0fDUnXU5powFXDhCwa'
GeorgeVoice = 'XB0fDUnXU5powFXDhCwa'
CharlieVoice = 'XB0fDUnXU5powFXDhCwa'
VoiceIdMapping = {
  'voice_1': CharlotteVoice, # fill in elevenlabs voice id
  'voice_2': BrianVoice, # fill in elevenlabs voice id
  'voice_3': JessicaVoice, # fill in elevenlabs voice id
  'voice_4': GeorgeVoice, # fill in elevenlabs voice id
  'voice_5': MatildaVoice, # fill in elevenlabs voice id
  'voice_6': CharlieVoice, # fill in elevenlabs voice id
}

@router.get("/api/generateToken")
async def fetchToken(user=Depends(authorize_user)):
  user_id = user["sub"]

  prisma = Prisma()
  await prisma.connect()

  async with prisma.tx():
    user = await prisma.supabaseuserprofiles.find_unique(
      where={
        "id": user_id
      },
      include={
        'settings': True
      }
    )
    user_voice = user.settings.voice
    voice_id = VoiceIdMapping[user_voice]
      
  await prisma.disconnect()


  token = api.AccessToken(os.getenv('LIVEKIT_API_KEY'), os.getenv('LIVEKIT_API_SECRET')) \
    .with_identity(user_id) \
    .with_name(user_id) \
    .with_attributes({
      "voice_id": voice_id,
      "name": user.settings.name,
      "agent_name": user.settings.agentName
    }) \
    .with_grants(api.VideoGrants(
        room_join=True,
        room=f"{user_id}-{datetime.now().timestamp()}",
    ))
  return token.to_jwt()