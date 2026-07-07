import time
import redis.asyncio as redis
from fastapi import Request
from typing import Optional

from core.config.settings import settings
from core.utils.logger import get_logger

logger = get_logger(__name__)


class RateLimitMiddleware:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.rate_limit_per_minute = settings.rate_limit_per_minute
        self.rate_limit_per_hour = settings.rate_limit_per_hour

    async def check_rate_limit(self, request: Request, user_id: Optional[str] = None) -> bool:
        identifier = user_id or request.client.host

        minute_key = f"rate_limit:minute:{identifier}:{int(time.time() // 60)}"
        minute_count = await self.redis.incr(minute_key)
        await self.redis.expire(minute_key, 60)

        if minute_count > self.rate_limit_per_minute:
            logger.warning(
                "Rate limit exceeded (per minute)",
                identifier=identifier,
                count=minute_count,
            )
            return False

        hour_key = f"rate_limit:hour:{identifier}:{int(time.time() // 3600)}"
        hour_count = await self.redis.incr(hour_key)
        await self.redis.expire(hour_key, 3600)

        if hour_count > self.rate_limit_per_hour:
            logger.warning(
                "Rate limit exceeded (per hour)",
                identifier=identifier,
                count=hour_count,
            )
            return False

        return True
