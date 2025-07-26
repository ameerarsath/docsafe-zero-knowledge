"""
Pytest configuration and shared fixtures for SecureVault tests.

This module provides common fixtures and configuration for all tests
in the SecureVault test suite. Fixtures are designed to support
both unit and integration testing with proper isolation.
"""

import pytest
import asyncio
import tempfile
import os
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import redis.asyncio as redis
from httpx import AsyncClient

from app.main import app
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User
from app.models.token import TokenFamily


# Configure pytest for async tests
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# Database fixtures
@pytest.fixture(scope="function")
def test_db():
    """Create a test database using SQLite in-memory."""
    # Create in-memory SQLite database for testing
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture(scope="function")
def mock_db_session():
    """Provide a mock database session for unit tests."""
    mock_session = MagicMock()
    mock_session.query = MagicMock()
    mock_session.add = MagicMock()
    mock_session.commit = MagicMock()
    mock_session.rollback = MagicMock()
    mock_session.close = MagicMock()
    return mock_session


# Redis fixtures
@pytest.fixture(scope="function")
async def test_redis():
    """Create a test Redis client using fakeredis."""
    try:
        import fakeredis.aioredis
        redis_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
        yield redis_client
        await redis_client.flushall()
        await redis_client.close()
    except ImportError:
        # Fallback to mock if fakeredis not available
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.set = AsyncMock(return_value=True)
        mock_redis.setex = AsyncMock(return_value=True)
        mock_redis.delete = AsyncMock(return_value=0)
        mock_redis.exists = AsyncMock(return_value=False)
        mock_redis.flushall = AsyncMock(return_value=True)
        yield mock_redis


@pytest.fixture(scope="function")
def mock_redis():
    """Provide a mock Redis client for unit tests."""
    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.set = AsyncMock(return_value=True)
    mock_redis.setex = AsyncMock(return_value=True)
    mock_redis.delete = AsyncMock(return_value=0)
    mock_redis.exists = AsyncMock(return_value=False)
    mock_redis.flushall = AsyncMock(return_value=True)
    return mock_redis


# HTTP client fixtures
@pytest.fixture(scope="function")
async def async_client(test_db):
    """Create an async HTTP client for API testing."""
    # Override database dependency
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client
    
    # Clean up
    app.dependency_overrides.clear()


