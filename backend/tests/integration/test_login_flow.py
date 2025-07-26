"""
Integration tests for authentication login flow.

This module contains comprehensive integration tests for the complete
login flow in SecureVault. Tests cover the full authentication pipeline
from credential validation to session establishment.

Test Coverage:
- Complete login flow with valid credentials
- Login flow with invalid credentials
- Multi-factor authentication integration
- Session management and cleanup
- Rate limiting and security measures
- Database integration for user lookup
- Redis integration for session storage
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient
import jwt
import redis.asyncio as redis

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token, verify_token
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, TokenData
from app.api.auth.endpoints import authenticate_user, create_user_session


class TestLoginFlowIntegration:
    """Integration tests for complete login flow."""

    @pytest.fixture
    def test_user_data(self):
        """Fixture providing test user data."""
        return {
            "username": "testuser",
            "email": "testuser@securevault.local",
            "password": "SecureTestPassword123!",
            "role": "user",
            "is_active": True,
            "mfa_enabled": False,
        }

    @pytest.fixture
    def test_user_with_mfa_data(self):
        """Fixture providing test user data with MFA enabled."""
        return {
            "username": "mfauser",
            "email": "mfauser@securevault.local",
            "password": "SecureMFAPassword123!",
            "role": "user",
            "is_active": True,
            "mfa_enabled": True,
            "mfa_secret": "JBSWY3DPEHPK3PXP",  # Test TOTP secret
        }

    @pytest.fixture
    async def async_client(self):
        """Fixture providing async HTTP client."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            yield client

    @pytest.fixture
    async def redis_client(self):
        """Fixture providing Redis client for session testing."""
        client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        yield client
        await client.flushdb()  # Clean up after test
        await client.close()

    async def test_successful_login_flow_complete(self, async_client, test_user_data, redis_client):
        """Test complete successful login flow."""
        # 1. Create test user in database
        with patch('app.api.auth.endpoints.get_user_by_username') as mock_get_user:
            mock_user = User(**test_user_data)
            mock_get_user.return_value = mock_user
            
            # 2. Mock password verification
            with patch('app.core.security.verify_password', return_value=True):
                # 3. Perform login request
                login_data = {
                    "username": test_user_data["username"],
                    "password": test_user_data["password"]
                }
                
                response = await async_client.post("/api/auth/login", json=login_data)
                
                # 4. Verify response
                assert response.status_code == 200
                response_data = response.json()
                
                # Verify response structure
                assert "access_token" in response_data
                assert "refresh_token" in response_data
                assert "token_type" in response_data
                assert response_data["token_type"] == "bearer"
                assert "expires_in" in response_data
                
                # Verify tokens are valid JWT
                access_token = response_data["access_token"]
                refresh_token = response_data["refresh_token"]
                
                # Decode and verify access token
                payload = jwt.decode(
                    access_token,
                    settings.SECRET_KEY,
                    algorithms=[settings.ALGORITHM]
                )
                assert payload["sub"] == test_user_data["username"]
                assert payload["type"] == "access"
                
                # Decode and verify refresh token
                refresh_payload = jwt.decode(
                    refresh_token,
                    settings.SECRET_KEY,
                    algorithms=[settings.ALGORITHM]
                )
                assert refresh_payload["sub"] == test_user_data["username"]
                assert refresh_payload["type"] == "refresh"
                
                # 5. Verify session created in Redis
                session_key = f"session:{test_user_data['username']}"
                session_data = await redis_client.get(session_key)
                assert session_data is not None

    async def test_login_flow_invalid_username(self, async_client):
        """Test login flow with invalid username."""
        with patch('app.api.auth.endpoints.get_user_by_username', return_value=None):
            login_data = {
                "username": "nonexistent_user",
                "password": "SomePassword123!"
            }
            
            response = await async_client.post("/api/auth/login", json=login_data)
            
            assert response.status_code == 401
            response_data = response.json()
            assert "detail" in response_data
            assert "invalid credentials" in response_data["detail"].lower()

    async def test_login_flow_invalid_password(self, async_client, test_user_data):
        """Test login flow with invalid password."""
        with patch('app.api.auth.endpoints.get_user_by_username') as mock_get_user:
            mock_user = User(**test_user_data)
            mock_get_user.return_value = mock_user
            
            # Mock password verification to return False
            with patch('app.core.security.verify_password', return_value=False):
                login_data = {
                    "username": test_user_data["username"],
                    "password": "WrongPassword123!"
                }
                
                response = await async_client.post("/api/auth/login", json=login_data)
                
                assert response.status_code == 401
                response_data = response.json()
                assert "detail" in response_data
                assert "invalid credentials" in response_data["detail"].lower()

    async def test_login_flow_inactive_user(self, async_client, test_user_data):
        """Test login flow with inactive user account."""
        inactive_user_data = test_user_data.copy()
        inactive_user_data["is_active"] = False
        
        with patch('app.api.auth.endpoints.get_user_by_username') as mock_get_user:
            mock_user = User(**inactive_user_data)
            mock_get_user.return_value = mock_user
            
            login_data = {
                "username": test_user_data["username"],
                "password": test_user_data["password"]
            }
            
            response = await async_client.post("/api/auth/login", json=login_data)
            
            assert response.status_code == 401
            response_data = response.json()
            assert "account is disabled" in response_data["detail"].lower()

    async def test_login_flow_with_mfa_required(self, async_client, test_user_with_mfa_data):
        """Test login flow when MFA is required."""
        with patch('app.api.auth.endpoints.get_user_by_username') as mock_get_user:
            mock_user = User(**test_user_with_mfa_data)
            mock_get_user.return_value = mock_user
            
            with patch('app.core.security.verify_password', return_value=True):
                login_data = {
                    "username": test_user_with_mfa_data["username"],
                    "password": test_user_with_mfa_data["password"]
                }
                
                response = await async_client.post("/api/auth/login", json=login_data)
                
                # Should return 200 but require MFA
                assert response.status_code == 200
                response_data = response.json()
                
                assert "mfa_required" in response_data
                assert response_data["mfa_required"] is True
                assert "temp_token" in response_data
                assert "access_token" not in response_data  # No full access yet

    async def test_login_flow_with_mfa_completion(self, async_client, test_user_with_mfa_data):
        """Test complete login flow with MFA verification."""
        with patch('app.api.auth.endpoints.get_user_by_username') as mock_get_user:
            mock_user = User(**test_user_with_mfa_data)
            mock_get_user.return_value = mock_user
            
            with patch('app.core.security.verify_password', return_value=True):
                # Step 1: Initial login (password only)
                login_data = {
                    "username": test_user_with_mfa_data["username"],
                    "password": test_user_with_mfa_data["password"]
                }
                
                response = await async_client.post("/api/auth/login", json=login_data)
                assert response.status_code == 200
                
                response_data = response.json()
                temp_token = response_data["temp_token"]
                
                # Step 2: MFA verification
                with patch('app.core.security.verify_totp_token', return_value=True):
                    mfa_data = {
                        "temp_token": temp_token,
                        "mfa_code": "123456"  # Mock TOTP code
                    }
                    
                    mfa_response = await async_client.post("/api/auth/mfa/verify", json=mfa_data)
                    
                    assert mfa_response.status_code == 200
                    mfa_response_data = mfa_response.json()
                    
                    # Should now have full access tokens
                    assert "access_token" in mfa_response_data
                    assert "refresh_token" in mfa_response_data
                    assert "token_type" in mfa_response_data

    async def test_login_flow_rate_limiting(self, async_client, test_user_data):
        """Test login flow rate limiting after multiple failed attempts."""
        with patch('app.api.auth.endpoints.get_user_by_username') as mock_get_user:
            mock_user = User(**test_user_data)
            mock_get_user.return_value = mock_user
            
            # Mock failed password verification
            with patch('app.core.security.verify_password', return_value=False):
                login_data = {
                    "username": test_user_data["username"],
                    "password": "WrongPassword123!"
                }
                
                # Make multiple failed login attempts
                for i in range(5):  # Exceed rate limit
                    response = await async_client.post("/api/auth/login", json=login_data)
                    
                    if i < 3:  # First few attempts
                        assert response.status_code == 401
                    else:  # Should be rate limited
                        assert response.status_code == 429
                        response_data = response.json()
                        assert "too many attempts" in response_data["detail"].lower()

    async def test_login_flow_session_management(self, async_client, test_user_data, redis_client):
        """Test session management during login flow."""
        with patch('app.api.auth.endpoints.get_user_by_username') as mock_get_user:
            mock_user = User(**test_user_data)
            mock_get_user.return_value = mock_user
            
            with patch('app.core.security.verify_password', return_value=True):
                login_data = {
                    "username": test_user_data["username"],
                    "password": test_user_data["password"]
                }
                
                # First login
                response1 = await async_client.post("/api/auth/login", json=login_data)
                assert response1.status_code == 200
                
                # Verify session exists
                session_key = f"session:{test_user_data['username']}"
                session_data = await redis_client.get(session_key)
                assert session_data is not None
                
                # Second login (should replace session)
                response2 = await async_client.post("/api/auth/login", json=login_data)
                assert response2.status_code == 200
                
                # Tokens should be different
                token1 = response1.json()["access_token"]
                token2 = response2.json()["access_token"]
                assert token1 != token2

    async def test_login_flow_concurrent_sessions(self, async_client, test_user_data, redis_client):
        """Test handling of concurrent login attempts."""
        import asyncio
        
        with patch('app.api.auth.endpoints.get_user_by_username') as mock_get_user:
            mock_user = User(**test_user_data)
            mock_get_user.return_value = mock_user
            
            with patch('app.core.security.verify_password', return_value=True):
                login_data = {
                    "username": test_user_data["username"],
                    "password": test_user_data["password"]
                }
                
                # Simulate concurrent login attempts
                async def login_attempt():
                    return await async_client.post("/api/auth/login", json=login_data)
                
                # Execute multiple concurrent logins
                tasks = [login_attempt() for _ in range(3)]
                responses = await asyncio.gather(*tasks)
                
                # All should succeed (last one wins for session)
                for response in responses:
                    assert response.status_code == 200

    async def test_login_flow_database_error_handling(self, async_client, test_user_data):
        """Test login flow error handling for database issues."""
        # Mock database connection error
        with patch('app.api.auth.endpoints.get_user_by_username', side_effect=Exception("Database error")):
            login_data = {
                "username": test_user_data["username"],
                "password": test_user_data["password"]
            }
            
            response = await async_client.post("/api/auth/login", json=login_data)
            
            assert response.status_code == 500
            response_data = response.json()
            assert "internal server error" in response_data["detail"].lower()

    async def test_login_flow_redis_error_handling(self, async_client, test_user_data):
        """Test login flow error handling for Redis session storage issues."""
        with patch('app.api.auth.endpoints.get_user_by_username') as mock_get_user:
            mock_user = User(**test_user_data)
            mock_get_user.return_value = mock_user
            
            with patch('app.core.security.verify_password', return_value=True):
                # Mock Redis error during session creation
                with patch('app.api.auth.endpoints.create_user_session', side_effect=Exception("Redis error")):
                    login_data = {
                        "username": test_user_data["username"],
                        "password": test_user_data["password"]
                    }
                    
                    response = await async_client.post("/api/auth/login", json=login_data)
                    
                    # Should handle gracefully - might return token but log error
                    assert response.status_code in [200, 500]

    async def test_login_flow_token_expiration_handling(self, async_client, test_user_data):
        """Test login flow with proper token expiration settings."""
        with patch('app.api.auth.endpoints.get_user_by_username') as mock_get_user:
            mock_user = User(**test_user_data)
            mock_get_user.return_value = mock_user
            
            with patch('app.core.security.verify_password', return_value=True):
                login_data = {
                    "username": test_user_data["username"],
                    "password": test_user_data["password"]
                }
                
                response = await async_client.post("/api/auth/login", json=login_data)
                assert response.status_code == 200
                
                response_data = response.json()
                access_token = response_data["access_token"]
                
                # Verify token has correct expiration
                payload = jwt.decode(
                    access_token,
                    settings.SECRET_KEY,
                    algorithms=[settings.ALGORITHM]
                )
                
                exp_timestamp = payload["exp"]
                current_timestamp = datetime.utcnow().timestamp()
                
                # Should expire in ~15 minutes (900 seconds)
                time_to_expiry = exp_timestamp - current_timestamp
                assert 800 < time_to_expiry < 1000  # Allow some variance

    async def test_login_flow_audit_logging(self, async_client, test_user_data):
        """Test that login flow creates appropriate audit logs."""
        with patch('app.api.auth.endpoints.get_user_by_username') as mock_get_user:
            mock_user = User(**test_user_data)
            mock_get_user.return_value = mock_user
            
            with patch('app.core.security.verify_password', return_value=True):
                with patch('app.core.audit.log_auth_event') as mock_audit:
                    login_data = {
                        "username": test_user_data["username"],
                        "password": test_user_data["password"]
                    }
                    
                    response = await async_client.post("/api/auth/login", json=login_data)
                    assert response.status_code == 200
                    
                    # Verify audit log was called
                    mock_audit.assert_called()
                    call_args = mock_audit.call_args
                    assert "login_success" in str(call_args)
                    assert test_user_data["username"] in str(call_args)


