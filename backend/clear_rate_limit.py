#!/usr/bin/env python3
"""Clear rate limiting for login"""

from app.core.redis import get_redis_client
import asyncio

async def clear_rate_limits():
    redis = get_redis_client()
    
    # Clear rate limiting for both usernames
    keys_to_delete = [
        "login:admin",
        "login:rahumana"
    ]
    
    for key in keys_to_delete:
        deleted = await redis.delete(key)
        print(f"Deleted key {key}: {deleted}")
    
    print("Rate limits cleared")
    await redis.close()

if __name__ == "__main__":
    asyncio.run(clear_rate_limits())