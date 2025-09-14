"""
Unit tests for MFA verification functionality.

This module contains comprehensive tests for MFA verification flows,
including TOTP verification, backup code usage, and MFA management
in SecureVault's authentication system.

Test Coverage:
- MFA setup and enablement process
- TOTP code verification in authentication flow
- Backup code generation and verification
- MFA recovery and reset procedures
- Security requirements and edge cases
- Integration with authentication system
"""

import pytest
import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock, AsyncMock
from freezegun import freeze_time

from app.core.mfa import (
    setup_user_mfa,
    verify_mfa_code,
    disable_user_mfa,
    generate_backup_codes,
    verify_backup_code,
    is_mfa_required,
    get_mfa_status,
    reset_mfa_for_user,
    MFAError,
    MFANotEnabledError,
    InvalidMFACodeError,
    MFAAlreadyEnabledError,
    BackupCodeExhaustedError,
)
from app.schemas.mfa import MFASetupResponse, MFAStatus


class TestMFASetup:
    """Test suite for MFA setup functionality."""

    def test_setup_user_mfa_success(self):
        """Test successful MFA setup for user."""
        user_id = 1
        password = "user_password"
        
        # Mock user validation
        with patch('app.core.mfa.validate_user_password', return_value=True):
            setup_response = setup_user_mfa(user_id, password)
            
            assert isinstance(setup_response, MFASetupResponse)
            assert setup_response.secret is not None
            assert len(setup_response.secret) > 0
            assert setup_response.qr_code_url.startswith("otpauth://totp/")
            assert len(setup_response.backup_codes) == 10  # Standard number of backup codes
            
            # Verify all backup codes are valid format
            for code in setup_response.backup_codes:
                assert len(code) == 8  # Standard backup code length
                assert code.isalnum()

    def test_setup_user_mfa_invalid_password(self):
        """Test MFA setup with invalid password."""
        user_id = 1
        wrong_password = "wrong_password"
        
        # Mock user validation failure
        with patch('app.core.mfa.validate_user_password', return_value=False):
            with pytest.raises(ValueError, match="Invalid password"):
                setup_user_mfa(user_id, wrong_password)

    def test_setup_user_mfa_already_enabled(self):
        """Test MFA setup when MFA is already enabled."""
        user_id = 1
        password = "user_password"
        
        # Mock MFA already enabled
        with patch('app.core.mfa.validate_user_password', return_value=True):
            with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=True):
                with pytest.raises(MFAAlreadyEnabledError):
                    setup_user_mfa(user_id, password)

    def test_setup_user_mfa_user_not_found(self):
        """Test MFA setup for non-existent user."""
        user_id = 999
        password = "password"
        
        # Mock user not found
        with patch('app.core.mfa.get_user_by_id', return_value=None):
            with pytest.raises(ValueError, match="User not found"):
                setup_user_mfa(user_id, password)

    def test_setup_user_mfa_database_error(self):
        """Test MFA setup with database error."""
        user_id = 1
        password = "user_password"
        
        # Mock database error during setup
        with patch('app.core.mfa.validate_user_password', return_value=True):
            with patch('app.core.mfa.save_mfa_secret', side_effect=Exception("Database error")):
                with pytest.raises(MFAError, match="Failed to setup MFA"):
                    setup_user_mfa(user_id, password)

    def test_setup_user_mfa_custom_issuer(self):
        """Test MFA setup with custom issuer name."""
        user_id = 1
        password = "user_password"
        issuer = "Custom SecureVault"
        
        with patch('app.core.mfa.validate_user_password', return_value=True):
            with patch('app.core.mfa.get_user_by_id') as mock_user:
                mock_user.return_value.email = "test@example.com"
                
                setup_response = setup_user_mfa(user_id, password, issuer=issuer)
                
                assert issuer in setup_response.qr_code_url
                assert "test@example.com" in setup_response.qr_code_url


