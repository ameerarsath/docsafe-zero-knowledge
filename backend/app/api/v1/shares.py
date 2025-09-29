"""
Document sharing API endpoints for SecureVault.

This module provides REST API endpoints for:
- Creating and managing document shares
- Accessing shared documents with decryption
- Share link validation and access control
- Share statistics and monitoring
"""

import os
import secrets
import hashlib
import base64
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel

# Import cryptography for decryption
try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.backends import default_backend
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    print("WARNING: cryptography library not available - decryption will not work")
from fastapi import (
    APIRouter, Depends, HTTPException, status, Query, Request,
    Response, BackgroundTasks
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func

from ...core.database import get_db
from ...core.security import get_current_user, get_current_user_optional
from ...core.rbac import has_permission
from ...core.config import settings
from ...models.user import User
from ...models.document import (
    Document, DocumentShare, DocumentShareType, DocumentAccessLog
)
from ...schemas.document import (
    DocumentShare as DocumentShareSchema,
    DocumentShareCreate,
    DocumentShareUpdate,
    DocumentAccessLog as DocumentAccessLogSchema
)

router = APIRouter(tags=["Document Shares"])

# Debug print to confirm module loading
print("DEBUG: shares.py module loaded successfully with router")


class ShareAccessRequest(BaseModel):
    """Request model for accessing shared documents."""
    password: Optional[str] = None


class DocumentShareResponse(BaseModel):
    """Response model for document share (matching frontend interface)."""
    id: int
    shareToken: str
    documentId: int
    shareName: str
    shareType: str
    permissions: List[str]
    expiresAt: Optional[str] = None
    createdAt: str
    accessCount: int
    lastAccessedAt: Optional[str] = None
    isActive: bool
    createdBy: Dict[str, Any]


class ShareAccessResponse(BaseModel):
    """Response model for shared document access."""
    document: Dict[str, Any]
    permissions: List[str]
    shareInfo: Dict[str, Any]


class CreateShareResponse(BaseModel):
    """Response model for share creation."""
    share: DocumentShareResponse
    shareUrl: str


class ListSharesResponse(BaseModel):
    """Response model for listing shares."""
    shares: List[DocumentShareResponse]
    total: int


def generate_share_token() -> str:
    """Generate a cryptographically secure share token."""
    return secrets.token_urlsafe(32)


def hash_password(password: str) -> str:
    """Hash a password for secure storage."""
    import secrets
    salt = secrets.token_hex(16)
    return hashlib.sha256((password + salt).encode()).hexdigest() + ':' + salt


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    if ':' in hashed:
        hash_part, salt = hashed.split(':', 1)
        return hashlib.sha256((password + salt).encode()).hexdigest() == hash_part
    else:
        # Legacy hash without salt
        return hashlib.sha256(password.encode()).hexdigest() == hashed


def log_share_access(db: Session, share: DocumentShare, request: Request, user_id: Optional[int] = None):
    """Log access to a shared document."""
    access_log = DocumentAccessLog(
        document_id=share.document_id,
        user_id=user_id,
        action="share",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={
            "share_token": share.share_token,
            "share_type": share.share_type,
            "share_id": share.id,
            "access_time": datetime.now(timezone.utc).isoformat()
        }
    )
    db.add(access_log)

    # Update share access count and last accessed time
    share.access_count += 1
    share.accessed_at = datetime.now(timezone.utc)
    share.last_accessed_ip = request.client.host if request.client else None
    share.last_accessed_user_agent = request.headers.get("user-agent")

    db.commit()


@router.post("/", response_model=CreateShareResponse, status_code=status.HTTP_201_CREATED)
async def create_share(
    share_data: DocumentShareCreate,
    document_id: Optional[int] = Query(None, description="Document ID to share (optional if in body)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new document share."""
    # Get document_id from query param or request body
    final_document_id = document_id if document_id is not None else share_data.document_id

    if final_document_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "Missing document_id",
                "message": "Document ID must be provided either as query parameter or in request body"
            }
        )

    print(f"DEBUG: Creating share for document_id={final_document_id}")
    print(f"DEBUG: Received share_data: {share_data}")
    print(f"DEBUG: Current user: {current_user.id if current_user else 'None'}")

    try:
        # Validate required fields
        validation_errors = {}

        if not share_data.share_name or not share_data.share_name.strip():
            validation_errors["share_name"] = "Share name is required and cannot be empty"

        # Validate permissions - at least one must be enabled
        if not any([share_data.allow_preview, share_data.allow_download, share_data.allow_comment]):
            validation_errors["permissions"] = "At least one permission (preview, download, or comment) must be enabled"

        # Validate share type
        if not share_data.share_type:
            validation_errors["share_type"] = "Share type is required (internal, external, or public)"

        # Validate password if required
        if share_data.require_password and not share_data.password:
            validation_errors["password"] = "Password is required when require_password is enabled"
        elif share_data.password and len(share_data.password) < 8:
            validation_errors["password"] = "Share password must be at least 8 characters long"

        # Validate expiration date
        if share_data.expires_at and share_data.expires_at <= datetime.now(timezone.utc):
            validation_errors["expires_at"] = "Expiration date must be in the future"

        if validation_errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": "Validation failed",
                    "message": "Please check the following fields and try again",
                    "fields": validation_errors
                }
            )

        # Get the document and verify ownership/permissions
        document = db.query(Document).filter(Document.id == final_document_id).first()
        if not document:
            print(f"DEBUG: Document {final_document_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Document not found",
                    "message": f"Document with ID {final_document_id} not found"
                }
            )

        print(f"DEBUG: Found document: {document.name} (owner_id={document.owner_id})")

        # Check if user has permission to share this document
        if document.owner_id != current_user.id:
            # Check if user has share permission
            if not has_permission(current_user, "document:share", db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error": "Permission denied",
                        "message": "Insufficient permissions to share documents"
                    }
                )

        # For encrypted documents in external shares, we need the encryption password
        if document.is_encrypted and share_data.share_type in ["external", "public"]:
            if not share_data.encryption_password:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "error": "Encryption password required",
                        "message": "External sharing of encrypted documents requires the encryption password for server-side decryption."
                    }
                )



        # Generate unique share token
        share_token = generate_share_token()

        # Hash password if provided
        password_hash = None
        if share_data.require_password and share_data.password:
            password_hash = hash_password(share_data.password)

        # Create the share
        new_share = DocumentShare(
            document_id=final_document_id,
            share_token=share_token,
            share_name=share_data.share_name,
            share_type=share_data.share_type,
            allow_download=share_data.allow_download,
            allow_preview=share_data.allow_preview,
            allow_comment=share_data.allow_comment,
            require_password=share_data.require_password,
            password_hash=password_hash,
            encryption_password=share_data.encryption_password,  # Store encryption password for server-side decryption
            expires_at=share_data.expires_at,
            max_access_count=share_data.max_access_count,
            access_restrictions=share_data.access_restrictions,
            created_by=current_user.id,
            is_active=True
        )

        db.add(new_share)
        db.commit()
        db.refresh(new_share)

        print(f"DEBUG: Share created successfully with ID: {new_share.id}")

        # Build permissions list
        permissions = []
        if new_share.allow_preview:
            permissions.append("read")
        if new_share.allow_download:
            permissions.append("download")
        if new_share.allow_comment:
            permissions.append("comment")

        # Convert to schema format
        share_response = DocumentShareResponse(
            id=new_share.id,
            shareToken=new_share.share_token,
            documentId=new_share.document_id,
            shareName=new_share.share_name or f"Share of {document.name}",
            shareType=new_share.share_type,
            permissions=permissions,
            expiresAt=new_share.expires_at.isoformat() if new_share.expires_at else None,
            createdAt=new_share.created_at.isoformat(),
            accessCount=new_share.access_count,
            lastAccessedAt=new_share.accessed_at.isoformat() if new_share.accessed_at else None,
            isActive=new_share.is_active,
            createdBy={
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email
            }
        )

        # Generate share URL
        share_url = f"{settings.FRONTEND_URL}/share/{share_token}"

        return CreateShareResponse(
            share=share_response,
            shareUrl=share_url
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except ValueError as e:
        # Handle Pydantic validation errors
        print(f"DEBUG: Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "Validation failed",
                "message": str(e)
            }
        )
    except Exception as e:
        # Handle unexpected errors
        print(f"DEBUG: Unexpected error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "An unexpected error occurred while creating the share"
            }
        )


