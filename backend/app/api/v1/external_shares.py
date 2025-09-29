"""
External share endpoints that serve documents directly without React app.

This module provides direct document access for external shares,
bypassing the frontend React application.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse, RedirectResponse, Response
from sqlalchemy.orm import Session, joinedload
from typing import Optional
import base64

from ...core.database import get_db
from ...core.config import settings
from ...models.document import DocumentShare
from .shares import (
    verify_password, log_share_access, detect_actual_encryption, get_original_document_content,
    decrypt_document_for_sharing
)
import os
from datetime import datetime, timezone

router = APIRouter(tags=["External Shares"])

@router.get("/{share_token}/stream")
async def stream_external_share(
    share_token: str,
    request: Request,
    password: Optional[str] = Query(None, description="Share password if required"),
    download: Optional[bool] = Query(False, description="Force download instead of inline view"),
    db: Session = Depends(get_db)
):
    """Stream decrypted document content for external shares (supports all file types)."""

    # Add CORS headers for external share requests
    origin = request.headers.get("origin")
    cors_headers = {}

    # Check if the origin is allowed
    if origin and any(
        origin in allowed_origin
        for allowed_origin in settings.CORS_ORIGINS
    ):
        cors_headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Expose-Headers": "Content-Length, Content-Type, Content-Disposition"
        }

    # Handle OPTIONS preflight requests
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers=cors_headers
        )

    # Load share with document
    share = db.query(DocumentShare).options(
        joinedload(DocumentShare.document)
    ).filter(DocumentShare.share_token == share_token).first()

    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    # Validate share
    if not share.is_active:
        raise HTTPException(status_code=410, detail="Share has been revoked")

    if share.expires_at and share.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Share has expired")

    if share.max_access_count and share.access_count >= share.max_access_count:
        raise HTTPException(status_code=410, detail="Share access limit reached")

    # Check password if required
    if share.require_password:
        if not password:
            raise HTTPException(status_code=401, detail="Password required")
        if not verify_password(password, share.password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")

    # For internal shares, require authentication through frontend
    if share.share_type == "internal":
        raise HTTPException(status_code=302, detail="Internal shares must be accessed through the frontend")

    document = share.document

    # Check if file exists
    if not document.storage_path or not os.path.exists(document.storage_path):
        raise HTTPException(status_code=404, detail="Document file not found")

    # Log access
    try:
        log_share_access(db, share, request, None)
    except Exception:
        pass  # Don't fail if logging fails

    # Get document content with encryption handling
    try:
        with open(document.storage_path, "rb") as f:
            file_data = f.read()

        # Check if encrypted
        is_encrypted = detect_actual_encryption(document, file_data)

        if is_encrypted:
            # For encrypted documents, attempt server-side decryption
            if password:
                encryption_password = password
                try:
                    print(f"🔑 Attempting server-side decryption for streaming")

                    # Determine encrypted data source
                    encrypted_data = None
                    if document.ciphertext:
                        import base64
                        encrypted_data = base64.b64decode(document.ciphertext)
                    else:
                        # File is encrypted on disk
                        encrypted_data = file_data

                    if encrypted_data:
                        decrypted_data = decrypt_document_for_sharing(document, encrypted_data, encryption_password)

                        if decrypted_data:
                            print(f"✅ Server-side decryption successful for streaming")

                            # Return decrypted content with appropriate headers
                            return await _serve_file_content(
                                decrypted_data,
                                document,
                                download,
                                cors_headers
                            )
                except Exception as decrypt_error:
                    print(f"❌ Server-side decryption failed: {decrypt_error}")

            # If decryption failed, return encrypted content with proper headers
            print(f"🔐 Serving encrypted content as-is")
            return await _serve_file_content(
                file_data,
                document,
                download,
                cors_headers,
                is_encrypted=True
            )

        # For unencrypted documents, serve directly
        return await _serve_file_content(
            file_data,
            document,
            download,
            cors_headers
        )

    except Exception as e:
        print(f"❌ Error streaming external share: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stream document: {str(e)}")


async def _serve_file_content(
    file_data: bytes,
    document,
    download: bool,
    cors_headers: dict,
    is_encrypted: bool = False
):
    """Serve file content with appropriate headers based on file type."""

    # Determine content disposition
    if download:
        content_disposition = f'attachment; filename="{document.name}"'
    else:
        # For inline viewing, be more selective
        if document.mime_type in [
            'application/pdf',
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'image/svg+xml', 'text/plain', 'text/html', 'text/csv', 'text/css',
            'application/json', 'application/xml', 'text/xml'
        ]:
            content_disposition = 'inline'
        else:
            # For other file types, default to download
            content_disposition = f'attachment; filename="{document.name}"'

    # Base headers
    headers = {
        "Content-Disposition": content_disposition,
        "Content-Length": str(len(file_data)),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "Accept-Ranges": "bytes",
        **cors_headers
    }

    # Add file type specific headers
    mime_type = document.mime_type or "application/octet-stream"

    if mime_type == "application/pdf":
        headers.update({
            "Content-Type": "application/pdf",
            "Content-Security-Policy": "default-src 'none'; img-src data:; script-src 'none'; style-src 'unsafe-inline'",
            "X-Content-Security-Policy": "default-src 'none'; script-src 'none'",
            "X-XSS-Protection": "1; mode=block"
        })
    elif mime_type.startswith('image/'):
        headers.update({
            "Content-Type": mime_type,
            "X-Content-Security-Policy": "default-src 'none'; img-src data:; script-src 'none'"
        })
    elif mime_type.startswith('text/'):
        headers.update({
            "Content-Type": mime_type,
            "X-Content-Security-Policy": "default-src 'none'; script-src 'none'"
        })
    elif mime_type in [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]:
        # Office documents - serve as download
        headers.update({
            "Content-Type": mime_type,
            "Content-Disposition": f'attachment; filename="{document.name}"'
        })
    elif is_encrypted:
        # Encrypted content
        headers.update({
            "Content-Type": "application/octet-stream",
            "X-Encrypted": "true",
            "X-Requires-Decryption": "true"
        })
    else:
        # Generic binary content
        headers.update({
            "Content-Type": mime_type
        })

    return StreamingResponse(
        iter([file_data]),
        media_type=mime_type,
        headers=headers
    )


@router.get("/{share_token}")
async def serve_external_share(
    share_token: str,
    request: Request,
    password: Optional[str] = Query(None, description="Share password if required"),
    download: Optional[bool] = Query(False, description="Force download instead of inline view"),
    db: Session = Depends(get_db)
):
    """Serve document directly for external shares (bypasses React app)."""

    # Add CORS headers for external share requests
    origin = request.headers.get("origin")
    cors_headers = {}

    # Check if the origin is allowed
    if origin and any(
        origin in allowed_origin
        for allowed_origin in settings.CORS_ORIGINS
    ):
        cors_headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }

    # Handle OPTIONS preflight requests
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers=cors_headers
        )

    # Load share with document
    share = db.query(DocumentShare).options(
        joinedload(DocumentShare.document)
    ).filter(DocumentShare.share_token == share_token).first()

    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    # Validate share
    if not share.is_active:
        raise HTTPException(status_code=410, detail="Share has been revoked")

    if share.expires_at and share.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Share has expired")

    if share.max_access_count and share.access_count >= share.max_access_count:
        raise HTTPException(status_code=410, detail="Share access limit reached")

    # Check password if required
    if share.require_password:
        if not password:
            # For password-protected shares, redirect to React app
            frontend_url = settings.FRONTEND_URL or "http://localhost:3005"
            redirect_url = f"{frontend_url}/share/{share_token}"
            response = RedirectResponse(url=redirect_url)
            # Add CORS headers to redirect
            for key, value in cors_headers.items():
                response.headers[key] = value
            return response

        if not verify_password(password, share.password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")

    # For internal shares, redirect to React app for authentication
    if share.share_type == "internal":
        frontend_url = settings.FRONTEND_URL or "http://localhost:3005"
        redirect_url = f"{frontend_url}/share/{share_token}"
        response = RedirectResponse(url=redirect_url)
        # Add CORS headers to redirect
        for key, value in cors_headers.items():
            response.headers[key] = value
        return response

    document = share.document

    # Check if file exists
    if not document.storage_path or not os.path.exists(document.storage_path):
        raise HTTPException(status_code=404, detail="Document file not found")

    # Log access
    try:
        log_share_access(db, share, request, None)
    except Exception:
        pass  # Don't fail if logging fails

    # Get document content with encryption handling
    try:
        with open(document.storage_path, "rb") as f:
            file_data = f.read()

        # Check if encrypted
        is_encrypted = detect_actual_encryption(document, file_data)

        if is_encrypted:
            # For encrypted documents, try server-side decryption if password provided
            if password and hasattr(share, 'encryption_password'):
                encryption_password = share.encryption_password or password
                try:
                    print(f"🔑 Attempting server-side decryption for external share")

                    # Determine encrypted data source
                    encrypted_data = None
                    if document.ciphertext:
                        import base64
                        encrypted_data = base64.b64decode(document.ciphertext)
                    else:
                        # File is encrypted on disk
                        encrypted_data = file_data

                    if encrypted_data:
                        decrypted_data = decrypt_document_for_sharing(document, encrypted_data, encryption_password)

                        if decrypted_data:
                            print(f"✅ Server-side decryption successful for external share")

                            # Determine content disposition
                            content_disposition = 'inline' if not download else f'attachment; filename="{document.name}"'

                            # Set appropriate headers based on document type
                            headers = {
                                "Content-Disposition": content_disposition,
                                "Content-Length": str(len(decrypted_data)),
                                "Cache-Control": "no-cache, no-store, must-revalidate",
                                "X-Content-Type-Options": "nosniff",
                                "Accept-Ranges": "bytes",
                                **cors_headers
                            }

                            # Add PDF-specific headers for better browser support
                            if document.mime_type == "application/pdf":
                                headers.update({
                                    "Content-Type": "application/pdf",
                                    "X-Content-Security-Policy": "default-src 'none'; script-src 'none'",
                                    "X-XSS-Protection": "1; mode=block"
                                })

                            return StreamingResponse(
                                iter([decrypted_data]),
                                media_type=document.mime_type or "application/octet-stream",
                                headers=headers
                            )
                except Exception as decrypt_error:
                    print(f"❌ Server-side decryption failed: {decrypt_error}")

            # If decryption failed or no password, redirect to React app
            frontend_url = settings.FRONTEND_URL or "http://localhost:3005"
            redirect_url = f"{frontend_url}/share/{share_token}"
            response = RedirectResponse(url=redirect_url)
            # Add CORS headers to redirect
            for key, value in cors_headers.items():
                response.headers[key] = value
            return response

        # For unencrypted documents, serve directly with proper headers
        content_disposition = 'inline' if not download else f'attachment; filename="{document.name}"'

        headers = {
            "Content-Disposition": content_disposition,
            "Content-Length": str(len(file_data)),
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Content-Type-Options": "nosniff",
            "Accept-Ranges": "bytes",
            **cors_headers
        }

        # Add PDF-specific headers for better browser support
        if document.mime_type == "application/pdf":
            headers.update({
                "Content-Type": "application/pdf",
                "X-Content-Security-Policy": "default-src 'none'; script-src 'none'",
                "X-XSS-Protection": "1; mode=block",
                "Content-Security-Policy": "default-src 'none'; img-src data:; script-src 'none'; style-src 'unsafe-inline'"
            })

        # Add security headers for other document types
        elif document.mime_type.startswith('image/'):
            headers.update({
                "X-Content-Security-Policy": "default-src 'none'; img-src data:; script-src 'none'"
            })

        return StreamingResponse(
            iter([file_data]),
            media_type=document.mime_type or "application/octet-stream",
            headers=headers
        )

    except Exception as e:
        print(f"❌ Error serving external share: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to serve document: {str(e)}")