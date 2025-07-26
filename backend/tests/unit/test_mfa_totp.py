"""
Unit tests for TOTP (Time-based One-Time Password) functionality.

This module contains comprehensive tests for TOTP generation, verification,
and management in SecureVault's MFA system. Tests follow TDD methodology
with security-first approach.

Test Coverage:
- TOTP secret generation and validation
- TOTP code generation and verification
- Time window and drift handling
- Secret key encoding and decoding
- Security requirements and edge cases
"""

import pytest
import time
import secrets
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from freezegun import freeze_time

from app.core.mfa import (
    generate_totp_secret,
    generate_totp_code,
    verify_totp_code,
    get_totp_provisioning_uri,
    validate_totp_secret,
    TOTPError,
    InvalidTOTPSecretError,
    InvalidTOTPCodeError,
    ExpiredTOTPCodeError,
)


class TestTOTPSecretGeneration:
    """Test suite for TOTP secret generation."""

    def test_generate_totp_secret_success(self):
        """Test successful TOTP secret generation."""
        secret = generate_totp_secret()
        
        # Verify secret is generated
        assert secret is not None
        assert isinstance(secret, str)
        assert len(secret) > 0
        
        # Verify secret is base32 encoded
        import base64
        try:
            decoded = base64.b32decode(secret)
            assert len(decoded) >= 20  # RFC 4226 recommends at least 160 bits
        except Exception:
            pytest.fail("Generated secret is not valid base32")

    def test_generate_totp_secret_uniqueness(self):
        """Test that each generated secret is unique."""
        secrets_list = []
        for _ in range(10):
            secret = generate_totp_secret()
            secrets_list.append(secret)
        
        # All secrets should be unique
        assert len(set(secrets_list)) == len(secrets_list)

    def test_generate_totp_secret_length(self):
        """Test TOTP secret has appropriate length."""
        secret = generate_totp_secret()
        
        # Base32 encoded secret should be at least 32 characters
        # for 160-bit (20 byte) entropy
        assert len(secret) >= 32
        
        # Should not be excessively long
        assert len(secret) <= 64

    def test_generate_totp_secret_custom_length(self):
        """Test TOTP secret generation with custom length."""
        # Test with different entropy lengths
        secret_160 = generate_totp_secret(entropy_bytes=20)  # 160 bits
        secret_256 = generate_totp_secret(entropy_bytes=32)  # 256 bits
        
        assert len(secret_160) >= 32  # 20 bytes -> ~32 base32 chars
        assert len(secret_256) >= 52  # 32 bytes -> ~52 base32 chars
        
        # Verify both are valid base32
        import base64
        base64.b32decode(secret_160)
        base64.b32decode(secret_256)

    def test_generate_totp_secret_invalid_length(self):
        """Test TOTP secret generation with invalid length."""
        # Too small entropy should raise error
        with pytest.raises(ValueError):
            generate_totp_secret(entropy_bytes=10)  # Less than 128 bits
        
        # Too large entropy should raise error
        with pytest.raises(ValueError):
            generate_totp_secret(entropy_bytes=100)  # Excessive size

    def test_validate_totp_secret_valid(self):
        """Test validation of valid TOTP secrets."""
        valid_secrets = [
            "JBSWY3DPEHPK3PXP",  # Standard test secret
            "MFRGG43UPEFC6QRAAMNG2ILBIU",  # Longer secret
            generate_totp_secret(),  # Generated secret
        ]
        
        for secret in valid_secrets:
            result = validate_totp_secret(secret)
            assert result is True

    def test_validate_totp_secret_invalid(self):
        """Test validation of invalid TOTP secrets."""
        invalid_secrets = [
            "",  # Empty
            "123",  # Too short
            "invalid_chars!@#",  # Invalid base32 characters
            "ABCDEFGH1234567890",  # Invalid base32 (contains 1 and 0)
            "A" * 100,  # Too long
        ]
        
        for secret in invalid_secrets:
            with pytest.raises(InvalidTOTPSecretError):
                validate_totp_secret(secret)

    def test_validate_totp_secret_none(self):
        """Test validation of None secret."""
        with pytest.raises(InvalidTOTPSecretError):
            validate_totp_secret(None)


