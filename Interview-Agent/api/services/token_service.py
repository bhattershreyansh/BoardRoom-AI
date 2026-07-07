import jwt
import time
import uuid
from typing import Dict, Optional

from core.config.settings import settings
from core.utils.logger import get_logger

logger = get_logger(__name__)


class TokenService:
    """LiveKit access token generation for interview rooms."""

    def __init__(self):
        self.api_key = settings.livekit_api_key
        self.api_secret = settings.livekit_api_secret
        self.livekit_url = settings.livekit_url

        if not all([self.api_key, self.api_secret, self.livekit_url]):
            raise ValueError("LiveKit configuration incomplete")

    def generate_user_token(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: str,
        role: str = "participant",
        ttl: int = 3600,
    ) -> str:
        try:
            now = int(time.time())
            exp = now + ttl
            permissions = self._get_permissions_for_role(role)

            payload = {
                "iss": self.api_key,
                "nbf": now,
                "exp": exp,
                "jti": f"{participant_identity}_{uuid.uuid4().hex[:8]}",
                "video": {
                    "room": room_name,
                    "roomJoin": True,
                    "identity": participant_identity,
                    "name": participant_name,
                    **permissions,
                },
            }

            token = jwt.encode(payload, self.api_secret, algorithm="HS256")

            logger.info(
                "Token generated successfully",
                room_name=room_name,
                participant_identity=participant_identity,
                role=role,
                expires_in=ttl,
            )
            return token

        except Exception as e:
            logger.error(
                "Token generation failed",
                room_name=room_name,
                participant_identity=participant_identity,
                error=str(e),
            )
            raise

    def _get_permissions_for_role(self, role: str) -> Dict:
        if role == "host":
            return {
                "canPublish": True,
                "canSubscribe": True,
                "canPublishData": True,
                "canUpdateMetadata": True,
            }
        if role == "participant":
            return {
                "canPublish": True,
                "canSubscribe": True,
                "canPublishData": True,
                "canUpdateMetadata": False,
            }
        return {
            "canPublish": False,
            "canSubscribe": True,
            "canPublishData": False,
            "canUpdateMetadata": False,
        }

    def validate_token(self, token: str) -> Optional[Dict]:
        try:
            return jwt.decode(
                token,
                self.api_secret,
                algorithms=["HS256"],
                options={"verify_signature": True},
            )
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
