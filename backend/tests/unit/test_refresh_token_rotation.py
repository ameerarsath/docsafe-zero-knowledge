"""
Unit tests for refresh token rotation functionality.

This module contains comprehensive tests for the refresh token rotation
system used in SecureVault authentication. Tests follow TDD methodology
with security-first approach focusing on token security and rotation.

Test Coverage:
- Refresh token rotation mechanics
- Token invalidation and blacklisting
- Concurrent refresh attempts
- Security measures against token reuse
- Refresh token family tracking
- Automatic cleanup of expired tokens
"""

import pytest
import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock, MagicMock
from freezegun import freeze_time
import jwt
import uuid

from app.core.security import (
    create_refresh_token,
    rotate_refresh_token,
    invalidate_refresh_token,
    is_refresh_token_valid,
    cleanup_expired_tokens,
    get_refresh_token_family,
    blacklist_token_family,
    RefreshTokenError,
    InvalidRefreshTokenError,
    ExpiredRefreshTokenError,
    RevokedRefreshTokenError,
)
from app.core.config import settings
from app.models.token import RefreshToken, TokenFamily
from app.schemas.auth import TokenPair


class TestRefreshTokenRotation:
    """Test suite for refresh token rotation mechanics."""

    @pytest.fixture
    def mock_redis(self):
        """Fixture providing mock Redis client."""
        mock_redis = AsyncMock()
        return mock_redis

    @pytest.fixture
    def mock_db_session(self):
        """Fixture providing mock database session."""
        mock_session = AsyncMock()
        return mock_session

    @pytest.fixture
    def test_user_data(self):
        """Fixture providing test user data."""
        return {
            "username": "testuser",
            "user_id": 123,
            "role": "user"
        }

    async def test_rotate_refresh_token_success(self, mock_redis, mock_db_session, test_user_data):
        """Test successful refresh token rotation."""
        # Create initial refresh token
        old_refresh_token = create_refresh_token(data=test_user_data)
        
        # Mock token family lookup
        mock_family = TokenFamily(
            id=str(uuid.uuid4()),
            user_id=test_user_data["user_id"],
            created_at=datetime.utcnow(),
            is_revoked=False
        )
        
        with patch('app.core.security.get_refresh_token_family', return_value=mock_family):
            with patch('app.core.security.invalidate_refresh_token') as mock_invalidate:
                # Perform rotation
                new_tokens = await rotate_refresh_token(
                    old_refresh_token,
                    mock_redis,
                    mock_db_session
                )
                
                # Verify new tokens created
                assert isinstance(new_tokens, TokenPair)
                assert new_tokens.access_token is not None
                assert new_tokens.refresh_token is not None
                assert new_tokens.refresh_token != old_refresh_token
                
                # Verify old token was invalidated
                mock_invalidate.assert_called_once()

    async def test_rotate_refresh_token_invalid_token(self, mock_redis, mock_db_session):
        """Test refresh token rotation with invalid token."""
        invalid_token = "invalid.refresh.token"
        
        with pytest.raises(InvalidRefreshTokenError):
            await rotate_refresh_token(
                invalid_token,
                mock_redis,
                mock_db_session
            )

    async def test_rotate_refresh_token_expired_token(self, mock_redis, mock_db_session, test_user_data):
        """Test refresh token rotation with expired token."""
        # Create expired refresh token
        with freeze_time("2023-01-01 12:00:00"):
            expired_token = create_refresh_token(
                data=test_user_data,
                expires_delta=timedelta(seconds=1)
            )
        
        # Move time forward
        with freeze_time("2023-01-01 12:00:02"):
            with pytest.raises(ExpiredRefreshTokenError):
                await rotate_refresh_token(
                    expired_token,
                    mock_redis,
                    mock_db_session
                )

    async def test_rotate_refresh_token_revoked_family(self, mock_redis, mock_db_session, test_user_data):
        """Test refresh token rotation with revoked token family."""
        refresh_token = create_refresh_token(data=test_user_data)
        
        # Mock revoked token family
        mock_family = TokenFamily(
            id=str(uuid.uuid4()),
            user_id=test_user_data["user_id"],
            created_at=datetime.utcnow(),
            is_revoked=True  # Revoked family
        )
        
        with patch('app.core.security.get_refresh_token_family', return_value=mock_family):
            with pytest.raises(RevokedRefreshTokenError):
                await rotate_refresh_token(
                    refresh_token,
                    mock_redis,
                    mock_db_session
                )

    async def test_rotate_refresh_token_concurrent_attempts_detection(self, mock_redis, mock_db_session, test_user_data):
        """Test detection and handling of concurrent refresh attempts."""
        refresh_token = create_refresh_token(data=test_user_data)
        
        # Mock token family
        mock_family = TokenFamily(
            id=str(uuid.uuid4()),
            user_id=test_user_data["user_id"],
            created_at=datetime.utcnow(),
            is_revoked=False
        )
        
        # Mock concurrent usage detection
        with patch('app.core.security.get_refresh_token_family', return_value=mock_family):
            with patch('app.core.security.detect_concurrent_token_usage', return_value=True):
                with patch('app.core.security.blacklist_token_family') as mock_blacklist:
                    with pytest.raises(RevokedRefreshTokenError):
                        await rotate_refresh_token(
                            refresh_token,
                            mock_redis,
                            mock_db_session
                        )
                    
                    # Should blacklist entire token family
                    mock_blacklist.assert_called_once()

    async def test_rotate_refresh_token_preserves_user_data(self, mock_redis, mock_db_session, test_user_data):
        """Test that token rotation preserves user data and permissions."""
        # Create refresh token with additional claims
        enhanced_user_data = {
            **test_user_data,
            "permissions": ["read", "write"],
            "department": "engineering"
        }
        
        old_refresh_token = create_refresh_token(data=enhanced_user_data)
        
        mock_family = TokenFamily(
            id=str(uuid.uuid4()),
            user_id=test_user_data["user_id"],
            created_at=datetime.utcnow(),
            is_revoked=False
        )
        
        with patch('app.core.security.get_refresh_token_family', return_value=mock_family):
            with patch('app.core.security.invalidate_refresh_token'):
                new_tokens = await rotate_refresh_token(
                    old_refresh_token,
                    mock_redis,
                    mock_db_session
                )
                
                # Decode new tokens to verify data preservation
                new_refresh_payload = jwt.decode(
                    new_tokens.refresh_token,
                    settings.SECRET_KEY,
                    algorithms=[settings.ALGORITHM]
                )
                
                new_access_payload = jwt.decode(
                    new_tokens.access_token,
                    settings.SECRET_KEY,
                    algorithms=[settings.ALGORITHM]
                )
                
                # Verify user data preserved
                assert new_refresh_payload["sub"] == enhanced_user_data["username"]
                assert new_refresh_payload["user_id"] == enhanced_user_data["user_id"]
                assert new_access_payload["permissions"] == enhanced_user_data["permissions"]
                assert new_access_payload["department"] == enhanced_user_data["department"]

    async def test_rotate_refresh_token_updates_family_tracking(self, mock_redis, mock_db_session, test_user_data):
        """Test that token rotation updates family tracking records."""
        refresh_token = create_refresh_token(data=test_user_data)
        
        mock_family = TokenFamily(
            id=str(uuid.uuid4()),
            user_id=test_user_data["user_id"],
            created_at=datetime.utcnow(),
            is_revoked=False
        )
        
        with patch('app.core.security.get_refresh_token_family', return_value=mock_family):
            with patch('app.core.security.invalidate_refresh_token'):
                with patch('app.core.security.update_token_family_tracking') as mock_update:
                    await rotate_refresh_token(
                        refresh_token,
                        mock_redis,
                        mock_db_session
                    )
                    
                    # Should update family tracking
                    mock_update.assert_called_once()

    async def test_rotate_refresh_token_database_error_handling(self, mock_redis, mock_db_session, test_user_data):
        """Test refresh token rotation handles database errors gracefully."""
        refresh_token = create_refresh_token(data=test_user_data)
        
        # Mock database error during family lookup
        with patch('app.core.security.get_refresh_token_family', side_effect=Exception("Database error")):
            with pytest.raises(RefreshTokenError):
                await rotate_refresh_token(
                    refresh_token,
                    mock_redis,
                    mock_db_session
                )

    async def test_rotate_refresh_token_redis_error_handling(self, mock_db_session, test_user_data):
        """Test refresh token rotation handles Redis errors gracefully."""
        refresh_token = create_refresh_token(data=test_user_data)
        
        # Mock Redis error
        mock_redis_error = AsyncMock()
        mock_redis_error.get.side_effect = Exception("Redis connection error")
        
        mock_family = TokenFamily(
            id=str(uuid.uuid4()),
            user_id=test_user_data["user_id"],
            created_at=datetime.utcnow(),
            is_revoked=False
        )
        
        with patch('app.core.security.get_refresh_token_family', return_value=mock_family):
            with pytest.raises(RefreshTokenError):
                await rotate_refresh_token(
                    refresh_token,
                    mock_redis_error,
                    mock_db_session
                )


