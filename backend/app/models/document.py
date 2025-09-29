"""
Document and Folder Models for SecureVault.

This module contains the SQLAlchemy models for document management including:
- Document storage with client-side encryption
- Hierarchical folder structure
- Permission inheritance
- Version tracking and audit trails
- File metadata and security information
"""

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Text, BigInteger, 
    ForeignKey, Index, CheckConstraint, LargeBinary, JSON
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.types import TypeDecorator, String as SqlString
from datetime import datetime
from enum import Enum
import uuid
from typing import Optional, Dict, Any, List

from ..core.database import Base


class GUID(TypeDecorator):
    """Platform-independent GUID type.
    
    Uses PostgreSQL's UUID type when available, otherwise falls back to String.
    """
    impl = SqlString
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(UUID())
        else:
            return dialect.type_descriptor(SqlString(36))
    
    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            return str(value)
    
    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            return str(value)


class JSONType(TypeDecorator):
    """Platform-independent JSON type.
    
    Uses PostgreSQL's JSONB type when available, otherwise falls back to JSON.
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(JSONB())
        else:
            return dialect.type_descriptor(JSON())


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


class EncryptionAlgorithm(str, Enum):
    """Supported encryption algorithms."""
    AES_256_GCM = "aes-256-gcm"
    AES_256_CBC = "aes-256-cbc"


class DocumentShareType(str, Enum):
    """Document share type enumeration."""
    PRIVATE = "private"
    INTERNAL = "internal"  # Within organization
    EXTERNAL = "external"  # External sharing with time limits
    PUBLIC = "public"      # Public access (admin only)


class Document(Base):
    """
    Document model representing both files and folders in a hierarchical structure.
    
    Features:
    - Client-side encryption with Web Crypto API
    - RBAC integration with permission inheritance
    - Hierarchical folder structure
    - Version tracking and audit trails
    - Comprehensive metadata storage
    """
    __tablename__ = "documents"

    # Primary identification
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(GUID(), default=uuid.uuid4, unique=True, nullable=False, index=True)
    
    # Document information
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    document_type = Column(String(20), nullable=False, default=DocumentType.DOCUMENT)
    mime_type = Column(String(100))  # Only for documents, null for folders
    
    # File information (for documents only)
    original_filename = Column(String(255))
    file_extension = Column(String(20))
    file_size = Column(BigInteger, default=0)  # Size in bytes
    file_hash_sha256 = Column(String(64))  # SHA256 hash of original file
    
    # Storage information
    storage_path = Column(String(500))  # Path to encrypted file on disk
    storage_backend = Column(String(50), default="local")  # local, s3, etc.
    
    # Encryption information
    encryption_algorithm = Column(String(50), default=EncryptionAlgorithm.AES_256_GCM)
    encryption_key_id = Column(String(100))  # Reference to key management system
    encrypted_dek = Column(Text, nullable=True)  # Document Encryption Key encrypted with user's master key
    encryption_iv = Column(String(255))  # Initialization vector for encryption (base64 encoded)
    encryption_auth_tag = Column(String(255))  # Authentication tag for GCM mode (base64 encoded)
    ciphertext = Column(Text, nullable=True)  # Encrypted document content (base64 encoded)
    salt = Column(String(255), nullable=True)  # Salt for key derivation (base64 encoded)
    is_encrypted = Column(Boolean, default=True, nullable=False)
    
    # Hierarchy and relationships
    parent_id = Column(Integer, ForeignKey("documents.id"), index=True)
    path = Column(String(1000), index=True)  # Full path from root for quick lookups
    depth_level = Column(Integer, default=0, index=True)  # Folder depth for queries
    
    # Ownership and permissions
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"))
    
    # Status and lifecycle
    status = Column(String(20), default=DocumentStatus.ACTIVE, nullable=False, index=True)
    share_type = Column(String(20), default=DocumentShareType.PRIVATE, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    accessed_at = Column(DateTime(timezone=True))  # Last access time
    archived_at = Column(DateTime(timezone=True))
    deleted_at = Column(DateTime(timezone=True))
    
    # Sharing and collaboration
    is_shared = Column(Boolean, default=False, nullable=False)
    share_expires_at = Column(DateTime(timezone=True))
    allow_download = Column(Boolean, default=True, nullable=False)
    allow_preview = Column(Boolean, default=True, nullable=False)
    
    # Version tracking
    version_number = Column(Integer, default=1, nullable=False)
    is_latest_version = Column(Boolean, default=True, nullable=False)
    previous_version_id = Column(Integer, ForeignKey("documents.id"))
    
    # Document metadata and tags
    doc_metadata = Column(JSONType, default=dict)  # Flexible metadata storage
    tags = Column(JSONType, default=list)  # Document tags for organization
    
    # Security and compliance
    is_sensitive = Column(Boolean, default=False, nullable=False)
    retention_policy_id = Column(String(50))  # Reference to retention policy
    compliance_flags = Column(JSONType, default=dict)  # Compliance metadata
    
    # Performance optimization
    child_count = Column(Integer, default=0)  # Number of direct children (for folders)
    total_size = Column(BigInteger, default=0)  # Total size including children
    
    # Relationships
    parent = relationship("Document", remote_side=[id], foreign_keys=[parent_id], back_populates="children")
    children = relationship("Document", foreign_keys=[parent_id], back_populates="parent", cascade="all, delete-orphan")
    
    owner = relationship("User", foreign_keys=[owner_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])
    
    previous_version = relationship("Document", remote_side=[id], foreign_keys=[previous_version_id])
    
    # Document permissions and shares
    permissions = relationship("DocumentPermission", back_populates="document", cascade="all, delete-orphan")
    shares = relationship("DocumentShare", back_populates="document", cascade="all, delete-orphan")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")
    access_logs = relationship("DocumentAccessLog", back_populates="document", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        CheckConstraint("document_type IN ('document', 'folder')", name="check_document_type"),
        CheckConstraint("status IN ('active', 'archived', 'deleted', 'quarantined')", name="check_status"),
        CheckConstraint("share_type IN ('private', 'internal', 'external', 'public')", name="check_share_type"),
        CheckConstraint("file_size >= 0", name="check_file_size_positive"),
        CheckConstraint("depth_level >= 0", name="check_depth_level_positive"),
        CheckConstraint("version_number > 0", name="check_version_positive"),
        CheckConstraint("child_count >= 0", name="check_child_count_positive"),
        CheckConstraint("total_size >= 0", name="check_total_size_positive"),
        Index("idx_documents_owner_status", "owner_id", "status"),
        Index("idx_documents_parent_type", "parent_id", "document_type"),
        Index("idx_documents_path_status", "path", "status"),
        Index("idx_documents_created_at", "created_at"),
        Index("idx_documents_updated_at", "updated_at"),
        Index("idx_documents_name_type", "name", "document_type"),
    )

    @validates('name')
    def validate_name(self, key, name):
        """Validate document name."""
        if not name or not name.strip():
            raise ValueError("Document name cannot be empty")
        
        # Check for invalid characters - remove colon from the list as it's commonly used in document names
        invalid_chars = ['/', '\\', '*', '?', '"', '<', '>', '|']
        found_invalid = [char for char in invalid_chars if char in name]
        if found_invalid:
            raise ValueError(f"Document name '{name}' contains invalid characters: {found_invalid}")
        
        return name.strip()

    @validates('document_type')
    def validate_document_type(self, key, document_type):
        """Validate document type."""
        if document_type not in [DocumentType.DOCUMENT, DocumentType.FOLDER]:
            raise ValueError(f"Invalid document type: {document_type}")
        return document_type

    def is_folder(self) -> bool:
        """Check if this is a folder."""
        return self.document_type == DocumentType.FOLDER

    def is_document(self) -> bool:
        """Check if this is a document."""
        return self.document_type == DocumentType.DOCUMENT

    def get_full_path(self) -> str:
        """Get the full path of the document."""
        if self.path:
            return f"{self.path}/{self.name}"
        return self.name

    def get_ancestors(self) -> List['Document']:
        """Get all ancestor documents (parent folders)."""
        ancestors = []
        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return ancestors[::-1]  # Return in root-to-parent order

    def get_descendants(self) -> List['Document']:
        """Get all descendant documents (recursive)."""
        descendants = []
        for child in self.children:
            descendants.append(child)
            descendants.extend(child.get_descendants())
        return descendants

    def calculate_total_size(self) -> int:
        """Calculate total size including all descendants."""
        total = self.file_size or 0
        for child in self.children:
            total += child.calculate_total_size()
        return total

    def update_path(self):
        """Update the path based on parent hierarchy."""
        if self.parent_id and self.parent:
            self.path = f"{self.parent.get_full_path()}"
            self.depth_level = self.parent.depth_level + 1
        else:
            self.path = ""
            self.depth_level = 0

    def _parse_json_field(self, field_value, default_value):
        """Parse JSON field that might be stored as string or already parsed."""
        import json

        if field_value is None:
            return default_value

        if isinstance(field_value, str):
            try:
                return json.loads(field_value)
            except (json.JSONDecodeError, ValueError):
                return default_value

        return field_value if field_value is not None else default_value

    def can_user_access(self, user, permission_type: str = "read") -> bool:
        """Check if user can access this document with given permission."""
        try:
            # Owner has full access
            if self.owner_id == user.id:
                return True
            
            # Admin users have full access to all documents
            try:
                # Safe admin check
                is_admin = getattr(user, 'is_admin', False)
                user_role = getattr(user, 'role', '')
                
                if (is_admin or 
                    user_role in ['super_admin', 'admin'] or 
                    user_role in ['5', '4']):
                    return True
            except Exception as e:
                print(f"WARNING: Admin check failed in can_user_access: {e}")
                # Continue with other checks if admin check fails
            
            # Check explicit permissions (deny takes precedence)
            try:
                explicit_permission_found = False
                permissions = getattr(self, 'permissions', [])
                for perm in permissions:
                    if perm.user_id == user.id and perm.permission_type == permission_type:
                        explicit_permission_found = True
                        return perm.granted
            except Exception as e:
                print(f"WARNING: Permission check failed in can_user_access: {e}")
            
            # Check inherited permissions from parent folders
            try:
                current = getattr(self, 'parent', None)
                while current:
                    parent_permissions = getattr(current, 'permissions', [])
                    for perm in parent_permissions:
                        if (perm.user_id == user.id and 
                            perm.permission_type == permission_type and
                            getattr(perm, 'inheritable', False)):
                            return perm.granted
                    current = getattr(current, 'parent', None)
            except Exception as e:
                print(f"WARNING: Inherited permission check failed in can_user_access: {e}")
            
            # For document-specific access, require explicit permissions
            # Don't fall back to RBAC for security - documents require explicit access grants
            # RBAC permissions are for system-level operations (create, admin functions)
            return False
            
        except Exception as e:
            print(f"ERROR: can_user_access method failed completely: {e}")
            # Default to no access on any error
            return False

    def to_dict(self, include_children: bool = False) -> Dict[str, Any]:
        """Convert document to dictionary representation."""
        import base64
        
        # Debug logging removed to prevent Unicode encoding issues on Windows
        import logging
        logger = logging.getLogger(__name__)
        logger.debug(f"Converting document {self.id} to dict")
        
        data = {
            "id": self.id,
            "uuid": str(self.uuid),
            "name": self.name,
            "description": self.description,
            "document_type": self.document_type,
            "mime_type": self.mime_type,
            "file_size": self.file_size,
            "file_extension": self.file_extension,
            "parent_id": self.parent_id,
            "path": self.path,
            "depth_level": self.depth_level,
            "owner_id": self.owner_id,
            "created_by": self.created_by,  # Added missing field
            "updated_by": self.updated_by,  # Added missing field
            "status": self.status,
            "share_type": self.share_type,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "accessed_at": self.accessed_at,
            "is_encrypted": self.is_encrypted,
            "is_shared": self.is_shared,
            "version_number": self.version_number,
            "is_latest_version": self.is_latest_version,
            "child_count": self.child_count,
            "total_size": self.total_size,
            "doc_metadata": self._parse_json_field(self.doc_metadata, {}),
            "tags": self._parse_json_field(self.tags, []),
            "is_sensitive": self.is_sensitive,
            # Encryption fields
            "encryption_algorithm": self.encryption_algorithm,
            "encryption_key_id": self.encryption_key_id,
            "encrypted_dek": self.encrypted_dek,
            "encryption_iv": self.encryption_iv,
            "encryption_auth_tag": self.encryption_auth_tag,
            "ciphertext": self.ciphertext,
        }
        
        if include_children and self.is_folder():
            data["children"] = [child.to_dict() for child in self.children]
        
        return data


class DocumentPermission(Base):
    """
    Document-level permissions for fine-grained access control.
    Extends RBAC system with document-specific permissions.
    """
    __tablename__ = "document_permissions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Document and user references
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Permission details
    permission_type = Column(String(50), nullable=False)  # read, write, delete, admin, share
    granted = Column(Boolean, default=True, nullable=False)
    inheritable = Column(Boolean, default=True, nullable=False)  # Can be inherited by children
    
    # Temporal permissions
    granted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True))
    
    # Permission source and management
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    revoked_by = Column(Integer, ForeignKey("users.id"))
    revoked_at = Column(DateTime(timezone=True))
    
    # Conditional permissions
    conditions = Column(JSONType, default=dict)  # IP restrictions, time restrictions, etc.
    
    # Relationships
    document = relationship("Document", back_populates="permissions")
    user = relationship("User", foreign_keys=[user_id])
    granted_by_user = relationship("User", foreign_keys=[granted_by])
    revoked_by_user = relationship("User", foreign_keys=[revoked_by])

    __table_args__ = (
        CheckConstraint("permission_type IN ('read', 'write', 'delete', 'admin', 'share')", 
                       name="check_permission_type"),
        Index("idx_doc_permissions_doc_user", "document_id", "user_id"),
        Index("idx_doc_permissions_type_granted", "permission_type", "granted"),
    )


class DocumentShare(Base):
    """
    Document sharing links and external access management.
    """
    __tablename__ = "document_shares"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(GUID(), default=uuid.uuid4, unique=True, nullable=False, index=True)
    
    # Document reference
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    
    # Share details
    share_token = Column(String(100), unique=True, nullable=False, index=True)
    share_name = Column(String(100))  # Optional name for the share
    share_type = Column(String(20), default=DocumentShareType.INTERNAL, nullable=False)
    
    # Access permissions
    allow_download = Column(Boolean, default=True, nullable=False)
    allow_preview = Column(Boolean, default=True, nullable=False)
    allow_comment = Column(Boolean, default=False, nullable=False)
    require_password = Column(Boolean, default=False, nullable=False)
    password_hash = Column(String(100))  # Hashed password for protected shares
    encryption_password = Column(String(255))  # Encryption password for server-side decryption of external shares
    
    # Temporal controls
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True))
    accessed_at = Column(DateTime(timezone=True))
    access_count = Column(Integer, default=0, nullable=False)
    max_access_count = Column(Integer)  # Maximum number of accesses
    
    # Share management
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    revoked_at = Column(DateTime(timezone=True))
    revoked_by = Column(Integer, ForeignKey("users.id"))
    
    # Access tracking
    last_accessed_ip = Column(String(45))  # IPv6 support
    last_accessed_user_agent = Column(Text)
    access_restrictions = Column(JSONType, default=dict)  # IP ranges, domains, etc.
    
    # Relationships
    document = relationship("Document", back_populates="shares")
    created_by_user = relationship("User", foreign_keys=[created_by])
    revoked_by_user = relationship("User", foreign_keys=[revoked_by])

    __table_args__ = (
        CheckConstraint("share_type IN ('private', 'internal', 'external', 'public')", 
                       name="check_share_type"),
        CheckConstraint("access_count >= 0", name="check_access_count_positive"),
        Index("idx_doc_shares_token_active", "share_token", "is_active"),
        Index("idx_doc_shares_document_active", "document_id", "is_active"),
    )


class DocumentVersion(Base):
    """
    Document version history for change tracking and recovery.
    """
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Document reference
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    
    # Version information
    version_number = Column(Integer, nullable=False)
    version_name = Column(String(100))  # Optional version name/tag
    change_description = Column(Text)
    
    # File information at this version
    file_size = Column(BigInteger, nullable=False)
    file_hash_sha256 = Column(String(64), nullable=False)
    storage_path = Column(String(500), nullable=False)
    
    # Encryption information for this version
    encryption_key_id = Column(String(100))
    encryption_iv = Column(LargeBinary(16))
    encryption_auth_tag = Column(LargeBinary(16))
    
    # Version lifecycle
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_current = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    document = relationship("Document", back_populates="versions")
    created_by_user = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        CheckConstraint("version_number > 0", name="check_version_number_positive"),
        CheckConstraint("file_size >= 0", name="check_file_size_positive"),
        Index("idx_doc_versions_doc_version", "document_id", "version_number"),
        Index("idx_doc_versions_doc_current", "document_id", "is_current"),
    )


class DocumentAccessLog(Base):
    """
    Audit log for document access and operations.
    """
    __tablename__ = "document_access_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Document and user references
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)  # Nullable for anonymous access
    
    # Access details
    action = Column(String(50), nullable=False, index=True)  # read, write, delete, share, etc.
    access_method = Column(String(50))  # web, api, mobile, etc.
    success = Column(Boolean, default=True, nullable=False)
    
    # Request information
    ip_address = Column(String(45))  # IPv6 support
    user_agent = Column(Text)
    referer = Column(String(500))
    
    # Timing
    accessed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    duration_ms = Column(Integer)  # Request duration in milliseconds
    
    # Additional context
    details = Column(JSONType, default=dict)  # Additional access details
    error_message = Column(Text)  # Error details if access failed
    
    # Relationships
    document = relationship("Document", back_populates="access_logs")
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        CheckConstraint("action IN ('read', 'write', 'delete', 'share', 'download', 'preview', 'move', 'copy', 'recover')", 
                       name="check_action_type"),
        Index("idx_doc_access_logs_doc_action", "document_id", "action"),
        Index("idx_doc_access_logs_user_accessed", "user_id", "accessed_at"),
        Index("idx_doc_access_logs_accessed_at", "accessed_at"),
    )