class TestTOTPCodeGeneration:
    """Test suite for TOTP code generation."""

    def test_generate_totp_code_success(self):
        """Test successful TOTP code generation."""
        secret = "JBSWY3DPEHPK3PXP"
        code = generate_totp_code(secret)
        
        # Verify code is generated
        assert code is not None
        assert isinstance(code, str)
        assert len(code) == 6  # Standard TOTP code length
        assert code.isdigit()

    def test_generate_totp_code_deterministic(self):
        """Test TOTP code generation is deterministic for same time."""
        secret = "JBSWY3DPEHPK3PXP"
        
        with freeze_time("2023-01-01 12:00:00"):
            code1 = generate_totp_code(secret)
            code2 = generate_totp_code(secret)
            
            # Same secret at same time should produce same code
            assert code1 == code2

    def test_generate_totp_code_time_based(self):
        """Test TOTP code changes with time."""
        secret = "JBSWY3DPEHPK3PXP"
        
        with freeze_time("2023-01-01 12:00:00"):
            code1 = generate_totp_code(secret)
        
        with freeze_time("2023-01-01 12:00:30"):  # 30 seconds later, same window
            code2 = generate_totp_code(secret)
        
        with freeze_time("2023-01-01 12:01:00"):  # Next 30-second window
            code3 = generate_totp_code(secret)
        
        # Codes in same time window should be identical
        assert code1 == code2
        
        # Code in different time window should be different
        assert code1 != code3

    def test_generate_totp_code_custom_period(self):
        """Test TOTP code generation with custom time period."""
        secret = "JBSWY3DPEHPK3PXP"
        
        with freeze_time("2023-01-01 12:00:00"):
            code_30s = generate_totp_code(secret, period=30)
            code_60s = generate_totp_code(secret, period=60)
            
            # Different periods should produce different codes
            assert code_30s != code_60s

    def test_generate_totp_code_custom_digits(self):
        """Test TOTP code generation with custom digit count."""
        secret = "JBSWY3DPEHPK3PXP"
        
        code_6 = generate_totp_code(secret, digits=6)
        code_8 = generate_totp_code(secret, digits=8)
        
        assert len(code_6) == 6
        assert len(code_8) == 8
        assert code_6.isdigit()
        assert code_8.isdigit()

    def test_generate_totp_code_invalid_secret(self):
        """Test TOTP code generation with invalid secret."""
        invalid_secrets = [
            "",
            "invalid_base32",
            None,
        ]
        
        for secret in invalid_secrets:
            with pytest.raises(InvalidTOTPSecretError):
                generate_totp_code(secret)

    def test_generate_totp_code_invalid_parameters(self):
        """Test TOTP code generation with invalid parameters."""
        secret = "JBSWY3DPEHPK3PXP"
        
        # Invalid period
        with pytest.raises(ValueError):
            generate_totp_code(secret, period=0)
        
        with pytest.raises(ValueError):
            generate_totp_code(secret, period=-30)
        
        # Invalid digits
        with pytest.raises(ValueError):
            generate_totp_code(secret, digits=3)  # Too few
        
        with pytest.raises(ValueError):
            generate_totp_code(secret, digits=12)  # Too many