class TestTokenInvalidation:
    """Test suite for token invalidation mechanisms."""

    @pytest.fixture
    def mock_redis(self):
        """Fixture providing mock Redis client."""
        return AsyncMock()

    async def test_invalidate_refresh_token_success(self, mock_redis):
        """Test successful refresh token invalidation."""
        test_user_data = {"username": "testuser", "user_id": 123}
        refresh_token = create_refresh_token(data=test_user_data)
        
        # Mock successful Redis operations
        mock_redis.setex.return_value = True
        
        result = await invalidate_refresh_token(refresh_token, mock_redis)
        
        assert result is True
        mock_redis.setex.assert_called_once()

    async def test_invalidate_refresh_token_already_invalidated(self, mock_redis):
        """Test invalidating already invalidated token."""
        test_user_data = {"username": "testuser", "user_id": 123}
        refresh_token = create_refresh_token(data=test_user_data)
        
        # Mock token already in blacklist
        mock_redis.exists.return_value = True
        
        result = await invalidate_refresh_token(refresh_token, mock_redis)
        
        assert result is True  # Should handle gracefully
        mock_redis.exists.assert_called_once()

    async def test_invalidate_refresh_token_malformed_token(self, mock_redis):
        """Test invalidating malformed token."""
        malformed_token = "not.a.valid.jwt.token"
        
        with pytest.raises(InvalidRefreshTokenError):
            await invalidate_refresh_token(malformed_token, mock_redis)

    async def test_is_refresh_token_valid_success(self, mock_redis):
        """Test checking validity of valid refresh token."""
        test_user_data = {"username": "testuser", "user_id": 123}
        refresh_token = create_refresh_token(data=test_user_data)
        
        # Mock token not in blacklist
        mock_redis.exists.return_value = False
        
        result = await is_refresh_token_valid(refresh_token, mock_redis)
        
        assert result is True

    async def test_is_refresh_token_valid_invalidated(self, mock_redis):
        """Test checking validity of invalidated token."""
        test_user_data = {"username": "testuser", "user_id": 123}
        refresh_token = create_refresh_token(data=test_user_data)
        
        # Mock token in blacklist
        mock_redis.exists.return_value = True
        
        result = await is_refresh_token_valid(refresh_token, mock_redis)
        
        assert result is False

    async def test_is_refresh_token_valid_expired(self, mock_redis):
        """Test checking validity of expired token."""
        test_user_data = {"username": "testuser", "user_id": 123}
        
        # Create expired token
        with freeze_time("2023-01-01 12:00:00"):
            expired_token = create_refresh_token(
                data=test_user_data,
                expires_delta=timedelta(seconds=1)
            )
        
        # Move time forward
        with freeze_time("2023-01-01 12:00:02"):
            result = await is_refresh_token_valid(expired_token, mock_redis)
            
            assert result is False


