#!/usr/bin/env python3
"""
DocSafe Backend Startup Script

This script starts the DocSafe backend server with proper configuration
and error handling for development environments.
"""

import os
import sys
import asyncio
import uvicorn
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Import the FastAPI app and settings
try:
    from app.main import app
    from app.core.config import settings
    from app.core.database import engine, create_tables
    from app.core.redis import redis_manager
except ImportError as e:
    print(f"ERROR: Import Error: {e}")
    print("Make sure you're running this from the backend directory")
    sys.exit(1)

def check_environment():
    """Check if all required environment variables and services are configured."""
    print("[CHECK] Checking environment configuration...")
    
    # Check database URL
    if not settings.DATABASE_URL:
        print("[ERROR] DATABASE_URL is not configured")
        return False
    print(f"[OK] Database URL: {settings.DATABASE_URL}")
    
    # Check Redis URL
    if not settings.REDIS_URL:
        print("[ERROR] REDIS_URL is not configured")
        return False
    print(f"[OK] Redis URL: {settings.REDIS_URL}")
    
    # Check CORS origins
    print(f"[OK] CORS Origins: {settings.CORS_ORIGINS}")
    
    # Check host and port
    host = getattr(settings, 'HOST', '0.0.0.0')
    port = getattr(settings, 'PORT', 8002)
    print(f"[OK] Server will run on: http://{host}:{port}")
    
    return True

def test_database_connection():
    """Test database connection."""
    print("[CHECK] Testing database connection...")
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            if result.fetchone():
                print("[OK] Database connection successful")
                return True
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        return False

async def test_redis_connection():
    """Test Redis connection."""
    print("[CHECK] Testing Redis connection...")
    try:
        await redis_manager.connect()
        if redis_manager.redis_client:
            await redis_manager.redis_client.ping()
            print("[OK] Redis connection successful")
            await redis_manager.disconnect()
            return True
    except Exception as e:
        print(f"[ERROR] Redis connection failed: {e}")
        return False

def main():
    """Main startup function."""
    print("[SERVER] Starting DocSafe Backend Server...")
    print("=" * 50)
    
    # Check environment
    if not check_environment():
        print("[ERROR] Environment check failed")
        sys.exit(1)
    
    # Test database connection
    if not test_database_connection():
        print("[ERROR] Database connection test failed")
        print("Please check your PostgreSQL server and DATABASE_URL")
        sys.exit(1)
    
    # Test Redis connection
    if not asyncio.run(test_redis_connection()):
        print("[ERROR] Redis connection test failed")
        print("Please check your Redis server and REDIS_URL")
        sys.exit(1)
    
    # Create database tables
    print("[CHECK] Creating database tables...")
    try:
        create_tables()
        print("[OK] Database tables created/verified")
    except Exception as e:
        print(f"[ERROR] Failed to create database tables: {e}")
        sys.exit(1)
    
    # Start the server
    print("=" * 50)
    print("[SERVER] All checks passed! Starting server...")
    print(f"[INFO] Server URL: http://localhost:{getattr(settings, 'PORT', 8002)}")
    print(f"[INFO] API Docs: http://localhost:{getattr(settings, 'PORT', 8002)}/docs")
    print("=" * 50)
    
    # Configure uvicorn settings
    uvicorn_config = {
        "app": "app.main:app",
        "host": getattr(settings, 'HOST', '0.0.0.0'),
        "port": getattr(settings, 'PORT', 8002),
        "reload": getattr(settings, 'RELOAD', settings.DEBUG),
        "access_log": getattr(settings, 'ACCESS_LOG', True),
        "log_level": settings.LOG_LEVEL.lower(),
        "workers": 1  # Use single worker for development
    }
    
    try:
        uvicorn.run(**uvicorn_config)
    except KeyboardInterrupt:
        print("\n[STOP] Server stopped by user")
    except Exception as e:
        print(f"\n[ERROR] Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