class TestMFAVerification:
    """Test suite for MFA verification functionality."""

    def test_verify_mfa_code_success(self):
        """Test successful MFA code verification."""
        user_id = 1
        mfa_code = "123456"
        
        # Mock successful verification
        with patch('app.core.mfa.get_user_mfa_secret', return_value="JBSWY3DPEHPK3PXP"):
            with patch('app.core.mfa.verify_totp_code', return_value=True):
                result = verify_mfa_code(user_id, mfa_code)
                assert result is True

    def test_verify_mfa_code_invalid_code(self):
        """Test MFA verification with invalid code."""
        user_id = 1
        invalid_code = "000000"
        
        # Mock TOTP verification failure
        with patch('app.core.mfa.get_user_mfa_secret', return_value="JBSWY3DPEHPK3PXP"):
            with patch('app.core.mfa.verify_totp_code', return_value=False):
                result = verify_mfa_code(user_id, invalid_code)
                assert result is False

    def test_verify_mfa_code_backup_code_fallback(self):
        """Test MFA verification falls back to backup codes."""
        user_id = 1
        backup_code = "ABCD1234"
        
        # Mock TOTP verification failure, backup code success
        with patch('app.core.mfa.get_user_mfa_secret', return_value="JBSWY3DPEHPK3PXP"):
            with patch('app.core.mfa.verify_totp_code', return_value=False):
                with patch('app.core.mfa.verify_backup_code', return_value=True):
                    result = verify_mfa_code(user_id, backup_code)
                    assert result is True

    def test_verify_mfa_code_mfa_not_enabled(self):
        """Test MFA verification when MFA is not enabled for user."""
        user_id = 1
        mfa_code = "123456"
        
        # Mock MFA not enabled
        with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=False):
            with pytest.raises(MFANotEnabledError):
                verify_mfa_code(user_id, mfa_code)

    def test_verify_mfa_code_invalid_format(self):
        """Test MFA verification with invalid code format."""
        user_id = 1
        
        invalid_codes = [
            "",           # Empty
            "12345",      # Too short
            "1234567",    # Too long
            "abcdef",     # Non-numeric TOTP
            None,         # None
        ]
        
        with patch('app.core.mfa.get_user_mfa_secret', return_value="JBSWY3DPEHPK3PXP"):
            for invalid_code in invalid_codes:
                with pytest.raises(InvalidMFACodeError):
                    verify_mfa_code(user_id, invalid_code)

    def test_verify_mfa_code_rate_limiting(self):
        """Test MFA verification has rate limiting."""
        user_id = 1
        wrong_code = "000000"
        
        # Mock multiple failed attempts
        with patch('app.core.mfa.get_user_mfa_secret', return_value="JBSWY3DPEHPK3PXP"):
            with patch('app.core.mfa.verify_totp_code', return_value=False):
                with patch('app.core.mfa.verify_backup_code', return_value=False):
                    
                    # First few attempts should be allowed
                    for i in range(3):
                        result = verify_mfa_code(user_id, wrong_code)
                        assert result is False
                    
                    # Further attempts should be rate limited
                    with patch('app.core.mfa.is_mfa_rate_limited', return_value=True):
                        with pytest.raises(MFAError, match="Too many failed attempts"):
                            verify_mfa_code(user_id, wrong_code)

    def test_verify_mfa_code_time_window_tolerance(self):
        """Test MFA verification with time window tolerance."""
        user_id = 1
        mfa_code = "123456"
        
        with patch('app.core.mfa.get_user_mfa_secret', return_value="JBSWY3DPEHPK3PXP"):
            # Mock TOTP verification with window tolerance
            with patch('app.core.mfa.verify_totp_code') as mock_verify:
                mock_verify.return_value = True
                
                result = verify_mfa_code(user_id, mfa_code)
                assert result is True
                
                # Verify that window tolerance was used
                mock_verify.assert_called_once()
                args, kwargs = mock_verify.call_args
                assert 'window' in kwargs
                assert kwargs['window'] >= 1  # Should allow some time drift