class TestTokenFamilyManagement:
    """Test suite for token family management."""

    @pytest.fixture
    def mock_db_session(self):
        """Fixture providing mock database session."""
        return AsyncMock()

    async def test_get_refresh_token_family_success(self, mock_db_session):
        """Test successful token family retrieval."""
        test_user_data = {"username": "testuser", "user_id": 123}
        refresh_token = create_refresh_token(data=test_user_data)
        
        # Mock database query
        mock_family = TokenFamily(
            id=str(uuid.uuid4()),
            user_id=123,
            created_at=datetime.utcnow(),
            is_revoked=False
        )
        
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_family
        
        result = await get_refresh_token_family(refresh_token, mock_db_session)
        
        assert result == mock_family
        assert result.user_id == 123
        assert result.is_revoked is False

    async def test_get_refresh_token_family_not_found(self, mock_db_session):
        """Test token family retrieval when family not found."""
        test_user_data = {"username": "testuser", "user_id": 123}
        refresh_token = create_refresh_token(data=test_user_data)
        
        # Mock family not found
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        
        result = await get_refresh_token_family(refresh_token, mock_db_session)
        
        assert result is None

    async def test_blacklist_token_family_success(self, mock_db_session):
        """Test successful token family blacklisting."""
        family_id = str(uuid.uuid4())
        
        # Mock family update
        mock_family = TokenFamily(
            id=family_id,
            user_id=123,
            created_at=datetime.utcnow(),
            is_revoked=False
        )
        
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_family
        
        result = await blacklist_token_family(family_id, mock_db_session)
        
        assert result is True
        assert mock_family.is_revoked is True
        mock_db_session.commit.assert_called_once()

    async def test_blacklist_token_family_not_found(self, mock_db_session):
        """Test blacklisting non-existent token family."""
        family_id = str(uuid.uuid4())
        
        # Mock family not found
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        
        result = await blacklist_token_family(family_id, mock_db_session)
        
        assert result is False

    async def test_create_token_family_for_user(self, mock_db_session):
        """Test creating new token family for user."""
        user_id = 123
        
        with patch('app.core.security.TokenFamily') as mock_token_family_class:
            mock_family_instance = MagicMock()
            mock_token_family_class.return_value = mock_family_instance
            
            from app.core.security import create_token_family_for_user
            
            result = await create_token_family_for_user(user_id, mock_db_session)
            
            # Should create new family
            mock_token_family_class.assert_called_once()
            mock_db_session.add.assert_called_once_with(mock_family_instance)
            mock_db_session.commit.assert_called_once()
            
            assert result == mock_family_instance


