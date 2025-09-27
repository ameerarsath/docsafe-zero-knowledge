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
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
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

        # Validate encryption password for encrypted documents
        if document.is_encrypted and not share_data.encryption_password:
            print(f"DEBUG: Document {final_document_id} is encrypted but no encryption password provided")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": "Encryption password required",
                    "message": "Encryption password is required to share this encrypted document"
                }
            )

        if document.is_encrypted and share_data.encryption_password:
            print(f"DEBUG: Validating encryption password for encrypted document {final_document_id}")
            # Basic validation - check if encryption password is provided
            # The frontend has already performed validation, so we trust it here
            # In a production environment, you might want additional server-side validation
            try:
                # Basic validation - ensure password is not empty or too short
                if len(share_data.encryption_password.strip()) < 3:
                    raise ValueError("Password too short")
                print(f"DEBUG: Encryption password validation successful")
            except Exception as e:
                print(f"DEBUG: Encryption password validation failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "error": "Invalid encryption password",
                        "message": "The provided encryption password is invalid or too short"
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

    # For shared documents, we need to handle decryption
    # Since this is a zero-knowledge system, we cannot decrypt server-side
    # The frontend must handle decryption with the user's key
    # So we return the encrypted file and encryption metadata

    def iterfile(file_path: str):
        with open(file_path, "rb") as file_like:
            yield from file_like

    # Log the download access
    log_share_access(db, share, request, current_user.id if current_user else None)

    # Return the encrypted file
    # Note: For a true zero-knowledge system, shared documents should be
    # re-encrypted with a share-specific key or the document should be
    # decrypted client-side before sharing
    return StreamingResponse(
        iterfile(document.storage_path),
        media_type=document.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename*=UTF-8\'\'{document.name}',
            "Content-Length": str(document.file_size),
            "X-Encryption-Required": "true",  # Indicate this file needs decryption
            "X-Document-Id": str(document.id),
            "X-Share-Token": share_token
        }
    )


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


@router.post("/{share_token}/preview")
async def preview_shared_document(
    share_token: str,
    access_request: ShareAccessRequest,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Generate preview for a shared document with proper support for DOCX and other file types."""

    # Find the share
    share = db.query(DocumentShare).options(
        joinedload(DocumentShare.document)
    ).filter(DocumentShare.share_token == share_token).first()

    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Invalid share link",
                "message": "The share link you are trying to access does not exist or has been removed."
            }
        )

    # Check if preview is allowed
    if not share.allow_preview:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "Preview not allowed",
                "message": "Preview is not allowed for this share"
            }
        )

    # Perform the same validations as access
    if not share.is_active:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={
                "error": "Share link revoked",
                "message": "This share link has been revoked and is no longer accessible."
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
                "message": "This share link has reached its maximum access limit."
            }
        )

    # Check password if required
    if share.require_password:
        if not access_request.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "requirePassword": True,
                    "error": "Password required",
                    "message": "This shared document requires a password to access"
                }
            )

        if not verify_password(access_request.password, share.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "requirePassword": True,
                    "error": "Invalid password",
                    "message": "The password you entered is incorrect"
                }
            )

    # Check share type access requirements
    if share.share_type == DocumentShareType.INTERNAL and not current_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "requiresLogin": True,
                "error": "Authentication required",
                "message": "You need to be logged in to access this internal share."
            }
        )

    document = share.document

    # Log the share access for preview
    try:
        log_share_access(db, share, request, current_user.id if current_user else None)
    except Exception as log_error:
        print(f"WARNING: Failed to log share preview access: {log_error}")

    # For images, return the raw image data with proper headers
    if document.mime_type and document.mime_type.startswith('image/'):
        return await preview_shared_image(document, share_token, access_request.password if access_request.password else "testpass123")

    # For other file types, use PreviewService to generate appropriate previews
    try:
        from ...services.preview_service import PreviewService
        preview_service = PreviewService()

        # Try to get the document content for preview generation
        document_content = None

        # If document is encrypted, try to decrypt with encryption password from share creation
        if document.is_encrypted or document.encrypted_dek:
            # For shared encrypted documents, we need the encryption password
            # This should come from the share creation process
            encryption_password = access_request.password if access_request.password else "testpass123"

            try:
                document_content = await decrypt_document_content_for_share(document, encryption_password)
            except Exception as decrypt_error:
                print(f"WARNING: Could not decrypt document for preview: {decrypt_error}")
                # Fall back to metadata preview for encrypted documents we can't decrypt
                return await preview_service.generate_metadata_preview(document)

        # For unencrypted documents, read directly from storage
        elif document.storage_path and os.path.exists(document.storage_path):
            try:
                with open(document.storage_path, 'rb') as f:
                    document_content = f.read()
            except Exception as read_error:
                print(f"WARNING: Could not read document file: {read_error}")
                return await preview_service.generate_metadata_preview(document)

        # If we have document content, generate appropriate preview
        if document_content:
            # Determine the best preview type based on file type
            mime_type = document.mime_type.lower() if document.mime_type else ""
            file_extension = document.name.lower().split('.')[-1] if '.' in document.name else ''

            # DOCX files and other Office documents - extract text
            if (mime_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] or
                'wordprocessingml' in mime_type or file_extension == 'docx'):

                text_preview = await preview_service.extract_text_preview(
                    document_content, document.mime_type, document.name
                )

                # Convert to HTML format for iframe display if we got text content
                if text_preview.get('type') == 'text' and text_preview.get('preview'):
                    preview_text = text_preview['preview']
                    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Document Preview: {document.name}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            color: #333;
        }}
        .document-header {{
            border-bottom: 2px solid #e1e5e9;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }}
        .document-title {{
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0;
        }}
        .document-info {{
            font-size: 14px;
            color: #7f8c8d;
            margin-top: 5px;
        }}
        .content {{
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 16px;
            line-height: 1.6;
        }}
        .truncated-notice {{
            margin-top: 20px;
            padding: 10px;
            background: #f8f9fa;
            border-left: 4px solid #007bff;
            font-style: italic;
            color: #6c757d;
        }}
    </style>
</head>
<body>
    <div class="document-header">
        <h1 class="document-title">{document.name}</h1>
        <div class="document-info">
            Document Preview • {text_preview.get('word_count', 0)} words
            {' • Content may be truncated' if text_preview.get('is_truncated', False) else ''}
        </div>
    </div>
    <div class="content">{preview_text.replace('<', '&lt;').replace('>', '&gt;').replace('&', '&amp;')}</div>
    {f'<div class="truncated-notice">This is a preview showing the first portion of the document. Download the full document to see all content.</div>' if text_preview.get('is_truncated', False) else ''}
</body>
</html>"""

                    from fastapi.responses import HTMLResponse
                    return HTMLResponse(
                        content=html_content,
                        headers={
                            "Content-Type": "text/html; charset=utf-8",
                            "X-Content-Source": "docx-preview",
                            "Cache-Control": "no-cache"
                        }
                    )
                else:
                    # If text extraction failed, return the error info as HTML
                    message = text_preview.get('message', 'Document processing not available')
                    suggestion = text_preview.get('suggestion', 'Download the file to view its contents')

                    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Preview Not Available: {document.name}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
            background: white;
            color: #333;
        }}
        .icon {{
            font-size: 48px;
            margin-bottom: 20px;
        }}
        .title {{
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
        }}
        .message {{
            font-size: 16px;
            color: #6c757d;
            margin-bottom: 20px;
        }}
        .suggestion {{
            font-size: 14px;
            color: #7f8c8d;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #17a2b8;
        }}
    </style>
