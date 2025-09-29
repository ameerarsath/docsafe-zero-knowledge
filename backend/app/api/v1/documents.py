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
from pydantic import BaseModel
from fastapi import (
    APIRouter, Depends, HTTPException, status, Query, UploadFile, 
    File, Form, BackgroundTasks
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
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
    DocumentStatistics,
    BulkFolderCreateRequest,
    BulkFolderCreateResult,
    BatchFileUploadRequest,
    BatchFileUploadResult,
    FolderUploadStatus
)


router = APIRouter(prefix="/documents", tags=["Documents"])


# Document CRUD Endpoints
@router.get("/", response_model=DocumentList)
async def list_documents(
    parent_id: Optional[int] = Query(None, description="Parent folder ID"),
    document_type: Optional[DocumentType] = Query(None, description="Document type filter"),
    status: Optional[DocumentStatus] = Query(DocumentStatus.ACTIVE, description="Document status"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    search: Optional[str] = Query(None, description="Search in document names and descriptions"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    sort_by: str = Query("updated_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List documents and folders with filtering and pagination."""
    try:
        print(f"[DOCUMENTS] Listing documents for user {current_user.username} (ID: {current_user.id})")
        print(f"[DOCUMENTS] Parameters: parent_id={parent_id}, status={status}, page={page}, size={size}")

        # Build base query with permission filtering and eager loading
        query = db.query(Document).options(
            joinedload(Document.permissions),
            joinedload(Document.owner),
            joinedload(Document.parent)
        ).filter(Document.status == status)

        # Filter by parent folder
        if parent_id is not None:
            query = query.filter(Document.parent_id == parent_id)
        else:
            query = query.filter(Document.parent_id.is_(None))  # Root level

        # Filter by document type
        if document_type:
            query = query.filter(Document.document_type == document_type)

        # Filter by search term
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Document.name.ilike(search_term),
                    Document.description.ilike(search_term)
                )
            )

        # Get all matching documents for tag and permission filtering
        all_docs = query.all()

        # Apply tag filtering (done in Python because tags are stored as JSON)
        if tags:
            tag_list = [tag.strip().lower() for tag in tags.split(",") if tag.strip()]
            filtered_docs = []
            for doc in all_docs:
                if doc.tags and isinstance(doc.tags, list):
                    doc_tags_lower = [tag.lower() for tag in doc.tags]
                    # Check if all requested tags are present (AND logic)
                    if all(tag in doc_tags_lower for tag in tag_list):
                        filtered_docs.append(doc)
            all_docs = filtered_docs

        # Apply permission filtering - simplified approach
        accessible_docs = []

        for doc in all_docs:
            # Simplified access check: owner always has access, admin sees all
            if current_user.is_admin or doc.owner_id == current_user.id:
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

    except Exception as e:
        print(f"[ERROR] Documents listing failed: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list documents: {str(e)}"
        )


# Statistics Endpoint (moved before {document_id} to avoid route conflict)
@router.get("/statistics", response_model=DocumentStatistics)
async def get_document_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get document statistics for the current user."""
    print(f"[STATS] STATISTICS ENDPOINT CALLED for user {current_user.username} (ID: {current_user.id})")
    print(f"[STATS] User is_admin: {current_user.is_admin}")
    
    # Simplified permission check - allow all authenticated users to view statistics
    print(f"[STATS] User {current_user.username} accessing statistics (Admin: {getattr(current_user, 'is_admin', False)})")
    
    try:
        # Simple and reliable statistics calculation
        from sqlalchemy import func
        
        print(f"[STATS] Starting simple calculation for user {current_user.username}")
        
        # Base filter for user access (defensive)
        is_admin = getattr(current_user, 'is_admin', False)
        print(f"[STATS] User admin status: {is_admin}")
        
        if is_admin:
            user_filter = Document.status == DocumentStatus.ACTIVE
            print("[STATS] Using admin filter (all active documents)")
        else:
            user_filter = and_(
                Document.status == DocumentStatus.ACTIVE,
                Document.owner_id == current_user.id
            )
            print(f"[STATS] Using user filter (owner_id={current_user.id})")
        
        # Simple counts using direct aggregation
        total_documents = db.query(func.count(Document.id)).filter(
            user_filter,
            Document.document_type == DocumentType.DOCUMENT
        ).scalar() or 0
        
        total_folders = db.query(func.count(Document.id)).filter(
            user_filter,
            Document.document_type == DocumentType.FOLDER
        ).scalar() or 0
        
        total_size = db.query(func.sum(Document.file_size)).filter(user_filter).scalar() or 0
        
        # Enhanced counts (simplified but working)
        encrypted_documents = db.query(func.count(Document.id)).filter(
            user_filter, Document.is_encrypted == True
        ).scalar() or 0
        
        shared_documents = db.query(func.count(Document.id)).filter(
            user_filter, Document.is_shared == True
        ).scalar() or 0
        
        sensitive_documents = db.query(func.count(Document.id)).filter(
            user_filter, Document.is_sensitive == True
        ).scalar() or 0
        
        # Simple aggregations
        docs_by_type = {
            "document": total_documents,
            "folder": total_folders
        }
        
        docs_by_status = {
            "active": total_documents + total_folders
        }
        
        print(f"[STATS] Calculated: docs={total_documents}, folders={total_folders}, size={total_size}")
        
        # Return simple but complete statistics
        result = DocumentStatistics(
            total_documents=total_documents,
            total_folders=total_folders,
            total_size=total_size,
            encrypted_documents=encrypted_documents,
            shared_documents=shared_documents,
            sensitive_documents=sensitive_documents,
            documents_by_type=docs_by_type,
            documents_by_status=docs_by_status,
            storage_usage_by_user={},
            recent_activity_count=0,
            active_documents=total_documents,
            archived_documents=0,
            deleted_documents=0,
            active_storage_size=total_size,
            archived_storage_size=0,
            deleted_storage_size=0,
            documents_created_today=0,
            documents_modified_today=0,
            avg_document_size=0.0,
            largest_document_size=0
        )
        print(f"[STATS] Success: {result}")
        return result
        
    except Exception as e:
        print(f"[ERROR] STATISTICS ERROR: {e}")
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
            recent_activity_count=0,
            # Enhanced fallback values
            active_documents=0,
            archived_documents=0,
            deleted_documents=0,
            active_storage_size=0,
            archived_storage_size=0,
            deleted_storage_size=0,
            documents_created_today=0,
            documents_modified_today=0,
            avg_document_size=0.0,
            largest_document_size=0
        )
        print(f"[ERROR] RETURNING FALLBACK: {fallback}")
        return fallback


# Trash Management Endpoints (must come before /{document_id} to avoid route conflicts)
@router.get("/trash", response_model=DocumentList)
async def list_trash_items(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    sort_by: str = Query("updated_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all documents in trash for the current user (all hierarchy levels)."""
    # Check user permissions
    if not has_permission(current_user, "documents:read", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to view trash"
        )

    try:
        # Get all deleted documents for the user (regardless of parent_id)
        query = db.query(Document).filter(
            Document.owner_id == current_user.id,
            Document.status == DocumentStatus.DELETED
        )

        # Apply sorting
        if sort_by == "name":
            order_func = Document.name.asc() if sort_order == "asc" else Document.name.desc()
        elif sort_by == "created_at":
            order_func = Document.created_at.asc() if sort_order == "asc" else Document.created_at.desc()
        elif sort_by == "updated_at":
            order_func = Document.updated_at.asc() if sort_order == "asc" else Document.updated_at.desc()
        elif sort_by == "file_size":
            order_func = Document.file_size.asc() if sort_order == "asc" else Document.file_size.desc()
        else:
            order_func = Document.updated_at.desc()

        query = query.order_by(order_func)

        # Get total count
        total = query.count()

        # Apply pagination
        documents = query.offset((page - 1) * size).limit(size).all()

        # Convert to response format with permissions
        document_responses = []
        for doc in documents:
            doc_dict = doc.to_dict()
            
            # Add computed permission flags
            doc_dict["can_read"] = doc.can_user_access(current_user, "read")
            doc_dict["can_write"] = doc.can_user_access(current_user, "write") 
            doc_dict["can_delete"] = doc.can_user_access(current_user, "delete")
            doc_dict["can_share"] = doc.can_user_access(current_user, "share")
            
            document_responses.append(DocumentSchema(**doc_dict))

        return DocumentList(
            documents=document_responses,
            total=total,
            page=page,
            size=size,
            has_next=total > page * size
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list trash items: {str(e)}"
        )


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
    document.accessed_at = datetime.now()
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
        
        db.commit()
        db.refresh(document)
        
        # Create access log
        access_log = DocumentAccessLog(
            document_id=document.id,
            user_id=current_user.id,
            action="write",  # Use 'write' instead of 'update' to match DB constraint
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
            action = "delete"  # Use 'delete' instead of 'permanent_delete' to match DB constraint
        else:
            # Archive the document
            document.status = DocumentStatus.DELETED
            document.deleted_at = datetime.now()
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
    """Upload an encrypted file with metadata (Unicode-safe)."""
    import os, json, hashlib, base64, re

    # --- Step 1: Save upload_data safely ---
    try:
        with open("upload_data.log", "w", encoding="utf-8") as f:
            f.write(upload_data)
    except Exception as e:
        print(f"WARNING: Failed to log upload_data: {e}")

    # --- Step 2: Check permissions ---
    if not has_permission(current_user, "documents:create", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to upload files"
        )
    
    # --- Step 3: Parse and validate metadata ---
    try:
        print(f"DEBUG: Raw upload_data received: {upload_data}")
        upload_metadata_dict = json.loads(upload_data)  # UTF-8 safe
        print(f"DEBUG: Parsed upload metadata: {upload_metadata_dict}")
        
        # Check if this is zero-knowledge upload
        is_zero_knowledge = 'encrypted_dek' in upload_metadata_dict
        print(f"[UPLOAD] Upload type detected: {'Zero-Knowledge' if is_zero_knowledge else 'Legacy'}")
        
        upload_metadata = DocumentUpload.parse_obj(upload_metadata_dict)
        print(f"SUCCESS: Upload metadata validated successfully")
        
        if is_zero_knowledge:
            print(f"[CRYPTO] Zero-knowledge fields: encrypted_dek length={len(upload_metadata.encrypted_dek) if upload_metadata.encrypted_dek else 0}, algorithm={upload_metadata.encryption_algorithm}")
        else:
            print(f"[CRYPTO] Legacy encryption fields: key_id={upload_metadata.encryption_key_id}, iv={upload_metadata.encryption_iv[:20] if upload_metadata.encryption_iv else 'None'}...")
            
    except Exception as e:
        print(f"ERROR: Upload metadata parsing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid upload metadata: {str(e)}"
        )
    
    # --- Step 4: Validate encrypted file size ---
    content = await file.read()
    encrypted_size = len(content)
    original_size = upload_metadata.file_size
    max_expected_size = original_size + (original_size * 0.1) + 1024
    if encrypted_size > max_expected_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Encrypted file size ({encrypted_size}) exceeds expected overhead"
        )

    # --- Step 5: Sanitize filename for filesystem ---
    safe_name = re.sub(r'[^\x00-\x7F]+', '_', upload_metadata.name)
    file_extension = "." + safe_name.split(".")[-1] if "." in safe_name else ""
    
    # Note: file_hash in upload_metadata should be the hash of the original file
    # The encrypted file hash would be different and is not needed for validation
    
    try:
        # --- Step 6: Generate storage path ---
        hash_input = f"{upload_metadata.name}{upload_metadata.file_size}{current_user.id}".encode('utf-8')
        document_uuid = hashlib.sha256(hash_input).hexdigest()
        storage_path = os.path.join(
            settings.ENCRYPTED_FILES_PATH,
            str(current_user.id),
            document_uuid[:2],
            f"{document_uuid}.enc"
        )
        
        os.makedirs(os.path.dirname(storage_path), exist_ok=True)

        # --- Step 7: Save file safely ---
        with open(storage_path, "wb") as f:
            f.write(content)
        
        # Create document record
        print(f"[DB] Creating document record with encryption metadata...")
        
        # Check if this is zero-knowledge or legacy encryption
        is_zero_knowledge = upload_metadata.encrypted_dek is not None
        
        if is_zero_knowledge:
            # Zero-knowledge encryption (DEK-per-document architecture)
            print(f"[CRYPTO] Zero-knowledge upload detected")

            # For zero-knowledge uploads, encryption_iv is already base64 string, store as-is
            document = Document(
                name=upload_metadata.name,        # original name for DB/display
                file_extension=file_extension,
                description=upload_metadata.description,
                document_type=DocumentType.DOCUMENT,
                mime_type=upload_metadata.mime_type,
                file_size=upload_metadata.original_size or upload_metadata.file_size,
                file_hash_sha256=upload_metadata.file_hash,
                storage_path=storage_path,
                parent_id=upload_metadata.parent_id,
                owner_id=current_user.id,
                created_by=current_user.id,
                # Zero-knowledge specific fields
                salt=upload_metadata.salt, # Save the salt for future decryption
                encrypted_dek=upload_metadata.encrypted_dek,
                encryption_iv=upload_metadata.encryption_iv,  # Keep as base64 string
                encryption_algorithm=upload_metadata.encryption_algorithm or "AES-256-GCM",
                tags=upload_metadata.tags,
                doc_metadata=upload_metadata.doc_metadata,
                is_sensitive=upload_metadata.is_sensitive,
                is_encrypted=True
            )
            print(f"[CRYPTO] Zero-knowledge document created: encrypted_dek_length={len(upload_metadata.encrypted_dek) if upload_metadata.encrypted_dek else 0}")
        else:
            # Legacy encryption format
            print(f"[CRYPTO] Legacy encryption upload detected")

            from ...models.encryption import UserEncryptionKey
            if not upload_metadata.encryption_key_id:
                raise HTTPException(status_code=422, detail="encryption_key_id is required for legacy uploads.")

            encryption_key = db.query(UserEncryptionKey).filter(UserEncryptionKey.key_id == upload_metadata.encryption_key_id).first()
            if not encryption_key:
                raise HTTPException(status_code=404, detail=f"Encryption key with id {upload_metadata.encryption_key_id} not found.")
            
            if not encryption_key.salt:
                raise HTTPException(status_code=500, detail=f"Data integrity error: Encryption key {encryption_key.key_id} is missing a salt.")

            print(f"[CRYPTO] Encryption data: iv={upload_metadata.encryption_iv[:20]}..., auth_tag={upload_metadata.encryption_auth_tag[:20]}...")

            document = Document(
                name=upload_metadata.name,        # original name for DB/display
                file_extension=file_extension,
                description=upload_metadata.description,
                document_type=DocumentType.DOCUMENT,
                mime_type=upload_metadata.mime_type,
                file_size=upload_metadata.file_size,
                file_hash_sha256=upload_metadata.file_hash,
                storage_path=storage_path,
                parent_id=upload_metadata.parent_id,
                owner_id=current_user.id,
                created_by=current_user.id,
                salt=encryption_key.salt, # Save the salt from the key for future decryption
                encryption_key_id=upload_metadata.encryption_key_id,
                encryption_iv=upload_metadata.encryption_iv,  # Keep as base64 string
                encryption_auth_tag=upload_metadata.encryption_auth_tag,  # Keep as base64 string
                tags=upload_metadata.tags,
                doc_metadata=upload_metadata.doc_metadata,
                is_sensitive=upload_metadata.is_sensitive,
                is_encrypted=True
            )
        
        print(f"[DB] Document created with: name={document.name}, encryption_key_id={document.encryption_key_id}, is_encrypted={document.is_encrypted}")
        
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

    # Check if file exists on disk with detailed error messages
    if not document.storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file path is not configured. The file may have been moved or deleted from the system."
        )

    if not os.path.exists(document.storage_path):
        # Log the missing file for admin investigation
        print(f"ERROR MISSING FILE: Document '{document.name}' (ID: {document.id}) file not found at path: {document.storage_path}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document file is missing from disk storage. The file '{document.name}' may have been moved, deleted, or the storage location is no longer accessible."
        )

    # VALIDATION: Check and correct file size consistency
    try:
        actual_file_size = os.path.getsize(document.storage_path)
        print(f"DOWNLOAD DIAGNOSTIC - Document ID: {document.id}")
        print(f"DOWNLOAD DIAGNOSTIC - Document name: {document.name}")
        print(f"DOWNLOAD DIAGNOSTIC - Storage path: {document.storage_path}")
        print(f"DOWNLOAD DIAGNOSTIC - DB file_size: {document.file_size}")
        print(f"DOWNLOAD DIAGNOSTIC - Actual file size: {actual_file_size}")
        print(f"DOWNLOAD DIAGNOSTIC - Size mismatch: {document.file_size != actual_file_size}")
        print(f"DOWNLOAD DIAGNOSTIC - MIME type: {document.mime_type}")
        print(f"DOWNLOAD DIAGNOSTIC - Is encrypted: {document.is_encrypted}")

        # FIX: If there's a size mismatch, update the database with correct size
        if document.file_size != actual_file_size:
            print(f"WARNING: SIZE MISMATCH DETECTED! Updating DB size from {document.file_size} to {actual_file_size}")
            document.file_size = actual_file_size
            db.commit()
            print(f"SUCCESS: Database file size updated successfully")
    except Exception as e:
        print(f"ERROR checking/correcting file size: {e}")
        # Continue with download even if size check fails
        actual_file_size = document.file_size or 0

    encrypted_file_size = actual_file_size

    # Log access
    access_log = DocumentAccessLog(
        document_id=document.id,
        user_id=current_user.id,
        action="download",
        access_method="api",
        success=True
    )
    db.add(access_log)
    db.commit()

    # Update last accessed time
    document.accessed_at = datetime.now()
    db.commit()

    # Read file content directly to avoid Content-Length issues
    try:
        with open(document.storage_path, 'rb') as file:
            file_content = file.read()

        print(f"SUCCESS: File read successfully, content size: {len(file_content)} bytes")

        # Return file content using basic Response (no Content-Length header)
        from fastapi.responses import Response
        return Response(
            content=file_content,
            media_type=document.mime_type or "application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{document.name}"
            }
        )
    except FileNotFoundError:
        # File was deleted between the existence check and file read
        print(f"ERROR FILE DISAPPEARED: Document '{document.name}' (ID: {document.id}) was deleted during download attempt")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document file '{document.name}' was deleted or moved during download. Please refresh the page and try again."
        )
    except PermissionError:
        # File access permission denied
        print(f"ERROR PERMISSION DENIED: Cannot access document '{document.name}' (ID: {document.id}) at path: {document.storage_path}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied to document file '{document.name}'. The file permissions may have changed or the storage is inaccessible."
        )
    except Exception as e:
        # Other file read errors
        print(f"ERROR reading file '{document.name}' (ID: {document.id}): {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read document file '{document.name}'. The file may be corrupted or inaccessible: {str(e)}"
        )


