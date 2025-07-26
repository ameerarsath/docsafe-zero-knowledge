"""
Unit tests for password hashing functionality.

This module contains comprehensive tests for the password hashing system
used in SecureVault authentication. Tests follow TDD methodology with
security-first approach.

Test Coverage:
- Password hashing with bcrypt
- Password verification
- Security requirements (min length, complexity)
- Performance benchmarks for hashing rounds
- Edge cases and error handling
"""

import pytest
import time
from unittest.mock import patch, MagicMock

from app.core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    generate_salt,
    PasswordHashingError,
    WeakPasswordError,
)


class TestPasswordHashing:
    """Test suite for password hashing operations."""

    def test_hash_password_success(self):
        """Test successful password hashing with default parameters."""
        password = "SecurePassword123!"
        hashed = hash_password(password)
        
        # Verify hash is generated
        assert hashed is not None
        assert isinstance(hashed, str)
        assert len(hashed) > 0
        
        # Verify hash is different from original password
        assert hashed != password
        
        # Verify hash starts with bcrypt identifier
        assert hashed.startswith('$2b$')

    def test_hash_password_different_passwords_different_hashes(self):
        """Test that different passwords produce different hashes."""
        password1 = "SecurePassword123!"
        password2 = "DifferentPassword456!"
        
        hash1 = hash_password(password1)
        hash2 = hash_password(password2)
        
        assert hash1 != hash2

    def test_hash_password_same_password_different_hashes(self):
        """Test that same password produces different hashes (salt effect)."""
        password = "SecurePassword123!"
        
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        # Different hashes due to salt
        assert hash1 != hash2
        
        # But both should verify correctly
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)

    def test_hash_password_custom_rounds(self):
        """Test password hashing with custom rounds."""
        password = "SecurePassword123!"
        
        # Test with higher rounds (slower but more secure)
        hash_high = hash_password(password, rounds=14)
        assert verify_password(password, hash_high)
        
        # Test with lower rounds (faster but less secure) - for testing only
        hash_low = hash_password(password, rounds=10)
        assert verify_password(password, hash_low)

    def test_hash_password_performance(self):
        """Test password hashing performance meets security requirements."""
        password = "SecurePassword123!"
        
        # Default rounds should take reasonable time (0.1-1 second)
        start_time = time.time()
        hashed = hash_password(password)
        end_time = time.time()
        
        hash_time = end_time - start_time
        
        # Should not be too fast (security) or too slow (usability)
        assert 0.05 < hash_time < 2.0, f"Hash time {hash_time}s outside acceptable range"
        assert verify_password(password, hashed)

    def test_hash_password_empty_string(self):
        """Test hashing empty password raises appropriate error."""
        with pytest.raises(WeakPasswordError):
            hash_password("")

    def test_hash_password_none(self):
        """Test hashing None password raises appropriate error."""
        with pytest.raises((TypeError, WeakPasswordError)):
            hash_password(None)

    def test_hash_password_weak_password(self):
        """Test hashing weak passwords raises WeakPasswordError."""
        weak_passwords = [
            "123",           # Too short
            "password",      # Too common
            "12345678",      # No complexity
            "aaaaaaaa",      # No variety
        ]
        
        for weak_password in weak_passwords:
            with pytest.raises(WeakPasswordError):
                hash_password(weak_password)

    def test_hash_password_unicode_support(self):
        """Test password hashing supports Unicode characters."""
        unicode_password = "Pāssw0rd123!çñ"
        hashed = hash_password(unicode_password)
        
        assert verify_password(unicode_password, hashed)

    def test_hash_password_long_password(self):
        """Test hashing very long passwords."""
        # Test with 72-character password (bcrypt limit)
        long_password = "A" * 50 + "SecurePassword123!"
        hashed = hash_password(long_password)
        
        assert verify_password(long_password, hashed)

    def test_hash_password_maximum_length(self):
        """Test password hashing with maximum allowed length."""
        # bcrypt has a 72-byte limit
        max_password = "SecurePass123!" + "A" * 58  # Total 72 chars
        hashed = hash_password(max_password)
        
        assert verify_password(max_password, hashed)

    @patch('app.core.security.bcrypt.hashpw')
    def test_hash_password_bcrypt_failure(self, mock_hashpw):
        """Test handling of bcrypt hashing failures."""
        mock_hashpw.side_effect = Exception("Bcrypt error")
        
        with pytest.raises(PasswordHashingError):
            hash_password("SecurePassword123!")

    def test_generate_salt_unique(self):
        """Test salt generation produces unique values."""
        salt1 = generate_salt()
        salt2 = generate_salt()
        
        assert salt1 != salt2
        assert len(salt1) > 0
        assert len(salt2) > 0

    def test_generate_salt_format(self):
        """Test salt generation format is correct for bcrypt."""
        salt = generate_salt()
        
        # bcrypt salt format: $2b$rounds$22-character-salt
        assert salt.startswith('$2b$')
        assert len(salt) == 29  # Standard bcrypt salt length


