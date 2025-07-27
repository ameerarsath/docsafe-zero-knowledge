"""
Document management API endpoints for SecureVault.

This module provides REST API endpoints for:
- Document and folder CRUD operations
- File upload and download with encryption
- Document metadata management
- Permission and sharing management
- Search and filtering capabilities
- Bulk operations and version control
"""

import os
import hashlib
import base64
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import (
    APIRouter, Depends, HTTPException, status, Query, UploadFile, 
    File, Form, BackgroundTasks
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func

from ...core.database import get_db
from ...core.security import get_current_user
from ...core.rbac import has_permission
from ...core.config import settings
from ...models.user import User
from ...models.document import (
    Document, DocumentPermission, DocumentShare, DocumentVersion,
    DocumentAccessLog, DocumentType, DocumentStatus, DocumentShareType
)
from ...schemas.document import (
    Document as DocumentSchema,
    DocumentCreate,
    DocumentUpdate,
    DocumentUpload,
    DocumentList,
    DocumentTree,
    DocumentPermission as DocumentPermissionSchema,
    DocumentPermissionCreate,
    DocumentPermissionUpdate,
    BulkPermissionUpdate,
    DocumentShare as DocumentShareSchema,
    DocumentShareCreate,
    DocumentShareUpdate,
    DocumentVersion as DocumentVersionSchema,
    DocumentVersionCreate,
    DocumentAccessLog as DocumentAccessLogSchema,
    DocumentFilter,
    DocumentSearch,
    BulkDocumentOperation,
    BulkDocumentResult,
    DocumentMoveRequest,
    DocumentCopyRequest,
    DocumentStatistics
)


router = APIRouter(prefix="/documents", tags=["Documents"])


# Document CRUD Endpoints
@router.get("/", response_model=DocumentList)
async def list_documents(
    parent_id: Optional[int] = Query(None, description="Parent folder ID"),
    document_type: Optional[DocumentType] = Query(None, description="Document type filter"),
    status: Optional[DocumentStatus] = Query(DocumentStatus.ACTIVE, description="Document status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    sort_by: str = Query("updated_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List documents and folders with filtering and pagination."""
    # Build base query with permission filtering
    query = db.query(Document).filter(Document.status == status)
    
    # Filter by parent folder
    if parent_id is not None:
        query = query.filter(Document.parent_id == parent_id)
    else:
        query = query.filter(Document.parent_id.is_(None))  # Root level
    
    # Filter by document type
    if document_type:
        query = query.filter(Document.document_type == document_type)
    
    # Apply permission filtering - only show documents user can access
    accessible_docs = []
    total_count = 0
    
    # Get all matching documents for permission checking
    all_docs = query.all()
    
    for doc in all_docs:
        if doc.can_user_access(current_user, "read"):
            accessible_docs.append(doc)
    
    total_count = len(accessible_docs)
    
    # Apply sorting
    if sort_order.lower() == "desc":
        accessible_docs.sort(key=lambda d: getattr(d, sort_by, ""), reverse=True)
    else:
        accessible_docs.sort(key=lambda d: getattr(d, sort_by, ""))
    
    # Apply pagination
    offset = (page - 1) * size
    paginated_docs = accessible_docs[offset:offset + size]
    
    # Convert to response format with permissions
    document_responses = []
    for doc in paginated_docs:
        doc_dict = doc.to_dict()
        
        # Add computed permission flags
        doc_dict["can_read"] = doc.can_user_access(current_user, "read")
        doc_dict["can_write"] = doc.can_user_access(current_user, "write") 
        doc_dict["can_delete"] = doc.can_user_access(current_user, "delete")
        doc_dict["can_share"] = doc.can_user_access(current_user, "share")
        
        document_responses.append(DocumentSchema(**doc_dict))
    
    return DocumentList(
        documents=document_responses,
        total=total_count,
        page=page,
        size=size,
        has_next=offset + size < total_count
    )


# Statistics Endpoint (moved before {document_id} to avoid route conflict)
@router.get("/statistics", response_model=DocumentStatistics)
async def get_document_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get document statistics for the current user."""
    print(f"🚀 STATISTICS ENDPOINT CALLED for user {current_user.username} (ID: {current_user.id})")
    print(f"🚀 User is_admin: {current_user.is_admin}")
    
    # Check if user has permission to read documents
    if not has_permission(current_user, "documents:read", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to view document statistics"
        )
    
    try:
        # Use database aggregation for performance instead of loading all documents
        base_query = db.query(Document).filter(Document.status == DocumentStatus.ACTIVE)
        
        # For user-level statistics, we need to consider permissions
        if not current_user.is_admin:
            # Non-admin users see only their own documents or ones with explicit permissions
            base_query = base_query.filter(
                or_(
                    Document.owner_id == current_user.id,
                    db.query(DocumentPermission).filter(
                        and_(
                            DocumentPermission.document_id == Document.id,
                            DocumentPermission.user_id == current_user.id,
                            DocumentPermission.granted == True
                        )
                    ).exists()
                )
            )
        
        # Get document counts by type
        total_documents = base_query.filter(Document.document_type == DocumentType.DOCUMENT).count()
        total_folders = base_query.filter(Document.document_type == DocumentType.FOLDER).count()
        
        # Get size aggregation
        total_size_result = base_query.with_entities(func.coalesce(func.sum(Document.file_size), 0)).scalar()
        total_size = int(total_size_result) if total_size_result else 0
        
        # Count special document types
        encrypted_documents = base_query.filter(Document.is_encrypted == True).count()
        shared_documents = base_query.filter(Document.is_shared == True).count()
        sensitive_documents = base_query.filter(Document.is_sensitive == True).count()
        
        # Group by type and status using database aggregation
        docs_by_type = {}
        type_stats = db.query(
            Document.document_type,
            func.count(Document.id)
        ).filter(Document.status == DocumentStatus.ACTIVE)
        
        if not current_user.is_admin:
            type_stats = type_stats.filter(
                or_(
                    Document.owner_id == current_user.id,
                    db.query(DocumentPermission).filter(
                        and_(
                            DocumentPermission.document_id == Document.id,
                            DocumentPermission.user_id == current_user.id,
                            DocumentPermission.granted == True
                        )
                    ).exists()
                )
            )
        
        for doc_type, count in type_stats.group_by(Document.document_type).all():
            type_key = doc_type.value if hasattr(doc_type, 'value') else str(doc_type)
            docs_by_type[type_key] = count
        
        # For status, since we're filtering by ACTIVE, it's straightforward
        docs_by_status = {"active": total_documents + total_folders}
        
        # Recent activity count (simplified - last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_activity_count = base_query.filter(Document.updated_at >= thirty_days_ago).count()
        
        result = DocumentStatistics(
            total_documents=total_documents,
            total_folders=total_folders,
            total_size=total_size,
            encrypted_documents=encrypted_documents,
            shared_documents=shared_documents,
            sensitive_documents=sensitive_documents,
            documents_by_type=docs_by_type,
            documents_by_status=docs_by_status,
            recent_activity_count=recent_activity_count
        )
        print(f"🚀 STATISTICS SUCCESS: {result}")
        return result
        
    except Exception as e:
        print(f"🚨 STATISTICS ERROR: {e}")
        import traceback
        traceback.print_exc()
        # Fallback to basic statistics if there's an error
        fallback = DocumentStatistics(
            total_documents=0,
            total_folders=0,
            total_size=0,
            encrypted_documents=0,
            shared_documents=0,
            sensitive_documents=0,
            documents_by_type={},
            documents_by_status={},
            recent_activity_count=0
        )
        print(f"🚨 RETURNING FALLBACK: {fallback}")
        return fallback


@router.get("/{document_id}", response_model=DocumentSchema)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific document by ID."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check read permission
    if not document.can_user_access(current_user, "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to access this document"
        )
    
    # Log access
    access_log = DocumentAccessLog(
        document_id=document.id,
        user_id=current_user.id,
        action="read",
        access_method="api",
        success=True
    )
    db.add(access_log)
    db.commit()
    
    # Update last accessed time
    document.accessed_at = func.now()
    db.commit()
    
    # Return with permission flags
    doc_dict = document.to_dict()
    doc_dict["can_read"] = True  # Already verified
    doc_dict["can_write"] = document.can_user_access(current_user, "write")
    doc_dict["can_delete"] = document.can_user_access(current_user, "delete") 
    doc_dict["can_share"] = document.can_user_access(current_user, "share")
    
    return DocumentSchema(**doc_dict)


@router.post("/", response_model=DocumentSchema, status_code=status.HTTP_201_CREATED)
async def create_document(
    document_data: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new document or folder."""
    # Check if user can create documents
    if not has_permission(current_user, "documents:create", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to create documents"
        )
    
    # Initialize parent to None to avoid scoping issues
    parent = None
    
    # If creating in a parent folder, check write access to parent
    if document_data.parent_id:
        parent = db.query(Document).filter(Document.id == document_data.parent_id).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent folder not found"
            )
        
        if not parent.can_user_access(current_user, "write"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges to create documents in this folder"
            )
    
    try:
        # Create document
        document = Document(
            name=document_data.name,
            description=document_data.description,
            document_type=document_data.document_type,
            parent_id=document_data.parent_id,
            owner_id=current_user.id,
            created_by=current_user.id,
            share_type=document_data.share_type,
            tags=document_data.tags,
            doc_metadata=document_data.doc_metadata,
            is_sensitive=document_data.is_sensitive
        )
        
        # Update path for folders
        if document_data.document_type == DocumentType.FOLDER:
            if parent:
                document.parent = parent
            document.update_path()
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        # Create access log
        access_log = DocumentAccessLog(
            document_id=document.id,
            user_id=current_user.id,
            action="write",
            access_method="api",
            success=True
        )
        db.add(access_log)
        db.commit()
        
        # Return with permission flags
        doc_dict = document.to_dict()
        doc_dict["can_read"] = True
        doc_dict["can_write"] = True
        doc_dict["can_delete"] = True
        doc_dict["can_share"] = True
        
        return DocumentSchema(**doc_dict)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create document: {str(e)}"
        )


@router.put("/{document_id}", response_model=DocumentSchema)
async def update_document(
    document_id: int,
    document_data: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing document."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check write permission
    if not document.can_user_access(current_user, "write"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to update this document"
        )
    
    try:
        # Update fields
        if document_data.name is not None:
            document.name = document_data.name
        if document_data.description is not None:
            document.description = document_data.description
        if document_data.parent_id is not None:
            # Check write access to new parent
            if document_data.parent_id != document.parent_id:
                if document_data.parent_id:
                    new_parent = db.query(Document).filter(Document.id == document_data.parent_id).first()
                    if not new_parent:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="New parent folder not found"
                        )
                    if not new_parent.can_user_access(current_user, "write"):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Insufficient privileges to move to target folder"
                        )
                document.parent_id = document_data.parent_id
                document.update_path()
        
        if document_data.tags is not None:
            document.tags = document_data.tags
        if document_data.doc_metadata is not None:
            document.doc_metadata = document_data.doc_metadata
        if document_data.is_sensitive is not None:
            document.is_sensitive = document_data.is_sensitive
        if document_data.share_type is not None:
            document.share_type = document_data.share_type
        
        document.updated_by = current_user.id
        document.updated_at = func.now()
        
        db.commit()
        db.refresh(document)
        
        # Create access log
        access_log = DocumentAccessLog(
            document_id=document.id,
            user_id=current_user.id,
            action="update",
            access_method="api",
            success=True
        )
        db.add(access_log)
        db.commit()
        
        # Return with permission flags
        doc_dict = document.to_dict()
        doc_dict["can_read"] = document.can_user_access(current_user, "read")
        doc_dict["can_write"] = document.can_user_access(current_user, "write")
        doc_dict["can_delete"] = document.can_user_access(current_user, "delete")
        doc_dict["can_share"] = document.can_user_access(current_user, "share")
        
        return DocumentSchema(**doc_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update document: {str(e)}"
        )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    permanent: bool = Query(False, description="Permanently delete (vs archive)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete or archive a document."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check delete permission
    if not document.can_user_access(current_user, "delete"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to delete this document"
        )
    
    try:
        if permanent:
            # Check if user has admin permissions for permanent deletion
            if not has_permission(current_user, "documents:delete", db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient privileges for permanent deletion"
                )
            
            # TODO: Delete actual encrypted file from storage
            # Delete from database
            db.delete(document)
            action = "permanent_delete"
        else:
            # Archive the document
            document.status = DocumentStatus.DELETED
            document.deleted_at = func.now()
            action = "delete"
        
        # Create access log
        access_log = DocumentAccessLog(
            document_id=document.id,
            user_id=current_user.id,
            action=action,
            access_method="api",
            success=True
        )
        db.add(access_log)
        
        db.commit()
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )


# File Upload Endpoints
@router.post("/upload", response_model=DocumentSchema, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    upload_data: str = Form(..., description="JSON document upload metadata"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Upload an encrypted file with metadata."""
    # Check upload permissions
    if not has_permission(current_user, "documents:create", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to upload files"
        )
    
    try:
        import json
        print(f"🔄 Raw upload_data received: {upload_data}")
        upload_metadata_dict = json.loads(upload_data)
        print(f"📋 Parsed upload metadata: {upload_metadata_dict}")
        
        upload_metadata = DocumentUpload.parse_obj(upload_metadata_dict)
        print(f"✅ Upload metadata validated successfully")
        print(f"🔐 Encryption fields: key_id={upload_metadata.encryption_key_id}, iv={upload_metadata.encryption_iv[:20]}..., auth_tag={upload_metadata.encryption_auth_tag[:20]}...")
    except Exception as e:
        print(f"❌ Upload metadata parsing failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid upload metadata: {str(e)}"
        )
    
    # Validate encrypted file size (should be reasonable overhead from original)
    content = await file.read()
    encrypted_size = len(content)
    original_size = upload_metadata.file_size
    
    # Allow reasonable encryption overhead (up to 10% more than original + 1KB for metadata)
    max_expected_size = original_size + (original_size * 0.1) + 1024
    if encrypted_size > max_expected_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Encrypted file size ({encrypted_size}) exceeds expected overhead"
        )
    
    # Note: file_hash in upload_metadata should be the hash of the original file
    # The encrypted file hash would be different and is not needed for validation
    
    try:
        # Generate storage path
        document_uuid = f"{current_user.id}_{hash(upload_metadata.name + str(upload_metadata.file_size))}"
        storage_path = f"{settings.ENCRYPTED_FILES_PATH}/{current_user.id}/{document_uuid[:2]}/{document_uuid}.enc"
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(storage_path), exist_ok=True)
        
        # Save encrypted file
        with open(storage_path, "wb") as f:
            f.write(content)
        
        # Create document record
        print(f"💾 Creating document record with encryption metadata...")
        encryption_iv_bytes = base64.b64decode(upload_metadata.encryption_iv)
        encryption_auth_tag_bytes = base64.b64decode(upload_metadata.encryption_auth_tag)
        
        print(f"🔐 Decoded encryption data: iv_length={len(encryption_iv_bytes)}, auth_tag_length={len(encryption_auth_tag_bytes)}")
        
        document = Document(
            name=upload_metadata.name,
            description=upload_metadata.description,
            document_type=DocumentType.DOCUMENT,
            mime_type=upload_metadata.mime_type,
            file_size=upload_metadata.file_size,
            file_hash_sha256=upload_metadata.file_hash,
            storage_path=storage_path,
            parent_id=upload_metadata.parent_id,
            owner_id=current_user.id,
            created_by=current_user.id,
            encryption_key_id=upload_metadata.encryption_key_id,
            encryption_iv=encryption_iv_bytes,
            encryption_auth_tag=encryption_auth_tag_bytes,
            tags=upload_metadata.tags,
            doc_metadata=upload_metadata.doc_metadata,
            is_sensitive=upload_metadata.is_sensitive,
            is_encrypted=True
        )
        
        print(f"📄 Document created with: name={document.name}, encryption_key_id={document.encryption_key_id}, is_encrypted={document.is_encrypted}")
        
        # Extract file extension
        if "." in upload_metadata.name:
            document.file_extension = "." + upload_metadata.name.split(".")[-1]
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        # Create access log
        access_log = DocumentAccessLog(
            document_id=document.id,
            user_id=current_user.id,
            action="write",  # Upload is a write operation
            access_method="api",
            success=True,
            details={"file_size": upload_metadata.file_size, "mime_type": upload_metadata.mime_type, "operation": "upload"}
        )
        db.add(access_log)
        db.commit()
        
        # Return with permission flags
        doc_dict = document.to_dict()
        doc_dict["can_read"] = True
        doc_dict["can_write"] = True  
        doc_dict["can_delete"] = True
        doc_dict["can_share"] = True
        
        return DocumentSchema(**doc_dict)
        
    except Exception as e:
        db.rollback()
        # Clean up file if it was created
        if 'storage_path' in locals() and os.path.exists(storage_path):
            os.remove(storage_path)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.get("/{document_id}/download")
async def download_file(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download an encrypted file."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check read permission
    if not document.can_user_access(current_user, "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to download this document"
        )
    
    # Check if it's a document (not folder)
    if document.document_type != DocumentType.DOCUMENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot download a folder"
        )
    
    # Check if file exists
    if not os.path.exists(document.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on storage"
        )
    
    # Get actual encrypted file size for correct Content-Length
    encrypted_file_size = os.path.getsize(document.storage_path)
    
    def file_generator():
        with open(document.storage_path, "rb") as f:
            while chunk := f.read(8192):
                yield chunk
    
    # Create access log
    access_log = DocumentAccessLog(
        document_id=document.id,
        user_id=current_user.id,
        action="download",
        access_method="api",
        success=True
    )
    db.add(access_log)
    db.commit()
    
    return StreamingResponse(
        file_generator(),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{document.name}"',
            "Content-Length": str(encrypted_file_size)  # Use actual encrypted file size
        }
    )


# Search and Filter Endpoints
@router.post("/search", response_model=DocumentList)
async def search_documents(
    search_params: DocumentSearch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search documents with advanced filtering."""
    # Build query with filters
    query = db.query(Document)
    
    # Apply filters
    if search_params.filters.document_type:
        query = query.filter(Document.document_type == search_params.filters.document_type)
    
    if search_params.filters.status:
        query = query.filter(Document.status == search_params.filters.status)
    else:
        query = query.filter(Document.status == DocumentStatus.ACTIVE)
    
    if search_params.filters.owner_id:
        query = query.filter(Document.owner_id == search_params.filters.owner_id)
    
    if search_params.filters.parent_id is not None:
        query = query.filter(Document.parent_id == search_params.filters.parent_id)
    
    if search_params.filters.mime_type:
        query = query.filter(Document.mime_type.like(f"%{search_params.filters.mime_type}%"))
    
    if search_params.filters.is_shared is not None:
        query = query.filter(Document.is_shared == search_params.filters.is_shared)
    
    if search_params.filters.is_sensitive is not None:
        query = query.filter(Document.is_sensitive == search_params.filters.is_sensitive)
    
    if search_params.filters.tags:
        for tag in search_params.filters.tags:
            query = query.filter(Document.tags.contains([tag]))
    
    # Date filters
    if search_params.filters.created_after:
        query = query.filter(Document.created_at >= search_params.filters.created_after)
    if search_params.filters.created_before:
        query = query.filter(Document.created_at <= search_params.filters.created_before)
    
    # Size filters
    if search_params.filters.min_size:
        query = query.filter(Document.file_size >= search_params.filters.min_size)
    if search_params.filters.max_size:
        query = query.filter(Document.file_size <= search_params.filters.max_size)
    
    # Text search in name and description
    if search_params.query:
        search_text = f"%{search_params.query}%"
        query = query.filter(
            or_(
                Document.name.like(search_text),
                Document.description.like(search_text)
            )
        )
    
    # Apply permission filtering
    all_docs = query.all()
    accessible_docs = [doc for doc in all_docs if doc.can_user_access(current_user, "read")]
    
    # Apply sorting
    if search_params.sort_order == "desc":
        accessible_docs.sort(key=lambda d: getattr(d, search_params.sort_by, ""), reverse=True)
    else:
        accessible_docs.sort(key=lambda d: getattr(d, search_params.sort_by, ""))
    
    # Apply pagination
    total_count = len(accessible_docs)
    offset = (search_params.page - 1) * search_params.size
    paginated_docs = accessible_docs[offset:offset + search_params.size]
    
    # Convert to response format
    document_responses = []
    for doc in paginated_docs:
        doc_dict = doc.to_dict()
        doc_dict["can_read"] = True  # Already verified
        doc_dict["can_write"] = doc.can_user_access(current_user, "write")
        doc_dict["can_delete"] = doc.can_user_access(current_user, "delete")
        doc_dict["can_share"] = doc.can_user_access(current_user, "share")
        document_responses.append(DocumentSchema(**doc_dict))
    
    return DocumentList(
        documents=document_responses,
        total=total_count,
        page=search_params.page,
        size=search_params.size,
        has_next=offset + search_params.size < total_count
    )


# Document Permission Endpoints
@router.get("/{document_id}/permissions", response_model=List[DocumentPermissionSchema])
async def get_document_permissions(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all permissions for a document."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if user can manage permissions (owner or admin permission)
    if not (document.owner_id == current_user.id or 
            document.can_user_access(current_user, "admin")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to view document permissions"
        )
    
    permissions = db.query(DocumentPermission).filter(
        DocumentPermission.document_id == document_id
    ).all()
    
    return permissions


@router.post("/{document_id}/permissions", response_model=DocumentPermissionSchema, 
             status_code=status.HTTP_201_CREATED)
async def create_document_permission(
    document_id: int,
    permission_data: DocumentPermissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Grant permission to a user for a document."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if user can manage permissions
    if not (document.owner_id == current_user.id or 
            document.can_user_access(current_user, "admin")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to manage document permissions"
        )
    
    # Check if target user exists
    target_user = db.query(User).filter(User.id == permission_data.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )
    
    # Check if permission already exists
    existing = db.query(DocumentPermission).filter(
        and_(
            DocumentPermission.document_id == document_id,
            DocumentPermission.user_id == permission_data.user_id,
            DocumentPermission.permission_type == permission_data.permission_type
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Permission already exists"
        )
    
    try:
        permission = DocumentPermission(
            document_id=document_id,
            user_id=permission_data.user_id,
            permission_type=permission_data.permission_type,
            granted=permission_data.granted,
            inheritable=permission_data.inheritable,
            expires_at=permission_data.expires_at,
            granted_by=current_user.id,
            conditions=permission_data.conditions
        )
        
        db.add(permission)
        db.commit()
        db.refresh(permission)
        
        # Create access log
        access_log = DocumentAccessLog(
            document_id=document_id,
            user_id=current_user.id,
            action="grant_permission",
            access_method="api",
            success=True,
            details={
                "target_user_id": permission_data.user_id,
                "permission_type": permission_data.permission_type,
                "granted": permission_data.granted
            }
        )
        db.add(access_log)
        db.commit()
        
        return permission
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create permission: {str(e)}"
        )


# Bulk Operations
@router.post("/bulk-operation", response_model=BulkDocumentResult)
async def bulk_document_operation(
    operation: BulkDocumentOperation,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Perform bulk operations on documents."""
    if not has_permission(current_user, "documents:update", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges for bulk operations"
        )
    
    successful = []
    failed = []
    
    for doc_id in operation.document_ids:
        try:
            document = db.query(Document).filter(Document.id == doc_id).first()
            if not document:
                failed.append({"document_id": doc_id, "error": "Document not found"})
                continue
            
            # Check permission for this specific document
            if operation.operation in ["delete", "move", "copy"]:
                required_permission = "write" if operation.operation in ["move", "copy"] else "delete"
                if not document.can_user_access(current_user, required_permission):
                    failed.append({"document_id": doc_id, "error": "Insufficient privileges"})
                    continue
            
            # Perform operation
            if operation.operation == "delete":
                document.status = DocumentStatus.DELETED
                document.deleted_at = func.now()
            elif operation.operation == "archive":
                document.status = DocumentStatus.ARCHIVED
                document.archived_at = func.now()
            elif operation.operation == "restore":
                document.status = DocumentStatus.ACTIVE
            elif operation.operation == "update_tags":
                if "tags" in operation.parameters:
                    document.tags = operation.parameters["tags"]
            
            successful.append(doc_id)
            
        except Exception as e:
            failed.append({"document_id": doc_id, "error": str(e)})
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete bulk operation: {str(e)}"
        )
    
    return BulkDocumentResult(
        successful=successful,
        failed=failed,
        total_processed=len(operation.document_ids)
    )


# Folder Hierarchy Management Endpoints
@router.get("/folders/tree", response_model=List[DocumentTree])
async def get_folder_tree(
    root_id: Optional[int] = Query(None, description="Root folder ID (null for top level)"),
    max_depth: int = Query(10, ge=1, le=20, description="Maximum tree depth"),
    include_documents: bool = Query(False, description="Include documents in tree"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get hierarchical folder tree structure."""
    def build_tree_node(folder: Document, depth: int = 0) -> DocumentTree:
        """Build a tree node with children."""
        # Get children (folders and optionally documents)
        children_query = db.query(Document).filter(
            Document.parent_id == folder.id,
            Document.status == DocumentStatus.ACTIVE
        )
        
        if not include_documents:
            children_query = children_query.filter(Document.document_type == DocumentType.FOLDER)
        
        children = children_query.all()
        accessible_children = [child for child in children if child.can_user_access(current_user, "read")]
        
        # Build child nodes recursively if within depth limit
        child_nodes = []
        if depth < max_depth:
            for child in accessible_children:
                if child.document_type == DocumentType.FOLDER:
                    child_nodes.append(build_tree_node(child, depth + 1))
                elif include_documents:
                    # For documents, create simple tree node without children
                    doc_dict = child.to_dict()
                    doc_dict["can_read"] = True
                    doc_dict["can_write"] = child.can_user_access(current_user, "write")
                    doc_dict["can_delete"] = child.can_user_access(current_user, "delete")
                    doc_dict["can_share"] = child.can_user_access(current_user, "share")
                    
                    child_nodes.append(DocumentTree(
                        document=DocumentSchema(**doc_dict),
                        children=[],
                        depth=depth + 1,
                        has_children=False
                    ))
        
        # Prepare folder document data
        folder_dict = folder.to_dict()
        folder_dict["can_read"] = True
        folder_dict["can_write"] = folder.can_user_access(current_user, "write")
        folder_dict["can_delete"] = folder.can_user_access(current_user, "delete")
        folder_dict["can_share"] = folder.can_user_access(current_user, "share")
        
        return DocumentTree(
            document=DocumentSchema(**folder_dict),
            children=child_nodes,
            depth=depth,
            has_children=len(accessible_children) > 0
        )
    
    try:
        if root_id is None:
            # Get top-level folders
            root_folders = db.query(Document).filter(
                Document.parent_id.is_(None),
                Document.document_type == DocumentType.FOLDER,
                Document.status == DocumentStatus.ACTIVE
            ).all()
            
            accessible_roots = [folder for folder in root_folders if folder.can_user_access(current_user, "read")]
            return [build_tree_node(folder) for folder in accessible_roots]
        else:
            # Get specific folder tree
            root_folder = db.query(Document).filter(Document.id == root_id).first()
            if not root_folder:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Root folder not found"
                )
            
            if not root_folder.can_user_access(current_user, "read"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient privileges to access folder"
                )
            
            return [build_tree_node(root_folder)]
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to build folder tree: {str(e)}"
        )


@router.get("/folders/{folder_id}/path")
async def get_folder_path(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the full path of a folder (breadcrumb trail)."""
    folder = db.query(Document).filter(Document.id == folder_id).first()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    if not folder.can_user_access(current_user, "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to access folder"
        )
    
    # Build path from current folder to root
    path = []
    current = folder
    
    while current:
        # Check access to each folder in path
        if not current.can_user_access(current_user, "read"):
            break
            
        folder_dict = current.to_dict()
        folder_dict["can_read"] = True
        folder_dict["can_write"] = current.can_user_access(current_user, "write")
        folder_dict["can_delete"] = current.can_user_access(current_user, "delete")
        folder_dict["can_share"] = current.can_user_access(current_user, "share")
        
        path.insert(0, DocumentSchema(**folder_dict))
        
        if current.parent_id:
            current = db.query(Document).filter(Document.id == current.parent_id).first()
        else:
            current = None
    
    return {
        "folder_id": folder_id,
        "path": path,
        "depth": len(path)
    }


@router.post("/folders/bulk-move")
async def bulk_move_folders(
    request: DocumentMoveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Move multiple folders to a new parent folder."""
    if not has_permission(current_user, "documents:update", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges for bulk folder operations"
        )
    
    # Validate target folder
    target_folder = None
    if request.target_parent_id:
        target_folder = db.query(Document).filter(Document.id == request.target_parent_id).first()
        if not target_folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target folder not found"
            )
        
        if target_folder.document_type != DocumentType.FOLDER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target must be a folder"
            )
        
        if not target_folder.can_user_access(current_user, "write"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges to move to target folder"
            )
    
    successful = []
    failed = []
    
    for folder_id in request.folder_ids:
        try:
            folder = db.query(Document).filter(Document.id == folder_id).first()
            if not folder:
                failed.append({"folder_id": folder_id, "error": "Folder not found"})
                continue
            
            if folder.document_type != DocumentType.FOLDER:
                failed.append({"folder_id": folder_id, "error": "Not a folder"})
                continue
            
            if not folder.can_user_access(current_user, "write"):
                failed.append({"folder_id": folder_id, "error": "Insufficient privileges"})
                continue
            
            # Check for circular reference
            if target_folder and target_folder.id == folder_id:
                failed.append({"folder_id": folder_id, "error": "Cannot move folder into itself"})
                continue
            
            # Check if target is a descendant of source (would create circular reference)
            if target_folder:
                current_check = target_folder
                while current_check:
                    if current_check.parent_id == folder_id:
                        failed.append({"folder_id": folder_id, "error": "Cannot move folder into its descendant"})
                        break
                    current_check = db.query(Document).filter(Document.id == current_check.parent_id).first() if current_check.parent_id else None
                else:
                    # No circular reference found, proceed with move
                    folder.parent_id = request.target_parent_id
                    folder.update_path()
                    folder.updated_by = current_user.id
                    folder.updated_at = func.now()
                    successful.append(folder_id)
            else:
                # Moving to root level
                folder.parent_id = None
                folder.update_path()
                folder.updated_by = current_user.id
                folder.updated_at = func.now()
                successful.append(folder_id)
            
        except Exception as e:
            failed.append({"folder_id": folder_id, "error": str(e)})
    
    try:
        db.commit()
        
        # Create access logs for successful moves
        for folder_id in successful:
            access_log = DocumentAccessLog(
                document_id=folder_id,
                user_id=current_user.id,
                action="move",
                access_method="api",
                success=True,
                details={"target_parent_id": request.target_parent_id}
            )
            db.add(access_log)
        
        db.commit()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete bulk move operation: {str(e)}"
        )
    
    return {
        "successful": successful,
        "failed": failed,
        "total_processed": len(request.folder_ids)
    }


@router.post("/folders/{folder_id}/copy")
async def copy_folder_hierarchy(
    folder_id: int,
    request: DocumentCopyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Copy a folder and its entire hierarchy to a new location."""
    if not has_permission(current_user, "documents:create", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to copy folders"
        )
    
    # Get source folder
    source_folder = db.query(Document).filter(Document.id == folder_id).first()
    if not source_folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source folder not found"
        )
    
    if source_folder.document_type != DocumentType.FOLDER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source must be a folder"
        )
    
    if not source_folder.can_user_access(current_user, "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to read source folder"
        )
    
    # Validate target parent
    target_parent = None
    if request.target_parent_id:
        target_parent = db.query(Document).filter(Document.id == request.target_parent_id).first()
        if not target_parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target parent folder not found"
            )
        
        if not target_parent.can_user_access(current_user, "write"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges to create in target folder"
            )
    
    def copy_folder_recursive(source: Document, new_parent_id: Optional[int], name_suffix: str = "") -> Document:
        """Recursively copy folder and its contents."""
        # Create new folder
        new_name = f"{source.name}{name_suffix}" if name_suffix else source.name
        
        new_folder = Document(
            name=new_name,
            description=f"Copy of {source.description}" if source.description else f"Copy of {source.name}",
            document_type=DocumentType.FOLDER,
            parent_id=new_parent_id,
            owner_id=current_user.id,
            created_by=current_user.id,
            tags=source.tags.copy() if source.tags else [],
            doc_metadata=source.doc_metadata.copy() if source.doc_metadata else {},
            is_sensitive=source.is_sensitive,
            share_type=source.share_type
        )
        
        db.add(new_folder)
        db.flush()  # Get ID without committing
        
        # Copy child folders
        child_folders = db.query(Document).filter(
            Document.parent_id == source.id,
            Document.document_type == DocumentType.FOLDER,
            Document.status == DocumentStatus.ACTIVE
        ).all()
        
        for child_folder in child_folders:
            if child_folder.can_user_access(current_user, "read"):
                copy_folder_recursive(child_folder, new_folder.id)
        
        # Copy child documents if requested
        if request.include_documents:
            child_documents = db.query(Document).filter(
                Document.parent_id == source.id,
                Document.document_type == DocumentType.DOCUMENT,
                Document.status == DocumentStatus.ACTIVE
            ).all()
            
            for child_doc in child_documents:
                if child_doc.can_user_access(current_user, "read"):
                    # Note: For encrypted files, we would need to handle file copying separately
                    # This creates document metadata copy only
                    new_doc = Document(
                        name=child_doc.name,
                        description=f"Copy of {child_doc.description}" if child_doc.description else f"Copy of {child_doc.name}",
                        document_type=DocumentType.DOCUMENT,
                        mime_type=child_doc.mime_type,
                        file_size=child_doc.file_size,
                        file_hash_sha256=child_doc.file_hash_sha256,
                        storage_path=child_doc.storage_path,  # Would need actual file copy
                        parent_id=new_folder.id,
                        owner_id=current_user.id,
                        created_by=current_user.id,
                        tags=child_doc.tags.copy() if child_doc.tags else [],
                        doc_metadata=child_doc.doc_metadata.copy() if child_doc.doc_metadata else {},
                        is_sensitive=child_doc.is_sensitive,
                        is_encrypted=child_doc.is_encrypted,
                        encryption_key_id=child_doc.encryption_key_id
                    )
                    db.add(new_doc)
        
        return new_folder
    
    try:
        # Check if name already exists in target location
        name_suffix = ""
        if request.new_name:
            base_name = request.new_name
        else:
            base_name = source_folder.name
            existing = db.query(Document).filter(
                Document.parent_id == request.target_parent_id,
                Document.name == base_name,
                Document.document_type == DocumentType.FOLDER
            ).first()
            
            if existing:
                # Add suffix to avoid naming conflict
                counter = 1
                while existing:
                    name_suffix = f" (Copy {counter})"
                    test_name = f"{base_name}{name_suffix}"
                    existing = db.query(Document).filter(
                        Document.parent_id == request.target_parent_id,
                        Document.name == test_name,
                        Document.document_type == DocumentType.FOLDER
                    ).first()
                    counter += 1
        
        # Perform the copy
        new_folder = copy_folder_recursive(source_folder, request.target_parent_id, name_suffix)
        db.commit()
        
        # Create access log
        access_log = DocumentAccessLog(
            document_id=new_folder.id,
            user_id=current_user.id,
            action="copy",
            access_method="api",
            success=True,
            details={
                "source_folder_id": folder_id,
                "target_parent_id": request.target_parent_id,
                "include_documents": request.include_documents
            }
        )
        db.add(access_log)
        db.commit()
        
        # Return the new folder with permissions
        folder_dict = new_folder.to_dict()
        folder_dict["can_read"] = True
        folder_dict["can_write"] = True
        folder_dict["can_delete"] = True
        folder_dict["can_share"] = True
        
        return DocumentSchema(**folder_dict)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to copy folder hierarchy: {str(e)}"
        )


