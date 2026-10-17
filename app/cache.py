import os
import asyncio
import redis.asyncio as redis

from redis import RedisError
from dotenv import load_dotenv

load_dotenv()

HOST = os.getenv("REDIS_HOST", "localhost")
PORT = int(os.getenv("REDIS_PORT", 6379))

redis_client = redis.Redis(
    host=HOST,
    port=PORT,
    db=0,
    decode_responses=True,
    socket_timeout=2,
    socket_connect_timeout=2,
)


async def get_cache(key: str) -> str | None:
    try:
        return await asyncio.wait_for(redis_client.get(key), timeout=1)
    except RedisError, OSError, TimeoutError:
        return None


async def set_cache(key: str, value: str, ttl: int = 3600) -> None:
    try:
        await asyncio.wait_for(redis_client.set(key, value, ex=ttl), timeout=1)
    except RedisError, OSError, TimeoutError:
        pass


async def delete_cache(key: str) -> None:
    try:
        await asyncio.wait_for(redis_client.delete(key), timeout=1)
    except RedisError, OSError, TimeoutError:
        pass


async def delete_cache_by_pattern(pattern: str) -> None:
    try:
        keys_to_delete = []
        async for key in redis_client.scan_iter(match=pattern):
            keys_to_delete.append(key)
        if keys_to_delete:
            await redis_client.delete(*keys_to_delete)
    except RedisError, OSError, TimeoutError:
        pass
