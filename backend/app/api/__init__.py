"""API package for SecureVault."""

from fastapi import APIRouter
from .auth import router as auth_router
from .v1.mfa import router as mfa_router
from .v1.rbac import router as rbac_router
from .v1.documents import router as documents_router
from .v1.encryption import router as encryption_router
from .v1.admin import router as admin_router
from .v1.security import router as security_router
from .v1.security_headers import router as security_headers_router, public_router as security_headers_public_router
from .v1.templates import router as templates_router
from .v1.document_preview import router as document_preview_router
from .v1.cors_debug import router as cors_debug_router
from .v1.monitoring import router as monitoring_router
from .v1.key_management import router as key_management_router
from .v1.shares import router as shares_router
from .v1.external_shares import router as external_shares_router
print("Shares router imported successfully with", len(shares_router.routes), "routes")

# Create main API router
api_router = APIRouter()

# FIXED: Add CORS debug router first
api_router.include_router(cors_debug_router, prefix="/v1", tags=["debug"])

# Include sub-routers
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(mfa_router, prefix="/v1", tags=["mfa"])
api_router.include_router(rbac_router, prefix="/v1", tags=["rbac"])
api_router.include_router(documents_router, prefix="/v1", tags=["documents"])
api_router.include_router(encryption_router, prefix="/v1", tags=["encryption"])
api_router.include_router(admin_router, prefix="/v1", tags=["admin"])
api_router.include_router(security_router, prefix="/v1", tags=["security"])
api_router.include_router(security_headers_router, prefix="/v1", tags=["security-headers"])
api_router.include_router(security_headers_public_router, tags=["public-security-headers"])  # No prefix for public endpoints
api_router.include_router(templates_router, prefix="/v1/templates", tags=["templates"])
api_router.include_router(document_preview_router, prefix="/v1", tags=["document-preview"])
api_router.include_router(monitoring_router, prefix="/v1", tags=["monitoring"])
api_router.include_router(key_management_router, prefix="/v1", tags=["key-management"])
api_router.include_router(shares_router, prefix="/v1/shares", tags=["shares"])
api_router.include_router(external_shares_router, prefix="/share", tags=["external-shares"])
print("Shares router added to main API router")

__all__ = ["api_router"]