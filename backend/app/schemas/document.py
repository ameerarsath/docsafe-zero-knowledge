"""
Pydantic schemas for document management system.

This module defines request/response schemas for document operations including:
- Document and folder CRUD operations
- File upload and download
- Permission management
- Sharing and collaboration
- Version tracking
"""

from pydantic import BaseModel, Field, validator, root_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum
import uuid


class DocumentType(str, Enum):
    """Document type enumeration."""
    DOCUMENT = "document"
    FOLDER = "folder"


class DocumentStatus(str, Enum):
    """Document status enumeration."""
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"
    QUARANTINED = "quarantined"


class DocumentShareType(str, Enum):
    """Document share type enumeration."""
    PRIVATE = "private"
    INTERNAL = "internal"
    EXTERNAL = "external"
    PUBLIC = "public"


class PermissionType(str, Enum):
    """Permission type enumeration."""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"
    SHARE = "share"


# Base schemas
class DocumentBase(BaseModel):
    """Base schema for document operations."""
    name: str = Field(..., min_length=1, max_length=255, description="Document or folder name")
    description: Optional[str] = Field(None, description="Document description")
    parent_id: Optional[int] = Field(None, description="Parent folder ID")
    tags: List[str] = Field(default_factory=list, description="Document tags")
    doc_metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    is_sensitive: bool = Field(False, description="Whether document contains sensitive data")

    @validator('name')
    def validate_name(cls, v):
        """Validate document name."""
        if not v.strip():
            raise ValueError("Document name cannot be empty")
        
        # Check for invalid characters
        invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        if any(char in v for char in invalid_chars):
            raise ValueError(f"Document name contains invalid characters: {invalid_chars}")
        
        return v.strip()

    @validator('tags')
    def validate_tags(cls, v):
        """Validate tags list."""
        if len(v) > 20:
            raise ValueError("Maximum 20 tags allowed")
        
        for tag in v:
            if not isinstance(tag, str) or not tag.strip():
                raise ValueError("All tags must be non-empty strings")
            if len(tag) > 50:
                raise ValueError("Tag length cannot exceed 50 characters")
        
        return [tag.strip().lower() for tag in v]


class DocumentCreate(DocumentBase):
    """Schema for creating new documents."""
    document_type: DocumentType = Field(DocumentType.DOCUMENT, description="Type of document")
    share_type: DocumentShareType = Field(DocumentShareType.PRIVATE, description="Sharing level")
    
    @root_validator(skip_on_failure=True)
    def validate_document_create(cls, values):
        """Validate document creation data."""
        doc_type = values.get('document_type')
        
        # Folders don't need file-related validations
        if doc_type == DocumentType.FOLDER:
            # Remove file-specific fields if present
            for field in ['mime_type', 'file_size', 'file_extension']:
                values.pop(field, None)
        
        return values