class TestTOTPCodeVerification:
    """Test suite for TOTP code verification."""

    def test_verify_totp_code_success(self):
        """Test successful TOTP code verification."""
        secret = "JBSWY3DPEHPK3PXP"
        
        with freeze_time("2023-01-01 12:00:00"):
            code = generate_totp_code(secret)
            
            # Verify the generated code
            result = verify_totp_code(secret, code)
            assert result is True

    def test_verify_totp_code_wrong_code(self):
        """Test TOTP code verification with wrong code."""
        secret = "JBSWY3DPEHPK3PXP"
        wrong_code = "000000"
        
        result = verify_totp_code(secret, wrong_code)
        assert result is False

    def test_verify_totp_code_time_window(self):
        """Test TOTP code verification within time window."""
        secret = "JBSWY3DPEHPK3PXP"
        
        with freeze_time("2023-01-01 12:00:00"):
            code = generate_totp_code(secret)
        
        # Verify code 15 seconds later (still in same 30s window)
        with freeze_time("2023-01-01 12:00:15"):
            result = verify_totp_code(secret, code)
            assert result is True
        
        # Verify code 29 seconds later (still in same 30s window)
        with freeze_time("2023-01-01 12:00:29"):
            result = verify_totp_code(secret, code)
            assert result is True

    def test_verify_totp_code_expired(self):
        """Test TOTP code verification after expiration."""
        secret = "JBSWY3DPEHPK3PXP"
        
        with freeze_time("2023-01-01 12:00:00"):
            code = generate_totp_code(secret)
        
        # Try to verify code after time window (31 seconds later)
        with freeze_time("2023-01-01 12:00:31"):
            result = verify_totp_code(secret, code)
            assert result is False

    def test_verify_totp_code_with_drift_tolerance(self):
        """Test TOTP code verification with clock drift tolerance."""
        secret = "JBSWY3DPEHPK3PXP"
        
        with freeze_time("2023-01-01 12:00:00"):
            code = generate_totp_code(secret)
        
        # Verify code with 1 time step tolerance (allowing previous window)
        with freeze_time("2023-01-01 12:00:31"):  # Next window
            result = verify_totp_code(secret, code, window=1)
            assert result is True
        
        # Verify code with 2 time step tolerance
        with freeze_time("2023-01-01 12:01:01"):  # Two windows later
            result = verify_totp_code(secret, code, window=2)
            assert result is True

    def test_verify_totp_code_future_drift(self):
        """Test TOTP code verification with future time drift."""
        secret = "JBSWY3DPEHPK3PXP"
        
        # Generate code for future time
        with freeze_time("2023-01-01 12:00:31"):  # Next window
            future_code = generate_totp_code(secret)
        
        # Verify future code from current time with tolerance
        with freeze_time("2023-01-01 12:00:00"):
            result = verify_totp_code(secret, future_code, window=1)
            assert result is True

    def test_verify_totp_code_invalid_format(self):
        """Test TOTP code verification with invalid code format."""
        secret = "JBSWY3DPEHPK3PXP"
        
        invalid_codes = [
            "",  # Empty
            "12345",  # Too short
            "1234567",  # Too long
            "abcdef",  # Non-numeric
            "12345a",  # Mixed characters
        ]
        
        for code in invalid_codes:
            with pytest.raises(InvalidTOTPCodeError):
                verify_totp_code(secret, code)

    def test_verify_totp_code_none_code(self):
        """Test TOTP code verification with None code."""
        secret = "JBSWY3DPEHPK3PXP"
        
        with pytest.raises(InvalidTOTPCodeError):
            verify_totp_code(secret, None)

    def test_verify_totp_code_invalid_secret(self):
        """Test TOTP code verification with invalid secret."""
        with pytest.raises(InvalidTOTPSecretError):
            verify_totp_code("invalid_secret", "123456")

    def test_verify_totp_code_replay_protection(self):
        """Test TOTP code verification prevents replay attacks."""
        secret = "JBSWY3DPEHPK3PXP"
        
        with freeze_time("2023-01-01 12:00:00"):
            code = generate_totp_code(secret)
            
            # First verification should succeed
            result1 = verify_totp_code(secret, code, prevent_replay=True)
            assert result1 is True
            
            # Second verification of same code should fail (replay protection)
            result2 = verify_totp_code(secret, code, prevent_replay=True)
            assert result2 is False


