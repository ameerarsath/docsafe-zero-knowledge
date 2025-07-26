"""
Configuration settings for SecureVault application.

This module contains all configuration settings including database connections,
security settings, and environment-specific configurations.
"""

import os
from functools import lru_cache
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import validator


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Basic App Settings
    APP_NAME: str = "SecureVault API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Security Settings
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database Settings
    DATABASE_URL: str = "postgresql://securevault_user:securevault_password@db:5432/securevault"
    
    # Redis Settings
    REDIS_URL: str = "redis://:redis_password@redis:6379/0"
    
    # CORS Settings
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3005", "http://frontend:3000", "http://127.0.0.1:3005"]
    
    # Password Policy Settings
    PASSWORD_MIN_LENGTH: int = 10
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGITS: bool = True
    PASSWORD_REQUIRE_SPECIAL_CHARS: bool = True
    PASSWORD_MAX_LENGTH: int = 128
    BCRYPT_ROUNDS: int = 12
    PASSWORD_ENTROPY_THRESHOLD: int = 60
    
    # Encryption Settings
    ENCRYPTION_ESCROW_ENABLED: bool = True
    ENCRYPTION_MIN_ITERATIONS: int = 100000
    ENCRYPTION_RECOMMENDED_ITERATIONS: int = 500000
    ENCRYPTION_SALT_LENGTH: int = 32
    ENCRYPTION_IV_LENGTH: int = 12
    ENCRYPTION_KEY_LENGTH: int = 32
    ENCRYPTED_FILES_PATH: str = "/app/encrypted-files"
    
    # Rate Limiting Settings
    LOGIN_RATE_LIMIT_ATTEMPTS: int = 3
    LOGIN_RATE_LIMIT_WINDOW: int = 1800  # 30 minutes in seconds
    
    # File Storage Settings
    ENCRYPTED_FILES_PATH: str = "/app/encrypted-files"
    BACKUPS_PATH: str = "/app/backups"
    TEMP_PATH: str = "/app/temp"
    
    
    @validator("ENVIRONMENT")
    def validate_environment(cls, v: str) -> str:
        """Validate environment is one of allowed values."""
        allowed = {"development", "staging", "production"}
        if v not in allowed:
            raise ValueError(f"Environment must be one of: {allowed}")
        return v
    
    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()