@router.post("/folders/{folder_id}/permissions/inherit")
async def apply_permission_inheritance(
    folder_id: int,
    recursive: bool = Query(True, description="Apply to all subfolders"),
    overwrite_existing: bool = Query(False, description="Overwrite existing permissions"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Apply permission inheritance to a folder hierarchy."""
    if not has_permission(current_user, "documents:admin", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges for permission inheritance operations"
        )
    
    # Get source folder
    folder = db.query(Document).filter(Document.id == folder_id).first()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    if folder.document_type != DocumentType.FOLDER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission inheritance only applies to folders"
        )
    
    if not folder.can_user_access(current_user, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to manage folder permissions"
        )
    
    # Get inheritable permissions from source folder
    source_permissions = db.query(DocumentPermission).filter(
        DocumentPermission.document_id == folder_id,
        DocumentPermission.inheritable == True
    ).all()
    
    if not source_permissions:
        return {
            "message": "No inheritable permissions found on source folder",
            "folders_processed": 0,
            "permissions_applied": 0
        }
    
    def apply_to_folder(target_folder: Document) -> int:
        """Apply permissions to a single folder."""
        permissions_applied = 0
        
        for source_perm in source_permissions:
            # Check if permission already exists
            existing = db.query(DocumentPermission).filter(
                DocumentPermission.document_id == target_folder.id,
                DocumentPermission.user_id == source_perm.user_id,
                DocumentPermission.permission_type == source_perm.permission_type
            ).first()
            
            if existing and not overwrite_existing:
                continue
            
            if existing and overwrite_existing:
                # Update existing permission
                existing.granted = source_perm.granted
                existing.inheritable = source_perm.inheritable
                existing.expires_at = source_perm.expires_at
                existing.conditions = source_perm.conditions
                existing.granted_by = current_user.id
                permissions_applied += 1
            else:
                # Create new permission
                new_permission = DocumentPermission(
                    document_id=target_folder.id,
                    user_id=source_perm.user_id,
                    permission_type=source_perm.permission_type,
                    granted=source_perm.granted,
                    inheritable=source_perm.inheritable,
                    expires_at=source_perm.expires_at,
                    granted_by=current_user.id,
                    conditions=source_perm.conditions
                )
                db.add(new_permission)
                permissions_applied += 1
        
        return permissions_applied
    
    try:
        folders_processed = 0
        total_permissions_applied = 0
        
        if recursive:
            # Get all subfolders
            def get_all_subfolders(parent_id: int) -> List[Document]:
                """Recursively get all subfolders."""
                subfolders = db.query(Document).filter(
                    Document.parent_id == parent_id,
                    Document.document_type == DocumentType.FOLDER,
                    Document.status == DocumentStatus.ACTIVE
                ).all()
                
                all_subfolders = []
                for subfolder in subfolders:
                    if subfolder.can_user_access(current_user, "admin"):
                        all_subfolders.append(subfolder)
                        all_subfolders.extend(get_all_subfolders(subfolder.id))
                
                return all_subfolders
            
            target_folders = get_all_subfolders(folder_id)
            
            for target_folder in target_folders:
                permissions_applied = apply_to_folder(target_folder)
                total_permissions_applied += permissions_applied
                folders_processed += 1
        
        db.commit()
        
        # Create access log
        access_log = DocumentAccessLog(
            document_id=folder_id,
            user_id=current_user.id,
            action="permission_inheritance",
            access_method="api",
            success=True,
            details={
                "recursive": recursive,
                "folders_processed": folders_processed,
                "permissions_applied": total_permissions_applied,
                "overwrite_existing": overwrite_existing
            }
        )
        db.add(access_log)
        db.commit()
        
        return {
            "message": "Permission inheritance applied successfully",
            "folders_processed": folders_processed,
            "permissions_applied": total_permissions_applied
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply permission inheritance: {str(e)}"
        )


# Health Check
@router.get("/health")
async def documents_health_check(db: Session = Depends(get_db)):
    """Check document system health."""
    try:
        document_count = db.query(Document).count()
        active_count = db.query(Document).filter(Document.status == DocumentStatus.ACTIVE).count()
        
        return {
            "status": "healthy",
            "total_documents": document_count,
            "active_documents": active_count,
            "storage_available": True  # Would check actual storage
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Document system unhealthy: {str(e)}"
        )