class TestTOTPProvisioningURI:
    """Test suite for TOTP provisioning URI generation."""

    def test_get_totp_provisioning_uri_success(self):
        """Test successful TOTP provisioning URI generation."""
        secret = "JBSWY3DPEHPK3PXP"
        account_name = "user@example.com"
        issuer_name = "SecureVault"
        
        uri = get_totp_provisioning_uri(secret, account_name, issuer_name)
        
        assert uri is not None
        assert isinstance(uri, str)
        assert uri.startswith("otpauth://totp/")
        assert secret in uri
        assert account_name in uri
        assert issuer_name in uri

    def test_get_totp_provisioning_uri_format(self):
        """Test TOTP provisioning URI format compliance."""
        secret = "JBSWY3DPEHPK3PXP"
        account_name = "testuser@securevault.local"
        issuer_name = "SecureVault"
        
        uri = get_totp_provisioning_uri(secret, account_name, issuer_name)
        
        # Check URI format: otpauth://totp/Issuer:Account?secret=...&issuer=...
        assert uri.startswith("otpauth://totp/")
        assert f"{issuer_name}:{account_name}" in uri
        assert f"secret={secret}" in uri
        assert f"issuer={issuer_name}" in uri

    def test_get_totp_provisioning_uri_custom_parameters(self):
        """Test TOTP provisioning URI with custom parameters."""
        secret = "JBSWY3DPEHPK3PXP"
        account_name = "user@example.com"
        issuer_name = "SecureVault"
        
        uri = get_totp_provisioning_uri(
            secret, 
            account_name, 
            issuer_name,
            period=60,  # Custom period
            digits=8,   # Custom digits
            algorithm="SHA256"  # Custom algorithm
        )
        
        assert "period=60" in uri
        assert "digits=8" in uri
        assert "algorithm=SHA256" in uri

    def test_get_totp_provisioning_uri_url_encoding(self):
        """Test TOTP provisioning URI properly URL encodes parameters."""
        secret = "JBSWY3DPEHPK3PXP"
        account_name = "user+test@example.com"  # Contains special characters
        issuer_name = "Secure Vault"  # Contains space
        
        uri = get_totp_provisioning_uri(secret, account_name, issuer_name)
        
        # Should not contain raw special characters
        assert "+" not in uri or "%2B" in uri  # + should be encoded
        assert " " not in uri or "%20" in uri  # Space should be encoded

    def test_get_totp_provisioning_uri_invalid_params(self):
        """Test TOTP provisioning URI with invalid parameters."""
        secret = "JBSWY3DPEHPK3PXP"
        
        # Invalid account name
        with pytest.raises(ValueError):
            get_totp_provisioning_uri(secret, "", "SecureVault")
        
        # Invalid issuer name
        with pytest.raises(ValueError):
            get_totp_provisioning_uri(secret, "user@example.com", "")
        
        # Invalid secret
        with pytest.raises(InvalidTOTPSecretError):
            get_totp_provisioning_uri("invalid", "user@example.com", "SecureVault")