class DocumentUpdate(BaseModel):
    """Schema for updating documents."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    tags: Optional[List[str]] = None
    doc_metadata: Optional[Dict[str, Any]] = None
    is_sensitive: Optional[bool] = None
    share_type: Optional[DocumentShareType] = None

    @validator('name')
    def validate_name(cls, v):
        """Validate document name."""
        if v is not None:
            if not v.strip():
                raise ValueError("Document name cannot be empty")
            
            invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
            if any(char in v for char in invalid_chars):
                raise ValueError(f"Document name contains invalid characters: {invalid_chars}")
        
        return v.strip() if v else v


class DocumentUpload(BaseModel):
    """Schema for file upload metadata."""
    name: str = Field(..., description="Original filename")
    parent_id: Optional[int] = Field(None, description="Parent folder ID")
    description: Optional[str] = Field(None, description="File description")
    tags: List[str] = Field(default_factory=list, description="File tags")
    doc_metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    is_sensitive: bool = Field(False, description="Whether file contains sensitive data")
    
    # Encryption information
    encryption_key_id: str = Field(..., description="Encryption key identifier")
    encryption_iv: str = Field(..., description="Base64 encoded initialization vector")
    encryption_auth_tag: str = Field(..., description="Base64 encoded authentication tag")
    
    # File validation
    file_size: int = Field(..., gt=0, description="File size in bytes")
    file_hash: str = Field(..., description="SHA256 hash of original file")
    mime_type: str = Field(..., description="MIME type of the file")
    
    @validator('file_size')
    def validate_file_size(cls, v):
        """Validate file size limits."""
        max_size = 500 * 1024 * 1024  # 500MB limit
        if v > max_size:
            raise ValueError(f"File size exceeds maximum limit of {max_size} bytes")
        return v


class Document(DocumentBase):
    """Schema for document responses."""
    id: int
    uuid: str
    document_type: DocumentType
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    file_extension: Optional[str] = None
    
    # Path and hierarchy
    path: Optional[str] = None
    depth_level: int = 0
    
    # Ownership and permissions
    owner_id: int
    created_by: int
    updated_by: Optional[int] = None
    
    # Status and sharing
    status: DocumentStatus
    share_type: DocumentShareType
    is_shared: bool = False
    is_encrypted: bool = True
    
    # Encryption information (optional for compatibility)
    encryption_algorithm: Optional[str] = None
    encryption_key_id: Optional[str] = None
    encryption_iv: Optional[str] = None
    encryption_auth_tag: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    accessed_at: Optional[datetime] = None
    
    # Version information
    version_number: int = 1
    is_latest_version: bool = True
    
    # Statistics
    child_count: int = 0
    total_size: int = 0
    
    # Computed fields
    full_path: Optional[str] = None
    can_read: bool = True
    can_write: bool = False
    can_delete: bool = False
    can_share: bool = False

    class Config:
        orm_mode = True

    @validator('uuid', pre=True)
    def validate_uuid(cls, v):
        """Ensure UUID is string format."""
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    @root_validator(skip_on_failure=True)
    def compute_full_path(cls, values):
        """Compute full path from path and name."""
        path = values.get('path', '')
        name = values.get('name', '')
        
        if path:
            values['full_path'] = f"{path}/{name}"
        else:
            values['full_path'] = name
        
        return values


class DocumentList(BaseModel):
    """Schema for paginated document lists."""
    documents: List[Document]
    total: int = Field(description="Total number of documents")
    page: int = Field(description="Current page number")
    size: int = Field(description="Page size")
    has_next: bool = Field(description="Whether there are more pages")


class DocumentTree(BaseModel):
    """Schema for hierarchical document tree."""
    document: Document
    children: List['DocumentTree'] = Field(default_factory=list, description="Child documents")
    
    class Config:
        orm_mode = True


# Permission schemas
class DocumentPermissionBase(BaseModel):
    """Base schema for document permissions."""
    user_id: int = Field(..., description="User ID")
    permission_type: PermissionType = Field(..., description="Permission type")
    granted: bool = Field(True, description="Whether permission is granted")
    inheritable: bool = Field(True, description="Whether permission is inheritable")
    expires_at: Optional[datetime] = Field(None, description="Permission expiration")
    conditions: Dict[str, Any] = Field(default_factory=dict, description="Permission conditions")


class DocumentPermissionCreate(DocumentPermissionBase):
    """Schema for creating document permissions."""
    pass


class DocumentPermissionUpdate(BaseModel):
    """Schema for updating document permissions."""
    granted: Optional[bool] = None
    inheritable: Optional[bool] = None
    expires_at: Optional[datetime] = None
    conditions: Optional[Dict[str, Any]] = None


class DocumentPermission(DocumentPermissionBase):
    """Schema for document permission responses."""
    id: int
    document_id: int
    granted_at: datetime
    granted_by: int
    revoked_at: Optional[datetime] = None
    revoked_by: Optional[int] = None

    class Config:
        orm_mode = True


class BulkPermissionUpdate(BaseModel):
    """Schema for bulk permission updates."""
    user_ids: List[int] = Field(..., min_items=1, description="List of user IDs")
    permission_type: PermissionType = Field(..., description="Permission type")
    granted: bool = Field(True, description="Whether to grant or revoke")
    inheritable: bool = Field(True, description="Whether permission is inheritable")
    expires_at: Optional[datetime] = Field(None, description="Permission expiration")


# Share schemas
class DocumentShareBase(BaseModel):
    """Base schema for document shares."""
    share_name: Optional[str] = Field(None, max_length=100, description="Optional share name")
    share_type: DocumentShareType = Field(DocumentShareType.INTERNAL, description="Share type")
    allow_download: bool = Field(True, description="Allow downloads")
    allow_preview: bool = Field(True, description="Allow previews")
    allow_comment: bool = Field(False, description="Allow comments")
    require_password: bool = Field(False, description="Require password for access")
    password: Optional[str] = Field(None, description="Share password")
    expires_at: Optional[datetime] = Field(None, description="Share expiration")
    max_access_count: Optional[int] = Field(None, gt=0, description="Maximum access count")
    access_restrictions: Dict[str, Any] = Field(default_factory=dict, description="Access restrictions")


class DocumentShareCreate(DocumentShareBase):
    """Schema for creating document shares."""
    
    @root_validator(skip_on_failure=True)
    def validate_password_requirement(cls, values):
        """Validate password requirement."""
        require_password = values.get('require_password', False)
        password = values.get('password')
        
        if require_password and not password:
            raise ValueError("Password is required when require_password is True")
        
        if password and len(password) < 8:
            raise ValueError("Share password must be at least 8 characters")
        
        return values


class DocumentShareUpdate(BaseModel):
    """Schema for updating document shares."""
    share_name: Optional[str] = Field(None, max_length=100)
    allow_download: Optional[bool] = None
    allow_preview: Optional[bool] = None
    allow_comment: Optional[bool] = None
    require_password: Optional[bool] = None
    password: Optional[str] = None
    expires_at: Optional[datetime] = None
    max_access_count: Optional[int] = Field(None, gt=0)
    access_restrictions: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class DocumentShare(DocumentShareBase):
    """Schema for document share responses."""
    id: int
    uuid: str
    document_id: int
    share_token: str
    created_at: datetime
    created_by: int
    accessed_at: Optional[datetime] = None
    access_count: int = 0
    is_active: bool = True
    revoked_at: Optional[datetime] = None
    revoked_by: Optional[int] = None
    last_accessed_ip: Optional[str] = None

    class Config:
        orm_mode = True

    @validator('uuid', pre=True)
    def validate_uuid(cls, v):
        """Ensure UUID is string format."""
        if isinstance(v, uuid.UUID):
            return str(v)
        return v


# Version schemas
class DocumentVersion(BaseModel):
    """Schema for document version responses."""
    id: int
    document_id: int
    version_number: int
    version_name: Optional[str] = None
    change_description: Optional[str] = None
    file_size: int
    file_hash_sha256: str
    created_at: datetime
    created_by: int
    is_current: bool = False

    class Config:
        orm_mode = True


class DocumentVersionCreate(BaseModel):
    """Schema for creating document versions."""
    version_name: Optional[str] = Field(None, max_length=100, description="Version name/tag")
    change_description: Optional[str] = Field(None, description="Description of changes")


# Access log schemas
class DocumentAccessLog(BaseModel):
    """Schema for document access log responses."""
    id: int
    document_id: int
    user_id: Optional[int] = None
    action: str
    access_method: Optional[str] = None
    success: bool = True
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    accessed_at: datetime
    duration_ms: Optional[int] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None

    class Config:
        orm_mode = True


# Search and filter schemas
class DocumentFilter(BaseModel):
    """Schema for document filtering."""
    document_type: Optional[DocumentType] = None
    status: Optional[DocumentStatus] = None
    owner_id: Optional[int] = None
    parent_id: Optional[int] = None
    mime_type: Optional[str] = None
    is_shared: Optional[bool] = None
    is_sensitive: Optional[bool] = None
    tags: Optional[List[str]] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    updated_after: Optional[datetime] = None
    updated_before: Optional[datetime] = None
    min_size: Optional[int] = Field(None, ge=0, description="Minimum file size in bytes")
    max_size: Optional[int] = Field(None, ge=0, description="Maximum file size in bytes")


class DocumentSearch(BaseModel):
    """Schema for document search."""
    query: Optional[str] = Field(None, description="Search query")
    filters: DocumentFilter = Field(default_factory=DocumentFilter, description="Search filters")
    sort_by: str = Field("updated_at", description="Sort field")
    sort_order: str = Field("desc", description="Sort order (asc/desc)")
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")

    @validator('sort_by')
    def validate_sort_by(cls, v):
        """Validate sort field."""
        allowed_fields = [
            'name', 'created_at', 'updated_at', 'file_size', 
            'document_type', 'status', 'owner_id'
        ]
        if v not in allowed_fields:
            raise ValueError(f"Sort field must be one of: {allowed_fields}")
        return v

    @validator('sort_order')
    def validate_sort_order(cls, v):
        """Validate sort order."""
        if v.lower() not in ['asc', 'desc']:
            raise ValueError("Sort order must be 'asc' or 'desc'")
        return v.lower()


# Bulk operation schemas
class BulkDocumentOperation(BaseModel):
    """Schema for bulk document operations."""
    document_ids: List[int] = Field(..., min_items=1, description="List of document IDs")
    operation: str = Field(..., description="Operation to perform")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Operation parameters")

    @validator('operation')
    def validate_operation(cls, v):
        """Validate operation type."""
        allowed_operations = ['move', 'copy', 'delete', 'archive', 'restore', 'update_tags']
        if v not in allowed_operations:
            raise ValueError(f"Operation must be one of: {allowed_operations}")
        return v


class BulkDocumentResult(BaseModel):
    """Schema for bulk operation results."""
    successful: List[int] = Field(description="Successfully processed document IDs")
    failed: List[Dict[str, Any]] = Field(description="Failed operations with reasons")
    total_processed: int = Field(description="Total number of documents processed")


# Move and copy operation schemas
class DocumentMoveRequest(BaseModel):
    """Schema for moving documents."""
    target_parent_id: Optional[int] = Field(None, description="Target parent folder ID")
    conflict_resolution: str = Field("rename", description="How to handle name conflicts")

    @validator('conflict_resolution')
    def validate_conflict_resolution(cls, v):
        """Validate conflict resolution strategy."""
        allowed_strategies = ['rename', 'overwrite', 'skip', 'error']
        if v not in allowed_strategies:
            raise ValueError(f"Conflict resolution must be one of: {allowed_strategies}")
        return v


class DocumentCopyRequest(DocumentMoveRequest):
    """Schema for copying documents."""
    new_name: Optional[str] = Field(None, description="New name for copied document")
    copy_permissions: bool = Field(False, description="Whether to copy permissions")


# Statistics and reporting schemas
class DocumentStatistics(BaseModel):
    """Schema for document statistics."""
    total_documents: int = 0
    total_folders: int = 0
    total_size: int = 0
    encrypted_documents: int = 0
    shared_documents: int = 0
    sensitive_documents: int = 0
    documents_by_type: Dict[str, int] = Field(default_factory=dict)
    documents_by_status: Dict[str, int] = Field(default_factory=dict)
    storage_usage_by_user: Dict[str, int] = Field(default_factory=dict)
    recent_activity_count: int = 0


# Enable forward references for recursive types
DocumentTree.update_forward_refs()