class TestLoginEndpointValidation:
    """Test suite for login endpoint input validation."""

    async def test_login_missing_username(self, async_client):
        """Test login with missing username."""
        login_data = {
            "password": "SomePassword123!"
        }
        
        response = await async_client.post("/api/auth/login", json=login_data)
        assert response.status_code == 422  # Validation error

    async def test_login_missing_password(self, async_client):
        """Test login with missing password."""
        login_data = {
            "username": "testuser"
        }
        
        response = await async_client.post("/api/auth/login", json=login_data)
        assert response.status_code == 422  # Validation error

    async def test_login_empty_credentials(self, async_client):
        """Test login with empty credentials."""
        login_data = {
            "username": "",
            "password": ""
        }
        
        response = await async_client.post("/api/auth/login", json=login_data)
        assert response.status_code == 422  # Validation error

    async def test_login_invalid_json(self, async_client):
        """Test login with invalid JSON payload."""
        response = await async_client.post(
            "/api/auth/login", 
            content="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422

    async def test_login_sql_injection_attempt(self, async_client):
        """Test login endpoint is protected against SQL injection."""
        malicious_inputs = [
            "admin'; DROP TABLE users; --",
            "admin' OR '1'='1",
            "admin' UNION SELECT * FROM users --",
        ]
        
        for malicious_username in malicious_inputs:
            login_data = {
                "username": malicious_username,
                "password": "SomePassword123!"
            }
            
            # Should handle gracefully without SQL injection
            with patch('app.api.auth.endpoints.get_user_by_username', return_value=None):
                response = await async_client.post("/api/auth/login", json=login_data)
                assert response.status_code == 401  # Invalid credentials, not SQL error

    async def test_login_xss_attempt(self, async_client):
        """Test login endpoint sanitizes XSS attempts."""
        xss_inputs = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
        ]
        
        for xss_input in xss_inputs:
            login_data = {
                "username": xss_input,
                "password": "SomePassword123!"
            }
            
            with patch('app.api.auth.endpoints.get_user_by_username', return_value=None):
                response = await async_client.post("/api/auth/login", json=login_data)
                
                # Should handle gracefully and sanitize input
                assert response.status_code == 401
                response_text = response.text
                assert "<script>" not in response_text
                assert "javascript:" not in response_text


