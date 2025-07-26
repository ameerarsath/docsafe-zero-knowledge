"""
Authentication-related test fixtures and factories.

This module provides factories and fixtures for creating
authentication-related test data using factory_boy.
"""

import factory
from datetime import datetime, timedelta
from factory import Faker, LazyAttribute
import uuid

from app.models.user import User
from app.models.token import TokenFamily, RefreshToken
from app.core.security import hash_password


class UserFactory(factory.Factory):
    """Factory for creating User test instances."""
    
    class Meta:
        model = User
    
    id = factory.Sequence(lambda n: n)
    username = factory.Sequence(lambda n: f"testuser{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@securevault.local")
    hashed_password = factory.LazyAttribute(
        lambda obj: hash_password("SecurePassword123!")
    )
    role = "user"
    is_active = True
    mfa_enabled = False
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class AdminUserFactory(UserFactory):
    """Factory for creating admin User test instances."""
    
    username = factory.Sequence(lambda n: f"admin{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@securevault.local")
    role = "admin"
    mfa_enabled = True


class MFAUserFactory(UserFactory):
    """Factory for creating MFA-enabled User test instances."""
    
    username = factory.Sequence(lambda n: f"mfauser{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@securevault.local")
    mfa_enabled = True
    mfa_secret = "JBSWY3DPEHPK3PXP"  # Test TOTP secret


class TokenFamilyFactory(factory.Factory):
    """Factory for creating TokenFamily test instances."""
    
    class Meta:
        model = TokenFamily
    
    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    user_id = factory.Sequence(lambda n: n)
    created_at = factory.LazyFunction(datetime.utcnow)
    is_revoked = False


class RevokedTokenFamilyFactory(TokenFamilyFactory):
    """Factory for creating revoked TokenFamily instances."""
    
    is_revoked = True


class RefreshTokenFactory(factory.Factory):
    """Factory for creating RefreshToken test instances."""
    
    class Meta:
        model = RefreshToken
    
    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    family_id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    user_id = factory.Sequence(lambda n: n)
    token_hash = factory.LazyFunction(lambda: str(uuid.uuid4()))
    created_at = factory.LazyFunction(datetime.utcnow)
    expires_at = factory.LazyFunction(lambda: datetime.utcnow() + timedelta(days=30))
    is_revoked = False


# Common test data constants
TEST_PASSWORDS = {
    "weak": ["123", "password", "12345678", "qwerty"],
    "medium": ["Password123", "MyPassword1", "SecurePass1"],
    "strong": [
        "SecurePassword123!",
        "MyStr0ng&P@ssw0rd",
        "Complex_Pass123$",
        "Super$ecure2023!"
    ]
}

TEST_USERS = {
    "regular_user": {
        "username": "testuser",
        "email": "testuser@securevault.local",
        "password": "SecurePassword123!",
        "role": "user",
        "is_active": True,
        "mfa_enabled": False
    },
    "admin_user": {
        "username": "adminuser",
        "email": "admin@securevault.local",
        "password": "AdminPassword123!",
        "role": "admin",
        "is_active": True,
        "mfa_enabled": True
    },
    "mfa_user": {
        "username": "mfauser",
        "email": "mfauser@securevault.local", 
        "password": "MFAPassword123!",
        "role": "user",
        "is_active": True,
        "mfa_enabled": True,
        "mfa_secret": "JBSWY3DPEHPK3PXP"
    },
    "inactive_user": {
        "username": "inactiveuser",
        "email": "inactive@securevault.local",
        "password": "InactivePassword123!",
        "role": "user",
        "is_active": False,
        "mfa_enabled": False
    }
}

TEST_JWT_PAYLOADS = {
    "valid_access": {
        "sub": "testuser",
        "user_id": 123,
        "role": "user",
        "type": "access"
    },
    "valid_refresh": {
        "sub": "testuser",
        "user_id": 123,
        "role": "user",
        "type": "refresh"
    },
    "admin_access": {
        "sub": "adminuser",
        "user_id": 456,
        "role": "admin",
        "type": "access",
        "permissions": ["read", "write", "admin"]
    },
    "malicious": {
        "sub": "testuser",
        "user_id": 123,
        "role": "admin",  # Privilege escalation attempt
        "type": "access",
        "is_superuser": True
    }
}

TEST_LOGIN_ATTEMPTS = {
    "valid": {
        "username": "testuser",
        "password": "SecurePassword123!"
    },
    "invalid_username": {
        "username": "nonexistent",
        "password": "AnyPassword123!"
    },
    "invalid_password": {
        "username": "testuser",
        "password": "WrongPassword123!"
    },
    "sql_injection": {
        "username": "admin'; DROP TABLE users; --",
        "password": "AnyPassword123!"
    },
    "xss_attempt": {
        "username": "<script>alert('xss')</script>",
        "password": "AnyPassword123!"
    },
    "empty_credentials": {
        "username": "",
        "password": ""
    }
}

MFA_TEST_DATA = {
    "valid_codes": ["123456", "789012", "345678"],
    "invalid_codes": ["000000", "111111", "999999", "123"],
    "expired_codes": ["654321"],  # Would be valid if not expired
    "backup_codes": [
        "12345678", "87654321", "11223344", "44332211",
        "55667788", "88776655", "99001122", "22110099"
    ],
    "used_backup_codes": ["12345678", "87654321"]  # Already used
}

RATE_LIMITING_TEST_DATA = {
    "login_attempts": {
        "allowed_per_minute": 5,
        "allowed_per_hour": 20,
        "lockout_duration": 1800  # 30 minutes
    },
    "token_refresh_attempts": {
        "allowed_per_minute": 10,
        "allowed_per_hour": 100
    },
    "mfa_attempts": {
        "allowed_per_minute": 3,
        "allowed_per_hour": 10,
        "lockout_duration": 900  # 15 minutes
    }
}

SECURITY_TEST_VECTORS = {
    "timing_attack_usernames": [
        "admin", "administrator", "root", "testuser",
        "user", "guest", "demo", "test"
    ],
    "timing_attack_passwords": [
        "password", "admin", "123456", "password123",
        "admin123", "root", "guest", "demo"
    ],
    "token_manipulation_attempts": [
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.invalid",
        "header.payload.signature",
        "not.a.jwt",
        "",
        None
    ]
}