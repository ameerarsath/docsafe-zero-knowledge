"""
Test cases for document models and database operations.

This module contains comprehensive tests for the document management system including:
- Document and folder model validation
- Hierarchical structure operations
- Permission inheritance
- Encryption metadata handling
- Database constraints and relationships
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError
from uuid import uuid4

from app.models.document import (
    Document, DocumentPermission, DocumentShare, DocumentVersion, 
    DocumentAccessLog, DocumentType, DocumentStatus, DocumentShareType
)
from app.models.user import User
from app.core.database import SessionLocal


class TestDocumentModel:
    """Test cases for Document model."""

    def test_create_document_success(self, db_session, test_user):
        """Test successful document creation."""
        document = Document(
            name="test-document.pdf",
            description="Test document",
            document_type=DocumentType.DOCUMENT,
            mime_type="application/pdf",
            file_size=1024,
            file_hash_sha256="abc123",
            storage_path="/encrypted/test-document.enc",
            owner_id=test_user.id,
            created_by=test_user.id
        )
        
        db_session.add(document)
        db_session.commit()
        db_session.refresh(document)
        
        assert document.id is not None
        assert document.uuid is not None
        assert document.name == "test-document.pdf"
        assert document.document_type == DocumentType.DOCUMENT
        assert document.is_document() is True
        assert document.is_folder() is False
        assert document.status == DocumentStatus.ACTIVE
        assert document.version_number == 1
        assert document.is_latest_version is True
        assert document.is_encrypted is True

    def test_create_folder_success(self, db_session, test_user):
        """Test successful folder creation."""
        folder = Document(
            name="test-folder",
            description="Test folder",
            document_type=DocumentType.FOLDER,
            owner_id=test_user.id,
            created_by=test_user.id
        )
        
        db_session.add(folder)
        db_session.commit()
        db_session.refresh(folder)
        
        assert folder.id is not None
        assert folder.name == "test-folder"
        assert folder.document_type == DocumentType.FOLDER
        assert folder.is_folder() is True
        assert folder.is_document() is False
        assert folder.mime_type is None
        assert folder.file_size == 0

    def test_document_name_validation(self, db_session, test_user):
        """Test document name validation."""
        # Test empty name
        with pytest.raises(ValueError, match="Document name cannot be empty"):
            Document(
                name="",
                document_type=DocumentType.DOCUMENT,
                owner_id=test_user.id,
                created_by=test_user.id
            )
        
        # Test invalid characters
        invalid_names = ["file/name", "file\\name", "file:name", "file*name", 
                        'file"name', "file<name", "file>name", "file|name"]
        
        for invalid_name in invalid_names:
            with pytest.raises(ValueError, match="contains invalid characters"):
                Document(
                    name=invalid_name,
                    document_type=DocumentType.DOCUMENT,
                    owner_id=test_user.id,
                    created_by=test_user.id
                )

    def test_document_hierarchy(self, db_session, test_user):
        """Test document hierarchy and path calculation."""
        # Create root folder
        root_folder = Document(
            name="root",
            document_type=DocumentType.FOLDER,
            owner_id=test_user.id,
            created_by=test_user.id
        )
        root_folder.update_path()  # Initialize path for root folder
        db_session.add(root_folder)
        db_session.commit()
        db_session.refresh(root_folder)
        
        # Create subfolder
        subfolder = Document(
            name="subfolder",
            document_type=DocumentType.FOLDER,
            parent_id=root_folder.id,
            owner_id=test_user.id,
            created_by=test_user.id
        )
        subfolder.parent = root_folder  # Set parent relationship manually
        subfolder.update_path()
        
        db_session.add(subfolder)
        db_session.commit()
        db_session.refresh(subfolder)
        
        # Create document in subfolder
        document = Document(
            name="document.pdf",
            document_type=DocumentType.DOCUMENT,
            parent_id=subfolder.id,
            mime_type="application/pdf",
            owner_id=test_user.id,
            created_by=test_user.id
        )
        document.parent = subfolder  # Set parent relationship manually
        document.update_path()
        
        db_session.add(document)
        db_session.commit()
        db_session.refresh(document)
        
        # Test hierarchy
        assert root_folder.depth_level == 0
        assert root_folder.path == ""
        assert root_folder.get_full_path() == "root"
        
        assert subfolder.depth_level == 1
        assert subfolder.path == "root"
        assert subfolder.get_full_path() == "root/subfolder"
        
        assert document.depth_level == 2
        assert document.path == "root/subfolder"
        assert document.get_full_path() == "root/subfolder/document.pdf"
        
        # Test relationships
        assert len(root_folder.children) == 1
        assert root_folder.children[0].id == subfolder.id
        assert subfolder.parent.id == root_folder.id
        assert len(subfolder.children) == 1
        assert document.parent.id == subfolder.id

    def test_document_ancestors_descendants(self, db_session, test_user):
        """Test getting ancestors and descendants."""
        # Create hierarchy: root -> folder1 -> folder2 -> document
        root = Document(
            name="root", document_type=DocumentType.FOLDER,
            owner_id=test_user.id, created_by=test_user.id
        )
        db_session.add(root)
        db_session.commit()
        
        folder1 = Document(
            name="folder1", document_type=DocumentType.FOLDER,
            parent_id=root.id, owner_id=test_user.id, created_by=test_user.id
        )
        db_session.add(folder1)
        db_session.commit()
        
        folder2 = Document(
            name="folder2", document_type=DocumentType.FOLDER,
            parent_id=folder1.id, owner_id=test_user.id, created_by=test_user.id
        )
        db_session.add(folder2)
        db_session.commit()
        
        document = Document(
            name="doc.pdf", document_type=DocumentType.DOCUMENT,
            parent_id=folder2.id, owner_id=test_user.id, created_by=test_user.id
        )
        db_session.add(document)
        db_session.commit()
        
        # Refresh to get relationships
        db_session.refresh(root)
        db_session.refresh(folder1)
        db_session.refresh(folder2)
        db_session.refresh(document)
        
        # Test ancestors
        ancestors = document.get_ancestors()
        assert len(ancestors) == 3
        assert ancestors[0].id == root.id
        assert ancestors[1].id == folder1.id
        assert ancestors[2].id == folder2.id
        
        # Test descendants
        descendants = root.get_descendants()
        assert len(descendants) == 3
        doc_ids = [d.id for d in descendants]
        assert folder1.id in doc_ids
        assert folder2.id in doc_ids
        assert document.id in doc_ids

    def test_document_size_calculation(self, db_session, test_user):
        """Test total size calculation for folders."""
        # Create folder with documents
        folder = Document(
            name="folder", document_type=DocumentType.FOLDER,
            owner_id=test_user.id, created_by=test_user.id
        )
        db_session.add(folder)
        db_session.commit()
        
        # Add documents with different sizes
        doc1 = Document(
            name="doc1.pdf", document_type=DocumentType.DOCUMENT,
            parent_id=folder.id, file_size=1000,
            owner_id=test_user.id, created_by=test_user.id
        )
        doc2 = Document(
            name="doc2.pdf", document_type=DocumentType.DOCUMENT,
            parent_id=folder.id, file_size=2000,
            owner_id=test_user.id, created_by=test_user.id
        )
        
        db_session.add_all([doc1, doc2])
        db_session.commit()
        
        # Refresh folder to get children
        db_session.refresh(folder)
        
        # Test size calculation
        total_size = folder.calculate_total_size()
        assert total_size == 3000  # 1000 + 2000

    def test_document_constraints(self, db_session, test_user):
        """Test database constraints."""
        # Test positive file size constraint
        with pytest.raises(IntegrityError):
            document = Document(
                name="test.pdf",
                document_type=DocumentType.DOCUMENT,
                file_size=-100,  # Negative size should fail
                owner_id=test_user.id,
                created_by=test_user.id
            )
            db_session.add(document)
            db_session.commit()
        
        db_session.rollback()
        
        # Test positive version number constraint
        with pytest.raises(IntegrityError):
            document = Document(
                name="test.pdf",
                document_type=DocumentType.DOCUMENT,
                version_number=0,  # Zero version should fail
                owner_id=test_user.id,
                created_by=test_user.id
            )
            db_session.add(document)
            db_session.commit()

    def test_document_to_dict(self, db_session, test_user):
        """Test document serialization to dictionary."""
        document = Document(
            name="test.pdf",
            description="Test document",
            document_type=DocumentType.DOCUMENT,
            mime_type="application/pdf",
            file_size=1024,
            doc_metadata={"key": "value"},
            tags=["tag1", "tag2"],
            owner_id=test_user.id,
            created_by=test_user.id
        )
        
        db_session.add(document)
        db_session.commit()
        db_session.refresh(document)
        
        doc_dict = document.to_dict()
        
        assert doc_dict["name"] == "test.pdf"
        assert doc_dict["description"] == "Test document"
        assert doc_dict["document_type"] == DocumentType.DOCUMENT
        assert doc_dict["mime_type"] == "application/pdf"
        assert doc_dict["file_size"] == 1024
        assert doc_dict["doc_metadata"] == {"key": "value"}
        assert doc_dict["tags"] == ["tag1", "tag2"]
        assert doc_dict["owner_id"] == test_user.id
        assert "uuid" in doc_dict
        assert "created_at" in doc_dict


class TestDocumentPermission:
    """Test cases for DocumentPermission model."""

    def test_create_document_permission(self, db_session, test_user, test_document):
        """Test creating document permissions."""
        permission = DocumentPermission(
            document_id=test_document.id,
            user_id=test_user.id,
            permission_type="read",
            granted=True,
            inheritable=True,
            granted_by=test_user.id
        )
        
        db_session.add(permission)
        db_session.commit()
        db_session.refresh(permission)
        
        assert permission.id is not None
        assert permission.document_id == test_document.id
        assert permission.user_id == test_user.id
        assert permission.permission_type == "read"
        assert permission.granted is True
        assert permission.inheritable is True

    def test_permission_expiry(self, db_session, test_user, test_document):
        """Test permission with expiry date."""
        expiry_date = datetime.utcnow() + timedelta(days=7)
        
        permission = DocumentPermission(
            document_id=test_document.id,
            user_id=test_user.id,
            permission_type="write",
            expires_at=expiry_date,
            granted_by=test_user.id
        )
        
        db_session.add(permission)
        db_session.commit()
        db_session.refresh(permission)
        
        assert permission.expires_at == expiry_date


class TestDocumentShare:
    """Test cases for DocumentShare model."""

    def test_create_document_share(self, db_session, test_user, test_document):
        """Test creating document shares."""
        share = DocumentShare(
            document_id=test_document.id,
            share_token="unique-share-token-123",
            share_name="Test Share",
            share_type=DocumentShareType.INTERNAL,
            allow_download=True,
            allow_preview=True,
            created_by=test_user.id
        )
        
        db_session.add(share)
        db_session.commit()
        db_session.refresh(share)
        
        assert share.id is not None
        assert share.document_id == test_document.id
        assert share.share_token == "unique-share-token-123"
        assert share.share_name == "Test Share"
        assert share.share_type == DocumentShareType.INTERNAL
        assert share.allow_download is True
        assert share.allow_preview is True
        assert share.is_active is True

    def test_share_with_password(self, db_session, test_user, test_document):
        """Test password-protected shares."""
        share = DocumentShare(
            document_id=test_document.id,
            share_token="protected-share-123",
            require_password=True,
            password_hash="hashed-password",
            created_by=test_user.id
        )
        
        db_session.add(share)
        db_session.commit()
        db_session.refresh(share)
        
        assert share.require_password is True
        assert share.password_hash == "hashed-password"

    def test_share_access_limits(self, db_session, test_user, test_document):
        """Test share access count limits."""
        share = DocumentShare(
            document_id=test_document.id,
            share_token="limited-share-123",
            max_access_count=5,
            created_by=test_user.id
        )
        
        db_session.add(share)
        db_session.commit()
        db_session.refresh(share)
        
        assert share.max_access_count == 5
        assert share.access_count == 0


class TestDocumentVersion:
    """Test cases for DocumentVersion model."""

    def test_create_document_version(self, db_session, test_user, test_document):
        """Test creating document versions."""
        version = DocumentVersion(
            document_id=test_document.id,
            version_number=2,
            version_name="Version 2.0",
            change_description="Updated content",
            file_size=2048,
            file_hash_sha256="def456",
            storage_path="/encrypted/test-document-v2.enc",
            created_by=test_user.id
        )
        
        db_session.add(version)
        db_session.commit()
        db_session.refresh(version)
        
        assert version.id is not None
        assert version.document_id == test_document.id
        assert version.version_number == 2
        assert version.version_name == "Version 2.0"
        assert version.change_description == "Updated content"
        assert version.file_size == 2048
        assert version.is_current is False


class TestDocumentAccessLog:
    """Test cases for DocumentAccessLog model."""

    def test_create_access_log(self, db_session, test_user, test_document):
        """Test creating access log entries."""
        log_entry = DocumentAccessLog(
            document_id=test_document.id,
            user_id=test_user.id,
            action="read",
            access_method="web",
            success=True,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0...",
            duration_ms=150
        )
        
        db_session.add(log_entry)
        db_session.commit()
        db_session.refresh(log_entry)
        
        assert log_entry.id is not None
        assert log_entry.document_id == test_document.id
        assert log_entry.user_id == test_user.id
        assert log_entry.action == "read"
        assert log_entry.success is True
        assert log_entry.ip_address == "192.168.1.1"
        assert log_entry.duration_ms == 150

    def test_failed_access_log(self, db_session, test_user, test_document):
        """Test logging failed access attempts."""
        log_entry = DocumentAccessLog(
            document_id=test_document.id,
            user_id=test_user.id,
            action="write",
            success=False,
            error_message="Access denied: insufficient permissions"
        )
        
        db_session.add(log_entry)
        db_session.commit()
        db_session.refresh(log_entry)
        
        assert log_entry.success is False
        assert log_entry.error_message == "Access denied: insufficient permissions"


class TestDocumentUserAccess:
    """Test cases for document user access methods."""

    def test_owner_has_full_access(self, db_session, test_user, test_document):
        """Test that document owner has full access."""
        # Owner should have access to their own documents
        assert test_document.can_user_access(test_user, "read") is True
        assert test_document.can_user_access(test_user, "write") is True
        assert test_document.can_user_access(test_user, "delete") is True

    def test_explicit_permissions(self, db_session, test_user, test_document):
        """Test explicit document permissions."""
        # Create another user
        other_user = User(
            username="other_user",
            email="other@example.com",
            password_hash="hashed_password"
        )
        db_session.add(other_user)
        db_session.commit()
        
        # Initially no access
        assert test_document.can_user_access(other_user, "read") is False
        
        # Grant read permission
        permission = DocumentPermission(
            document_id=test_document.id,
            user_id=other_user.id,
            permission_type="read",
            granted=True,
            granted_by=test_user.id
        )
        db_session.add(permission)
        db_session.commit()
        
        # Now should have read access
        assert test_document.can_user_access(other_user, "read") is True
        assert test_document.can_user_access(other_user, "write") is False

    def test_inherited_permissions(self, db_session, test_user):
        """Test permission inheritance from parent folders."""
        # Create another user
        other_user = User(
            username="other_user",
            email="other@example.com",
            password_hash="hashed_password"
        )
        db_session.add(other_user)
        db_session.commit()
        
        # Create folder hierarchy
        parent_folder = Document(
            name="parent", document_type=DocumentType.FOLDER,
            owner_id=test_user.id, created_by=test_user.id
        )
        db_session.add(parent_folder)
        db_session.commit()
        
        child_document = Document(
            name="child.pdf", document_type=DocumentType.DOCUMENT,
            parent_id=parent_folder.id, owner_id=test_user.id, created_by=test_user.id
        )
        db_session.add(child_document)
        db_session.commit()
        
        # Grant inheritable permission on parent folder
        permission = DocumentPermission(
            document_id=parent_folder.id,
            user_id=other_user.id,
            permission_type="read",
            granted=True,
            inheritable=True,
            granted_by=test_user.id
        )
        db_session.add(permission)
        db_session.commit()
        
        # Refresh to get relationships
        db_session.refresh(parent_folder)
        db_session.refresh(child_document)
        
        # Child document should inherit permission
        assert child_document.can_user_access(other_user, "read") is True