@router.get("/document/{document_id}", response_model=ListSharesResponse)
async def get_document_shares(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all shares for a specific document."""
    # Get the document and verify ownership/permissions
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Check if user has permission to view shares
    # Users can view shares for documents they own, or if they have special admin permissions
    # Also allow users with general document read permissions to view shares
    if document.owner_id != current_user.id:
        has_view_permission = (
            has_permission(current_user, "document:share:view", db) or
            has_permission(current_user, "documents:read", db) or
            has_permission(current_user, "documents:admin", db)
        )

        if not has_view_permission:
            # For documents not owned by the user, return empty shares list instead of error
            # This allows the frontend to gracefully handle documents they can't manage shares for
            return ListSharesResponse(shares=[], total=0)

    # Get all shares for this document
    shares = db.query(DocumentShare).options(
        joinedload(DocumentShare.created_by_user)
    ).filter(
        DocumentShare.document_id == document_id
    ).order_by(desc(DocumentShare.created_at)).all()

    # Convert to schema format
    share_responses = []
    for share in shares:
        # Build permissions list
        permissions = []
        if share.allow_preview:
            permissions.append("read")
        if share.allow_download:
            permissions.append("download")
        if share.allow_comment:
            permissions.append("comment")

        share_response = DocumentShareResponse(
            id=share.id,
            shareToken=share.share_token,
            documentId=share.document_id,
            shareName=share.share_name or f"Share of {document.name}",
            shareType=share.share_type,
            permissions=permissions,
            expiresAt=share.expires_at.isoformat() if share.expires_at else None,
            createdAt=share.created_at.isoformat(),
            accessCount=share.access_count,
            lastAccessedAt=share.accessed_at.isoformat() if share.accessed_at else None,
            isActive=share.is_active,
            createdBy={
                "id": share.created_by_user.id,
                "username": share.created_by_user.username,
                "email": share.created_by_user.email
            }
        )
        share_responses.append(share_response)

    return ListSharesResponse(
        shares=share_responses,
        total=len(share_responses)
    )


@router.get("/stats")
async def get_share_statistics(
    document_id: Optional[int] = Query(None, description="Filter by document ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sharing statistics."""
    query = db.query(DocumentShare)

    if document_id:
        # Check if user has access to this document
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        if document.owner_id != current_user.id:
            if not has_permission(current_user, "document:share:view", db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )

        query = query.filter(DocumentShare.document_id == document_id)
    else:
        # User can only see their own documents' shares unless they have admin permission
        if not has_permission(current_user, "document:share:admin", db):
            user_documents = db.query(Document.id).filter(Document.owner_id == current_user.id).subquery()
            query = query.filter(DocumentShare.document_id.in_(user_documents))

    shares = query.all()

    # Calculate statistics
    total_shares = len(shares)
    active_shares = len([s for s in shares if s.is_active])
    expired_shares = len([s for s in shares if s.expires_at and s.expires_at < datetime.now(timezone.utc)])
    total_accesses = sum(s.access_count for s in shares)

    return {
        "total_shares": total_shares,
        "active_shares": active_shares,
        "expired_shares": expired_shares,
        "revoked_shares": total_shares - active_shares - expired_shares,
        "total_accesses": total_accesses,
        "shares_by_type": {
            "internal": len([s for s in shares if s.share_type == "internal"]),
            "external": len([s for s in shares if s.share_type == "external"]),
            "public": len([s for s in shares if s.share_type == "public"])
        }
    }


@router.get("/{share_token}")
async def get_share_details(
    share_token: str,
    db: Session = Depends(get_db)
):
    """Get details of a share by token (without accessing the document)."""
    share = db.query(DocumentShare).options(
        joinedload(DocumentShare.document),
        joinedload(DocumentShare.created_by_user)
    ).filter(DocumentShare.share_token == share_token).first()

    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )

    # Check if share is still valid
    if not share.is_active:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share has been revoked"
        )

    if share.expires_at and share.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share has expired"
        )

    if share.max_access_count and share.access_count >= share.max_access_count:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share has reached its access limit"
        )

    # Build permissions list
    permissions = []
    if share.allow_preview:
        permissions.append("read")
    if share.allow_download:
        permissions.append("download")
    if share.allow_comment:
        permissions.append("comment")

    return DocumentShareResponse(
        id=share.id,
        shareToken=share.share_token,
        documentId=share.document_id,
        shareName=share.share_name or f"Share of {share.document.name}",
        shareType=share.share_type,
        permissions=permissions,
        expiresAt=share.expires_at.isoformat() if share.expires_at else None,
        createdAt=share.created_at.isoformat(),
        accessCount=share.access_count,
        lastAccessedAt=share.accessed_at.isoformat() if share.accessed_at else None,
        isActive=share.is_active,
        createdBy={
            "id": share.created_by_user.id,
            "username": share.created_by_user.username,
            "email": share.created_by_user.email
        }
    )


