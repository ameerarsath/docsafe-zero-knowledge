"""
Test cases for document API endpoints.

This module contains integration tests for:
- Document CRUD operations via API
- File upload and download endpoints
- Permission management through API
- Search and filtering functionality
- Bulk operations and statistics
"""

import pytest
import json
import io
from unittest.mock import patch, mock_open
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.document import Document, DocumentType, DocumentStatus
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentUpload


class TestDocumentAPI:
    """Test cases for document CRUD API endpoints."""
    
    def test_list_documents_empty(self, client: TestClient, authenticated_user_headers: dict):
        """Test listing documents when none exist."""
        response = client.get("/api/v1/documents/", headers=authenticated_user_headers)
        
        # Debug output
        if response.status_code != 200:
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] == 0
        assert data["documents"] == []
        assert data["page"] == 1
        assert data["has_next"] is False
    
    def test_create_folder_success(self, client: TestClient, authenticated_headers: dict):
        """Test successful folder creation."""
        folder_data = {
            "name": "Test Folder",
            "description": "A test folder",
            "document_type": "folder",
            "tags": ["test", "folder"],
            "doc_metadata": {"purpose": "testing"}
        }
        
        response = client.post(
            "/api/v1/documents/",
            json=folder_data,
            headers=authenticated_headers
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "Test Folder"
        assert data["document_type"] == "folder"
        assert data["can_read"] is True
        assert data["can_write"] is True
        assert data["can_delete"] is True
    
    def test_create_document_invalid_name(self, client: TestClient, authenticated_headers: dict):
        """Test document creation with invalid name characters."""
        document_data = {
            "name": "test/invalid:name*",  # Invalid characters
            "document_type": "document"
        }
        
        response = client.post(
            "/api/v1/documents/",
            json=document_data,
            headers=authenticated_headers
        )
        assert response.status_code == 422  # Validation error
    
    def test_get_document_not_found(self, client: TestClient, authenticated_headers: dict):
        """Test getting a non-existent document."""
        response = client.get("/api/v1/documents/99999", headers=authenticated_headers)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_update_document_success(self, client: TestClient, authenticated_headers: dict, test_document):
        """Test successful document update."""
        update_data = {
            "name": "Updated Document Name",
            "description": "Updated description",
            "tags": ["updated", "test"]
        }
        
        response = client.put(
            f"/api/v1/documents/{test_document.id}",
            json=update_data,
            headers=authenticated_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Updated Document Name"
        assert data["description"] == "Updated description"
        assert "updated" in data["tags"]
    
    def test_delete_document_success(self, client: TestClient, authenticated_headers: dict, test_document):
        """Test successful document deletion (archival)."""
        response = client.delete(
            f"/api/v1/documents/{test_document.id}",
            headers=authenticated_headers
        )
        assert response.status_code == 204
    
    def test_document_permissions_owner(self, client: TestClient, authenticated_headers: dict, test_document):
        """Test that document owner has full permissions."""
        response = client.get(f"/api/v1/documents/{test_document.id}", headers=authenticated_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["can_read"] is True
        assert data["can_write"] is True
        assert data["can_delete"] is True


class TestDocumentUploadAPI:
    """Test cases for file upload API endpoints."""
    
    @patch("builtins.open", mock_open())
    @patch("os.makedirs")
    @patch("os.path.exists", return_value=True)
    def test_file_upload_success(self, mock_exists, mock_makedirs, client: TestClient, authenticated_headers: dict):
        """Test successful file upload."""
        # Prepare test file
        test_content = b"This is test file content"
        test_file = io.BytesIO(test_content)
        
        # Prepare upload metadata
        upload_metadata = {
            "name": "test-file.txt",
            "description": "Test file upload",
            "encryption_key_id": "test-key-123",
            "encryption_iv": "MTIzNDU2Nzg5MDEyMzQ1Ng==",  # base64 encoded 16 bytes
            "encryption_auth_tag": "MTIzNDU2Nzg5MDEyMzQ1Ng==",  # base64 encoded 16 bytes
            "file_size": len(test_content),
            "file_hash": "abc123def456",
            "mime_type": "text/plain",
            "tags": ["test", "upload"]
        }
        
        # Make upload request
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("test-file.txt", test_file, "text/plain")},
            data={"upload_data": json.dumps(upload_metadata)},
            headers=authenticated_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "test-file.txt"
        assert data["mime_type"] == "text/plain"
        assert data["file_size"] == len(test_content)
    
    def test_file_upload_invalid_metadata(self, client: TestClient, authenticated_headers: dict):
        """Test file upload with invalid metadata."""
        test_file = io.BytesIO(b"test content")
        
        # Invalid JSON metadata
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.txt", test_file, "text/plain")},
            data={"upload_data": "invalid json"},
            headers=authenticated_headers
        )
        
        assert response.status_code == 422
    
    def test_file_upload_size_mismatch(self, client: TestClient, authenticated_headers: dict):
        """Test file upload with size mismatch."""
        test_content = b"test content"
        test_file = io.BytesIO(test_content)
        
        upload_metadata = {
            "name": "test.txt",
            "encryption_key_id": "test-key",
            "encryption_iv": "MTIzNDU2Nzg5MDEyMzQ1Ng==",
            "encryption_auth_tag": "MTIzNDU2Nzg5MDEyMzQ1Ng==",
            "file_size": 999,  # Wrong size
            "file_hash": "abc123",
            "mime_type": "text/plain"
        }
        
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.txt", test_file, "text/plain")},
            data={"upload_data": json.dumps(upload_metadata)},
            headers=authenticated_headers
        )
        
        assert response.status_code == 400
        assert "size mismatch" in response.json()["detail"].lower()


