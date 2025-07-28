"""
FastAPI main application for SecureVault.

This is the main entry point for the SecureVault API server.
It sets up the FastAPI application with all necessary middleware,
routes, and configurations.
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

from .core.config import settings
from .core.database import get_db, create_tables
from .core.redis import redis_manager
from .api import api_router
from .middleware.security_headers_middleware import (
    SecurityHeadersMiddleware, 
    SecurityAuditMiddleware
)
from .middleware.security_middleware import SecurityMonitoringMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown events for the application,
    including database and Redis connections.
    """
    # Startup
    print("Starting SecureVault API...")
    
    # Create database tables
    create_tables()
    
    # Connect to Redis
    try:
        await redis_manager.connect()
        print("✅ Redis connected successfully")
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
    
    print("🚀 SecureVault API started successfully")
    
    yield
    
    # Shutdown
    print("Shutting down SecureVault API...")
    
    # Disconnect from Redis
    try:
        await redis_manager.disconnect()
        print("✅ Redis disconnected")
    except Exception as e:
        print(f"❌ Redis disconnection error: {e}")
    
    print("👋 SecureVault API shutdown complete")


# Create FastAPI application with lifespan
app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise-grade secure document storage for small teams",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Security middleware (order matters - add before CORS)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(SecurityAuditMiddleware)
app.add_middleware(SecurityMonitoringMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint providing API information."""
    return {
        "message": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for container monitoring."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "securevault-api",
        "version": settings.VERSION
    }


@app.get("/health/db")
async def database_health(db: Session = Depends(get_db)):
    """Database health check endpoint."""
    try:
        # Test database connection
        result = db.execute(text("SELECT 1")).fetchone()
        if result:
            return {
                "status": "healthy",
                "database": "postgresql",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            return {
                "status": "unhealthy",
                "database": "postgresql",
                "error": "Query returned no result",
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "postgresql",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@app.get("/health/redis")
async def redis_health():
    """Redis health check endpoint."""
    try:
        # Test Redis connection
        if redis_manager.redis_client:
            await redis_manager.redis_client.ping()
            return {
                "status": "healthy",
                "redis": "connected",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            return {
                "status": "unhealthy",
                "redis": "not connected",
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "redis": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)