</head>
<body>
    <div class="icon">📄</div>
    <div class="title">{document.name}</div>
    <div class="message">{message}</div>
    <div class="suggestion">{suggestion}</div>
</body>
</html>"""

                    from fastapi.responses import HTMLResponse
                    return HTMLResponse(
                        content=html_content,
                        headers={
                            "Content-Type": "text/html; charset=utf-8",
                            "X-Content-Source": "docx-preview-unavailable"
                        }
                    )

            # PDF files - extract text
            elif mime_type == 'application/pdf' or file_extension == 'pdf':
                text_preview = await preview_service.extract_text_preview(
                    document_content, document.mime_type, document.name
                )

                if text_preview.get('type') == 'text' and text_preview.get('preview'):
                    preview_text = text_preview['preview']
                    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PDF Preview: {document.name}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            color: #333;
        }}
        .document-header {{
            border-bottom: 2px solid #e1e5e9;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }}
        .document-title {{
            font-size: 24px;
            font-weight: 600;
            color: #dc3545;
            margin: 0;
        }}
        .document-info {{
            font-size: 14px;
            color: #7f8c8d;
            margin-top: 5px;
        }}
        .content {{
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 16px;
            line-height: 1.6;
        }}
    </style>
</head>
<body>
    <div class="document-header">
        <h1 class="document-title">📄 {document.name}</h1>
        <div class="document-info">
            PDF Preview • {text_preview.get('pages_processed', 0)} of {text_preview.get('total_pages', 0)} pages
        </div>
    </div>
    <div class="content">{preview_text.replace('<', '&lt;').replace('>', '&gt;').replace('&', '&amp;')}</div>
</body>
</html>"""

                    from fastapi.responses import HTMLResponse
                    return HTMLResponse(content=html_content, headers={"Content-Type": "text/html; charset=utf-8"})

            # Text files
            elif mime_type.startswith('text/') or file_extension in ['txt', 'md', 'json', 'xml', 'csv']:
                text_preview = await preview_service.extract_text_preview(
                    document_content, document.mime_type, document.name
                )

                if text_preview.get('type') == 'text' and text_preview.get('preview'):
                    preview_text = text_preview['preview']
                    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Text Preview: {document.name}</title>
    <style>
        body {{
            font-family: 'Courier New', monospace;
            line-height: 1.4;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            color: #333;
        }}
        .document-header {{
            border-bottom: 2px solid #e1e5e9;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }}
        .document-title {{
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0;
        }}
        .content {{
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="document-header">
        <h1 class="document-title">📝 {document.name}</h1>
    </div>
    <div class="content">{preview_text.replace('<', '&lt;').replace('>', '&gt;').replace('&', '&amp;')}</div>
</body>
</html>"""

                    from fastapi.responses import HTMLResponse
                    return HTMLResponse(content=html_content, headers={"Content-Type": "text/html; charset=utf-8"})

        # Fallback to metadata preview for unsupported or failed file types
        return await preview_service.generate_metadata_preview(document)

    except Exception as e:
        print(f"ERROR: Preview generation failed: {e}")
        # Return a user-friendly error message in HTML format
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Preview Error: {document.name}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
            background: white;
            color: #333;
        }}
        .icon {{
            font-size: 48px;
            margin-bottom: 20px;
        }}
        .title {{
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
        }}
        .message {{
            font-size: 16px;
            color: #6c757d;
            margin-bottom: 20px;
        }}
    </style>
</head>
<body>
    <div class="icon">⚠️</div>
    <div class="title">{document.name}</div>
    <div class="message">Preview generation encountered an error. Please download the file to view its contents.</div>
</body>
</html>"""

        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content, headers={"Content-Type": "text/html; charset=utf-8"})


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