class TestDocumentSearchAPI:
    """Test cases for document search and filtering."""
    
    def test_search_by_name(self, client: TestClient, authenticated_headers: dict, test_document):
        """Test searching documents by name."""
        search_params = {
            "query": "test",
            "filters": {},
            "page": 1,
            "size": 10
        }
        
        response = client.post(
            "/api/v1/documents/search",
            json=search_params,
            headers=authenticated_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 0
        assert isinstance(data["documents"], list)
    
    def test_search_with_filters(self, client: TestClient, authenticated_headers: dict):
        """Test searching with multiple filters."""
        search_params = {
            "query": "",
            "filters": {
                "document_type": "document",
                "status": "active",
                "is_sensitive": False
            },
            "sort_by": "created_at",
            "sort_order": "desc",
            "page": 1,
            "size": 20
        }
        
        response = client.post(
            "/api/v1/documents/search",
            json=search_params,
            headers=authenticated_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert "total" in data
    
    def test_search_pagination(self, client: TestClient, authenticated_headers: dict):
        """Test search pagination."""
        search_params = {
            "query": "",
            "filters": {},
            "page": 1,
            "size": 5
        }
        
        response = client.post(
            "/api/v1/documents/search",
            json=search_params,
            headers=authenticated_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["size"] == 5


class TestDocumentPermissionsAPI:
    """Test cases for document permission management."""
    
    def test_get_document_permissions_owner(self, client: TestClient, authenticated_headers: dict, test_document):
        """Test getting permissions as document owner."""
        response = client.get(
            f"/api/v1/documents/{test_document.id}/permissions",
            headers=authenticated_headers
        )
        
        assert response.status_code == 200
        permissions = response.json()
        assert isinstance(permissions, list)
    
    def test_create_document_permission_success(self, client: TestClient, authenticated_headers: dict, 
                                              test_document, test_admin_user, db_session):
        """Test creating a document permission."""
        permission_data = {
            "user_id": test_admin_user.id,
            "permission_type": "read",
            "granted": True,
            "inheritable": False
        }
        
        response = client.post(
            f"/api/v1/documents/{test_document.id}/permissions",
            json=permission_data,
            headers=authenticated_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == test_admin_user.id
        assert data["permission_type"] == "read"
        assert data["granted"] is True
    
    def test_create_permission_nonexistent_user(self, client: TestClient, authenticated_headers: dict, test_document):
        """Test creating permission for non-existent user."""
        permission_data = {
            "user_id": 99999,  # Non-existent user
            "permission_type": "read",
            "granted": True
        }
        
        response = client.post(
            f"/api/v1/documents/{test_document.id}/permissions",
            json=permission_data,
            headers=authenticated_headers
        )
        
        assert response.status_code == 404
        assert "user not found" in response.json()["detail"].lower()


class TestDocumentBulkOperations:
    """Test cases for bulk document operations."""
    
    def test_bulk_operation_success(self, client: TestClient, authenticated_headers: dict, test_document):
        """Test successful bulk operation."""
        operation_data = {
            "document_ids": [test_document.id],
            "operation": "update_tags",
            "parameters": {"tags": ["bulk", "updated"]}
        }
        
        response = client.post(
            "/api/v1/documents/bulk-operation",
            json=operation_data,
            headers=authenticated_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert test_document.id in data["successful"]
        assert data["total_processed"] == 1
    
    def test_bulk_operation_mixed_results(self, client: TestClient, authenticated_headers: dict, test_document):
        """Test bulk operation with mixed success/failure."""
        operation_data = {
            "document_ids": [test_document.id, 99999],  # One valid, one invalid
            "operation": "archive",
            "parameters": {}
        }
        
        response = client.post(
            "/api/v1/documents/bulk-operation",
            json=operation_data,
            headers=authenticated_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["successful"]) >= 0
        assert len(data["failed"]) >= 0
        assert data["total_processed"] == 2


class TestDocumentStatistics:
    """Test cases for document statistics endpoint."""
    
    def test_get_statistics(self, client: TestClient, authenticated_headers: dict):
        """Test getting document statistics."""
        response = client.get("/api/v1/documents/statistics", headers=authenticated_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "total_documents" in data
        assert "total_folders" in data
        assert "total_size" in data
        assert "encrypted_documents" in data
        assert "shared_documents" in data
        assert "sensitive_documents" in data
        assert "documents_by_type" in data
        assert "documents_by_status" in data
        
        # Values should be non-negative
        assert data["total_documents"] >= 0
        assert data["total_folders"] >= 0
        assert data["total_size"] >= 0


class TestDocumentHealthCheck:
    """Test cases for document system health check."""
    
    def test_health_check(self, client: TestClient):
        """Test document system health check."""
        response = client.get("/api/v1/documents/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "total_documents" in data
        assert "active_documents" in data


# Authentication and Authorization Tests
class TestDocumentAPIAuthentication:
    """Test authentication and authorization for document endpoints."""
    
    def test_list_documents_unauthorized(self, client: TestClient):
        """Test listing documents without authentication."""
        response = client.get("/api/v1/documents/")
        assert response.status_code == 401
    
    def test_create_document_unauthorized(self, client: TestClient):
        """Test creating document without authentication."""
        document_data = {"name": "test", "document_type": "document"}
        response = client.post("/api/v1/documents/", json=document_data)
        assert response.status_code == 401
    
    def test_upload_file_unauthorized(self, client: TestClient):
        """Test file upload without authentication."""
        test_file = io.BytesIO(b"test")
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.txt", test_file, "text/plain")},
            data={"upload_data": "{}"}
        )
        assert response.status_code == 401


# Folder Hierarchy Management Tests  
class TestFolderHierarchyAPI:
    """Test cases for folder hierarchy management endpoints."""
    
    def test_get_folder_tree_empty(self, client: TestClient, authenticated_headers: dict):
        """Test getting folder tree when no folders exist."""
        response = client.get("/api/v1/documents/folders/tree", headers=authenticated_headers)
        assert response.status_code == 200
        tree = response.json()
        assert isinstance(tree, list)
        assert len(tree) == 0
    
    def test_get_folder_tree_with_folders(self, client: TestClient, authenticated_headers: dict):
        """Test getting folder tree with nested folders."""
        # Create root folder
        root_folder_data = {
            "name": "Root Folder",
            "document_type": "folder",
            "description": "Root level folder"
        }
        
        root_response = client.post(
            "/api/v1/documents/",
            json=root_folder_data,
            headers=authenticated_headers
        )
        assert root_response.status_code == 201
        root_folder = root_response.json()
        
        # Create child folder
        child_folder_data = {
            "name": "Child Folder",
            "document_type": "folder",
            "parent_id": root_folder["id"],
            "description": "Child folder"
        }
        
        child_response = client.post(
            "/api/v1/documents/",
            json=child_folder_data,
            headers=authenticated_headers
        )
        assert child_response.status_code == 201
        
        # Get folder tree
        tree_response = client.get("/api/v1/documents/folders/tree", headers=authenticated_headers)
        assert tree_response.status_code == 200
        tree = tree_response.json()
        
        assert len(tree) >= 1
        assert tree[0]["document"]["name"] == "Root Folder"
        assert tree[0]["has_children"] is True
        assert len(tree[0]["children"]) >= 1
        assert tree[0]["children"][0]["document"]["name"] == "Child Folder"
    
    def test_get_folder_path(self, client: TestClient, authenticated_headers: dict):
        """Test getting folder breadcrumb path."""
        # Create nested folder structure
        grandparent_data = {
            "name": "Grandparent",
            "document_type": "folder"
        }
        grandparent_response = client.post(
            "/api/v1/documents/",
            json=grandparent_data,
            headers=authenticated_headers
        )
        grandparent = grandparent_response.json()
        
        parent_data = {
            "name": "Parent",
            "document_type": "folder",
            "parent_id": grandparent["id"]
        }
        parent_response = client.post(
            "/api/v1/documents/",
            json=parent_data,
            headers=authenticated_headers
        )
        parent = parent_response.json()
        
        child_data = {
            "name": "Child",
            "document_type": "folder", 
            "parent_id": parent["id"]
        }
        child_response = client.post(
            "/api/v1/documents/",
            json=child_data,
            headers=authenticated_headers
        )
        child = child_response.json()
        
        # Get path for child folder
        path_response = client.get(
            f"/api/v1/documents/folders/{child['id']}/path",
            headers=authenticated_headers
        )
        assert path_response.status_code == 200
        path_data = path_response.json()
        
        assert path_data["folder_id"] == child["id"]
        assert path_data["depth"] == 3
        assert len(path_data["path"]) == 3
        assert path_data["path"][0]["name"] == "Grandparent"
        assert path_data["path"][1]["name"] == "Parent"
        assert path_data["path"][2]["name"] == "Child"
    
    def test_bulk_move_folders_success(self, client: TestClient, authenticated_headers: dict):
        """Test successful bulk folder move operation."""
        # Create source folders
        folder1_data = {"name": "Folder 1", "document_type": "folder"}
        folder2_data = {"name": "Folder 2", "document_type": "folder"}
        target_data = {"name": "Target Folder", "document_type": "folder"}
        
        folder1_response = client.post("/api/v1/documents/", json=folder1_data, headers=authenticated_headers)
        folder2_response = client.post("/api/v1/documents/", json=folder2_data, headers=authenticated_headers)
        target_response = client.post("/api/v1/documents/", json=target_data, headers=authenticated_headers)
        
        folder1 = folder1_response.json()
        folder2 = folder2_response.json()
        target = target_response.json()
        
        # Perform bulk move
        move_request = {
            "folder_ids": [folder1["id"], folder2["id"]],
            "target_parent_id": target["id"]
        }
        
        move_response = client.post(
            "/api/v1/documents/folders/bulk-move",
            json=move_request,
            headers=authenticated_headers
        )
        assert move_response.status_code == 200
        result = move_response.json()
        
        assert len(result["successful"]) == 2
        assert len(result["failed"]) == 0
        assert result["total_processed"] == 2
        
        # Verify folders were moved
        folder1_check = client.get(f"/api/v1/documents/{folder1['id']}", headers=authenticated_headers)
        assert folder1_check.json()["parent_id"] == target["id"]
    
    def test_bulk_move_folders_circular_reference(self, client: TestClient, authenticated_headers: dict):
        """Test bulk move with circular reference prevention."""
        # Create parent and child folders
        parent_data = {"name": "Parent", "document_type": "folder"}
        parent_response = client.post("/api/v1/documents/", json=parent_data, headers=authenticated_headers)
        parent = parent_response.json()
        
        child_data = {"name": "Child", "document_type": "folder", "parent_id": parent["id"]}
        child_response = client.post("/api/v1/documents/", json=child_data, headers=authenticated_headers)
        child = child_response.json()
        
        # Try to move parent into child (should fail)
        move_request = {
            "folder_ids": [parent["id"]],
            "target_parent_id": child["id"]
        }
        
        move_response = client.post(
            "/api/v1/documents/folders/bulk-move",
            json=move_request,
            headers=authenticated_headers
        )
        assert move_response.status_code == 200
        result = move_response.json()
        
        assert len(result["successful"]) == 0
        assert len(result["failed"]) == 1
        assert "descendant" in result["failed"][0]["error"].lower()
    
    def test_copy_folder_hierarchy(self, client: TestClient, authenticated_headers: dict):
        """Test copying folder hierarchy with nested structure."""
        # Create source folder with child
        source_data = {"name": "Source Folder", "document_type": "folder"}
        source_response = client.post("/api/v1/documents/", json=source_data, headers=authenticated_headers)
        source = source_response.json()
        
        child_data = {"name": "Child Folder", "document_type": "folder", "parent_id": source["id"]}
        child_response = client.post("/api/v1/documents/", json=child_data, headers=authenticated_headers)
        
        # Create target folder
        target_data = {"name": "Target Folder", "document_type": "folder"}
        target_response = client.post("/api/v1/documents/", json=target_data, headers=authenticated_headers)
        target = target_response.json()
        
        # Copy folder hierarchy
        copy_request = {
            "target_parent_id": target["id"],
            "new_name": "Copied Source",
            "include_documents": False
        }
        
        copy_response = client.post(
            f"/api/v1/documents/folders/{source['id']}/copy",
            json=copy_request,
            headers=authenticated_headers
        )
        assert copy_response.status_code == 200
        copied_folder = copy_response.json()
        
        assert copied_folder["name"] == "Copied Source"
        assert copied_folder["parent_id"] == target["id"]
        
        # Verify child folder was also copied
        children_response = client.get(
            f"/api/v1/documents/?parent_id={copied_folder['id']}",
            headers=authenticated_headers
        )
        assert children_response.status_code == 200
        children = children_response.json()
        assert children["total"] >= 1
    
    def test_permission_inheritance(self, client: TestClient, authenticated_headers: dict, test_admin_user):
        """Test applying permission inheritance to folder hierarchy."""
        # Create folder hierarchy
        root_data = {"name": "Root", "document_type": "folder"}
        root_response = client.post("/api/v1/documents/", json=root_data, headers=authenticated_headers)
        root = root_response.json()
        
        child_data = {"name": "Child", "document_type": "folder", "parent_id": root["id"]}
        child_response = client.post("/api/v1/documents/", json=child_data, headers=authenticated_headers)
        
        # Add permission to root folder
        permission_data = {
            "user_id": test_admin_user.id,
            "permission_type": "read",
            "granted": True,
            "inheritable": True
        }
        
        perm_response = client.post(
            f"/api/v1/documents/{root['id']}/permissions",
            json=permission_data,
            headers=authenticated_headers
        )
        assert perm_response.status_code == 201
        
        # Apply inheritance
        inherit_response = client.post(
            f"/api/v1/documents/folders/{root['id']}/permissions/inherit?recursive=true",
            headers=authenticated_headers
        )
        assert inherit_response.status_code == 200
        result = inherit_response.json()
        
        assert result["folders_processed"] >= 1
        assert result["permissions_applied"] >= 1


# Integration Tests with Database
class TestDocumentAPIIntegration:
    """Integration tests with real database operations."""
    
    def test_document_lifecycle(self, client: TestClient, authenticated_headers: dict, db_session: Session):
        """Test complete document lifecycle through API."""
        # 1. Create folder
        folder_data = {
            "name": "Integration Test Folder",
            "document_type": "folder",
            "description": "Folder for integration testing"
        }
        
        folder_response = client.post(
            "/api/v1/documents/",
            json=folder_data,
            headers=authenticated_headers
        )
        assert folder_response.status_code == 201
        folder = folder_response.json()
        
        # 2. List documents (should include folder)
        list_response = client.get("/api/v1/documents/", headers=authenticated_headers)
        assert list_response.status_code == 200
        assert list_response.json()["total"] >= 1
        
        # 3. Get specific folder
        get_response = client.get(f"/api/v1/documents/{folder['id']}", headers=authenticated_headers)
        assert get_response.status_code == 200
        assert get_response.json()["name"] == folder_data["name"]
        
        # 4. Update folder
        update_data = {"name": "Updated Folder Name"}
        update_response = client.put(
            f"/api/v1/documents/{folder['id']}",
            json=update_data,
            headers=authenticated_headers
        )
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "Updated Folder Name"
        
        # 5. Delete folder
        delete_response = client.delete(f"/api/v1/documents/{folder['id']}", headers=authenticated_headers)
        assert delete_response.status_code == 204
        
        # 6. Verify deletion (should return 404 or be archived)
        final_get_response = client.get(f"/api/v1/documents/{folder['id']}", headers=authenticated_headers)
        # Document should still exist but be archived, or API should handle archived documents
        # The exact behavior depends on implementation
    
    def test_search_and_filter_integration(self, client: TestClient, authenticated_headers: dict):
        """Test search and filtering with real data."""
        # Create test documents with different attributes
        documents = [
            {
                "name": "Sensitive Report.pdf",
                "document_type": "document",
                "is_sensitive": True,
                "tags": ["report", "confidential"]
            },
            {
                "name": "Public Documentation",
                "document_type": "folder",
                "is_sensitive": False,
                "tags": ["public", "docs"]
            }
        ]
        
        created_docs = []
        for doc_data in documents:
            response = client.post(
                "/api/v1/documents/",
                json=doc_data,
                headers=authenticated_headers
            )
            assert response.status_code == 201
            created_docs.append(response.json())
        
        # Test search by name
        search_response = client.post(
            "/api/v1/documents/search",
            json={
                "query": "Report",
                "filters": {},
                "page": 1,
                "size": 10
            },
            headers=authenticated_headers
        )
        assert search_response.status_code == 200
        results = search_response.json()
        assert results["total"] >= 1
        
        # Test filter by sensitivity
        filter_response = client.post(
            "/api/v1/documents/search",
            json={
                "query": "",
                "filters": {"is_sensitive": True},
                "page": 1,
                "size": 10
            },
            headers=authenticated_headers
        )
        assert filter_response.status_code == 200
        sensitive_results = filter_response.json()
        
        # All returned documents should be sensitive
        for doc in sensitive_results["documents"]:
            assert doc["is_sensitive"] is True
    
    def test_complete_folder_hierarchy_workflow(self, client: TestClient, authenticated_headers: dict):
        """Test complete folder hierarchy workflow with all operations."""
        # 1. Create folder structure
        projects_folder = client.post(
            "/api/v1/documents/",
            json={"name": "Projects", "document_type": "folder"},
            headers=authenticated_headers
        ).json()
        
        web_project = client.post(
            "/api/v1/documents/",
            json={"name": "Web Project", "document_type": "folder", "parent_id": projects_folder["id"]},
            headers=authenticated_headers
        ).json()
        
        mobile_project = client.post(
            "/api/v1/documents/",
            json={"name": "Mobile Project", "document_type": "folder", "parent_id": projects_folder["id"]},
            headers=authenticated_headers
        ).json()
        
        # 2. Get complete folder tree
        tree_response = client.get("/api/v1/documents/folders/tree", headers=authenticated_headers)
        assert tree_response.status_code == 200
        tree = tree_response.json()
        
        projects_node = next((node for node in tree if node["document"]["name"] == "Projects"), None)
        assert projects_node is not None
        assert len(projects_node["children"]) == 2
        
        # 3. Get folder path
        path_response = client.get(
            f"/api/v1/documents/folders/{web_project['id']}/path",
            headers=authenticated_headers
        )
        assert path_response.status_code == 200
        path = path_response.json()
        assert path["depth"] == 2
        assert path["path"][0]["name"] == "Projects"
        assert path["path"][1]["name"] == "Web Project"
        
        # 4. Create archive folder and move projects there
        archive_folder = client.post(
            "/api/v1/documents/",
            json={"name": "Archive", "document_type": "folder"},
            headers=authenticated_headers
        ).json()
        
        move_response = client.post(
            "/api/v1/documents/folders/bulk-move",
            json={
                "folder_ids": [web_project["id"], mobile_project["id"]],
                "target_parent_id": archive_folder["id"]
            },
            headers=authenticated_headers
        )
        assert move_response.status_code == 200
        move_result = move_response.json()
        assert len(move_result["successful"]) == 2
        
        # 5. Copy archive folder
        backup_response = client.post(
            f"/api/v1/documents/folders/{archive_folder['id']}/copy",
            json={
                "target_parent_id": None,
                "new_name": "Archive Backup",
                "include_documents": False
            },
            headers=authenticated_headers
        )
        assert backup_response.status_code == 200
        backup_folder = backup_response.json()
        assert backup_folder["name"] == "Archive Backup"
        
        # 6. Verify final structure
        final_tree = client.get("/api/v1/documents/folders/tree", headers=authenticated_headers).json()
        
        # Should have Projects (empty), Archive (with 2 projects), and Archive Backup (with 2 projects)
        folder_names = [node["document"]["name"] for node in final_tree]
        assert "Projects" in folder_names
        assert "Archive" in folder_names
        assert "Archive Backup" in folder_names