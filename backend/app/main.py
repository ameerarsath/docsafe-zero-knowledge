"""
FastAPI main application for SecureVault.

This is the main entry point for the SecureVault API server.
It sets up the FastAPI application with all necessary middleware,
routes, and configurations.
"""

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from contextlib import asynccontextmanager
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

from .core.config import settings
from .core.database import get_db, create_tables
from .core.redis import redis_manager
from .api import api_router
# Import all models to ensure they are registered with Base.metadata
from . import models
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
        print("[OK] Redis connected successfully")
    except Exception as e:
        print(f"[ERROR] Redis connection failed: {e}")
    
    print("[SUCCESS] SecureVault API started successfully")
    
    yield
    
    # Shutdown
    print("Shutting down SecureVault API...")
    
    # Disconnect from Redis
    try:
        await redis_manager.disconnect()
        print("[OK] Redis disconnected")
    except Exception as e:
        print(f"[ERROR] Redis disconnection error: {e}")
    
    print("[INFO] SecureVault API shutdown complete")


# Create FastAPI application with lifespan
app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise-grade secure document storage for small teams",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Debug CORS configuration
print(f"[CORS] Configuring CORS with origins: {settings.CORS_ORIGINS}")
print(f"[CORS] CORS configuration: allow_credentials=True, methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']")

# CORS middleware (must be added BEFORE security middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Security middleware (order matters - add after CORS)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(SecurityAuditMiddleware)
app.add_middleware(SecurityMonitoringMiddleware)

# Custom exception handlers that preserve CORS headers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions while preserving CORS headers."""
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    
    # Add CORS headers manually for error responses
    origin = request.headers.get("origin")
    if origin in settings.CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "*"
    
    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors while preserving CORS headers."""
    response = JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )
    
    # Add CORS headers manually for error responses
    origin = request.headers.get("origin")
    if origin in settings.CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "*"
    
    return response

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions while preserving CORS headers."""
    response = JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
    
    # Add CORS headers manually for error responses
    origin = request.headers.get("origin")
    if origin in settings.CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "*"
    
    return response

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

@app.get("/cors-test")
async def cors_test(request: Request):
    """CORS test endpoint to verify CORS configuration."""
    return {
        "message": "CORS test successful",
        "origin": request.headers.get("origin"),
        "cors_origins": settings.CORS_ORIGINS,
        "timestamp": datetime.utcnow().isoformat(),
        "headers": dict(request.headers)
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
    uvicorn.run(
        app, 
        host=getattr(settings, 'HOST', '0.0.0.0'), 
        port=getattr(settings, 'PORT', 8000),
        reload=getattr(settings, 'RELOAD', settings.DEBUG),
        access_log=getattr(settings, 'ACCESS_LOG', True),
        log_level=settings.LOG_LEVEL.lower()
    )