@router.post("/{share_token}/access", response_model=ShareAccessResponse)
async def access_shared_document(
    share_token: str,
    access_request: ShareAccessRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Access a shared document and get its metadata."""
    print(f"DEBUG: Accessing share with token: {share_token}")

    try:
        # Handle authentication separately to provide better error messages
        current_user = None
        auth_error = None

        try:
            # Try to get current user, but don't let auth errors crash the endpoint
            from ...core.security import get_current_user_optional
            from fastapi.security import HTTPBearer
            from fastapi import Depends as FastAPIDepends

            # Get authorization header manually to avoid dependency injection issues
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[7:]  # Remove "Bearer " prefix

                # Manually validate token to avoid dependency crashes
                try:
                    from ...core.security import decode_token
                    from ...models.user import User

                    payload = decode_token(token)
                    user_id = payload.get("sub")
                    if user_id:
                        try:
                            user_id_int = int(user_id)
                            current_user = db.query(User).filter(User.id == user_id_int).first()
                            if not current_user:
                                auth_error = "user_not_found"
                            elif not current_user.is_active:
                                auth_error = "user_inactive"
                        except (ValueError, TypeError):
                            print(f"DEBUG: Invalid user_id format: {user_id}")
                            auth_error = "invalid_token"
                except Exception as token_error:
                    print(f"DEBUG: Token validation failed: {token_error}")
                    auth_error = "invalid_token"
            else:
                print("DEBUG: No authorization header found")
                # No token provided - this is okay for external shares

        except Exception as e:
            print(f"DEBUG: Authentication check failed: {e}")
            auth_error = "auth_system_error"

        # Verify database session is active
        if not db:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "Database connection error",
                    "message": "Unable to connect to the database. Please try again later."
                }
            )
        
        # Load share with all required relationships to prevent 500 errors
        share = db.query(DocumentShare).options(
            joinedload(DocumentShare.document),
            joinedload(DocumentShare.created_by_user)
        ).filter(DocumentShare.share_token == share_token).first()
        
        print(f"DEBUG: Share query result: {share is not None}")

        if not share:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Invalid share link",
                    "message": "The share link you are trying to access does not exist or has been removed."
                }
            )

        # Verify document exists and handle missing relationships
        if not share.document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Document not found",
                    "message": "The document associated with this share no longer exists."
                }
            )

        # Ensure created_by_user relationship exists
        if not share.created_by_user:
            # Try to load the user separately if relationship failed
            try:
                from ...models.user import User as UserModel
                creator = db.query(UserModel).filter(UserModel.id == share.created_by).first()
                if not creator:
                    # Create a fallback user info if creator is missing
                    creator_info = {
                        "id": share.created_by,
                        "username": "Unknown User",
                        "email": "unknown@example.com"
                    }
                else:
                    creator_info = {
                        "id": creator.id,
                        "username": creator.username,
                        "email": creator.email
                    }
            except Exception as e:
                print(f"WARNING: Could not load share creator: {e}")
                creator_info = {
                    "id": share.created_by,
                    "username": "Unknown User",
                    "email": "unknown@example.com"
                }
        else:
            creator_info = {
                "id": share.created_by_user.id,
                "username": share.created_by_user.username,
                "email": share.created_by_user.email
            }

        # Check if share is still valid
        if not share.is_active:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail={
                    "error": "Share link revoked",
                    "message": "This share link has been revoked by the document owner and is no longer accessible."
                }
            )

        if share.expires_at and share.expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail={
                    "error": "Share link expired",
                    "message": "This share link has expired and is no longer accessible."
                }
            )

        if share.max_access_count and share.access_count >= share.max_access_count:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail={
                    "error": "Access limit reached",
                    "message": "This share link has reached its maximum access limit and is no longer accessible."
                }
            )

        # Check password if required
        if share.require_password:
            if not access_request.password:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "error": "Password required",
                        "message": "This shared document requires a password to access.",
                        "requirePassword": True
                    }
                )

            if not verify_password(access_request.password, share.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "error": "Invalid password",
                        "message": "The password you entered is incorrect. Please try again.",
                        "requirePassword": True
                    }
                )

        # Check share type access requirements with specific error handling
        if share.share_type == DocumentShareType.INTERNAL:
            if not current_user and not auth_error:
                # No authentication attempted for internal share
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "error": "Authentication required",
                        "message": "You need to be logged in to access this internal share.",
                        "requiresLogin": True
                    }
                )
            elif auth_error == "invalid_token":
                # Invalid or expired token for internal share
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "error": "Invalid or expired token",
                        "message": "Your authentication token is invalid or has expired. Please log in again.",
                        "requiresLogin": True
                    }
                )
            elif auth_error == "user_not_found":
                # User in token doesn't exist
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "error": "User not found",
                        "message": "The authenticated user no longer exists. Please log in again.",
                        "requiresLogin": True
                    }
                )
            elif auth_error == "user_inactive":
                # User account is disabled
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error": "Account disabled",
                        "message": "Your account has been disabled. Please contact an administrator."
                    }
                )
            elif not current_user:
                # Generic authentication failure
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "error": "Authentication failed",
                        "message": "Authentication is required to access this internal share.",
                        "requiresLogin": True
                    }
                )

        # Log the access (non-blocking)
        try:
            log_share_access(db, share, request, current_user.id if current_user else None)
            print(f"DEBUG: Share access logged successfully")
        except Exception as log_error:
            # Don't fail the entire request if logging fails
            print(f"WARNING: Failed to log share access: {log_error}")
            # Continue without failing the request

        # Build permissions list
        permissions = []
        if share.allow_preview:
            permissions.append("read")
        if share.allow_download:
            permissions.append("download")
        if share.allow_comment:
            permissions.append("comment")

        # Prepare document info (without actual file content) with null safety
        document_info = {
            "id": share.document.id,
            "name": share.document.name or "Untitled Document",
            "file_size": share.document.file_size or 0,
            "mime_type": share.document.mime_type or "application/octet-stream",
            "created_at": share.document.created_at.isoformat() if share.document.created_at else datetime.now(timezone.utc).isoformat(),
            "description": share.document.description or ""
        }

        share_info = {
            "shareName": share.share_name or f"Share of {share.document.name or 'Document'}",
            "shareType": share.share_type or "external",
            "expiresAt": share.expires_at.isoformat() if share.expires_at else None,
            "accessCount": share.access_count or 0,
            "createdBy": creator_info
        }

        return ShareAccessResponse(
            document=document_info,
            permissions=permissions,
            shareInfo=share_info
        )

    except HTTPException:
        # Re-raise HTTP exceptions with proper status codes
        raise
    except Exception as e:
        # Handle any unexpected database or processing errors
        print(f"ERROR: Unexpected error in share access: {e}")
        import traceback
        print(f"ERROR: Full traceback: {traceback.format_exc()}")
        
        # Rollback any pending database transactions
        try:
            db.rollback()
        except Exception as rollback_error:
            print(f"WARNING: Database rollback failed: {rollback_error}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "An unexpected error occurred while accessing the shared document. Please try again later."
            }
        )


@router.get("/{share_token}/preview")
async def preview_shared_document(
    share_token: str,
    request: Request,
    password: Optional[str] = Query(None, description="Share password if required"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Stream document data for preview access with proper decryption."""
    share = db.query(DocumentShare).options(
        joinedload(DocumentShare.document)
    ).filter(DocumentShare.share_token == share_token).first()

    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )

    # Check if preview is allowed
    if not share.allow_preview:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Preview not allowed for this share"
        )

    # Perform same validations as access endpoint
    if not share.is_active:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share has been revoked"
        )

    if share.expires_at and share.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share has expired"
        )

    if share.max_access_count and share.access_count >= share.max_access_count:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share has reached its access limit"
        )

    # Check password if required
    if share.require_password:
        if not password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password required for this share"
            )
        if not verify_password(password, share.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )

    # Check share type access requirements
    if share.share_type == DocumentShareType.INTERNAL and not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for internal shares"
        )

    document = share.document

    # Check if file exists
    if not document.storage_path or not os.path.exists(document.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found"
        )

    # Log the preview access
    log_share_access(db, share, request, current_user.id if current_user else None)

    # Get document content with appropriate encryption handling
    try:
        # Check if document is actually encrypted by reading the file first
        if not document.storage_path or not os.path.exists(document.storage_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document file not found on server"
            )

        # Read file from disk to check actual content
        with open(document.storage_path, "rb") as f:
            file_data = f.read()

        # Check for inconsistent encryption state
        has_inconsistent_state = document.is_encrypted and not document.ciphertext

        if has_inconsistent_state:
            print(f"⚠️  Document {document.id} has inconsistent encryption state:")
            print(f"   is_encrypted: True but ciphertext: False")
            print(f"   This appears to be an encrypted file stored directly on disk")
            # Treat as encrypted since it doesn't have known file signatures
            is_encrypted = True
        else:
            # Use proper encryption detection (same as get_original_document_content)
            is_encrypted = detect_actual_encryption(document, file_data)

        print(f"🔍 Document {document.id} encryption status:")
        print(f"   database is_encrypted: {document.is_encrypted}")
        print(f"   has ciphertext: {bool(document.ciphertext)}")
        print(f"   has salt: {bool(document.salt)}")
        print(f"   inconsistent state: {has_inconsistent_state}")
        print(f"   actual is_encrypted: {is_encrypted}")
        print(f"   mime_type: {document.mime_type}")
        print(f"   file size: {len(file_data)} bytes")

        if is_encrypted:
            # For encrypted documents, try to get decrypted content for preview
            encryption_password = None

            # Try different sources for encryption password
            if hasattr(share, 'encryption_password') and share.encryption_password:
                encryption_password = share.encryption_password
            elif password:  # Use the password from query parameter
                encryption_password = password

            if encryption_password:
                print(f"🔑 Attempting server-side decryption with password length: {len(encryption_password)}")

                # Handle different encryption scenarios
                encrypted_data = None

                if document.ciphertext:
                    # Normal case: encrypted data in database
                    import base64
                    encrypted_data = base64.b64decode(document.ciphertext)
                    print(f"📦 Using ciphertext from database, length: {len(encrypted_data)} bytes")
                elif has_inconsistent_state:
                    # Special case: file on disk is encrypted but no ciphertext in database
                    encrypted_data = file_data
                    print(f"📦 Using file data directly (inconsistent state), length: {len(encrypted_data)} bytes")

                if encrypted_data:
                    try:
                        decrypted_data = decrypt_document_for_sharing(document, encrypted_data, encryption_password)

                        if decrypted_data:
                            print(f"✅ Successfully decrypted document {document.id} for preview")
                            print(f"📄 Decrypted data length: {len(decrypted_data)} bytes")
                            print(f"🔍 First 20 bytes: {decrypted_data[:20].hex()}")

                            # Check if it's a valid DOCX
                            if len(decrypted_data) >= 4:
                                signature = decrypted_data[:4]
                                if signature == b'PK':
                                    print(f"✅ Valid DOCX signature detected")
                                else:
                                    print(f"⚠️  Unexpected signature: {signature.hex()}")

                            headers = {
                                "Content-Length": str(len(decrypted_data)),
                                "X-Document-Name": document.name,
                                "X-Share-Token": share_token,
                                "Cache-Control": "no-cache, no-store, must-revalidate",
                                "X-Decrypted": "true",
                                "X-Content-Format": "decrypted"
                            }
                            return Response(
                                content=decrypted_data,
                                media_type=document.mime_type or "application/octet-stream",
                                headers=headers
                            )
                        else:
                            print(f"❌ Decryption returned None for document {document.id}")
                    except Exception as e:
                        print(f"❌ Server-side decryption failed for document {document.id}: {e}")
                        import traceback
                        traceback.print_exc()
                else:
                    print(f"❌ No encrypted data available for document {document.id}")
            else:
                print(f"❌ No encryption password available for document {document.id}")

            # If decryption failed or no password available, provide encrypted data with metadata
            import base64
            try:
                if document.ciphertext:
                    encrypted_file_data = base64.b64decode(document.ciphertext)
                elif has_inconsistent_state:
                    # File is already encrypted on disk
                    encrypted_file_data = file_data
                else:
                    print(f"❌ No encrypted data available for document {document.id}")
                    # For documents marked as encrypted but no ciphertext found,
                    # treat the file data as encrypted (this handles the inconsistent state)
                    encrypted_file_data = file_data
                    print(f"📦 Using file data as encrypted content for document {document.id}")

                headers = {
                    "Content-Length": str(len(encrypted_file_data)),
                    "X-Document-Name": document.name,
                    "X-Share-Token": share_token,
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "X-Requires-Decryption": "true",
                    "X-Encryption-Salt": document.salt,
                    "X-Encryption-IV": document.encryption_iv,
                    "X-Encryption-Algorithm": document.encryption_algorithm or "aes-256-gcm",
                    "X-Encryption-Iterations": "500000",  # Match frontend iterations
                    "X-Content-Format": "encrypted"
                }

                print(f"📦 Serving encrypted content for document {document.id} with decryption metadata")
                return Response(
                    content=encrypted_file_data,
                    media_type="application/octet-stream",
                    headers=headers
                )

            except Exception as e:
                print(f"❌ Error processing encrypted document {document.id}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to process encrypted document"
                )
        else:
            # For unencrypted documents, serve the file directly from disk
            print(f"📁 Document {document.id} is not encrypted, serving from disk")
            if not document.storage_path or not os.path.exists(document.storage_path):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document file not found on server"
                )

            with open(document.storage_path, "rb") as f:
                file_data = f.read()

            print(f"📄 File data length: {len(file_data)} bytes")
            print(f"🔍 First 20 bytes: {file_data[:20].hex()}")

            # Check if the file on disk is actually a DOCX
            if len(file_data) >= 4:
                signature = file_data[:4]
                if signature == b'PK':
                    print(f"✅ Valid DOCX signature detected in file - serving original DOCX")
                else:
                    print(f"⚠️  Unexpected file signature: {signature.hex()}")

            headers = {
                "Content-Length": str(len(file_data)),
                "X-Document-Name": document.name,
                "X-Share-Token": share_token,
                "Cache-Control": "no-cache, no-store, must-revalidate",
            }

            return Response(
                content=file_data,
                media_type=document.mime_type or "application/octet-stream",
                headers=headers
            )
            
    except HTTPException:
        # Re-raise HTTPExceptions directly to be handled by FastAPI
        raise
    except Exception as e:
        # Catch any other unexpected errors
        import traceback
        tb_str = traceback.format_exc()
        print(f"ERROR: Unexpected exception in preview_shared_document: {e}")
        print(tb_str)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the document."
        )