class TestBackupCodes:
    """Test suite for backup codes functionality."""

    def test_generate_backup_codes_success(self):
        """Test successful backup codes generation."""
        user_id = 1
        
        backup_codes = generate_backup_codes(user_id)
        
        # Verify backup codes
        assert isinstance(backup_codes, list)
        assert len(backup_codes) == 10  # Standard number
        
        for code in backup_codes:
            assert isinstance(code, str)
            assert len(code) == 8  # Standard length
            assert code.isalnum()
            assert code.isupper()  # Should be uppercase

    def test_generate_backup_codes_uniqueness(self):
        """Test backup codes are unique."""
        user_id = 1
        
        backup_codes = generate_backup_codes(user_id)
        
        # All codes should be unique
        assert len(set(backup_codes)) == len(backup_codes)

    def test_generate_backup_codes_custom_count(self):
        """Test backup codes generation with custom count."""
        user_id = 1
        custom_count = 15
        
        backup_codes = generate_backup_codes(user_id, count=custom_count)
        
        assert len(backup_codes) == custom_count

    def test_generate_backup_codes_invalid_count(self):
        """Test backup codes generation with invalid count."""
        user_id = 1
        
        # Too few codes
        with pytest.raises(ValueError):
            generate_backup_codes(user_id, count=0)
        
        # Too many codes
        with pytest.raises(ValueError):
            generate_backup_codes(user_id, count=100)

    def test_verify_backup_code_success(self):
        """Test successful backup code verification."""
        user_id = 1
        backup_code = "ABCD1234"
        
        # Mock backup code exists and is unused
        with patch('app.core.mfa.get_user_backup_codes', return_value=["ABCD1234", "EFGH5678"]):
            with patch('app.core.mfa.is_backup_code_used', return_value=False):
                with patch('app.core.mfa.mark_backup_code_used') as mock_mark:
                    result = verify_backup_code(user_id, backup_code)
                    
                    assert result is True
                    mock_mark.assert_called_once_with(user_id, backup_code)

    def test_verify_backup_code_invalid(self):
        """Test backup code verification with invalid code."""
        user_id = 1
        invalid_code = "INVALID1"
        
        # Mock backup code doesn't exist
        with patch('app.core.mfa.get_user_backup_codes', return_value=["ABCD1234", "EFGH5678"]):
            result = verify_backup_code(user_id, invalid_code)
            assert result is False

    def test_verify_backup_code_already_used(self):
        """Test backup code verification when code is already used."""
        user_id = 1
        used_code = "ABCD1234"
        
        # Mock backup code exists but is already used
        with patch('app.core.mfa.get_user_backup_codes', return_value=["ABCD1234", "EFGH5678"]):
            with patch('app.core.mfa.is_backup_code_used', return_value=True):
                result = verify_backup_code(user_id, used_code)
                assert result is False

    def test_verify_backup_code_exhausted(self):
        """Test backup code verification when all codes are exhausted."""
        user_id = 1
        backup_code = "ABCD1234"
        
        # Mock all backup codes are used
        with patch('app.core.mfa.get_user_backup_codes', return_value=["ABCD1234"]):
            with patch('app.core.mfa.is_backup_code_used', return_value=True):
                with patch('app.core.mfa.count_unused_backup_codes', return_value=0):
                    with pytest.raises(BackupCodeExhaustedError):
                        verify_backup_code(user_id, backup_code)

    def test_backup_code_format_validation(self):
        """Test backup code format validation."""
        user_id = 1
        
        invalid_codes = [
            "",           # Empty
            "ABC123",     # Too short
            "ABCD123456", # Too long
            "abcd1234",   # Lowercase
            "ABCD-1234",  # Contains hyphen
            "ABCD 1234",  # Contains space
        ]
        
        for invalid_code in invalid_codes:
            with pytest.raises(InvalidMFACodeError):
                verify_backup_code(user_id, invalid_code)


class TestMFAStatus:
    """Test suite for MFA status functionality."""

    def test_is_mfa_required_enabled_user(self):
        """Test MFA requirement check for user with MFA enabled."""
        user_id = 1
        
        with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=True):
            result = is_mfa_required(user_id)
            assert result is True

    def test_is_mfa_required_disabled_user(self):
        """Test MFA requirement check for user with MFA disabled."""
        user_id = 1
        
        with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=False):
            result = is_mfa_required(user_id)
            assert result is False

    def test_is_mfa_required_admin_policy(self):
        """Test MFA requirement based on admin policy."""
        user_id = 1
        
        # Mock user doesn't have MFA, but admin policy requires it
        with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=False):
            with patch('app.core.mfa.is_mfa_required_by_policy', return_value=True):
                result = is_mfa_required(user_id)
                assert result is True

    def test_get_mfa_status_complete(self):
        """Test getting complete MFA status for user."""
        user_id = 1
        
        # Mock MFA enabled with backup codes
        with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=True):
            with patch('app.core.mfa.count_unused_backup_codes', return_value=8):
                with patch('app.core.mfa.get_mfa_setup_date', return_value=datetime.utcnow()):
                    status = get_mfa_status(user_id)
                    
                    assert isinstance(status, MFAStatus)
                    assert status.enabled is True
                    assert status.backup_codes_remaining == 8
                    assert status.setup_date is not None

    def test_get_mfa_status_not_enabled(self):
        """Test getting MFA status for user without MFA."""
        user_id = 1
        
        with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=False):
            status = get_mfa_status(user_id)
            
            assert isinstance(status, MFAStatus)
            assert status.enabled is False
            assert status.backup_codes_remaining == 0
            assert status.setup_date is None


