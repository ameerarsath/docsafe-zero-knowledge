#!/usr/bin/env python3
"""
DocSafe Backend Health Check Script

This script checks if all required services are running and accessible.
"""

import asyncio
import psycopg2
import redis
import sys
from urllib.parse import urlparse

def check_postgresql(database_url: str) -> bool:
    """Check if PostgreSQL is accessible."""
    try:
        # Parse the database URL
        parsed = urlparse(database_url)
        
        # Extract connection parameters
        conn_params = {
            'host': parsed.hostname or 'localhost',
            'port': parsed.port or 5432,
            'user': parsed.username,
            'password': parsed.password,
            'database': parsed.path.lstrip('/') if parsed.path else 'postgres'
        }
        
        print(f"Checking PostgreSQL at {conn_params['host']}:{conn_params['port']}")
        
        # Test connection
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        cursor.close()
        conn.close()
        
        print(f"SUCCESS: PostgreSQL connected: {version[0]}")
        return True
        
    except Exception as e:
        print(f"ERROR: PostgreSQL connection failed: {e}")
        return False

def check_redis(redis_url: str) -> bool:
    """Check if Redis is accessible."""
    try:
        # Parse Redis URL
        parsed = urlparse(redis_url)
        
        # Extract connection parameters
        host = parsed.hostname or 'localhost'
        port = parsed.port or 6379
        password = parsed.password
        db = int(parsed.path.lstrip('/')) if parsed.path and parsed.path != '/' else 0
        
        print(f"Checking Redis at {host}:{port}")
        
        # Test connection
        r = redis.Redis(host=host, port=port, password=password, db=db, decode_responses=True)
        r.ping()
        info = r.info()
        
        print(f"SUCCESS: Redis connected: {info.get('redis_version', 'Unknown version')}")
        return True
        
    except Exception as e:
        print(f"ERROR: Redis connection failed: {e}")
        return False

def main():
    """Main health check function."""
    print("DocSafe Backend Health Check")
    print("=" * 40)
    
    # Load environment variables
    try:
        from app.core.config import settings
    except ImportError:
        print("ERROR: Cannot import settings. Make sure you're in the backend directory.")
        sys.exit(1)
    
    all_healthy = True
    
    # Check PostgreSQL
    if not check_postgresql(settings.DATABASE_URL):
        all_healthy = False
        print("To start PostgreSQL:")
        print("   - Docker: docker run -d -p 5430:5432 --name postgres -e POSTGRES_PASSWORD=securevault_password postgres")
        print("   - Or check your existing PostgreSQL installation")
    
    # Check Redis
    if not check_redis(settings.REDIS_URL):
        all_healthy = False
        print("To start Redis:")
        print("   - Docker: docker run -d -p 6380:6379 --name redis redis:alpine")
        print("   - Or check your existing Redis installation")
    
    print("=" * 40)
    if all_healthy:
        print("SUCCESS: All services are healthy! Ready to start the backend server.")
        print("Run: python run_server.py")
    else:
        print("ERROR: Some services are not available. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