@router.post("/{share_token}/download")
async def download_shared_document(
    share_token: str,
    access_request: ShareAccessRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Download a shared document with proper decryption."""
    share = db.query(DocumentShare).options(
        joinedload(DocumentShare.document)
    ).filter(DocumentShare.share_token == share_token).first()

    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )

    # Check if download is allowed
    if not share.allow_download:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Download not allowed for this share"
        )

    # Perform the same validations as access
    if not share.is_active:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share has been revoked"
        )

    if share.expires_at and share.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share has expired"
        )

    if share.max_access_count and share.access_count >= share.max_access_count:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share has reached its access limit"
        )

    # Check password if required
    if share.require_password:
        if not access_request.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password required for this share"
            )

        if not verify_password(access_request.password, share.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )

    # Check share type access requirements
    if share.share_type == DocumentShareType.INTERNAL and not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for internal shares"
        )

    document = share.document

    # Check if file exists
    if not document.storage_path or not os.path.exists(document.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found"
        )

    # Log the download access
    log_share_access(db, share, request, current_user.id if current_user else None)

    # Get original document content with decryption if needed
    try:
        # For encrypted documents, try to get encryption password from share
        encryption_password = None
        if document.is_encrypted and hasattr(share, 'encryption_password') and share.encryption_password:
            encryption_password = share.encryption_password
            print(f"Using encryption password from share for document {document.id}")
        elif document.is_encrypted:
            print(f"Document {document.id} is encrypted but no password available in share")
            
        file_data = get_original_document_content(document, encryption_password)
        
        if file_data is None:
            # Document is encrypted and cannot be served without decryption
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": "Document encrypted",
                    "message": "This document is encrypted and requires the encryption password for external sharing.",
                    "encrypted": True
                }
            )
        
        # Serve file for download with proper headers
        return Response(
            content=file_data,
            media_type=document.mime_type or "application/octet-stream",
            headers={
                "Content-Disposition": f'inline; filename*=UTF-8\'\'{document.name}',
                "Content-Length": str(len(file_data)),
                "X-Share-Token": share_token,
                "X-Document-Id": str(document.id)
            }
        )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}"
        )


def detect_actual_encryption(document, file_data: bytes) -> bool:
    """Detect if file is actually encrypted by checking content and metadata."""
    if not file_data or len(file_data) < 8:
        return False

    # Check file signature first
    header = file_data[:16]  # Increased header size for better detection

    # Known unencrypted file signatures (FIXED BYTE STRINGS)
    if (header.startswith(b'%PDF') or                    # PDF
        header.startswith(b'PK\x03\x04') or             # ZIP/DOCX/XLSX/PPTX
        header.startswith(b'\xff\xd8\xff') or           # JPEG
        header.startswith(b'\x89PNG\r\n\x1a\n') or      # PNG
        header.startswith(b'GIF87a') or                 # GIF87a
        header.startswith(b'GIF89a') or                 # GIF89a
        header.startswith(b'BM') or                     # BMP
        header.startswith(b'RIFF')):                    # WEBP/WAV
        return False

    # Try to decode as text (for plain text files)
    try:
        header.decode('utf-8')
        return False  # Likely plain text file
    except UnicodeDecodeError:
        pass

    # If we have encryption metadata and the file doesn't match known signatures,
    # check if it looks like encrypted data
    if document.is_encrypted and document.ciphertext and document.salt:
        # Calculate entropy to detect encrypted content
        import math
        sample_size = min(1024, len(file_data))
        if sample_size > 0:
            # Count byte frequencies
            freq = [0] * 256
            for byte in file_data[:sample_size]:
                freq[byte] += 1

            # Calculate entropy
            entropy = 0.0
            for count in freq:
                if count > 0:
                    probability = count / sample_size
                    entropy -= probability * math.log2(probability)

            # Encrypted data typically has entropy > 7.5
            if entropy > 7.5:
                print(f"🔐 High entropy detected ({entropy:.2f}), file appears encrypted")
                return True

    # If no clear indicators, assume not encrypted
    return False


def get_original_document_content(document, encryption_password: str = None, allow_encrypted_passthrough: bool = False) -> Optional[bytes]:
    """Get original document content for sharing with decryption support."""
    try:
        # Check if file exists on disk
        if not document.storage_path or not os.path.exists(document.storage_path):
            print(f"Document file not found: {document.storage_path}")
            return None
            
        # Read file from disk
        with open(document.storage_path, "rb") as f:
            file_data = f.read()
            
        # Check if document is actually encrypted
        is_encrypted = detect_actual_encryption(document, file_data)
        
        if is_encrypted:
            if allow_encrypted_passthrough:
                print(f"Encrypted document {document.id} is being passed through without decryption.")
                return file_data

            if not encryption_password:
                print(f"No encryption password provided for encrypted document {document.id}")
                return None
                
            # Decrypt the document content
            try:
                print(f"Attempting to decrypt document {document.id} with provided password")
                decrypted_content = decrypt_document_for_sharing(document, file_data, encryption_password)
                if decrypted_content is None:
                    print(f"Decryption returned None for document {document.id}")
                    return None
                print(f"Successfully decrypted document {document.id}, size: {len(decrypted_content)} bytes")
                return decrypted_content
            except Exception as e:
                print(f"Decryption failed for document {document.id}: {e}")
                return None
        else:
            # Document is not encrypted, return raw file data
            print(f"Document {document.id} is not encrypted, returning raw data")
            return file_data
        
    except Exception as e:
        print(f"Error reading document content for document {document.id}: {e}")
        return None


def decrypt_document_for_sharing(document, encrypted_data: bytes, password: str) -> bytes:
    """Decrypt document content for external sharing."""
    # Extensive logging for final debugging
    print("\n--- DECRYPTION DEBUG START ---")
    try:
        print(f"Attempting to decrypt document ID: {document.id}")
        pw_preview = f'{password[0]}...{password[-1]}' if password and len(password) > 1 else '***'
        print(f"Password length: {len(password) if password else 0}, Preview: {pw_preview}")
        print(f"Document Salt (b64): {document.salt}")
        print(f"Document IV (b64): {document.encryption_iv}")
        print(f"Encrypted Data Length: {len(encrypted_data)} bytes")
    except Exception as log_e:
        print(f"Error during logging: {log_e}")
    print("----------------------------")

    if not CRYPTO_AVAILABLE:
        raise ValueError("Cryptography library not available for decryption")
        
    import base64
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.backends import default_backend
    
    try:
        # Check if document has zero-knowledge encryption metadata
        if document.encrypted_dek and document.ciphertext:
            # Zero-knowledge encryption model - decrypt using stored metadata
            
            # Get salt from document or use default
            if hasattr(document, 'salt') and document.salt:
                salt = base64.b64decode(document.salt)
            else:
                # Fallback salt for legacy documents
                salt = b'default_salt_for_legacy_docs_16b'
            
            # Derive master key from password
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=500000,  # Match frontend iterations
                backend=default_backend()
            )
            master_key = kdf.derive(password.encode())
            
            # Decrypt the DEK (Document Encryption Key)
            encrypted_dek_data = base64.b64decode(document.encrypted_dek)
            
            # For AES-GCM, the format is: IV (12 bytes) + ciphertext + auth_tag (16 bytes)
            if len(encrypted_dek_data) < 28:  # 12 + 16 minimum
                raise ValueError("Invalid encrypted DEK format")
                
            dek_iv = encrypted_dek_data[:12]  # First 12 bytes are IV for GCM
            dek_ciphertext = encrypted_dek_data[12:-16]  # Middle part is encrypted DEK
            dek_tag = encrypted_dek_data[-16:]  # Last 16 bytes are auth tag
            
            # Decrypt DEK using AES-GCM
            aesgcm = AESGCM(master_key)
            dek = aesgcm.decrypt(dek_iv, dek_ciphertext + dek_tag, None)
            
            # Now decrypt the document content using the DEK
            ciphertext_data = base64.b64decode(document.ciphertext)
            
            if len(ciphertext_data) < 28:  # 12 + 16 minimum
                raise ValueError("Invalid document ciphertext format")
                
            doc_iv = ciphertext_data[:12]  # First 12 bytes are IV
            doc_ciphertext = ciphertext_data[12:-16]  # Middle part is encrypted content
            doc_tag = ciphertext_data[-16:]  # Last 16 bytes are auth tag
            
            # Decrypt document content using DEK
            doc_aesgcm = AESGCM(dek)
            decrypted_content = doc_aesgcm.decrypt(doc_iv, doc_ciphertext + doc_tag, None)
            
            return decrypted_content
            
        elif document.is_encrypted and hasattr(document, 'encryption_iv') and hasattr(document, 'encryption_auth_tag'):
            # Legacy encryption model with separate IV and auth tag fields
            
            # Get encryption metadata
            iv = base64.b64decode(document.encryption_iv)
            auth_tag = base64.b64decode(document.encryption_auth_tag)
            
            # Use the file data as ciphertext
            ciphertext = encrypted_data
            
            # Derive key from password (using document-specific salt if available)
            salt = base64.b64decode(document.salt) if hasattr(document, 'salt') and document.salt else b'legacy_salt_16bytes'
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=500000,  # Match frontend iterations
                backend=default_backend()
            )
            key = kdf.derive(password.encode())
            
            # Decrypt using AES-GCM
            aesgcm = AESGCM(key)
            decrypted_content = aesgcm.decrypt(iv, ciphertext, None)
            
            return decrypted_content
            
        else:
            # Document is marked as encrypted but no encryption metadata found
            raise ValueError("Document is marked as encrypted but no encryption metadata was found.")
            
    except Exception as e:
        print(f"Decryption error: {e}")
        raise ValueError(f"Failed to decrypt document: {str(e)}")


@router.delete("/{share_id}")
async def revoke_share(
    share_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke a document share."""
    share = db.query(DocumentShare).options(
        joinedload(DocumentShare.document)
    ).filter(DocumentShare.id == share_id).first()

    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )

    # Check if user has permission to revoke this share
    if share.created_by != current_user.id and share.document.owner_id != current_user.id:
        if not has_permission(current_user, "document:share:admin", db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to revoke this share"
            )

    # Revoke the share
    share.is_active = False
    share.revoked_at = datetime.now(timezone.utc)
    share.revoked_by = current_user.id

    db.commit()

    return {"message": "Share revoked successfully"}