class TestMFADisable:
    """Test suite for MFA disable functionality."""

    def test_disable_user_mfa_success(self):
        """Test successful MFA disable."""
        user_id = 1
        password = "user_password"
        
        # Mock successful disable
        with patch('app.core.mfa.validate_user_password', return_value=True):
            with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=True):
                with patch('app.core.mfa.remove_mfa_for_user') as mock_remove:
                    result = disable_user_mfa(user_id, password)
                    
                    assert result is True
                    mock_remove.assert_called_once_with(user_id)

    def test_disable_user_mfa_invalid_password(self):
        """Test MFA disable with invalid password."""
        user_id = 1
        wrong_password = "wrong_password"
        
        with patch('app.core.mfa.validate_user_password', return_value=False):
            with pytest.raises(ValueError, match="Invalid password"):
                disable_user_mfa(user_id, wrong_password)

    def test_disable_user_mfa_not_enabled(self):
        """Test MFA disable when MFA is not enabled."""
        user_id = 1
        password = "user_password"
        
        with patch('app.core.mfa.validate_user_password', return_value=True):
            with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=False):
                with pytest.raises(MFANotEnabledError):
                    disable_user_mfa(user_id, password)

    def test_disable_user_mfa_admin_override(self):
        """Test MFA disable with admin override."""
        user_id = 1
        admin_id = 2
        
        # Mock admin disable without password
        with patch('app.core.mfa.is_user_admin', return_value=True):
            with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=True):
                with patch('app.core.mfa.remove_mfa_for_user') as mock_remove:
                    result = disable_user_mfa(user_id, admin_override=admin_id)
                    
                    assert result is True
                    mock_remove.assert_called_once_with(user_id)


class TestMFAReset:
    """Test suite for MFA reset functionality."""

    def test_reset_mfa_for_user_success(self):
        """Test successful MFA reset."""
        user_id = 1
        admin_id = 2
        
        # Mock admin reset
        with patch('app.core.mfa.is_user_admin', return_value=True):
            with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=True):
                with patch('app.core.mfa.remove_mfa_for_user') as mock_remove:
                    with patch('app.core.mfa.log_mfa_reset') as mock_log:
                        result = reset_mfa_for_user(user_id, admin_id)
                        
                        assert result is True
                        mock_remove.assert_called_once_with(user_id)
                        mock_log.assert_called_once_with(user_id, admin_id)

    def test_reset_mfa_for_user_not_admin(self):
        """Test MFA reset by non-admin user."""
        user_id = 1
        non_admin_id = 3
        
        with patch('app.core.mfa.is_user_admin', return_value=False):
            with pytest.raises(ValueError, match="Admin privileges required"):
                reset_mfa_for_user(user_id, non_admin_id)

    def test_reset_mfa_for_user_not_enabled(self):
        """Test MFA reset when MFA is not enabled."""
        user_id = 1
        admin_id = 2
        
        with patch('app.core.mfa.is_user_admin', return_value=True):
            with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=False):
                with pytest.raises(MFANotEnabledError):
                    reset_mfa_for_user(user_id, admin_id)


class TestMFASecurity:
    """Test suite for MFA security features."""

    def test_mfa_secret_encryption(self):
        """Test MFA secrets are encrypted in storage."""
        user_id = 1
        password = "user_password"
        
        with patch('app.core.mfa.validate_user_password', return_value=True):
            with patch('app.core.mfa.encrypt_mfa_secret') as mock_encrypt:
                with patch('app.core.mfa.save_mfa_secret') as mock_save:
                    setup_user_mfa(user_id, password)
                    
                    # Verify secret was encrypted before storage
                    mock_encrypt.assert_called_once()
                    mock_save.assert_called_once()

    def test_mfa_backup_codes_hashed(self):
        """Test backup codes are hashed before storage."""
        user_id = 1
        
        with patch('app.core.mfa.hash_backup_code') as mock_hash:
            with patch('app.core.mfa.save_backup_codes') as mock_save:
                generate_backup_codes(user_id)
                
                # Verify backup codes were hashed
                assert mock_hash.call_count == 10  # Default number of codes
                mock_save.assert_called_once()

    def test_mfa_timing_attack_resistance(self):
        """Test MFA verification is resistant to timing attacks."""
        user_id = 1
        
        # Test with valid and invalid codes
        codes_to_test = ["123456", "654321", "000000", "999999"]
        times = []
        
        with patch('app.core.mfa.get_user_mfa_secret', return_value="JBSWY3DPEHPK3PXP"):
            for code in codes_to_test:
                start_time = time.time()
                try:
                    verify_mfa_code(user_id, code)
                except:
                    pass
                end_time = time.time()
                times.append(end_time - start_time)
        
        # Times should be relatively consistent
        avg_time = sum(times) / len(times)
        for t in times:
            # Allow some variance but not excessive
            assert abs(t - avg_time) < avg_time * 0.5

    def test_mfa_replay_protection(self):
        """Test MFA codes cannot be reused (replay protection)."""
        user_id = 1
        mfa_code = "123456"
        
        with patch('app.core.mfa.get_user_mfa_secret', return_value="JBSWY3DPEHPK3PXP"):
            with patch('app.core.mfa.verify_totp_code', return_value=True):
                with patch('app.core.mfa.is_totp_code_used', side_effect=[False, True]):
                    with patch('app.core.mfa.mark_totp_code_used') as mock_mark:
                        # First use should succeed
                        result1 = verify_mfa_code(user_id, mfa_code)
                        assert result1 is True
                        mock_mark.assert_called_once()
                        
                        # Second use should fail (replay protection)
                        result2 = verify_mfa_code(user_id, mfa_code)
                        assert result2 is False


