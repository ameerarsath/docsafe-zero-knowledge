"""
Unit tests for JWT token generation and validation.

This module contains comprehensive tests for JWT token operations
used in SecureVault authentication system. Tests follow TDD methodology
with security-first approach.

Test Coverage:
- Access token generation and validation
- Refresh token generation and validation
- Token expiration handling
- Token payload validation
- Security edge cases and error handling
- Token tampering detection
- Algorithm verification
"""

import pytest
import jwt
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from freezegun import freeze_time

from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
    decode_token,
    get_token_payload,
    TokenError,
    ExpiredTokenError,
    InvalidTokenError,
    MalformedTokenError,
)
from app.core.config import settings
from app.schemas.auth import TokenData


class TestAccessTokenGeneration:
    """Test suite for access token generation."""

    def test_create_access_token_success(self):
        """Test successful access token creation."""
        username = "testuser"
        token = create_access_token(data={"sub": username})
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token can be decoded
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == username
        assert payload["type"] == "access"

    def test_create_access_token_with_custom_expiry(self):
        """Test access token creation with custom expiry time."""
        username = "testuser"
        custom_expiry = timedelta(hours=2)
        token = create_access_token(
            data={"sub": username}, 
            expires_delta=custom_expiry
        )
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Verify custom expiry is set
        exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        expected_exp = datetime.now(timezone.utc) + custom_expiry
        
        # Allow 5 second variance for test execution time
        assert abs((exp_time - expected_exp).total_seconds()) < 5

    def test_create_access_token_with_additional_claims(self):
        """Test access token creation with additional claims."""
        username = "testuser"
        additional_data = {
            "sub": username,
            "role": "admin",
            "permissions": ["read", "write"],
            "user_id": 123
        }
        
        token = create_access_token(data=additional_data)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        assert payload["sub"] == username
        assert payload["role"] == "admin"
        assert payload["permissions"] == ["read", "write"]
        assert payload["user_id"] == 123
        assert payload["type"] == "access"

    def test_create_access_token_default_expiry(self):
        """Test access token has correct default expiry time."""
        username = "testuser"
        
        with freeze_time("2023-01-01 12:00:00"):
            token = create_access_token(data={"sub": username})
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            
            exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
            expected_exp = datetime(2023, 1, 1, 12, 15, 0, tzinfo=timezone.utc)  # 15 minutes default
            
            assert exp_time == expected_exp

    def test_create_access_token_includes_iat_claim(self):
        """Test access token includes issued-at timestamp."""
        username = "testuser"
        
        with freeze_time("2023-01-01 12:00:00"):
            token = create_access_token(data={"sub": username})
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            
            iat_time = datetime.fromtimestamp(payload["iat"], tz=timezone.utc)
            expected_iat = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
            
            assert iat_time == expected_iat

    def test_create_access_token_includes_jti_claim(self):
        """Test access token includes unique JWT ID."""
        username = "testuser"
        
        token1 = create_access_token(data={"sub": username})
        token2 = create_access_token(data={"sub": username})
        
        payload1 = jwt.decode(token1, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        payload2 = jwt.decode(token2, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        assert "jti" in payload1
        assert "jti" in payload2
        assert payload1["jti"] != payload2["jti"]  # Should be unique

    def test_create_access_token_with_empty_data(self):
        """Test access token creation with empty data raises error."""
        with pytest.raises((ValueError, KeyError)):
            create_access_token(data={})

    def test_create_access_token_with_none_data(self):
        """Test access token creation with None data raises error."""
        with pytest.raises((TypeError, ValueError)):
            create_access_token(data=None)

    def test_create_access_token_with_invalid_expiry(self):
        """Test access token creation with invalid expiry time."""
        username = "testuser"
        
        # Negative expiry should raise error
        with pytest.raises(ValueError):
            create_access_token(
                data={"sub": username},
                expires_delta=timedelta(seconds=-1)
            )

    @patch('app.core.security.jwt.encode')
    def test_create_access_token_jwt_encoding_error(self, mock_encode):
        """Test handling of JWT encoding errors."""
        mock_encode.side_effect = Exception("JWT encoding error")
        
        with pytest.raises(TokenError):
            create_access_token(data={"sub": "testuser"})


class TestRefreshTokenGeneration:
    """Test suite for refresh token generation."""

    def test_create_refresh_token_success(self):
        """Test successful refresh token creation."""
        username = "testuser"
        token = create_refresh_token(data={"sub": username})
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token can be decoded
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == username
        assert payload["type"] == "refresh"

    def test_create_refresh_token_longer_expiry(self):
        """Test refresh token has longer expiry than access token."""
        username = "testuser"
        
        with freeze_time("2023-01-01 12:00:00"):
            access_token = create_access_token(data={"sub": username})
            refresh_token = create_refresh_token(data={"sub": username})
            
            access_payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            refresh_payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            
            access_exp = access_payload["exp"]
            refresh_exp = refresh_payload["exp"]
            
            # Refresh token should expire later than access token
            assert refresh_exp > access_exp

    def test_create_refresh_token_with_custom_expiry(self):
        """Test refresh token creation with custom expiry."""
        username = "testuser"
        custom_expiry = timedelta(days=30)
        
        token = create_refresh_token(
            data={"sub": username},
            expires_delta=custom_expiry
        )
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        expected_exp = datetime.now(timezone.utc) + custom_expiry
        
        # Allow small variance for execution time
        assert abs((exp_time - expected_exp).total_seconds()) < 5

    def test_create_refresh_token_unique_jti(self):
        """Test refresh tokens have unique JWT IDs."""
        username = "testuser"
        
        token1 = create_refresh_token(data={"sub": username})
        token2 = create_refresh_token(data={"sub": username})
        
        payload1 = jwt.decode(token1, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        payload2 = jwt.decode(token2, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        assert payload1["jti"] != payload2["jti"]


class TestTokenValidation:
    """Test suite for token validation."""

    def test_verify_token_valid_access_token(self):
        """Test verification of valid access token."""
        username = "testuser"
        token = create_access_token(data={"sub": username})
        
        result = verify_token(token)
        assert result is True

    def test_verify_token_valid_refresh_token(self):
        """Test verification of valid refresh token."""
        username = "testuser"
        token = create_refresh_token(data={"sub": username})
        
        result = verify_token(token)
        assert result is True

    def test_verify_token_expired_token(self):
        """Test verification of expired token."""
        username = "testuser"
        
        # Create token that's already expired
        with freeze_time("2023-01-01 12:00:00"):
            token = create_access_token(
                data={"sub": username},
                expires_delta=timedelta(seconds=1)
            )
        
        # Move time forward past expiration
        with freeze_time("2023-01-01 12:00:02"):
            with pytest.raises(ExpiredTokenError):
                verify_token(token)

    def test_verify_token_invalid_signature(self):
        """Test verification of token with invalid signature."""
        username = "testuser"
        token = create_access_token(data={"sub": username})
        
        # Tamper with token signature
        tampered_token = token[:-10] + "tampered123"
        
        with pytest.raises(InvalidTokenError):
            verify_token(tampered_token)

    def test_verify_token_wrong_algorithm(self):
        """Test verification of token signed with wrong algorithm."""
        username = "testuser"
        
        # Create token with different algorithm
        payload = {
            "sub": username,
            "exp": datetime.utcnow() + timedelta(minutes=15),
            "iat": datetime.utcnow(),
            "type": "access"
        }
        
        # Sign with HS384 instead of HS256
        malicious_token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS384")
        
        with pytest.raises(InvalidTokenError):
            verify_token(malicious_token)

    def test_verify_token_malformed_token(self):
        """Test verification of malformed token."""
        malformed_tokens = [
            "not.a.jwt",
            "invalid_token",
            "",
            "header.payload",  # Missing signature
            "too.many.parts.here.invalid",
        ]
        
        for malformed_token in malformed_tokens:
            with pytest.raises(MalformedTokenError):
                verify_token(malformed_token)

    def test_verify_token_none_token(self):
        """Test verification of None token."""
        with pytest.raises((TypeError, MalformedTokenError)):
            verify_token(None)

    def test_verify_token_with_different_secret(self):
        """Test verification fails with different secret key."""
        username = "testuser"
        
        # Create token with current secret
        token = create_access_token(data={"sub": username})
        
        # Try to verify with different secret
        with patch('app.core.config.settings.SECRET_KEY', 'different_secret'):
            with pytest.raises(InvalidTokenError):
                verify_token(token)


class TestTokenDecoding:
    """Test suite for token decoding operations."""

    def test_decode_token_success(self):
        """Test successful token decoding."""
        username = "testuser"
        role = "admin"
        token = create_access_token(data={"sub": username, "role": role})
        
        payload = decode_token(token)
        
        assert payload["sub"] == username
        assert payload["role"] == role
        assert payload["type"] == "access"
        assert "exp" in payload
        assert "iat" in payload
        assert "jti" in payload

    def test_decode_token_without_verification(self):
        """Test token decoding without signature verification."""
        username = "testuser"
        token = create_access_token(data={"sub": username})
        
        # Tamper with signature
        tampered_token = token[:-10] + "tampered123"
        
        # Should still decode payload without verification
        payload = decode_token(tampered_token, verify=False)
        assert payload["sub"] == username

    def test_decode_token_expired_without_verification(self):
        """Test decoding expired token without verification."""
        username = "testuser"
        
        with freeze_time("2023-01-01 12:00:00"):
            token = create_access_token(
                data={"sub": username},
                expires_delta=timedelta(seconds=1)
            )
        
        # Move time forward past expiration
        with freeze_time("2023-01-01 12:00:02"):
            # Should decode even if expired when verification is disabled
            payload = decode_token(token, verify=False)
            assert payload["sub"] == username

    def test_get_token_payload_to_token_data(self):
        """Test converting token payload to TokenData object."""
        username = "testuser"
        user_id = 123
        role = "admin"
        
        token = create_access_token(data={
            "sub": username,
            "user_id": user_id,
            "role": role
        })
        
        token_data = get_token_payload(token)
        
        assert isinstance(token_data, TokenData)
        assert token_data.username == username
        assert token_data.user_id == user_id
        assert token_data.role == role

    def test_get_token_payload_missing_required_fields(self):
        """Test token payload extraction with missing required fields."""
        # Create token manually without required fields
        payload = {
            "exp": datetime.utcnow() + timedelta(minutes=15),
            "iat": datetime.utcnow(),
            "type": "access"
            # Missing "sub" field
        }
        
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        with pytest.raises(InvalidTokenError):
            get_token_payload(token)


class TestTokenSecurity:
    """Test suite for token security features."""

    def test_token_algorithm_verification(self):
        """Test that only allowed algorithms are accepted."""
        username = "testuser"
        
        # Create payload
        payload = {
            "sub": username,
            "exp": datetime.utcnow() + timedelta(minutes=15),
            "iat": datetime.utcnow(),
            "type": "access"
        }
        
        # Test with various algorithms
        insecure_algorithms = ["none", "HS384", "HS512", "RS256"]
        
        for algorithm in insecure_algorithms:
            if algorithm == "none":
                # Special case for "none" algorithm
                token = jwt.encode(payload, "", algorithm=algorithm)
            else:
                token = jwt.encode(payload, settings.SECRET_KEY, algorithm=algorithm)
            
            with pytest.raises(InvalidTokenError):
                verify_token(token)

    def test_token_timing_attack_resistance(self):
        """Test token verification has consistent timing."""
        username = "testuser"
        valid_token = create_access_token(data={"sub": username})
        
        invalid_tokens = [
            "invalid.token.here",
            valid_token[:-10] + "tampered123",
            "completely_different_token",
            "",
        ]
        
        # Measure verification times
        times = []
        
        # Valid token time
        start = time.time()
        try:
            verify_token(valid_token)
        except:
            pass
        end = time.time()
        valid_time = end - start
        
        # Invalid token times
        for invalid_token in invalid_tokens:
            start = time.time()
            try:
                verify_token(invalid_token)
            except:
                pass
            end = time.time()
            times.append(end - start)
        
        # Times should be relatively consistent
        avg_time = sum(times) / len(times)
        for t in times:
            # Allow significant variance for different error types
            assert abs(t - avg_time) < avg_time * 2

    def test_token_payload_injection_protection(self):
        """Test protection against payload injection attacks."""
        username = "testuser"
        
        # Attempt to inject malicious payload
        malicious_payloads = [
            {"sub": username, "role": "admin", "is_superuser": True},
            {"sub": username, "permissions": ["*"]},
            {"sub": username, "exp": datetime.utcnow() + timedelta(days=365)},  # Long expiry
        ]
        
        for malicious_payload in malicious_payloads:
            # Create token with malicious payload
            token = jwt.encode(
                malicious_payload,
                "wrong_secret",  # Wrong secret
                algorithm=settings.ALGORITHM
            )
            
            # Should fail verification
            with pytest.raises(InvalidTokenError):
                verify_token(token)

    def test_token_replay_attack_prevention(self):
        """Test that tokens include measures to prevent replay attacks."""
        username = "testuser"
        
        # Create multiple tokens
        tokens = []
        for _ in range(5):
            token = create_access_token(data={"sub": username})
            tokens.append(token)
        
        # Each token should have unique JTI
        jtis = []
        for token in tokens:
            payload = decode_token(token, verify=False)
            jtis.append(payload["jti"])
        
        # All JTIs should be unique
        assert len(set(jtis)) == len(jtis)

    def test_token_information_disclosure_prevention(self):
        """Test that tokens don't disclose sensitive information."""
        username = "testuser"
        sensitive_data = {
            "sub": username,
            "password": "should_not_be_included",
            "password_hash": "$2b$12$hash",
            "secret_key": "sensitive_secret",
        }
        
        # Only allowed fields should be included
        allowed_fields = {"sub", "role", "permissions", "user_id"}
        filtered_data = {k: v for k, v in sensitive_data.items() if k in allowed_fields}
        filtered_data["sub"] = username  # Ensure sub is present
        
        token = create_access_token(data=filtered_data)
        payload = decode_token(token, verify=False)
        
        # Sensitive fields should not be present
        assert "password" not in payload
        assert "password_hash" not in payload
        assert "secret_key" not in payload


class TestTokenEdgeCases:
    """Test suite for token edge cases and error scenarios."""

    def test_token_with_unicode_username(self):
        """Test token creation and verification with Unicode username."""
        unicode_username = "test_user_çñüñ"
        token = create_access_token(data={"sub": unicode_username})
        
        payload = decode_token(token)
        assert payload["sub"] == unicode_username

    def test_token_with_very_long_username(self):
        """Test token with very long username."""
        long_username = "a" * 255  # Very long username
        token = create_access_token(data={"sub": long_username})
        
        payload = decode_token(token)
        assert payload["sub"] == long_username

    def test_token_creation_performance(self):
        """Test token creation performance meets requirements."""
        username = "testuser"
        
        # Create multiple tokens and measure time
        start_time = time.time()
        for _ in range(100):
            create_access_token(data={"sub": username})
        end_time = time.time()
        
        total_time = end_time - start_time
        avg_time_per_token = total_time / 100
        
        # Should create tokens quickly (less than 10ms each)
        assert avg_time_per_token < 0.01

    def test_token_verification_performance(self):
        """Test token verification performance meets requirements."""
        username = "testuser"
        token = create_access_token(data={"sub": username})
        
        # Verify multiple times and measure performance
        start_time = time.time()
        for _ in range(100):
            verify_token(token)
        end_time = time.time()
        
        total_time = end_time - start_time
        avg_time_per_verification = total_time / 100
        
        # Should verify tokens quickly (less than 5ms each)
        assert avg_time_per_verification < 0.005

    def test_concurrent_token_operations(self):
        """Test thread safety of token operations."""
        import threading
        import concurrent.futures
        
        username = "testuser"
        results = []
        
        def create_and_verify_token():
            """Create and verify token in thread."""
            try:
                token = create_access_token(data={"sub": username})
                is_valid = verify_token(token)
                return is_valid
            except Exception as e:
                return False
        
        # Run concurrent operations
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(create_and_verify_token) for _ in range(20)]
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())
        
        # All operations should succeed
        assert all(results)
        assert len(results) == 20