async def preview_shared_image(document, share_token: str, encryption_password: str):
    """Preview shared image with proper decryption."""
    from ...services.document_service import DocumentService
    from ...services.preview_service import PreviewService
    from fastapi.responses import Response
    import tempfile
    import os

    try:
        # For encrypted images, we need to decrypt them first
        if document.is_encrypted or document.encrypted_dek:
            # For shared documents, we don't have access to the user's master key
            # In a real zero-knowledge system, the encryption password would be
            # provided by the user or embedded in the share

            # For demo purposes, we'll use a default encryption password
            # In production, this should come from the share creation or user input
            document_service = DocumentService(None)  # No DB session needed for decryption

            try:
                # Attempt to decrypt with provided password
                decrypted_content = await decrypt_document_content_for_share(
                    document, encryption_password
                )

                # Return the decrypted image with proper MIME type
                return Response(
                    content=decrypted_content,
                    media_type=document.mime_type,
                    headers={
                        "Content-Length": str(len(decrypted_content)),
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "X-Content-Source": "decrypted-share"
                    }
                )

            except Exception as decrypt_error:
                # If decryption fails, return an error response
                error_message = f"Unable to decrypt image: {str(decrypt_error)}"

                return {
                    "type": "error",
                    "format": "image",
                    "message": "Image format not supported or file is corrupted",
                    "error_detail": error_message,
                    "suggestion": "The image may be encrypted or corrupted. Try downloading the file."
                }

        # For unencrypted images, return the raw data
        if os.path.exists(document.storage_path):
            with open(document.storage_path, 'rb') as f:
                image_data = f.read()

            return Response(
                content=image_data,
                media_type=document.mime_type,
                headers={
                    "Content-Length": str(len(image_data)),
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "X-Content-Source": "direct-file"
                }
            )
        else:
            return {
                "type": "error",
                "message": "Image file not found on server"
            }

    except Exception as e:
        return {
            "type": "error",
            "format": "image",
            "message": "Image format not supported or file is corrupted",
            "error_detail": str(e),
            "suggestion": "Download the file to view the image in an external viewer"
        }


async def decrypt_document_content_for_share(document, encryption_password: str) -> bytes:
    """Decrypt document content for shared access."""
    try:
        # For now, since this is a zero-knowledge system and we don't have
        # access to the actual decryption keys server-side, we'll simulate
        # decryption by reading the original file if it exists unencrypted,
        # or provide a structured error response

        if document.storage_path and os.path.exists(document.storage_path):
            # Try to read the file directly
            with open(document.storage_path, 'rb') as f:
                file_content = f.read()

            # Check if this looks like a valid image file by checking magic bytes
            if file_content.startswith(b'\x89PNG') or file_content.startswith(b'\xff\xd8\xff'):
                # PNG or JPEG file - return as-is
                return file_content
            elif document.ciphertext:
                # File is encrypted, return informative error
                raise ValueError("Document is encrypted and requires client-side decryption")
            else:
                # Return the file content (might be binary/encrypted)
                return file_content
        else:
            raise ValueError("Document file not found on server")

    except Exception as e:
        raise ValueError(f"Unable to access document content: {str(e)}")