class TestConcurrentTokenOperations:
    """Test suite for concurrent token operations."""

    @pytest.fixture
    def mock_redis(self):
        """Fixture providing mock Redis client."""
        return AsyncMock()

    @pytest.fixture
    def mock_db_session(self):
        """Fixture providing mock database session."""
        return AsyncMock()

    async def test_detect_concurrent_token_usage(self, mock_redis):
        """Test detection of concurrent token usage."""
        test_user_data = {"username": "testuser", "user_id": 123}
        refresh_token = create_refresh_token(data=test_user_data)
        
        # Mock concurrent usage detection
        token_payload = jwt.decode(
            refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        usage_key = f"token_usage:{token_payload['jti']}"
        
        # First usage
        mock_redis.exists.return_value = False
        mock_redis.setex.return_value = True
        
        from app.core.security import detect_concurrent_token_usage
        
        first_usage = await detect_concurrent_token_usage(refresh_token, mock_redis)
        assert first_usage is False  # Not concurrent
        
        # Second usage (concurrent)
        mock_redis.exists.return_value = True
        
        second_usage = await detect_concurrent_token_usage(refresh_token, mock_redis)
        assert second_usage is True  # Concurrent detected

    async def test_concurrent_refresh_attempts_protection(self, mock_redis, mock_db_session):
        """Test protection against concurrent refresh attempts."""
        test_user_data = {"username": "testuser", "user_id": 123}
        refresh_token = create_refresh_token(data=test_user_data)
        
        mock_family = TokenFamily(
            id=str(uuid.uuid4()),
            user_id=123,
            created_at=datetime.utcnow(),
            is_revoked=False
        )
        
        # Simulate concurrent refresh attempts
        async def refresh_attempt():
            with patch('app.core.security.get_refresh_token_family', return_value=mock_family):
                with patch('app.core.security.detect_concurrent_token_usage', return_value=True):
                    with patch('app.core.security.blacklist_token_family') as mock_blacklist:
                        try:
                            await rotate_refresh_token(
                                refresh_token,
                                mock_redis,
                                mock_db_session
                            )
                            return "success"
                        except RevokedRefreshTokenError:
                            return "revoked"
        
        # Execute concurrent attempts
        results = await asyncio.gather(
            refresh_attempt(),
            refresh_attempt(),
            refresh_attempt(),
            return_exceptions=True
        )
        
        # Should detect and prevent concurrent usage
        revoked_count = sum(1 for r in results if r == "revoked")
        assert revoked_count > 0  # At least one should be revoked


class TestTokenCleanup:
    """Test suite for token cleanup operations."""

    @pytest.fixture
    def mock_redis(self):
        """Fixture providing mock Redis client."""
        return AsyncMock()

    @pytest.fixture
    def mock_db_session(self):
        """Fixture providing mock database session."""
        return AsyncMock()

    async def test_cleanup_expired_tokens_success(self, mock_redis, mock_db_session):
        """Test successful cleanup of expired tokens."""
        # Mock expired token families
        expired_families = [
            TokenFamily(
                id=str(uuid.uuid4()),
                user_id=123,
                created_at=datetime.utcnow() - timedelta(days=30),
                is_revoked=False
            ),
            TokenFamily(
                id=str(uuid.uuid4()),
                user_id=124,
                created_at=datetime.utcnow() - timedelta(days=31),
                is_revoked=False
            )
        ]
        
        mock_db_session.query.return_value.filter.return_value.all.return_value = expired_families
        
        # Mock Redis cleanup
        mock_redis.delete.return_value = 2
        
        result = await cleanup_expired_tokens(mock_redis, mock_db_session)
        
        assert result["families_cleaned"] == 2
        assert result["redis_keys_cleaned"] >= 0
        
        # Should delete from database
        mock_db_session.delete.assert_called()
        mock_db_session.commit.assert_called()

    async def test_cleanup_expired_tokens_no_expired(self, mock_redis, mock_db_session):
        """Test cleanup when no expired tokens exist."""
        # Mock no expired families
        mock_db_session.query.return_value.filter.return_value.all.return_value = []
        
        result = await cleanup_expired_tokens(mock_redis, mock_db_session)
        
        assert result["families_cleaned"] == 0
        assert result["redis_keys_cleaned"] == 0

    async def test_cleanup_expired_tokens_error_handling(self, mock_redis, mock_db_session):
        """Test cleanup error handling."""
        # Mock database error
        mock_db_session.query.side_effect = Exception("Database error")
        
        with pytest.raises(RefreshTokenError):
            await cleanup_expired_tokens(mock_redis, mock_db_session)

    async def test_scheduled_token_cleanup(self, mock_redis, mock_db_session):
        """Test scheduled token cleanup task."""
        with patch('app.core.security.cleanup_expired_tokens') as mock_cleanup:
            mock_cleanup.return_value = {"families_cleaned": 5, "redis_keys_cleaned": 10}
            
            from app.core.security import run_scheduled_token_cleanup
            
            result = await run_scheduled_token_cleanup(mock_redis, mock_db_session)
            
            assert result["families_cleaned"] == 5
            assert result["redis_keys_cleaned"] == 10
            mock_cleanup.assert_called_once()


class TestTokenRotationSecurity:
    """Test suite for token rotation security measures."""

    async def test_token_rotation_audit_logging(self):
        """Test that token rotation creates audit logs."""
        test_user_data = {"username": "testuser", "user_id": 123}
        refresh_token = create_refresh_token(data=test_user_data)
        
        mock_redis = AsyncMock()
        mock_db_session = AsyncMock()
        
        mock_family = TokenFamily(
            id=str(uuid.uuid4()),
            user_id=123,
            created_at=datetime.utcnow(),
            is_revoked=False
        )
        
        with patch('app.core.security.get_refresh_token_family', return_value=mock_family):
            with patch('app.core.security.invalidate_refresh_token'):
                with patch('app.core.audit.log_token_rotation') as mock_audit:
                    await rotate_refresh_token(
                        refresh_token,
                        mock_redis,
                        mock_db_session
                    )
                    
                    # Should create audit log
                    mock_audit.assert_called_once()

    async def test_token_rotation_rate_limiting(self):
        """Test rate limiting for token rotation attempts."""
        test_user_data = {"username": "testuser", "user_id": 123}
        refresh_token = create_refresh_token(data=test_user_data)
        
        mock_redis = AsyncMock()
        mock_db_session = AsyncMock()
        
        # Mock rate limiting
        with patch('app.core.security.check_rotation_rate_limit', return_value=False):
            with pytest.raises(RefreshTokenError) as exc_info:
                await rotate_refresh_token(
                    refresh_token,
                    mock_redis,
                    mock_db_session
                )
            
            assert "rate limit" in str(exc_info.value).lower()

    async def test_token_family_generation_uniqueness(self):
        """Test that token families have unique identifiers."""
        family_ids = set()
        
        # Generate multiple families
        for _ in range(100):
            from app.core.security import generate_token_family_id
            family_id = generate_token_family_id()
            family_ids.add(family_id)
        
        # All should be unique
        assert len(family_ids) == 100

    async def test_token_rotation_preserves_security_claims(self):
        """Test that security-related claims are preserved during rotation."""
        test_user_data = {
            "username": "testuser",
            "user_id": 123,
            "role": "admin",
            "security_level": "high",
            "last_password_change": "2023-01-01T00:00:00Z"
        }
        
        refresh_token = create_refresh_token(data=test_user_data)
        
        mock_redis = AsyncMock()
        mock_db_session = AsyncMock()
        
        mock_family = TokenFamily(
            id=str(uuid.uuid4()),
            user_id=123,
            created_at=datetime.utcnow(),
            is_revoked=False
        )
        
        with patch('app.core.security.get_refresh_token_family', return_value=mock_family):
            with patch('app.core.security.invalidate_refresh_token'):
                new_tokens = await rotate_refresh_token(
                    refresh_token,
                    mock_redis,
                    mock_db_session
                )
                
                # Decode new refresh token
                new_payload = jwt.decode(
                    new_tokens.refresh_token,
                    settings.SECRET_KEY,
                    algorithms=[settings.ALGORITHM]
                )
                
                # Security claims should be preserved
                assert new_payload["role"] == "admin"
                assert new_payload["security_level"] == "high"
                assert new_payload["last_password_change"] == "2023-01-01T00:00:00Z"