class TestLogoutFlow:
    """Test suite for logout flow integration."""

    async def test_successful_logout_flow(self, async_client, test_user_data, redis_client):
        """Test successful logout flow with session cleanup."""
        # First, login to get tokens
        with patch('app.api.auth.endpoints.get_user_by_username') as mock_get_user:
            mock_user = User(**test_user_data)
            mock_get_user.return_value = mock_user
            
            with patch('app.core.security.verify_password', return_value=True):
                login_data = {
                    "username": test_user_data["username"],
                    "password": test_user_data["password"]
                }
                
                login_response = await async_client.post("/api/auth/login", json=login_data)
                assert login_response.status_code == 200
                
                login_data = login_response.json()
                access_token = login_data["access_token"]
                
                # Verify session exists
                session_key = f"session:{test_user_data['username']}"
                session_data = await redis_client.get(session_key)
                assert session_data is not None
                
                # Now logout
                logout_response = await async_client.post(
                    "/api/auth/logout",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                
                assert logout_response.status_code == 200
                
                # Verify session is cleaned up
                session_data_after = await redis_client.get(session_key)
                assert session_data_after is None

    async def test_logout_without_token(self, async_client):
        """Test logout without providing token."""
        response = await async_client.post("/api/auth/logout")
        assert response.status_code == 401

    async def test_logout_with_invalid_token(self, async_client):
        """Test logout with invalid token."""
        response = await async_client.post(
            "/api/auth/logout",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401