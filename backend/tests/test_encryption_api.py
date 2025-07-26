"""
Test cases for encryption API endpoints.

This module contains comprehensive tests for:
- Encryption key management
- Key derivation and validation
- Cryptographic operations
- Key escrow and recovery
- Security and error handling
"""

import pytest
import base64
import hashlib
import secrets
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend

from app.main import app
from app.models.encryption import UserEncryptionKey, KeyEscrow, EncryptionAuditLog
from app.models.user import User


class TestEncryptionKeyManagement:
    """Test cases for encryption key management endpoints."""
    
    def test_get_crypto_parameters(self, client: TestClient):
        """Test getting recommended crypto parameters."""
        response = client.get("/api/v1/encryption/parameters")
        assert response.status_code == 200
        
        params = response.json()
        assert params["algorithm"] == "AES-256-GCM"
        assert params["key_derivation"] == "PBKDF2-SHA256"
        assert params["min_iterations"] == 100000
        assert params["recommended_iterations"] == 500000
        assert params["key_length"] == 32
        assert params["iv_length"] == 12
        assert params["auth_tag_length"] == 16
    
    def test_generate_salt(self, client: TestClient):
        """Test salt generation endpoint."""
        response = client.get("/api/v1/encryption/generate-salt")
        assert response.status_code == 200
        
        data = response.json()
        assert "salt" in data
        assert data["length"] == 32
        assert data["entropy_bits"] == 256
        
        # Verify salt is base64 encoded
        salt_bytes = base64.b64decode(data["salt"])
        assert len(salt_bytes) == 32
    
    def test_generate_salt_custom_length(self, client: TestClient):
        """Test salt generation with custom length."""
        response = client.get("/api/v1/encryption/generate-salt?length=16")
        assert response.status_code == 200
        
        data = response.json()
        salt_bytes = base64.b64decode(data["salt"])
        assert len(salt_bytes) == 16
        assert data["length"] == 16
    
    def test_generate_iv(self, client: TestClient):
        """Test IV generation endpoint."""
        response = client.post("/api/v1/encryption/generate-iv")
        assert response.status_code == 200
        
        data = response.json()
        assert "iv" in data
        assert data["length"] == 12
        assert data["algorithm"] == "AES-GCM"
        
        # Verify IV is base64 encoded and correct length
        iv_bytes = base64.b64decode(data["iv"])
        assert len(iv_bytes) == 12
    
    def test_create_encryption_key_success(self, client: TestClient, authenticated_headers: dict):
        """Test successful encryption key creation."""
        # Generate test key components
        password = "SecureTestPassword123!"
        salt = secrets.token_bytes(32)
        iterations = 500000
        
        # Derive key for validation
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=iterations,
            backend=default_backend()
        )
        derived_key = kdf.derive(password.encode('utf-8'))
        
        # Create validation payload
        aesgcm = AESGCM(derived_key)
        validation_text = "validation:testuser".encode('utf-8')
        iv = secrets.token_bytes(12)
        ciphertext = aesgcm.encrypt(iv, validation_text, None)
        
        # Split ciphertext and auth tag
        validation_ciphertext = ciphertext[:-16]
        auth_tag = ciphertext[-16:]
        
        key_data = {
            "password": password,
            "iterations": iterations,
            "salt": base64.b64encode(salt).decode('utf-8'),
            "hint": "Test password hint",
            "validation_ciphertext": base64.b64encode(validation_ciphertext).decode('utf-8'),
            "validation_iv": base64.b64encode(iv).decode('utf-8'),
            "validation_auth_tag": base64.b64encode(auth_tag).decode('utf-8'),
            "replace_existing": False
        }
        
        response = client.post(
            "/api/v1/encryption/keys",
            json=key_data,
            headers=authenticated_headers
        )
        assert response.status_code == 201
        
        data = response.json()
        assert "key_id" in data
        assert data["algorithm"] == "AES-256-GCM"
        assert data["key_derivation_method"] == "PBKDF2-SHA256"
        assert data["iterations"] == iterations
        assert data["hint"] == "Test password hint"
        assert data["is_active"] is True
    
    def test_create_encryption_key_insufficient_iterations(self, client: TestClient, authenticated_headers: dict):
        """Test key creation with insufficient iterations."""
        key_data = {
            "password": "SecureTestPassword123!",
            "iterations": 50000,  # Too low
            "salt": base64.b64encode(secrets.token_bytes(32)).decode('utf-8'),
            "validation_ciphertext": "dummy",
            "validation_iv": "dummy",
            "validation_auth_tag": "dummy"
        }
        
        response = client.post(
            "/api/v1/encryption/keys",
            json=key_data,
            headers=authenticated_headers
        )
        assert response.status_code == 400
        assert "iterations" in response.json()["detail"].lower()
    
    def test_create_encryption_key_invalid_validation(self, client: TestClient, authenticated_headers: dict):
        """Test key creation with invalid validation payload."""
        key_data = {
            "password": "SecureTestPassword123!",
            "iterations": 500000,
            "salt": base64.b64encode(secrets.token_bytes(32)).decode('utf-8'),
            "validation_ciphertext": base64.b64encode(b"invalid").decode('utf-8'),
            "validation_iv": base64.b64encode(secrets.token_bytes(12)).decode('utf-8'),
            "validation_auth_tag": base64.b64encode(secrets.token_bytes(16)).decode('utf-8')
        }
        
        response = client.post(
            "/api/v1/encryption/keys",
            json=key_data,
            headers=authenticated_headers
        )
        assert response.status_code == 400
        assert "validation" in response.json()["detail"].lower()
    
    def test_list_encryption_keys_empty(self, client: TestClient, authenticated_headers: dict):
        """Test listing encryption keys when none exist."""
        response = client.get("/api/v1/encryption/keys", headers=authenticated_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] == 0
        assert data["active_count"] == 0
        assert data["keys"] == []
    
    def test_list_encryption_keys_with_data(self, client: TestClient, authenticated_headers: dict, 
                                           test_encryption_key):
        """Test listing encryption keys with existing data."""
        response = client.get("/api/v1/encryption/keys", headers=authenticated_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] >= 1
        assert data["active_count"] >= 1
        assert len(data["keys"]) >= 1
        
        key = data["keys"][0]
        assert "key_id" in key
        assert "algorithm" in key
        assert "is_active" in key
    
    def test_get_encryption_key_success(self, client: TestClient, authenticated_headers: dict,
                                       test_encryption_key):
        """Test getting specific encryption key."""
        response = client.get(
            f"/api/v1/encryption/keys/{test_encryption_key.key_id}",
            headers=authenticated_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["key_id"] == test_encryption_key.key_id
        assert data["algorithm"] == test_encryption_key.algorithm
        assert data["is_active"] == test_encryption_key.is_active
    
    def test_get_encryption_key_not_found(self, client: TestClient, authenticated_headers: dict):
        """Test getting non-existent encryption key."""
        response = client.get(
            "/api/v1/encryption/keys/nonexistent-key-id",
            headers=authenticated_headers
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_deactivate_encryption_key_success(self, client: TestClient, authenticated_headers: dict,
                                              test_encryption_key):
        """Test successful key deactivation."""
        response = client.delete(
            f"/api/v1/encryption/keys/{test_encryption_key.key_id}?reason=Testing deactivation",
            headers=authenticated_headers
        )
        assert response.status_code == 204
    
    def test_deactivate_encryption_key_not_found(self, client: TestClient, authenticated_headers: dict):
        """Test deactivating non-existent key."""
        response = client.delete(
            "/api/v1/encryption/keys/nonexistent-key?reason=Test",
            headers=authenticated_headers
        )
        assert response.status_code == 404


class TestKeyDerivationAPI:
    """Test cases for key derivation endpoints."""
    
    def test_derive_key_success(self, client: TestClient, authenticated_headers: dict):
        """Test successful key derivation."""
        salt = secrets.token_bytes(32)
        derive_request = {
            "password": "SecureTestPassword123!",
            "salt": base64.b64encode(salt).decode('utf-8'),
            "iterations": 500000
        }
        
        response = client.post(
            "/api/v1/encryption/derive-key",
            json=derive_request,
            headers=authenticated_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "derived_key" in data
        assert "key_hash" in data
        assert data["algorithm"] == "PBKDF2-SHA256"
        assert data["iterations"] == 500000
        
        # Verify derived key is base64 encoded and correct length
        key_bytes = base64.b64decode(data["derived_key"])
        assert len(key_bytes) == 32
    
    def test_derive_key_insufficient_iterations(self, client: TestClient, authenticated_headers: dict):
        """Test key derivation with insufficient iterations."""
        derive_request = {
            "password": "SecureTestPassword123!",
            "salt": base64.b64encode(secrets.token_bytes(32)).decode('utf-8'),
            "iterations": 50000  # Too low
        }
        
        response = client.post(
            "/api/v1/encryption/derive-key",
            json=derive_request,
            headers=authenticated_headers
        )
        assert response.status_code == 400
        assert "iterations" in response.json()["detail"].lower()
    
    def test_derive_key_invalid_salt(self, client: TestClient, authenticated_headers: dict):
        """Test key derivation with invalid salt."""
        derive_request = {
            "password": "SecureTestPassword123!",
            "salt": "invalid-base64",
            "iterations": 500000
        }
        
        response = client.post(
            "/api/v1/encryption/derive-key",
            json=derive_request,
            headers=authenticated_headers
        )
        assert response.status_code == 400


class TestEncryptionValidationAPI:
    """Test cases for encryption validation endpoints."""
    
    def test_validate_encryption_success(self, client: TestClient, authenticated_headers: dict):
        """Test successful encryption validation."""
        # Create test encryption
        key = secrets.token_bytes(32)
        iv = secrets.token_bytes(12)
        plaintext = b"Hello, SecureVault!"
        
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(iv, plaintext, None)
        
        # Split ciphertext and auth tag
        ciphertext_only = ciphertext[:-16]
        auth_tag = ciphertext[-16:]
        
        validation_request = {
            "key": base64.b64encode(key).decode('utf-8'),
            "iv": base64.b64encode(iv).decode('utf-8'),
            "auth_tag": base64.b64encode(auth_tag).decode('utf-8'),
            "ciphertext": base64.b64encode(ciphertext_only).decode('utf-8')
        }
        
        response = client.post(
            "/api/v1/encryption/validate",
            json=validation_request,
            headers=authenticated_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["valid"] is True
        assert data["algorithm"] == "AES-256-GCM"
        assert "plaintext_hash" in data
        assert data["error_message"] is None
    
    def test_validate_encryption_invalid_key(self, client: TestClient, authenticated_headers: dict):
        """Test validation with invalid key."""
        validation_request = {
            "key": base64.b64encode(secrets.token_bytes(16)).decode('utf-8'),  # Wrong length
            "iv": base64.b64encode(secrets.token_bytes(12)).decode('utf-8'),
            "auth_tag": base64.b64encode(secrets.token_bytes(16)).decode('utf-8'),
            "ciphertext": base64.b64encode(b"dummy").decode('utf-8')
        }
        
        response = client.post(
            "/api/v1/encryption/validate",
            json=validation_request,
            headers=authenticated_headers
        )
        assert response.status_code == 400
        assert "key must be 32 bytes" in response.json()["detail"].lower()
    
    def test_validate_encryption_wrong_key(self, client: TestClient, authenticated_headers: dict):
        """Test validation with wrong decryption key."""
        # Create encryption with one key
        correct_key = secrets.token_bytes(32)
        wrong_key = secrets.token_bytes(32)
        iv = secrets.token_bytes(12)
        plaintext = b"Hello, SecureVault!"
        
        aesgcm = AESGCM(correct_key)
        ciphertext = aesgcm.encrypt(iv, plaintext, None)
        
        ciphertext_only = ciphertext[:-16]
        auth_tag = ciphertext[-16:]
        
        # Try to validate with wrong key
        validation_request = {
            "key": base64.b64encode(wrong_key).decode('utf-8'),
            "iv": base64.b64encode(iv).decode('utf-8'),
            "auth_tag": base64.b64encode(auth_tag).decode('utf-8'),
            "ciphertext": base64.b64encode(ciphertext_only).decode('utf-8')
        }
        
        response = client.post(
            "/api/v1/encryption/validate",
            json=validation_request,
            headers=authenticated_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["valid"] is False
        assert data["error_message"] is not None


class TestEncryptionHealthCheck:
    """Test cases for encryption health check."""
    
    def test_encryption_health_check_healthy(self, client: TestClient, authenticated_headers: dict):
        """Test encryption health check when system is healthy."""
        response = client.get("/api/v1/encryption/health", headers=authenticated_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["crypto_functional"] is True
        assert "user_keys_count" in data
        assert "audit_logs_count" in data
        assert "supported_algorithms" in data
        assert "supported_kdf" in data
        assert "AES-256-GCM" in data["supported_algorithms"]
        assert "PBKDF2-SHA256" in data["supported_kdf"]


class TestEncryptionAuthentication:
    """Test authentication and authorization for encryption endpoints."""
    
    def test_encryption_endpoints_require_auth(self, client: TestClient):
        """Test that encryption endpoints require authentication."""
        endpoints = [
            ("/api/v1/encryption/keys", "GET"),
            ("/api/v1/encryption/keys", "POST"),
            ("/api/v1/encryption/derive-key", "POST"),
            ("/api/v1/encryption/validate", "POST"),
            ("/api/v1/encryption/health", "GET")
        ]
        
        for endpoint, method in endpoints:
            if method == "GET":
                response = client.get(endpoint)
            else:
                response = client.post(endpoint, json={})
            
            assert response.status_code == 401, f"Endpoint {method} {endpoint} should require auth"


class TestEncryptionAuditLogging:
    """Test audit logging for encryption operations."""
    
    def test_key_creation_creates_audit_log(self, client: TestClient, authenticated_headers: dict, 
                                           db_session: Session):
        """Test that key creation creates audit log entry."""
        initial_count = db_session.query(EncryptionAuditLog).count()
        
        # Create encryption key (simplified for testing)
        key_data = {
            "password": "SecureTestPassword123!",
            "iterations": 500000,
            "salt": base64.b64encode(secrets.token_bytes(32)).decode('utf-8'),
            "validation_ciphertext": base64.b64encode(b"dummy").decode('utf-8'),
            "validation_iv": base64.b64encode(secrets.token_bytes(12)).decode('utf-8'),
            "validation_auth_tag": base64.b64encode(secrets.token_bytes(16)).decode('utf-8')
        }
        
        # This will fail validation but should still create audit log
        client.post(
            "/api/v1/encryption/keys",
            json=key_data,
            headers=authenticated_headers
        )
        
        # Check that audit log was created (even for failed attempt)
        final_count = db_session.query(EncryptionAuditLog).count()
        assert final_count > initial_count
    
    def test_key_derivation_creates_audit_log(self, client: TestClient, authenticated_headers: dict,
                                             db_session: Session):
        """Test that key derivation creates audit log entry."""
        initial_count = db_session.query(EncryptionAuditLog).count()
        
        derive_request = {
            "password": "SecureTestPassword123!",
            "salt": base64.b64encode(secrets.token_bytes(32)).decode('utf-8'),
            "iterations": 500000
        }
        
        response = client.post(
            "/api/v1/encryption/derive-key",
            json=derive_request,
            headers=authenticated_headers
        )
        assert response.status_code == 200
        
        final_count = db_session.query(EncryptionAuditLog).count()
        assert final_count > initial_count


class TestEncryptionIntegration:
    """Integration tests for complete encryption workflows."""
    
    def test_complete_encryption_workflow(self, client: TestClient, authenticated_headers: dict):
        """Test complete encryption workflow from key creation to validation."""
        # 1. Get crypto parameters
        params_response = client.get("/api/v1/encryption/parameters")
        assert params_response.status_code == 200
        params = params_response.json()
        
        # 2. Generate salt
        salt_response = client.get("/api/v1/encryption/generate-salt")
        assert salt_response.status_code == 200
        salt_data = salt_response.json()
        
        # 3. Derive key for validation
        password = "SecureTestPassword123!"
        salt_bytes = base64.b64decode(salt_data["salt"])
        iterations = params["recommended_iterations"]
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt_bytes,
            iterations=iterations,
            backend=default_backend()
        )
        derived_key = kdf.derive(password.encode('utf-8'))
        
        # 4. Create validation payload
        aesgcm = AESGCM(derived_key)
        validation_text = "validation:testuser".encode('utf-8')
        iv = secrets.token_bytes(12)
        ciphertext = aesgcm.encrypt(iv, validation_text, None)
        
        validation_ciphertext = ciphertext[:-16]
        auth_tag = ciphertext[-16:]
        
        # 5. Create encryption key
        key_data = {
            "password": password,
            "iterations": iterations,
            "salt": salt_data["salt"],
            "hint": "Integration test password",
            "validation_ciphertext": base64.b64encode(validation_ciphertext).decode('utf-8'),
            "validation_iv": base64.b64encode(iv).decode('utf-8'),
            "validation_auth_tag": base64.b64encode(auth_tag).decode('utf-8'),
            "replace_existing": False
        }
        
        key_response = client.post(
            "/api/v1/encryption/keys",
            json=key_data,
            headers=authenticated_headers
        )
        assert key_response.status_code == 201
        key_info = key_response.json()
        
        # 6. List keys to verify creation
        list_response = client.get("/api/v1/encryption/keys", headers=authenticated_headers)
        assert list_response.status_code == 200
        keys = list_response.json()
        assert keys["total"] >= 1
        assert any(key["key_id"] == key_info["key_id"] for key in keys["keys"])
        
        # 7. Test key derivation endpoint
        derive_response = client.post(
            "/api/v1/encryption/derive-key",
            json={
                "password": password,
                "salt": salt_data["salt"],
                "iterations": iterations
            },
            headers=authenticated_headers
        )
        assert derive_response.status_code == 200
        derived_info = derive_response.json()
        
        # 8. Validate encryption
        test_plaintext = b"Test encryption data"
        test_iv = secrets.token_bytes(12)
        test_ciphertext = aesgcm.encrypt(test_iv, test_plaintext, None)
        test_ciphertext_only = test_ciphertext[:-16]
        test_auth_tag = test_ciphertext[-16:]
        
        validate_response = client.post(
            "/api/v1/encryption/validate",
            json={
                "key": derived_info["derived_key"],
                "iv": base64.b64encode(test_iv).decode('utf-8'),
                "auth_tag": base64.b64encode(test_auth_tag).decode('utf-8'),
                "ciphertext": base64.b64encode(test_ciphertext_only).decode('utf-8')
            },
            headers=authenticated_headers
        )
        assert validate_response.status_code == 200
        validation = validate_response.json()
        assert validation["valid"] is True
        
        # 9. Check health
        health_response = client.get("/api/v1/encryption/health", headers=authenticated_headers)
        assert health_response.status_code == 200
        health = health_response.json()
        assert health["status"] == "healthy"
        assert health["user_keys_count"] >= 1