class TestTOTPSecurity:
    """Test suite for TOTP security features."""

    def test_totp_secret_entropy(self):
        """Test TOTP secret has sufficient entropy."""
        # Generate multiple secrets and check uniqueness
        secrets = set()
        for _ in range(100):
            secret = generate_totp_secret()
            secrets.add(secret)
        
        # All secrets should be unique (high entropy)
        assert len(secrets) == 100

    def test_totp_code_distribution(self):
        """Test TOTP codes have good distribution."""
        secret = "JBSWY3DPEHPK3PXP"
        codes = set()
        
        # Generate codes for different time periods
        base_time = datetime(2023, 1, 1, 12, 0, 0)
        for i in range(100):
            test_time = base_time + timedelta(seconds=i * 30)
            with freeze_time(test_time):
                code = generate_totp_code(secret)
                codes.add(code)
        
        # Should have good distribution (not all the same)
        assert len(codes) > 50  # At least 50% unique codes

    def test_totp_timing_attack_resistance(self):
        """Test TOTP verification is resistant to timing attacks."""
        secret = "JBSWY3DPEHPK3PXP"
        valid_code = generate_totp_code(secret)
        
        # Time verification of correct code
        start_time = time.time()
        verify_totp_code(secret, valid_code)
        valid_time = time.time() - start_time
        
        # Time verification of incorrect codes
        invalid_times = []
        for _ in range(10):
            invalid_code = f"{secrets.randbelow(1000000):06d}"
            start_time = time.time()
            try:
                verify_totp_code(secret, invalid_code)
            except:
                pass
            invalid_times.append(time.time() - start_time)
        
        # Times should be relatively consistent
        avg_invalid_time = sum(invalid_times) / len(invalid_times)
        
        # Valid and invalid times should not differ significantly
        time_ratio = max(valid_time, avg_invalid_time) / min(valid_time, avg_invalid_time)
        assert time_ratio < 2.0  # Less than 2x difference

    def test_totp_secret_secure_generation(self):
        """Test TOTP secret uses cryptographically secure generation."""
        # This test ensures we're using secure random generation
        # by checking that secrets don't follow predictable patterns
        
        secrets_list = []
        for _ in range(20):
            secret = generate_totp_secret()
            secrets_list.append(secret)
        
        # Check for patterns that might indicate weak randomness
        for i, secret1 in enumerate(secrets_list):
            for j, secret2 in enumerate(secrets_list):
                if i != j:
                    # Check Hamming distance (number of different characters)
                    differences = sum(c1 != c2 for c1, c2 in zip(secret1, secret2))
                    # Should have high Hamming distance for cryptographic randomness
                    assert differences > len(secret1) * 0.3


class TestTOTPIntegration:
    """Integration tests for TOTP functionality."""

    def test_totp_full_lifecycle(self):
        """Test complete TOTP lifecycle from secret generation to verification."""
        # 1. Generate secret
        secret = generate_totp_secret()
        assert validate_totp_secret(secret) is True
        
        # 2. Generate provisioning URI
        uri = get_totp_provisioning_uri(secret, "test@example.com", "SecureVault")
        assert secret in uri
        
        # 3. Generate TOTP code
        code = generate_totp_code(secret)
        assert len(code) == 6
        assert code.isdigit()
        
        # 4. Verify TOTP code
        result = verify_totp_code(secret, code)
        assert result is True
        
        # 5. Verify wrong code fails
        wrong_code = "000000" if code != "000000" else "111111"
        result = verify_totp_code(secret, wrong_code)
        assert result is False

    def test_totp_with_real_time_flow(self):
        """Test TOTP with real time progression."""
        secret = generate_totp_secret()
        
        # Generate code at current time
        code1 = generate_totp_code(secret)
        
        # Verify immediately
        assert verify_totp_code(secret, code1) is True
        
        # Wait for next time window (this would require actual time in real test)
        with freeze_time(datetime.utcnow() + timedelta(seconds=35)):
            code2 = generate_totp_code(secret)
            
            # New code should be different
            assert code1 != code2
            
            # New code should verify
            assert verify_totp_code(secret, code2) is True
            
            # Old code should not verify (without window tolerance)
            assert verify_totp_code(secret, code1) is False
            
            # Old code should verify with window tolerance
            assert verify_totp_code(secret, code1, window=1) is True

    def test_totp_concurrent_operations(self):
        """Test TOTP operations are thread-safe."""
        import threading
        import concurrent.futures
        
        secret = generate_totp_secret()
        results = []
        
        def generate_and_verify():
            """Generate and verify TOTP code in thread."""
            try:
                code = generate_totp_code(secret)
                verified = verify_totp_code(secret, code)
                return verified
            except Exception:
                return False
        
        # Run multiple threads concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(generate_and_verify) for _ in range(10)]
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())
        
        # All operations should succeed
        assert all(results)
        assert len(results) == 10