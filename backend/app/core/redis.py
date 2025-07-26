"""
Redis client and session management for SecureVault.

This module provides Redis connectivity and session management functionality
for user authentication and caching.
"""

import json
import redis.asyncio as redis
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pydantic import BaseModel

from .config import settings
from ..schemas.auth import SessionData


class RedisManager:
    """Redis connection and session management."""
    
    def __init__(self):
        """Initialize Redis manager."""
        self.redis_client: Optional[redis.Redis] = None
    
    async def connect(self) -> None:
        """Establish Redis connection."""
        self.redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_keepalive=True,
            socket_keepalive_options={},
            health_check_interval=30,
        )
        
        # Test connection
        await self.redis_client.ping()
    
    async def disconnect(self) -> None:
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
    
    async def set_session(
        self, 
        username: str, 
        session_data: SessionData, 
        expire_seconds: int = 86400  # 24 hours
    ) -> None:
        """
        Store user session data in Redis.
        
        Args:
            username: Username for session key
            session_data: Session data to store
            expire_seconds: Session expiration time in seconds
        """
        if not self.redis_client:
            raise RuntimeError("Redis client not connected")
        
        session_key = f"session:{username}"
        session_json = session_data.json()
        
        await self.redis_client.setex(
            session_key, 
            expire_seconds, 
            session_json
        )
    
    async def get_session(self, username: str) -> Optional[SessionData]:
        """
        Retrieve user session data from Redis.
        
        Args:
            username: Username for session key
            
        Returns:
            Session data if exists, None otherwise
        """
        if not self.redis_client:
            raise RuntimeError("Redis client not connected")
        
        session_key = f"session:{username}"
        session_json = await self.redis_client.get(session_key)
        
        if session_json:
            try:
                session_dict = json.loads(session_json)
                return SessionData(**session_dict)
            except (json.JSONDecodeError, ValueError):
                # Invalid session data, remove it
                await self.delete_session(username)
        
        return None
    
    async def delete_session(self, username: str) -> None:
        """
        Delete user session from Redis.
        
        Args:
            username: Username for session key
        """
        if not self.redis_client:
            raise RuntimeError("Redis client not connected")
        
        session_key = f"session:{username}"
        await self.redis_client.delete(session_key)
    
    async def update_session_activity(self, username: str) -> None:
        """
        Update last activity time for user session.
        
        Args:
            username: Username for session key
        """
        session_data = await self.get_session(username)
        if session_data:
            session_data.last_activity = datetime.utcnow()
            await self.set_session(username, session_data)
    
    async def set_rate_limit(
        self, 
        key: str, 
        limit: int, 
        window_seconds: int
    ) -> int:
        """
        Implement rate limiting using Redis.
        
        Args:
            key: Rate limit key (e.g., "login:username" or "login:ip")
            limit: Maximum attempts allowed
            window_seconds: Time window in seconds
            
        Returns:
            Current attempt count
        """
        if not self.redis_client:
            raise RuntimeError("Redis client not connected")
        
        # Use sliding window rate limiting
        current_time = datetime.utcnow().timestamp()
        pipeline = self.redis_client.pipeline()
        
        # Remove old entries outside the window
        pipeline.zremrangebyscore(
            key, 
            0, 
            current_time - window_seconds
        )
        
        # Count current attempts
        pipeline.zcard(key)
        
        # Add current attempt
        pipeline.zadd(key, {str(current_time): current_time})
        
        # Set expiration for cleanup
        pipeline.expire(key, window_seconds)
        
        results = await pipeline.execute()
        current_count = results[1]  # Result from zcard
        
        return current_count
    
    async def is_rate_limited(
        self, 
        key: str, 
        limit: int, 
        window_seconds: int
    ) -> bool:
        """
        Check if key is rate limited.
        
        Args:
            key: Rate limit key
            limit: Maximum attempts allowed
            window_seconds: Time window in seconds
            
        Returns:
            True if rate limited, False otherwise
        """
        current_count = await self.set_rate_limit(key, limit, window_seconds)
        return current_count >= limit
    
    async def store_temp_token(
        self, 
        token: str, 
        data: Dict[str, Any], 
        expire_seconds: int = 300  # 5 minutes
    ) -> None:
        """
        Store temporary token data (for MFA flow).
        
        Args:
            token: Temporary token
            data: Data to associate with token
            expire_seconds: Token expiration time
        """
        if not self.redis_client:
            raise RuntimeError("Redis client not connected")
        
        key = f"temp_token:{token}"
        await self.redis_client.setex(
            key, 
            expire_seconds, 
            json.dumps(data, default=str)
        )
    
    async def get_temp_token_data(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve temporary token data.
        
        Args:
            token: Temporary token
            
        Returns:
            Token data if exists, None otherwise
        """
        if not self.redis_client:
            raise RuntimeError("Redis client not connected")
        
        key = f"temp_token:{token}"
        data_json = await self.redis_client.get(key)
        
        if data_json:
            try:
                return json.loads(data_json)
            except json.JSONDecodeError:
                await self.redis_client.delete(key)
        
        return None
    
    async def delete_temp_token(self, token: str) -> None:
        """
        Delete temporary token.
        
        Args:
            token: Temporary token to delete
        """
        if not self.redis_client:
            raise RuntimeError("Redis client not connected")
        
        key = f"temp_token:{token}"
        await self.redis_client.delete(key)
    
    async def cache_set(
        self, 
        key: str, 
        value: Any, 
        expire_seconds: int = 3600
    ) -> None:
        """
        Set cache value.
        
        Args:
            key: Cache key
            value: Value to cache
            expire_seconds: Expiration time
        """
        if not self.redis_client:
            raise RuntimeError("Redis client not connected")
        
        if isinstance(value, (dict, list)):
            value = json.dumps(value, default=str)
        
        await self.redis_client.setex(key, expire_seconds, value)
    
    async def cache_get(self, key: str) -> Optional[Any]:
        """
        Get cache value.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value if exists, None otherwise
        """
        if not self.redis_client:
            raise RuntimeError("Redis client not connected")
        
        value = await self.redis_client.get(key)
        
        if value:
            try:
                # Try to parse as JSON
                return json.loads(value)
            except json.JSONDecodeError:
                # Return as string
                return value
        
        return None
    
    async def cache_delete(self, key: str) -> None:
        """
        Delete cache key.
        
        Args:
            key: Cache key to delete
        """
        if not self.redis_client:
            raise RuntimeError("Redis client not connected")
        
        await self.redis_client.delete(key)


# Global Redis manager instance
redis_manager = RedisManager()


async def get_redis() -> RedisManager:
    """Dependency to get Redis manager."""
    return redis_manager