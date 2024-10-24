import os
import jwt
from livekit import api
from fastapi import APIRouter, Depends, HTTPException, status, FastAPI
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse

router = APIRouter()

# Verifies the user JWT token in the authorization header
def authorize_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    secret_key = os.environ.get("SUPABASE_JWT_SECRET")
    algo = "HS256"

    print(credentials.credentials)
    print(secret_key)

    try:
      payload = jwt.decode(
          credentials.credentials,
          secret_key,
          algorithms=[algo],
          audience="authenticated",
      )
      return payload
    except:
        print('forbidden')
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid token",
        )

@router.get("/api/generateToken")
async def fetchToken(user=Depends(authorize_user)):
  user_id = user["sub"]
  token = api.AccessToken(os.getenv('LIVEKIT_API_KEY'), os.getenv('LIVEKIT_API_SECRET')) \
    .with_identity(user_id) \
    .with_name(user_id) \
    .with_grants(api.VideoGrants(
        room_join=True,
        room=user_id,
    ))
  return token.to_jwt()


@router.get("/api/health")
async def handle_chat_data():
    return JSONResponse(status_code=200, content={"message": "Alive"})

app = FastAPI()
app.include_router(router)