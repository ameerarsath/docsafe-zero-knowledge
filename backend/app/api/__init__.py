"""API package for SecureVault."""

from fastapi import APIRouter
from .auth import router as auth_router
from .v1.mfa import router as mfa_router
from .v1.rbac import router as rbac_router
from .v1.documents import router as documents_router
from .v1.encryption import router as encryption_router
from .v1.admin import router as admin_router
from .v1.security import router as security_router
from .v1.security_headers import router as security_headers_router
from .v1.templates import router as templates_router
from .v1.document_preview import router as document_preview_router

# Create main API router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(mfa_router, prefix="/v1", tags=["mfa"])
api_router.include_router(rbac_router, prefix="/v1", tags=["rbac"])
api_router.include_router(documents_router, prefix="/v1", tags=["documents"])
api_router.include_router(encryption_router, prefix="/v1", tags=["encryption"])
api_router.include_router(admin_router, prefix="/v1", tags=["admin"])
api_router.include_router(security_router, prefix="/v1", tags=["security"])
api_router.include_router(security_headers_router, prefix="/v1", tags=["security-headers"])
api_router.include_router(templates_router, prefix="/v1/templates", tags=["templates"])
api_router.include_router(document_preview_router, prefix="/v1", tags=["document-preview"])

__all__ = ["api_router"]