# User fixtures
@pytest.fixture
def test_user_data():
    """Provide test user data."""
    return {
        "username": "testuser",
        "email": "testuser@securevault.local",
        "password": "SecureTestPassword123!",
        "hashed_password": "$2b$12$hashedpasswordexample",
        "role": "user",
        "is_active": True,
        "mfa_enabled": False,
        "user_id": 123,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


@pytest.fixture
def test_admin_user_data():
    """Provide test admin user data."""
    return {
        "username": "adminuser",
        "email": "admin@securevault.local",
        "password": "SecureAdminPassword123!",
        "hashed_password": "$2b$12$hashedadminpassword",
        "role": "admin",
        "is_active": True,
        "mfa_enabled": True,
        "user_id": 456,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


@pytest.fixture
def test_user_with_mfa_data():
    """Provide test user data with MFA enabled."""
    return {
        "username": "mfauser",
        "email": "mfauser@securevault.local",
        "password": "SecureMFAPassword123!",
        "hashed_password": "$2b$12$hashedmfapassword",
        "role": "user",
        "is_active": True,
        "mfa_enabled": True,
        "mfa_secret": "JBSWY3DPEHPK3PXP",
        "user_id": 789,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


@pytest.fixture
def test_user_instance(test_user_data):
    """Create a test User model instance."""
    return User(**test_user_data)


# Token fixtures
@pytest.fixture
def test_access_token(test_user_data):
    """Create a test access token."""
    return create_access_token(data={
        "sub": test_user_data["username"],
        "user_id": test_user_data["user_id"],
        "role": test_user_data["role"]
    })


@pytest.fixture
def test_refresh_token(test_user_data):
    """Create a test refresh token."""
    return create_refresh_token(data={
        "sub": test_user_data["username"],
        "user_id": test_user_data["user_id"],
        "role": test_user_data["role"]
    })


@pytest.fixture
def test_expired_token(test_user_data):
    """Create an expired test token."""
    return create_access_token(
        data={
            "sub": test_user_data["username"],
            "user_id": test_user_data["user_id"],
            "role": test_user_data["role"]
        },
        expires_delta=timedelta(seconds=-1)  # Already expired
    )


# Token family fixtures
@pytest.fixture
def test_token_family():
    """Create a test token family."""
    return TokenFamily(
        id="test-family-id-123",
        user_id=123,
        created_at=datetime.utcnow(),
        is_revoked=False
    )


@pytest.fixture
def test_revoked_token_family():
    """Create a revoked test token family."""
    return TokenFamily(
        id="revoked-family-id-456",
        user_id=123,
        created_at=datetime.utcnow(),
        is_revoked=True
    )


# Authentication fixtures  
@pytest.fixture
def authenticated_headers(test_access_token):
    """Provide headers for authenticated requests."""
    return {"Authorization": f"Bearer {test_access_token}"}


@pytest.fixture
def authenticated_user_headers(test_user):
    """Provide headers for authenticated requests using actual test user."""
    from app.core.security import create_access_token
    
    token = create_access_token(data={
        "sub": test_user.username,
        "user_id": test_user.id,
        "role": test_user.role
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(test_admin_user_data):
    """Provide headers for admin requests."""
    admin_token = create_access_token(data={
        "sub": test_admin_user_data["username"],
        "user_id": test_admin_user_data["user_id"],
        "role": test_admin_user_data["role"]
    })
    return {"Authorization": f"Bearer {admin_token}"}


# Environment fixtures
@pytest.fixture
def temp_directory():
    """Create a temporary directory for file operations."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


@pytest.fixture
def test_settings():
    """Provide test-specific settings."""
    original_settings = {}
    
    # Store original values
    for attr in ['SECRET_KEY', 'ALGORITHM', 'ACCESS_TOKEN_EXPIRE_MINUTES']:
        if hasattr(settings, attr):
            original_settings[attr] = getattr(settings, attr)
    
    # Set test values
    settings.SECRET_KEY = "test-secret-key-for-testing-only"
    settings.ALGORITHM = "HS256"
    settings.ACCESS_TOKEN_EXPIRE_MINUTES = 15
    
    yield settings
    
    # Restore original values
    for attr, value in original_settings.items():
        setattr(settings, attr, value)


# Mock service fixtures
@pytest.fixture
def mock_email_service():
    """Provide a mock email service."""
    mock_service = MagicMock()
    mock_service.send_email = AsyncMock(return_value=True)
    mock_service.send_password_reset = AsyncMock(return_value=True)
    mock_service.send_mfa_code = AsyncMock(return_value=True)
    return mock_service


@pytest.fixture
def mock_audit_service():
    """Provide a mock audit service."""
    mock_service = MagicMock()
    mock_service.log_event = AsyncMock(return_value=True)
    mock_service.log_auth_event = AsyncMock(return_value=True)
    mock_service.log_security_event = AsyncMock(return_value=True)
    return mock_service


# Test data fixtures
@pytest.fixture
def sample_login_data():
    """Provide sample login request data."""
    return {
        "username": "testuser",
        "password": "SecureTestPassword123!"
    }


@pytest.fixture
def sample_registration_data():
    """Provide sample user registration data."""
    return {
        "username": "newuser",
        "email": "newuser@securevault.local",
        "password": "SecureNewPassword123!",
        "confirm_password": "SecureNewPassword123!",
        "role": "user"
    }


@pytest.fixture
def sample_mfa_data():
    """Provide sample MFA verification data."""
    return {
        "temp_token": "temporary-mfa-token",
        "mfa_code": "123456"
    }


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "security: mark test as a security test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on location."""
    for item in items:
        # Add markers based on test file location
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        
        # Add security marker for security-related tests
        if any(keyword in item.name.lower() for keyword in ['security', 'auth', 'token', 'password']):
            item.add_marker(pytest.mark.security)


# Custom assertions
def assert_token_valid(token, expected_username=None):
    """Assert that a JWT token is valid."""
    import jwt
    from app.core.config import settings
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload is not None
        assert "sub" in payload
        assert "exp" in payload
        assert "iat" in payload
        
        if expected_username:
            assert payload["sub"] == expected_username
        
        return payload
    except jwt.PyJWTError as e:
        pytest.fail(f"Token validation failed: {e}")


def assert_password_hashed(password, hashed_password):
    """Assert that a password is properly hashed."""
    import bcrypt
    
    assert hashed_password != password  # Should not be plain text
    assert hashed_password.startswith('$2b$')  # bcrypt format
    assert bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))


# Document fixtures
@pytest.fixture
def test_user(test_db):
    """Create a test user in the database."""
    from app.models.user import User
    user = User(
        username="testuser",
        email="testuser@securevault.local",
        password_hash="$2b$12$hashedpasswordexample",
        role="user",
        is_active=True,
        is_verified=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def test_admin_user(test_db):
    """Create a test admin user in the database."""
    from app.models.user import User
    admin = User(
        username="adminuser",
        email="admin@securevault.local", 
        password_hash="$2b$12$hashedadminpassword",
        role="admin",
        is_active=True,
        is_verified=True
    )
    test_db.add(admin)
    test_db.commit()
    test_db.refresh(admin)
    return admin


@pytest.fixture
def test_document(test_db, test_user):
    """Create a test document in the database."""
    from app.models.document import Document, DocumentType
    document = Document(
        name="test-document.pdf",
        description="Test document for testing",
        document_type=DocumentType.DOCUMENT,
        mime_type="application/pdf",
        file_size=1024,
        file_hash_sha256="abc123def456",
        storage_path="/encrypted/test-document.enc",
        owner_id=test_user.id,
        created_by=test_user.id
    )
    test_db.add(document)
    test_db.commit()
    test_db.refresh(document)
    return document


@pytest.fixture
def test_folder(test_db, test_user):
    """Create a test folder in the database."""
    from app.models.document import Document, DocumentType
    folder = Document(
        name="test-folder",
        description="Test folder for testing",
        document_type=DocumentType.FOLDER,
        owner_id=test_user.id,
        created_by=test_user.id
    )
    test_db.add(folder)
    test_db.commit()
    test_db.refresh(folder)
    return folder


@pytest.fixture 
def test_document_permission(test_db, test_document, test_user):
    """Create a test document permission."""
    from app.models.document import DocumentPermission
    permission = DocumentPermission(
        document_id=test_document.id,
        user_id=test_user.id,
        permission_type="read",
        granted=True,
        granted_by=test_user.id
    )
    test_db.add(permission)
    test_db.commit()
    test_db.refresh(permission)
    return permission


@pytest.fixture
def test_document_share(test_db, test_document, test_user):
    """Create a test document share."""
    from app.models.document import DocumentShare, DocumentShareType
    share = DocumentShare(
        document_id=test_document.id,
        share_token="test-share-token-123",
        share_name="Test Share",
        share_type=DocumentShareType.INTERNAL,
        created_by=test_user.id
    )
    test_db.add(share)
    test_db.commit()
    test_db.refresh(share)
    return share


@pytest.fixture
def sample_document_upload_data():
    """Provide sample document upload data."""
    import base64
    import os
    return {
        "name": "sample-document.pdf",
        "description": "Sample document for testing",
        "parent_id": None,
        "tags": ["test", "sample"],
        "doc_metadata": {"source": "test", "category": "testing"},
        "encryption_key_id": "test-key-123",
        "encryption_iv": base64.b64encode(os.urandom(16)).decode(),
        "encryption_auth_tag": base64.b64encode(os.urandom(16)).decode(),
        "file_size": 2048,
        "file_hash": "def456abc789",
        "mime_type": "application/pdf"
    }


@pytest.fixture
def sample_folder_create_data():
    """Provide sample folder creation data."""
    return {
        "name": "sample-folder",
        "description": "Sample folder for testing",
        "document_type": "folder",
        "parent_id": None,
        "tags": ["test", "folder"]
    }


# Database session alias for document tests
@pytest.fixture
def db_session(test_db):
    """Alias for test_db to match document test expectations."""
    return test_db


# Synchronous test client for API testing
@pytest.fixture
def client(test_db):
    """Create a synchronous test client for API testing."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.database import get_db
    
    # Override database dependency
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as client:
        yield client
    
    # Clean up
    app.dependency_overrides.clear()


# Encryption test fixtures
@pytest.fixture
def test_encryption_key(test_db, test_user):
    """Create a test encryption key in the database."""
    from app.models.encryption import UserEncryptionKey
    import secrets
    import base64
    
    encryption_key = UserEncryptionKey(
        user_id=test_user.id,
        key_id=f"key_{test_user.id}_{secrets.token_hex(8)}",
        algorithm="AES-256-GCM",
        key_derivation_method="PBKDF2-SHA256",
        iterations=500000,
        salt=base64.b64encode(secrets.token_bytes(32)).decode('utf-8'),
        validation_hash=secrets.token_hex(32),
        hint="Test encryption key",
        is_active=True,
        created_by=test_user.id
    )
    test_db.add(encryption_key)
    test_db.commit()
    test_db.refresh(encryption_key)
    return encryption_key


@pytest.fixture
def test_key_escrow(test_db, test_encryption_key, test_admin_user):
    """Create a test key escrow record."""
    from app.models.encryption import KeyEscrow
    
    escrow = KeyEscrow(
        key_id=test_encryption_key.key_id,
        user_id=test_encryption_key.user_id,
        escrow_data=b"encrypted_key_material",
        escrow_method="admin_escrow",
        recovery_hint="Test recovery hint",
        created_by=test_admin_user.id
    )
    test_db.add(escrow)
    test_db.commit()
    test_db.refresh(escrow)
    return escrow


@pytest.fixture
def encryption_test_data():
    """Provide test data for encryption operations."""
    import secrets
    import base64
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.backends import default_backend
    
    password = "SecureTestPassword123!"
    salt = secrets.token_bytes(32)
    iterations = 500000
    
    # Derive key
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations,
        backend=default_backend()
    )
    derived_key = kdf.derive(password.encode('utf-8'))
    
    # Create test encryption
    plaintext = b"Hello, SecureVault! This is test data."
    iv = secrets.token_bytes(12)
    aesgcm = AESGCM(derived_key)
    ciphertext = aesgcm.encrypt(iv, plaintext, None)
    
    return {
        "password": password,
        "salt": base64.b64encode(salt).decode('utf-8'),
        "iterations": iterations,
        "derived_key": base64.b64encode(derived_key).decode('utf-8'),
        "plaintext": plaintext,
        "iv": base64.b64encode(iv).decode('utf-8'),
        "ciphertext": base64.b64encode(ciphertext[:-16]).decode('utf-8'),
        "auth_tag": base64.b64encode(ciphertext[-16:]).decode('utf-8')
    }


# Add custom assertions to pytest namespace
pytest.assert_token_valid = assert_token_valid
pytest.assert_password_hashed = assert_password_hashed