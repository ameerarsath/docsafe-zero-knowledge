"""
CORS Debug Endpoint - Temporary fix for CORS issues
"""

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/debug", tags=["Debug"])

@router.options("/{path:path}")
async def handle_options(request: Request, path: str):
    """Handle all OPTIONS requests for CORS preflight."""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token",
            "Access-Control-Max-Age": "600"
        }
    )

@router.get("/cors-test")
async def cors_test(request: Request):
    """Test CORS configuration."""
    return JSONResponse(
        content={
            "message": "CORS test successful",
            "origin": request.headers.get("origin"),
            "method": request.method,
            "headers": dict(request.headers)
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
        }
    )