class DecryptDownloadRequest(BaseModel):
    password: str


@router.post("/{document_id}/download/decrypted")
async def download_decrypted_file(
    document_id: int,
    request: DecryptDownloadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a decrypted file with password authentication."""
    from ...services.document_service import DocumentService
    
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if it's a document (not folder)
    if document.document_type != DocumentType.DOCUMENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot download a folder"
        )
    
    # Check if document is encrypted
    if not document.is_encrypted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not encrypted. Use regular download endpoint."
        )
    
    # Decrypt document content
    document_service = DocumentService(db)
    try:
        decrypted_content = await document_service.decrypt_document_content(
            document_id, current_user.id, request.password
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong password or decryption failed"
        )
    
    # Create access log
    access_log = DocumentAccessLog(
        document_id=document.id,
        user_id=current_user.id,
        action="download",
        access_method="api_decrypted",
        success=True
    )
    db.add(access_log)
    db.commit()
    
    def content_generator():
        yield decrypted_content
    
    return StreamingResponse(
        content_generator(),
        media_type=document.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename*=UTF-8\'\'{document.name}',
            "Content-Length": str(len(decrypted_content))
        }
    )



@router.get("/{document_id}/encryption-data")
async def get_document_encryption_data(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get document encryption data for client-side decryption."""
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

    # Check if it's a document (not folder)
    if document.document_type != DocumentType.DOCUMENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot get encryption data for a folder"
        )

    if not document.is_encrypted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not encrypted"
        )

    # Validate required encryption fields
    if not document.ciphertext:
        # If ciphertext is missing, try to read from file and populate it
        if document.storage_path and os.path.exists(document.storage_path):
            try:
                import base64
                with open(document.storage_path, 'rb') as file:
                    file_content = file.read()
                    document.ciphertext = base64.b64encode(file_content).decode('utf-8')
                    db.commit()
                    print(f"MIGRATION: Populated ciphertext for document {document.id} from file")
            except Exception as e:
                print(f"ERROR: Failed to read file content for document {document.id}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve document content"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document ciphertext not found and file is missing"
            )

    if not document.encryption_iv or not document.encryption_auth_tag:
        # Check for encryption data truncation
        iv_length = len(document.encryption_iv) if document.encryption_iv else 0
        tag_length = len(document.encryption_auth_tag) if document.encryption_auth_tag else 0

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"TRUNCATION_DETECTED: Encryption data incomplete (IV: {iv_length}B, AuthTag: {tag_length}B)"
        )

    # Log access
    access_log = DocumentAccessLog(
        document_id=document.id,
        user_id=current_user.id,
        action="read",
        access_method="api",
        success=True,
        details={"endpoint": "encryption-data"}
    )
    db.add(access_log)
    db.commit()

    # Update last accessed time
    document.accessed_at = datetime.now()
    db.commit()

    # DEBUG: Log encryption data being returned
    print(f"DEBUG ENCRYPTION DATA - Document {document.id}:")
    print(f"  ciphertext type: {type(document.ciphertext)}, length: {len(document.ciphertext) if document.ciphertext else 0}")
    print(f"  encryption_iv type: {type(document.encryption_iv)}, length: {len(document.encryption_iv) if document.encryption_iv else 0}")
    print(f"  encryption_auth_tag type: {type(document.encryption_auth_tag)}, length: {len(document.encryption_auth_tag) if document.encryption_auth_tag else 0}")
    print(f"  encryption_algorithm: {document.encryption_algorithm}")
    print(f"  encrypted_dek: {document.encrypted_dek[:50] if document.encrypted_dek else None}...")

    # FIX: Convert bytes to base64 strings for frontend compatibility
    encryption_iv_b64 = base64.b64encode(document.encryption_iv).decode('utf-8') if document.encryption_iv else None
    encryption_auth_tag_b64 = base64.b64encode(document.encryption_auth_tag).decode('utf-8') if document.encryption_auth_tag else None

    print(f"DEBUG ENCRYPTION DATA - After base64 conversion:")
    print(f"  encryption_iv_b64: {encryption_iv_b64}")
    print(f"  encryption_auth_tag_b64: {encryption_auth_tag_b64}")

    # Return encryption data for client-side decryption
    return {
        "id": document.id,
        "name": document.name,
        "mime_type": document.mime_type,
        "file_size": document.file_size,
        "ciphertext": document.ciphertext,
        "encryption_iv": encryption_iv_b64,
        "encryption_auth_tag": encryption_auth_tag_b64,
        "encryption_algorithm": document.encryption_algorithm,
        "encrypted_dek": document.encrypted_dek,
        "is_encrypted": document.is_encrypted
    }