class TestMFAIntegration:
    """Integration tests for MFA functionality."""

    def test_mfa_full_lifecycle(self):
        """Test complete MFA lifecycle from setup to disable."""
        user_id = 1
        password = "user_password"
        
        # 1. Setup MFA
        with patch('app.core.mfa.validate_user_password', return_value=True):
            setup_response = setup_user_mfa(user_id, password)
            assert setup_response.secret is not None
        
        # 2. Enable MFA (simulate)
        with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=True):
            # 3. Verify TOTP code
            with patch('app.core.mfa.get_user_mfa_secret', return_value=setup_response.secret):
                with patch('app.core.mfa.verify_totp_code', return_value=True):
                    result = verify_mfa_code(user_id, "123456")
                    assert result is True
            
            # 4. Use backup code
            with patch('app.core.mfa.get_user_backup_codes', return_value=setup_response.backup_codes):
                with patch('app.core.mfa.is_backup_code_used', return_value=False):
                    with patch('app.core.mfa.mark_backup_code_used'):
                        result = verify_backup_code(user_id, setup_response.backup_codes[0])
                        assert result is True
            
            # 5. Check status
            with patch('app.core.mfa.count_unused_backup_codes', return_value=9):
                with patch('app.core.mfa.get_mfa_setup_date', return_value=datetime.utcnow()):
                    status = get_mfa_status(user_id)
                    assert status.enabled is True
                    assert status.backup_codes_remaining == 9
            
            # 6. Disable MFA
            with patch('app.core.mfa.remove_mfa_for_user'):
                result = disable_user_mfa(user_id, password)
                assert result is True

    def test_mfa_authentication_flow_integration(self):
        """Test MFA integration with authentication flow."""
        user_id = 1
        username = "testuser"
        password = "user_password"
        mfa_code = "123456"
        
        # Mock user with MFA enabled
        with patch('app.core.mfa.is_mfa_enabled_for_user', return_value=True):
            # Simulate login requiring MFA
            login_result = {"requires_mfa": True, "temp_token": "temp123"}
            
            # Verify MFA code
            with patch('app.core.mfa.get_user_mfa_secret', return_value="JBSWY3DPEHPK3PXP"):
                with patch('app.core.mfa.verify_totp_code', return_value=True):
                    mfa_result = verify_mfa_code(user_id, mfa_code)
                    assert mfa_result is True
                    
                    # Should now allow full authentication
                    final_result = {"access_token": "jwt_token", "authenticated": True}
                    assert final_result["authenticated"] is True

    def test_mfa_concurrent_operations(self):
        """Test MFA operations are thread-safe."""
        import threading
        import concurrent.futures
        
        user_id = 1
        results = []
        
        def mfa_operation():
            """Perform MFA operation in thread."""
            try:
                # Simulate MFA verification
                with patch('app.core.mfa.get_user_mfa_secret', return_value="JBSWY3DPEHPK3PXP"):
                    with patch('app.core.mfa.verify_totp_code', return_value=True):
                        result = verify_mfa_code(user_id, "123456")
                        return result
            except Exception:
                return False
        
        # Run concurrent MFA operations
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(mfa_operation) for _ in range(10)]
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())
        
        # All operations should succeed
        assert all(results)
        assert len(results) == 10