class TestPasswordVerification:
    """Test suite for password verification operations."""

    def test_verify_password_correct(self):
        """Test password verification with correct password."""
        password = "SecurePassword123!"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password."""
        password = "SecurePassword123!"
        wrong_password = "WrongPassword456!"
        hashed = hash_password(password)
        
        assert verify_password(wrong_password, hashed) is False

    def test_verify_password_empty_password(self):
        """Test password verification with empty password."""
        hashed = hash_password("SecurePassword123!")
        
        assert verify_password("", hashed) is False

    def test_verify_password_empty_hash(self):
        """Test password verification with empty hash."""
        with pytest.raises((ValueError, TypeError)):
            verify_password("SecurePassword123!", "")

    def test_verify_password_invalid_hash_format(self):
        """Test password verification with invalid hash format."""
        invalid_hashes = [
            "not_a_hash",
            "$2b$invalid",
            "plain_text_password",
            "$2b$12$invalid_salt_and_hash",
        ]
        
        for invalid_hash in invalid_hashes:
            with pytest.raises((ValueError, TypeError)):
                verify_password("SecurePassword123!", invalid_hash)

    def test_verify_password_case_sensitive(self):
        """Test password verification is case sensitive."""
        password = "SecurePassword123!"
        hashed = hash_password(password)
        
        assert verify_password(password.upper(), hashed) is False
        assert verify_password(password.lower(), hashed) is False
        assert verify_password(password, hashed) is True

    def test_verify_password_unicode(self):
        """Test password verification with Unicode characters."""
        unicode_password = "Pāssw0rd123!çñ"
        hashed = hash_password(unicode_password)
        
        assert verify_password(unicode_password, hashed) is True
        assert verify_password("Password123!cn", hashed) is False

    @patch('app.core.security.bcrypt.checkpw')
    def test_verify_password_bcrypt_failure(self, mock_checkpw):
        """Test handling of bcrypt verification failures."""
        mock_checkpw.side_effect = Exception("Bcrypt error")
        
        password = "SecurePassword123!"
        hashed = hash_password(password)
        
        with pytest.raises(PasswordHashingError):
            verify_password(password, hashed)

    def test_verify_password_timing_attack_resistance(self):
        """Test password verification has consistent timing (timing attack resistance)."""
        password = "SecurePassword123!"
        hashed = hash_password(password)
        
        # Test multiple incorrect passwords
        wrong_passwords = [
            "WrongPassword1!",
            "WrongPassword2!",
            "WrongPassword3!",
            "A",
            "Very_Long_Wrong_Password_123456789!",
        ]
        
        times = []
        for wrong_pass in wrong_passwords:
            start = time.time()
            result = verify_password(wrong_pass, hashed)
            end = time.time()
            times.append(end - start)
            assert result is False
        
        # Times should be relatively consistent (within 50% variance)
        avg_time = sum(times) / len(times)
        for t in times:
            assert abs(t - avg_time) < avg_time * 0.5


class TestPasswordStrengthValidation:
    """Test suite for password strength validation."""

    def test_validate_strong_password(self):
        """Test validation of strong passwords."""
        strong_passwords = [
            "SecurePassword123!",
            "MyP@ssw0rd2023",
            "Str0ng&S3cur3!",
            "Complex_Pass123$",
        ]
        
        for password in strong_passwords:
            result = validate_password_strength(password)
            assert result.is_valid is True
            assert len(result.issues) == 0

    def test_validate_weak_password_too_short(self):
        """Test validation of passwords that are too short."""
        short_passwords = [
            "Sh0rt!",
            "A1!",
            "1234567",  # 7 chars - below minimum
        ]
        
        for password in short_passwords:
            result = validate_password_strength(password)
            assert result.is_valid is False
            assert "too short" in str(result.issues).lower()

    def test_validate_weak_password_no_uppercase(self):
        """Test validation of passwords without uppercase letters."""
        no_upper_passwords = [
            "lowercase123!",
            "all_lower_case_password!123",
        ]
        
        for password in no_upper_passwords:
            result = validate_password_strength(password)
            assert result.is_valid is False
            assert "uppercase" in str(result.issues).lower()

    def test_validate_weak_password_no_lowercase(self):
        """Test validation of passwords without lowercase letters."""
        no_lower_passwords = [
            "UPPERCASE123!",
            "ALL_UPPER_CASE_PASSWORD!123",
        ]
        
        for password in no_lower_passwords:
            result = validate_password_strength(password)
            assert result.is_valid is False
            assert "lowercase" in str(result.issues).lower()

    def test_validate_weak_password_no_digits(self):
        """Test validation of passwords without digits."""
        no_digit_passwords = [
            "NoDigitsPassword!",
            "OnlyLettersAndSymbols!@#",
        ]
        
        for password in no_digit_passwords:
            result = validate_password_strength(password)
            assert result.is_valid is False
            assert "digit" in str(result.issues).lower()

    def test_validate_weak_password_no_special_chars(self):
        """Test validation of passwords without special characters."""
        no_special_passwords = [
            "NoSpecialChars123",
            "OnlyLettersAndNumbers456",
        ]
        
        for password in no_special_passwords:
            result = validate_password_strength(password)
            assert result.is_valid is False
            assert "special" in str(result.issues).lower()

    def test_validate_common_passwords(self):
        """Test validation rejects common passwords."""
        common_passwords = [
            "password123",
            "Password123!",  # Even with complexity, too common
            "123456789",
            "qwerty123",
            "admin123!",
        ]
        
        for password in common_passwords:
            result = validate_password_strength(password)
            assert result.is_valid is False
            assert "common" in str(result.issues).lower()

    def test_validate_password_entropy(self):
        """Test password entropy calculation."""
        low_entropy_passwords = [
            "aaaaaaaa1!A",      # Low character variety
            "123456789!A",      # Sequential numbers
            "abcdefgh1!A",      # Sequential letters
        ]
        
        for password in low_entropy_passwords:
            result = validate_password_strength(password)
            assert result.is_valid is False
            assert result.entropy_score < 60  # Below threshold

    def test_validate_password_multiple_issues(self):
        """Test validation identifies multiple password issues."""
        weak_password = "weak"  # Short, no uppercase, no numbers, no special chars
        
        result = validate_password_strength(weak_password)
        assert result.is_valid is False
        assert len(result.issues) >= 3  # Multiple issues identified

    def test_validate_password_edge_cases(self):
        """Test password validation edge cases."""
        edge_cases = [
            ("", "Empty password"),
            (None, "None password"),
            ("   ", "Whitespace only"),
            ("A" * 200, "Very long password"),
        ]
        
        for password, description in edge_cases:
            if password is None:
                with pytest.raises((TypeError, WeakPasswordError)):
                    validate_password_strength(password)
            else:
                result = validate_password_strength(password)
                # Should handle gracefully without crashing
                assert hasattr(result, 'is_valid')


@pytest.fixture
def mock_password_policy():
    """Fixture providing mock password policy for testing."""
    return {
        'min_length': 10,
        'require_uppercase': True,
        'require_lowercase': True,
        'require_digits': True,
        'require_special_chars': True,
        'max_length': 128,
        'bcrypt_rounds': 12,
        'entropy_threshold': 60,
    }


class TestPasswordPolicy:
    """Test suite for password policy enforcement."""

    def test_password_policy_configuration(self, mock_password_policy):
        """Test password policy can be configured."""
        from app.core.security import configure_password_policy
        
        configure_password_policy(mock_password_policy)
        
        # Test that policy is applied
        weak_password = "short"
        with pytest.raises(WeakPasswordError):
            hash_password(weak_password)

    def test_password_policy_enforcement(self, mock_password_policy):
        """Test password policy is enforced during hashing."""
        from app.core.security import configure_password_policy
        
        configure_password_policy(mock_password_policy)
        
        # Valid according to policy
        valid_password = "ValidPassword123!"
        hashed = hash_password(valid_password)
        assert verify_password(valid_password, hashed)
        
        # Invalid according to policy
        invalid_password = "short"
        with pytest.raises(WeakPasswordError):
            hash_password(invalid_password)


class TestSecurityIntegration:
    """Integration tests for password security components."""

    def test_full_password_lifecycle(self):
        """Test complete password lifecycle from creation to verification."""
        original_password = "SecureLifecyclePassword123!"
        
        # 1. Validate password strength
        validation_result = validate_password_strength(original_password)
        assert validation_result.is_valid is True
        
        # 2. Hash the password
        hashed_password = hash_password(original_password)
        assert hashed_password is not None
        
        # 3. Verify the password
        is_valid = verify_password(original_password, hashed_password)
        assert is_valid is True
        
        # 4. Verify wrong password fails
        wrong_password = "WrongPassword456!"
        is_invalid = verify_password(wrong_password, hashed_password)
        assert is_invalid is False

    def test_concurrent_password_operations(self):
        """Test password operations are thread-safe."""
        import threading
        import concurrent.futures
        
        password = "ConcurrentTestPassword123!"
        results = []
        
        def hash_and_verify():
            """Hash and verify password in thread."""
            hashed = hash_password(password)
            verified = verify_password(password, hashed)
            return verified
        
        # Run multiple threads concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(hash_and_verify) for _ in range(10)]
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())
        
        # All operations should succeed
        assert all(results)
        assert len(results) == 10