# Search and Filter Endpoints
@router.post("/search", response_model=DocumentList)
async def search_documents(
    search_params: DocumentSearch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enhanced search documents with advanced filtering and full-text capabilities."""
    from ...models.user import User as UserModel
    
    # Build base query with joins for author search
    query = db.query(Document).outerjoin(UserModel, Document.created_by == UserModel.id)
    
    # Apply status filter (default to active)
    if search_params.filters.status:
        query = query.filter(Document.status == search_params.filters.status)
    else:
        query = query.filter(Document.status == DocumentStatus.ACTIVE)
    
    # Apply basic filters
    if search_params.filters.document_type:
        query = query.filter(Document.document_type == search_params.filters.document_type)
    
    if search_params.filters.owner_id:
        query = query.filter(Document.owner_id == search_params.filters.owner_id)
    
    if search_params.filters.parent_id is not None:
        query = query.filter(Document.parent_id == search_params.filters.parent_id)
    
    if search_params.filters.is_shared is not None:
        query = query.filter(Document.is_shared == search_params.filters.is_shared)
    
    if search_params.filters.is_sensitive is not None:
        query = query.filter(Document.is_sensitive == search_params.filters.is_sensitive)
    
    # Enhanced MIME type and file extension filtering
    if search_params.filters.mime_type:
        mime_filter = search_params.filters.mime_type.lower()
        
        # File type categories
        type_categories = {
            'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/rtf'],
            'spreadsheet': ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
            'presentation': ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
            'image': ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml'],
            'video': ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo'],
            'audio': ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg'],
            'archive': ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar'],
            'code': ['text/x-python', 'text/javascript', 'text/html', 'text/css', 'application/json', 'text/x-java-source']
        }
        
        if mime_filter in type_categories:
            # Search by category
            query = query.filter(Document.mime_type.in_(type_categories[mime_filter]))
        else:
            # Search by specific mime type or pattern
            query = query.filter(Document.mime_type.ilike(f"%{mime_filter}%"))
    
    # File category filtering (alternative to mime_type)
    if search_params.filters.file_category:
        type_categories = {
            'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/rtf'],
            'spreadsheet': ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
            'presentation': ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
            'image': ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml'],
            'video': ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo'],
            'audio': ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg'],
            'archive': ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar'],
            'code': ['text/x-python', 'text/javascript', 'text/html', 'text/css', 'application/json', 'text/x-java-source']
        }
        
        category_types = type_categories.get(search_params.filters.file_category, [])
        if category_types:
            query = query.filter(Document.mime_type.in_(category_types))
    
    # Author filtering (admin only)
    if search_params.filters.author_id:
        if not (current_user.role and current_user.role in ['admin', 'super_admin']):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can filter by author"
            )
        query = query.filter(Document.created_by == search_params.filters.author_id)
    
    # Enhanced tag filtering with suggestions support
    if search_params.filters.tags:
        for tag in search_params.filters.tags:
            # Use case-insensitive search in JSONB array
            query = query.filter(
                func.jsonb_path_exists(
                    Document.tags,
                    f'$[*] ? (@ like_regex "{tag.lower()}" flag "i")'
                )
            )
    
    # Enhanced date filtering with smart ranges
    if search_params.filters.date_range:
        from datetime import timedelta
        now = datetime.now()
        
        date_ranges = {
            'today': now.replace(hour=0, minute=0, second=0, microsecond=0),
            'week': now - timedelta(days=7),
            'month': now - timedelta(days=30),
            'quarter': now - timedelta(days=90),
            'year': now - timedelta(days=365),
            'older': None  # Special case for documents older than 1 year
        }
        
        if search_params.filters.date_range == 'older':
            query = query.filter(Document.updated_at < (now - timedelta(days=365)))
        else:
            start_date = date_ranges[search_params.filters.date_range]
            query = query.filter(Document.updated_at >= start_date)
    
    # Manual date filtering (overrides smart ranges)
    if search_params.filters.created_after:
        query = query.filter(Document.created_at >= search_params.filters.created_after)
    if search_params.filters.created_before:
        query = query.filter(Document.created_at <= search_params.filters.created_before)
    if search_params.filters.updated_after:
        query = query.filter(Document.updated_at >= search_params.filters.updated_after)
    if search_params.filters.updated_before:
        query = query.filter(Document.updated_at <= search_params.filters.updated_before)
    
    # Enhanced size filtering with smart ranges
    if search_params.filters.size_range:
        size_ranges = {
            'small': (0, 1024 * 1024),  # 0-1MB
            'medium': (1024 * 1024, 10 * 1024 * 1024),  # 1-10MB
            'large': (10 * 1024 * 1024, 100 * 1024 * 1024),  # 10-100MB
            'huge': (100 * 1024 * 1024, None)  # 100MB+
        }
        min_size, max_size = size_ranges[search_params.filters.size_range]
        query = query.filter(Document.file_size >= min_size)
        if max_size is not None:
            query = query.filter(Document.file_size <= max_size)
    
    # Manual size filtering (overrides smart ranges)
    if search_params.filters.min_size is not None:
        query = query.filter(Document.file_size >= search_params.filters.min_size)
    if search_params.filters.max_size is not None:
        query = query.filter(Document.file_size <= search_params.filters.max_size)
    
    # Enhanced full-text search in name, description, and author (admin only)
    if search_params.query:
        search_text = f"%{search_params.query}%"
        search_conditions = [
            Document.name.ilike(search_text),
            Document.description.ilike(search_text)
        ]
        
        # Add author search for admin users only
        if current_user.role and current_user.role in ['admin', 'super_admin']:
            search_conditions.extend([
                UserModel.full_name.ilike(search_text),
                UserModel.email.ilike(search_text)
            ])
        
        query = query.filter(or_(*search_conditions))
    
    # Apply permission filtering
    all_docs = query.all()
    accessible_docs = [doc for doc in all_docs if doc.can_user_access(current_user, "read")]
    
    # Enhanced sorting with relevance scoring for text searches
    def get_sort_key(doc):
        value = getattr(doc, search_params.sort_by, "")
        # Handle None values
        if value is None:
            return ""
        # Handle datetime objects
        if hasattr(value, 'isoformat'):
            return value
        return str(value)
    
    if search_params.sort_order == "desc":
        accessible_docs.sort(key=get_sort_key, reverse=True)
    else:
        accessible_docs.sort(key=get_sort_key)
    
    # Apply pagination
    total_count = len(accessible_docs)
    offset = (search_params.page - 1) * search_params.size
    paginated_docs = accessible_docs[offset:offset + search_params.size]
    
    # Convert to response format with enhanced metadata
    document_responses = []
    for doc in paginated_docs:
        doc_dict = doc.to_dict()
        doc_dict["can_read"] = True  # Already verified
        doc_dict["can_write"] = doc.can_user_access(current_user, "write")
        doc_dict["can_delete"] = doc.can_user_access(current_user, "delete")
        doc_dict["can_share"] = doc.can_user_access(current_user, "share")
        
        # Add author information if available and user has permission
        if current_user.role and current_user.role in ['admin', 'super_admin']:
            creator = db.query(UserModel).filter(UserModel.id == doc.created_by).first()
            if creator:
                doc_dict["author_name"] = creator.full_name
                doc_dict["author_email"] = creator.email
        
        # Add file category based on mime type
        if doc.mime_type:
            doc_dict["file_category"] = _get_file_category(doc.mime_type)
        
        document_responses.append(DocumentSchema(**doc_dict))
    
    return DocumentList(
        documents=document_responses,
        total=total_count,
        page=search_params.page,
        size=search_params.size,
        has_next=offset + search_params.size < total_count
    )


def _get_file_category(mime_type: str) -> str:
    """Categorize file based on MIME type."""
    mime_lower = mime_type.lower()
    
    if any(t in mime_lower for t in ['pdf', 'msword', 'wordprocessing', 'text/plain', 'rtf']):
        return 'document'
    elif any(t in mime_lower for t in ['excel', 'spreadsheet', 'csv']):
        return 'spreadsheet'
    elif any(t in mime_lower for t in ['powerpoint', 'presentation']):
        return 'presentation'
    elif mime_lower.startswith('image/'):
        return 'image'
    elif mime_lower.startswith('video/'):
        return 'video'
    elif mime_lower.startswith('audio/'):
        return 'audio'
    elif any(t in mime_lower for t in ['zip', 'rar', '7z', 'tar', 'gz']):
        return 'archive'
    elif any(t in mime_lower for t in ['javascript', 'python', 'java', 'html', 'css', 'json', 'xml']):
        return 'code'
    else:
        return 'other'


@router.get("/search/suggestions/tags", response_model=List[str])
async def get_tag_suggestions(
    query: str = Query("", description="Tag search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of suggestions"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tag suggestions based on existing tags."""
    # Get all accessible documents first (for permission filtering)
    docs_query = db.query(Document).filter(Document.status == DocumentStatus.ACTIVE)
    all_docs = docs_query.all()
    accessible_docs = [doc for doc in all_docs if doc.can_user_access(current_user, "read")]
    
    # Extract all tags from accessible documents
    all_tags = set()
    for doc in accessible_docs:
        if doc.tags and isinstance(doc.tags, list):
            for tag in doc.tags:
                if isinstance(tag, str):
                    all_tags.add(tag.lower())
    
    # Filter tags based on query
    if query:
        query_lower = query.lower()
        matching_tags = [tag for tag in all_tags if query_lower in tag]
    else:
        matching_tags = list(all_tags)
    
    # Sort by relevance (exact matches first, then alphabetical)
    if query:
        query_lower = query.lower()
        exact_matches = [tag for tag in matching_tags if tag == query_lower]
        starts_with = [tag for tag in matching_tags if tag.startswith(query_lower) and tag != query_lower]
        contains = [tag for tag in matching_tags if query_lower in tag and not tag.startswith(query_lower)]
        
        matching_tags = exact_matches + sorted(starts_with) + sorted(contains)
    else:
        matching_tags = sorted(matching_tags)
    
    return matching_tags[:limit]


@router.get("/search/suggestions/authors", response_model=List[Dict[str, Any]])
async def get_author_suggestions(
    query: str = Query("", description="Author search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of suggestions"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get author suggestions (admin only)."""
    # Check admin permission
    if not (current_user.role and current_user.role in ['admin', 'super_admin']):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can search by author"
        )
    
    from ...models.user import User as UserModel
    
    # Build query for users who have created documents
    user_query = db.query(UserModel).join(Document, UserModel.id == Document.created_by).distinct()
    
    if query:
        search_text = f"%{query}%"
        user_query = user_query.filter(
            or_(
                UserModel.full_name.ilike(search_text),
                UserModel.email.ilike(search_text)
            )
        )
    
    users = user_query.limit(limit).all()
    
    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "document_count": db.query(Document).filter(
                Document.created_by == user.id,
                Document.status == DocumentStatus.ACTIVE
            ).count()
        }
        for user in users
    ]


@router.get("/search/file-categories", response_model=List[Dict[str, Any]])
async def get_file_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available file categories with counts."""
    # Get all accessible documents
    docs_query = db.query(Document).filter(
        Document.status == DocumentStatus.ACTIVE,
        Document.document_type == DocumentType.DOCUMENT
    )
    all_docs = docs_query.all()
    accessible_docs = [doc for doc in all_docs if doc.can_user_access(current_user, "read")]
    
    # Count documents by category
    category_counts = {}
    for doc in accessible_docs:
        if doc.mime_type:
            category = _get_file_category(doc.mime_type)
            category_counts[category] = category_counts.get(category, 0) + 1
    
    # Format response
    categories = [
        {"name": "document", "label": "Documents", "count": category_counts.get("document", 0)},
        {"name": "spreadsheet", "label": "Spreadsheets", "count": category_counts.get("spreadsheet", 0)},
        {"name": "presentation", "label": "Presentations", "count": category_counts.get("presentation", 0)},
        {"name": "image", "label": "Images", "count": category_counts.get("image", 0)},
        {"name": "video", "label": "Videos", "count": category_counts.get("video", 0)},
        {"name": "audio", "label": "Audio", "count": category_counts.get("audio", 0)},
        {"name": "archive", "label": "Archives", "count": category_counts.get("archive", 0)},
        {"name": "code", "label": "Code", "count": category_counts.get("code", 0)},
        {"name": "other", "label": "Other", "count": category_counts.get("other", 0)}
    ]
    
    # Only return categories with documents
    return [cat for cat in categories if cat["count"] > 0]


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
            action="share",  # Use 'share' instead of 'grant_permission' to match DB constraint
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
                document.deleted_at = datetime.now()
            elif operation.operation == "archive":
                document.status = DocumentStatus.ARCHIVED
                document.archived_at = datetime.now()
            elif operation.operation == "restore":
                document.status = DocumentStatus.ACTIVE
            elif operation.operation == "move":
                target_parent_id = operation.parameters.get("target_parent_id")
                # Validate target folder exists and user has access
                if target_parent_id:
                    target_folder = db.query(Document).filter(Document.id == target_parent_id).first()
                    if not target_folder:
                        failed.append({"document_id": doc_id, "error": "Target folder not found"})
                        continue
                    if not target_folder.can_user_access(current_user, "write"):
                        failed.append({"document_id": doc_id, "error": "No access to target folder"})
                        continue
                
                # Move document
                document.parent_id = target_parent_id
                document.updated_by = current_user.id
                if document.document_type == DocumentType.FOLDER:
                    document.update_path()
            elif operation.operation == "copy":
                target_parent_id = operation.parameters.get("target_parent_id")
                # Validate target folder exists and user has access
                if target_parent_id:
                    target_folder = db.query(Document).filter(Document.id == target_parent_id).first()
                    if not target_folder:
                        failed.append({"document_id": doc_id, "error": "Target folder not found"})
                        continue
                    if not target_folder.can_user_access(current_user, "write"):
                        failed.append({"document_id": doc_id, "error": "No access to target folder"})
                        continue
                
                # Create copy of document
                copy_document = Document(
                    name=f"Copy of {document.name}",
                    description=f"Copy of {document.description}" if document.description else None,
                    document_type=document.document_type,
                    mime_type=document.mime_type,
                    file_size=document.file_size,
                    file_hash_sha256=document.file_hash_sha256,
                    storage_path=document.storage_path,  # Note: Would need actual file copy for full implementation
                    parent_id=target_parent_id,
                    owner_id=current_user.id,
                    created_by=current_user.id,
                    tags=document.tags.copy() if document.tags else [],
                    doc_metadata=document.doc_metadata.copy() if document.doc_metadata else {},
                    is_sensitive=document.is_sensitive,
                    is_encrypted=document.is_encrypted,
                    encryption_key_id=document.encryption_key_id,
                    encryption_iv=document.encryption_iv,
                    encryption_auth_tag=document.encryption_auth_tag
                )
                db.add(copy_document)
                db.flush()  # Get the new document ID
                successful.append(copy_document.id)
                continue  # Don't add original doc_id to successful
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
                    successful.append(folder_id)
            else:
                # Moving to root level
                folder.parent_id = None
                folder.update_path()
                folder.updated_by = current_user.id
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
            action="share",  # Use 'share' instead of 'permission_inheritance' to match DB constraint
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


# Bulk Folder Operations
@router.post("/bulk-create-folders", response_model=BulkFolderCreateResult)
async def bulk_create_folders(
    request: BulkFolderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create multiple folders in a single transaction."""
    if not has_permission(current_user, "documents:create", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to create folders"
        )
    
    # Check parent folder permissions if specified
    if request.parent_id:
        parent_folder = db.query(Document).filter(
            Document.id == request.parent_id,
            Document.document_type == DocumentType.FOLDER,
            Document.status == DocumentStatus.ACTIVE
        ).first()
        
        if not parent_folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent folder not found"
            )
        
        if not parent_folder.can_user_access(current_user, "write"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges for parent folder"
            )
    
    successful = []
    failed = []
    skipped = []
    created_folders = {}  # path -> document_id mapping
    
    try:
        # Sort folders by path depth to ensure parents are created first
        sorted_folders = sorted(request.folders, key=lambda f: f.path.count('/'))
        
        for folder_item in sorted_folders:
            try:
                # Determine parent_id for this folder
                current_parent_id = request.parent_id
                
                if '/' in folder_item.path:
                    # This is a nested folder, find its parent
                    parent_path = '/'.join(folder_item.path.split('/')[:-1])
                    if parent_path in created_folders:
                        current_parent_id = created_folders[parent_path]
                    else:
                        # Parent should have been created earlier in sorted order
                        failed.append({
                            "path": folder_item.path,
                            "name": folder_item.name,
                            "error": f"Parent folder not found for path: {parent_path}"
                        })
                        continue
                
                # Check if folder already exists
                existing_folder = db.query(Document).filter(
                    Document.name == folder_item.name,
                    Document.parent_id == current_parent_id,
                    Document.document_type == DocumentType.FOLDER,
                    Document.status == DocumentStatus.ACTIVE
                ).first()
                
                if existing_folder:
                    if request.conflict_resolution == "skip":
                        skipped.append({
                            "path": folder_item.path,
                            "name": folder_item.name,
                            "document_id": existing_folder.id,
                            "reason": "Folder already exists"
                        })
                        created_folders[folder_item.path] = existing_folder.id
                        continue
                    elif request.conflict_resolution == "rename":
                        # Find a unique name
                        base_name = folder_item.name
                        counter = 1
                        while existing_folder:
                            folder_item.name = f"{base_name} ({counter})"
                            existing_folder = db.query(Document).filter(
                                Document.name == folder_item.name,
                                Document.parent_id == current_parent_id,
                                Document.document_type == DocumentType.FOLDER,
                                Document.status == DocumentStatus.ACTIVE
                            ).first()
                            counter += 1
                    elif request.conflict_resolution == "error":
                        failed.append({
                            "path": folder_item.path,
                            "name": folder_item.name,
                            "error": "Folder already exists"
                        })
                        continue
                
                # Create the folder
                new_folder = Document(
                    name=folder_item.name,
                    description=folder_item.description or "",
                    document_type=DocumentType.FOLDER,
                    parent_id=current_parent_id,
                    owner_id=current_user.id,
                    status=DocumentStatus.ACTIVE,
                    tags=folder_item.tags,
                    created_by=current_user.id
                )
                
                db.add(new_folder)
                db.flush()  # Get the ID without committing
                
                created_folders[folder_item.path] = new_folder.id
                successful.append({
                    "path": folder_item.path,
                    "name": folder_item.name,
                    "document_id": new_folder.id,
                    "parent_id": current_parent_id
                })
                
            except Exception as e:
                failed.append({
                    "path": folder_item.path,
                    "name": folder_item.name,
                    "error": str(e)
                })
        
        # Commit all changes
        db.commit()
        
        return BulkFolderCreateResult(
            successful=successful,
            failed=failed,
            skipped=skipped,
            total_requested=len(request.folders),
            total_created=len(successful)
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create folders: {str(e)}"
        )


@router.post("/batch-upload-files", response_model=BatchFileUploadResult)
async def batch_upload_files(
    files: List[UploadFile] = File(...),
    metadata: str = Form(...),  # JSON string containing BatchFileUploadRequest
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload multiple files with folder structure in a single batch."""
    if not has_permission(current_user, "documents:create", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to upload files"
        )
    
    try:
        import json
        request_data = json.loads(metadata)
        request = BatchFileUploadRequest(**request_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid metadata format: {str(e)}"
        )
    
    if len(files) != len(request.files):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Number of files doesn't match metadata count"
        )
    
    successful = []
    failed = []
    folders_created = []
    created_folders = {}  # path -> document_id mapping
    total_size = 0
    
    try:
        # Check root folder permissions
        if request.root_folder_id:
            root_folder = db.query(Document).filter(
                Document.id == request.root_folder_id,
                Document.document_type == DocumentType.FOLDER,
                Document.status == DocumentStatus.ACTIVE
            ).first()
            
            if not root_folder or not root_folder.can_user_access(current_user, "write"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient privileges for root folder"
                )
        
        # Create folders if needed
        if request.create_folders:
            unique_folder_paths = set()
            for file_meta in request.files:
                if '/' in file_meta.folder_path:
                    # Extract all parent paths
                    parts = file_meta.folder_path.split('/')
                    for i in range(1, len(parts) + 1):
                        path = '/'.join(parts[:i])
                        unique_folder_paths.add(path)
                elif file_meta.folder_path:
                    unique_folder_paths.add(file_meta.folder_path)
            
            # Sort by depth to create parents first
            sorted_paths = sorted(unique_folder_paths, key=lambda p: p.count('/'))
            
            for folder_path in sorted_paths:
                if folder_path in created_folders:
                    continue
                
                folder_name = folder_path.split('/')[-1]
                parent_path = '/'.join(folder_path.split('/')[:-1]) if '/' in folder_path else ''
                parent_id = created_folders.get(parent_path) if parent_path else request.root_folder_id
                
                # Check if folder exists
                existing_folder = db.query(Document).filter(
                    Document.name == folder_name,
                    Document.parent_id == parent_id,
                    Document.document_type == DocumentType.FOLDER,
                    Document.status == DocumentStatus.ACTIVE
                ).first()
                
                if existing_folder:
                    created_folders[folder_path] = existing_folder.id
                    continue
                
                # Create folder
                new_folder = Document(
                    name=folder_name,
                    document_type=DocumentType.FOLDER,
                    parent_id=parent_id,
                    owner_id=current_user.id,
                    status=DocumentStatus.ACTIVE,
                    created_by=current_user.id
                )
                
                db.add(new_folder)
                db.flush()
                
                created_folders[folder_path] = new_folder.id
                folders_created.append({
                    "path": folder_path,
                    "name": folder_name,
                    "document_id": new_folder.id
                })
        
        # Upload files
        for i, (upload_file, file_meta) in enumerate(zip(files, request.files)):
            try:
                # Determine target folder
                target_parent_id = request.root_folder_id
                if file_meta.folder_path:
                    target_parent_id = created_folders.get(file_meta.folder_path)
                    if target_parent_id is None and request.create_folders:
                        failed.append({
                            "filename": file_meta.filename,
                            "folder_path": file_meta.folder_path,
                            "error": "Target folder could not be created"
                        })
                        continue
                
                # Check for filename conflicts
                existing_file = db.query(Document).filter(
                    Document.name == file_meta.filename,
                    Document.parent_id == target_parent_id,
                    Document.document_type == DocumentType.DOCUMENT,
                    Document.status == DocumentStatus.ACTIVE
                ).first()
                
                final_filename = file_meta.filename
                if existing_file:
                    if request.conflict_resolution == "skip":
                        continue
                    elif request.conflict_resolution == "rename":
                        # Generate unique filename
                        base_name, ext = os.path.splitext(file_meta.filename)
                        counter = 1
                        while existing_file:
                            final_filename = f"{base_name} ({counter}){ext}"
                            existing_file = db.query(Document).filter(
                                Document.name == final_filename,
                                Document.parent_id == target_parent_id,
                                Document.document_type == DocumentType.DOCUMENT,
                                Document.status == DocumentStatus.ACTIVE
                            ).first()
                            counter += 1
                    elif request.conflict_resolution == "error":
                        failed.append({
                            "filename": file_meta.filename,
                            "folder_path": file_meta.folder_path,
                            "error": "File already exists"
                        })
                        continue
                
                # Save file to storage
                storage_path = os.path.join(settings.UPLOAD_DIR, f"{current_user.id}_{final_filename}_{int(datetime.now().timestamp())}")
                os.makedirs(os.path.dirname(storage_path), exist_ok=True)
                
                with open(storage_path, "wb") as buffer:
                    content = await upload_file.read()
                    buffer.write(content)
                
                # Calculate file hash
                hash_sha256 = hashlib.sha256(content).hexdigest()
                
                # Create document record
                new_document = Document(
                    name=final_filename,
                    document_type=DocumentType.DOCUMENT,
                    mime_type=file_meta.mime_type,
                    file_size=len(content),
                    file_hash_sha256=hash_sha256,
                    storage_path=storage_path,
                    parent_id=target_parent_id,
                    owner_id=current_user.id,
                    status=DocumentStatus.ACTIVE,
                    tags=file_meta.tags,
                    is_sensitive=file_meta.is_sensitive,
                    created_by=current_user.id,
                    doc_metadata=file_meta.encryption_metadata or {}
                )
                
                db.add(new_document)
                db.flush()
                
                total_size += len(content)
                successful.append({
                    "filename": final_filename,
                    "original_filename": file_meta.filename,
                    "folder_path": file_meta.folder_path,
                    "document_id": new_document.id,
                    "size": len(content)
                })
                
            except Exception as e:
                failed.append({
                    "filename": file_meta.filename,
                    "folder_path": file_meta.folder_path,
                    "error": str(e)
                })
        
        # Commit all changes
        db.commit()
        
        return BatchFileUploadResult(
            successful=successful,
            failed=failed,
            total_requested=len(request.files),
            total_uploaded=len(successful),
            folders_created=folders_created,
            total_size=total_size
        )
        
    except Exception as e:
        db.rollback()
        # Clean up any uploaded files on error
        for result in successful:
            try:
                if 'storage_path' in result:
                    os.remove(result['storage_path'])
            except:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload files: {str(e)}"
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


@router.post("/trash/empty", status_code=status.HTTP_200_OK)
async def empty_trash(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete all documents in trash for the current user."""
    if not has_permission(current_user, "documents:delete", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to empty trash"
        )
    
    try:
        # Get all deleted documents for the user
        deleted_docs = db.query(Document).filter(
            Document.owner_id == current_user.id,
            Document.status == DocumentStatus.DELETED
        ).all()
        
        deleted_count = len(deleted_docs)
        
        # Delete associated access logs first
        doc_ids = [doc.id for doc in deleted_docs]
        if doc_ids:
            db.query(DocumentAccessLog).filter(DocumentAccessLog.document_id.in_(doc_ids)).delete(synchronize_session=False)
        
        # Delete files from filesystem
        files_deleted = 0
        for doc in deleted_docs:
            if doc.storage_path and os.path.exists(doc.storage_path):
                try:
                    os.remove(doc.storage_path)
                    files_deleted += 1
                except Exception as e:
                    print(f"Could not delete file {doc.storage_path}: {e}")
        
        # Permanently delete documents from database
        db.query(Document).filter(
            Document.owner_id == current_user.id,
            Document.status == DocumentStatus.DELETED
        ).delete(synchronize_session=False)
        
        db.commit()
        
        return {
            "message": "Trash emptied successfully",
            "deleted_count": deleted_count,
            "files_deleted": files_deleted
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to empty trash: {str(e)}"
        )


@router.post("/trash/recover-all", status_code=status.HTTP_200_OK)
async def recover_all_from_trash(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recover all documents from trash for the current user."""
    if not has_permission(current_user, "documents:write", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to recover documents"
        )
    
    try:
        # Get all deleted documents for the user
        deleted_docs = db.query(Document).filter(
            Document.owner_id == current_user.id,
            Document.status == DocumentStatus.DELETED
        ).all()
        
        recovered_count = 0
        
        for doc in deleted_docs:
            # Check if parent folder still exists and is active
            if doc.parent_id:
                parent = db.query(Document).filter(Document.id == doc.parent_id).first()
                if not parent or parent.status != DocumentStatus.ACTIVE:
                    # Parent doesn't exist or is deleted, move to root level
                    doc.parent_id = None
                    doc.path = doc.name
            
            # Restore document
            doc.status = DocumentStatus.ACTIVE
            doc.deleted_at = None
            recovered_count += 1
            
            # Create access log
            access_log = DocumentAccessLog(
                document_id=doc.id,
                user_id=current_user.id,
                action="recover",
                access_method="api",
                success=True
            )
            db.add(access_log)
        
        db.commit()
        
        return {
            "message": "All items recovered from trash successfully",
            "recovered_count": recovered_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recover from trash: {str(e)}"
        )


@router.post("/{document_id}/recover", status_code=status.HTTP_200_OK)
async def recover_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recover a single document from trash."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to recover this document"
        )
    
    if document.status != DocumentStatus.DELETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not in trash"
        )
    
    try:
        # Check if parent folder still exists and is active
        if document.parent_id:
            parent = db.query(Document).filter(Document.id == document.parent_id).first()
            if not parent or parent.status != DocumentStatus.ACTIVE:
                # Parent doesn't exist or is deleted, move to root level
                document.parent_id = None
                document.path = document.name
        
        # Restore document
        document.status = DocumentStatus.ACTIVE
        document.deleted_at = None
        
        # Create access log
        access_log = DocumentAccessLog(
            document_id=document.id,
            user_id=current_user.id,
            action="recover",
            access_method="api",
            success=True
        )
        db.add(access_log)
        db.commit()
        
        return {
            "message": f"Successfully recovered '{document.name}'",
            "document_id": document.id
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recover document: {str(e)}"
        )


@router.delete("/{document_id}/permanent", status_code=status.HTTP_200_OK)
async def permanently_delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete a document from trash."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to delete this document"
        )
    
    if document.status != DocumentStatus.DELETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not in trash"
        )
    
    try:
        # Delete associated access logs first
        db.query(DocumentAccessLog).filter(DocumentAccessLog.document_id == document.id).delete(synchronize_session=False)
        
        # Delete file from filesystem
        file_deleted = False
        if document.storage_path and os.path.exists(document.storage_path):
            try:
                os.remove(document.storage_path)
                file_deleted = True
            except Exception as e:
                print(f"Could not delete file {document.storage_path}: {e}")
        
        document_name = document.name
        
        # Permanently delete document from database
        db.delete(document)
        db.commit()
        
        return {
            "message": f"Permanently deleted '{document_name}'",
            "file_deleted": file_deleted
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to permanently delete document: {str(e)}"
        )