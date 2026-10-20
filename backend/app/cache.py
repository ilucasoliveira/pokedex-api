import os
import asyncio
from typing import cast

import redis.asyncio as redis
from dotenv import load_dotenv
from redis import RedisError

load_dotenv()

CACHE_ERRORS = (RedisError, OSError, TimeoutError)


def create_redis_client() -> redis.Redis:
    # Em produção o serviço de hospedagem entrega uma URL única (REDIS_URL).
    # Localmente e no docker-compose usamos host e porta separados.
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        return redis.Redis.from_url(
            redis_url,
            decode_responses=True,
            socket_timeout=2,
            socket_connect_timeout=2,
        )

    return redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        db=0,
        decode_responses=True,
        socket_timeout=2,
        socket_connect_timeout=2,
    )


redis_client = create_redis_client()


async def get_cache(key: str) -> str | None:
    try:
        value = await asyncio.wait_for(redis_client.get(key), timeout=1)
        return cast(str | None, value)
    except CACHE_ERRORS:
        return None


async def set_cache(key: str, value: str, ttl: int = 3600) -> None:
    try:
        await asyncio.wait_for(redis_client.set(key, value, ex=ttl), timeout=1)
    except CACHE_ERRORS:
        pass


async def delete_cache(key: str) -> None:
    try:
        await asyncio.wait_for(redis_client.delete(key), timeout=1)
    except CACHE_ERRORS:
        pass


async def delete_cache_by_pattern(pattern: str) -> None:
    try:
        keys_to_delete: list[str] = []
        async for key in redis_client.scan_iter(match=pattern):
            keys_to_delete.append(key)
        if keys_to_delete:
            await asyncio.wait_for(redis_client.delete(*keys_to_delete), timeout=1)
    except CACHE_ERRORS:
        pass
