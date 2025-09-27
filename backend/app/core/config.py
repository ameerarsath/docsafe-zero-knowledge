"""
Configuration settings for SecureVault application.

This module contains all configuration settings including database connections,
security settings, and environment-specific configurations.
"""

import os
import json
from functools import lru_cache
from typing import Optional, List, Union, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, Field


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Changed from "forbid" to "ignore" to handle additional env vars
        validate_assignment=True,
        validate_default=True,
        use_enum_values=True,
    )
    
    # Basic App Settings
    APP_NAME: str = "SecureVault API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    ALLOWED_HOSTS: List[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1", "0.0.0.0"])
    
    # Security Settings
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database Settings
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5430/securevault"
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = Field(default=30, description="Connection pool timeout in seconds")
    DB_POOL_RECYCLE: int = Field(default=1800, description="Connection pool recycle time in seconds")
    DB_POOL_PRE_PING: bool = Field(default=True, description="Enable connection pool pre-ping")
    TEST_DATABASE_URL: Optional[str] = None
    
    # Redis Settings
    REDIS_URL: str = "redis://:redis_password@redis:6379/0"
    REDIS_MAX_CONNECTIONS: int = 20
    REDIS_CONNECTION_TIMEOUT: int = Field(default=5, description="Redis connection timeout in seconds")
    REDIS_SOCKET_TIMEOUT: int = Field(default=5, description="Redis socket timeout in seconds")
    REDIS_RETRY_ON_TIMEOUT: bool = Field(default=True, description="Retry Redis operations on timeout")
    REDIS_HEALTH_CHECK_INTERVAL: int = Field(default=30, description="Redis health check interval in seconds")
    TEST_REDIS_URL: Optional[str] = None
    
    # Frontend URL for share links
    FRONTEND_URL: str = "http://localhost:3005"

    # CORS Settings
    CORS_ORIGINS: List[str] = Field(default_factory=lambda: ["http://localhost:3000", "http://localhost:3005", "http://localhost:3006", "http://localhost:3008", "http://localhost:3009", "http://localhost:3010", "http://localhost:3013", "http://frontend:3000", "http://127.0.0.1:3005", "http://127.0.0.1:3006", "http://127.0.0.1:3008", "http://127.0.0.1:3009", "http://127.0.0.1:3010", "http://127.0.0.1:3013"])
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = Field(default_factory=lambda: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
    CORS_ALLOW_HEADERS: List[str] = Field(default_factory=lambda: ["*"])
    CORS_EXPOSE_HEADERS: List[str] = Field(default_factory=lambda: ["*"])
    CORS_MAX_AGE: int = Field(default=600, description="CORS preflight cache duration in seconds")
    
    # Multi-Factor Authentication Settings
    MFA_ISSUER: str = "DocSafe"
    MFA_BACKUP_CODES_COUNT: int = 10
    MFA_TOTP_WINDOW: int = 1
    MFA_TOTP_INTERVAL: int = Field(default=30, description="TOTP time interval in seconds")
    MFA_TOTP_DIGITS: int = Field(default=6, description="Number of digits in TOTP code")
    MFA_RECOVERY_CODE_LENGTH: int = Field(default=8, description="Length of MFA recovery codes")
    
    # File Upload Settings
    MAX_FILE_SIZE_MB: int = 100
    MAX_FILE_SIZE_BYTES: int = Field(default=104857600, description="Maximum file size in bytes (computed from MB)")
    UPLOAD_PATH: str = "./data/files"
    BACKUP_PATH: str = "./data/backups"
    TEMP_PATH: str = "./temp"
    ALLOWED_FILE_TYPES: List[str] = Field(default_factory=lambda: [
        "pdf", "doc", "docx", "txt", "png", "jpg", "jpeg", "gif", 
        "xls", "xlsx", "ppt", "pptx", "zip", "rar"
    ])
    UPLOAD_CHUNK_SIZE: int = Field(default=8192, description="File upload chunk size in bytes")
    FILE_CLEANUP_INTERVAL: int = Field(default=3600, description="Temporary file cleanup interval in seconds")
    
    # Password Policy Settings
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_MAX_LENGTH: int = 128
    PASSWORD_REQUIRE_UPPERCASE: bool = False
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGITS: bool = False
    PASSWORD_REQUIRE_SPECIAL_CHARS: bool = False
    PASSWORD_HISTORY_COUNT: int = Field(default=5, description="Number of previous passwords to remember")
    PASSWORD_EXPIRY_DAYS: int = Field(default=90, description="Password expiry in days, 0 for no expiry")
    BCRYPT_ROUNDS: int = 12
    PASSWORD_ENTROPY_THRESHOLD: int = 25
    
    # Encryption Settings
    ENCRYPTION_ESCROW_ENABLED: bool = True
    ENCRYPTION_MIN_ITERATIONS: int = 100000
    ENCRYPTION_RECOMMENDED_ITERATIONS: int = 500000
    ENCRYPTION_SALT_LENGTH: int = 32
    ENCRYPTION_IV_LENGTH: int = 12
    ENCRYPTION_KEY_LENGTH: int = 32
    ENCRYPTION_ALGORITHM: str = Field(default="AES-256-GCM", description="Default encryption algorithm")
    ENCRYPTION_KEY_DERIVATION: str = Field(default="PBKDF2", description="Key derivation function")
    PBKDF2_ITERATIONS: int = 100000
    SALT_LENGTH: int = 16
    ENCRYPTED_FILES_PATH: str = "/app/encrypted-files"
    
    # Rate Limiting Settings
    LOGIN_RATE_LIMIT_ATTEMPTS: int = 3
    LOGIN_RATE_LIMIT_WINDOW: int = 1800  # 30 minutes in seconds
    RATE_LIMIT_PER_MINUTE: int = 20
    RATE_LIMIT_BURST: int = 5
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_STORAGE: str = Field(default="redis", description="Rate limit storage backend")
    RATE_LIMIT_STRATEGY: str = Field(default="sliding_window", description="Rate limiting strategy")
    
    # Email Configuration
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = Field(default=False, description="Use SSL for SMTP connection")
    SMTP_TIMEOUT: int = Field(default=30, description="SMTP connection timeout in seconds")
    EMAIL_FROM: str = "noreply@docsafe.dev"
    EMAIL_FROM_NAME: str = Field(default="DocSafe", description="From name for outgoing emails")
    EMAIL_TEMPLATE_PATH: str = Field(default="./templates/email", description="Path to email templates")
    
    # Security Headers Settings
    HSTS_MAX_AGE: int = 31536000  # 1 year
    HSTS_INCLUDE_SUBDOMAINS: bool = True
    HSTS_PRELOAD: bool = True
    CSP_REPORT_ONLY: bool = False
    CSP_REPORT_URI: Optional[str] = Field(default=None, description="CSP violation report URI")
    SECURITY_HEADERS_ENABLED: bool = True
    SECURE_HEADERS_ENABLED: bool = False
    USE_HTTPS: bool = False
    SECURE_COOKIES: bool = False
    SECURE_REFERRER_POLICY: str = Field(default="strict-origin-when-cross-origin", description="Referrer policy header")
    
    # Development/Production Feature Toggles
    ENABLE_SWAGGER_UI: bool = True
    ENABLE_REDOC: bool = True
    ENABLE_CORS: bool = True
    ENABLE_DEBUG_TOOLBAR: bool = False
    ENABLE_PROFILER: bool = Field(default=False, description="Enable application profiler")
    ENABLE_METRICS: bool = Field(default=True, description="Enable metrics collection")
    
    # Certificate Pinning Settings (for production)
    CERTIFICATE_PINNING_ENABLED: bool = False
    CERTIFICATE_PINS: List[str] = Field(default_factory=list)
    CERTIFICATE_VALIDATION_STRICT: bool = Field(default=True, description="Strict certificate validation")
    
    # File Storage Settings
    BACKUPS_PATH: str = "/app/backups"
    BACKUP_RETENTION_DAYS: int = Field(default=30, description="Backup retention period in days")
    BACKUP_COMPRESSION: bool = Field(default=True, description="Enable backup compression")
    STORAGE_BACKEND: str = Field(default="local", description="Storage backend (local, s3, etc.)")
    
    # Logging Configuration
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: str = "./logs/docsafe.log"
    LOG_MAX_SIZE_MB: int = 10
    LOG_BACKUP_COUNT: int = 5
    LOG_ROTATION: str = Field(default="time", description="Log rotation strategy (time, size)")
    LOG_STRUCTURED: bool = Field(default=False, description="Enable structured JSON logging")
    
    # Session Management
    SESSION_TIMEOUT: int = Field(default=1800, description="Session timeout in seconds")
    SESSION_CLEANUP_INTERVAL: int = Field(default=300, description="Session cleanup interval in seconds")
    SESSION_COOKIE_NAME: str = Field(default="docsafe_session", description="Session cookie name")
    SESSION_COOKIE_DOMAIN: Optional[str] = Field(default=None, description="Session cookie domain")
    SESSION_COOKIE_PATH: str = Field(default="/", description="Session cookie path")
    SESSION_COOKIE_SECURE: bool = Field(default=False, description="Secure session cookies")
    SESSION_COOKIE_HTTPONLY: bool = Field(default=True, description="HTTP-only session cookies")
    SESSION_COOKIE_SAMESITE: str = Field(default="lax", description="SameSite policy for session cookies")
    
    # Performance Settings
    CONNECTION_POOL_SIZE: int = Field(default=20, description="HTTP connection pool size")
    CONNECTION_POOL_MAXSIZE: int = Field(default=100, description="Maximum HTTP connection pool size")
    REQUEST_TIMEOUT: int = Field(default=30, description="HTTP request timeout in seconds")
    WORKER_TIMEOUT: int = Field(default=300, description="Worker process timeout in seconds")
    KEEPALIVE_TIMEOUT: int = Field(default=5, description="HTTP keep-alive timeout in seconds")
    
    # Cache Settings
    CACHE_ENABLED: bool = Field(default=True, description="Enable application caching")
    CACHE_TTL: int = Field(default=300, description="Default cache TTL in seconds")
    CACHE_MAX_SIZE: int = Field(default=1000, description="Maximum cache size")
    CACHE_BACKEND: str = Field(default="redis", description="Cache backend")
    
    # Monitoring and Health Checks
    HEALTH_CHECK_ENABLED: bool = Field(default=True, description="Enable health check endpoints")
    METRICS_ENABLED: bool = Field(default=True, description="Enable metrics collection")
    PROMETHEUS_ENABLED: bool = Field(default=False, description="Enable Prometheus metrics")
    JAEGER_ENABLED: bool = Field(default=False, description="Enable Jaeger tracing")
    
    # Development/Testing Overrides
    SKIP_AUTH_FOR_HEALTH_CHECK: bool = False
    ENABLE_TEST_ENDPOINTS: bool = False
    MOCK_EXTERNAL_SERVICES: bool = False
    TESTING_MODE: bool = Field(default=False, description="Enable testing mode")
    
    # Additional Environment Variables (commonly found in deployment)
    # These are included to prevent validation errors in various deployment scenarios
    HOST: str = Field(default="0.0.0.0", description="Application host")
    PORT: int = Field(default=8000, description="Application port")
    WORKERS: int = Field(default=1, description="Number of worker processes")
    RELOAD: bool = Field(default=False, description="Enable auto-reload in development")
    ACCESS_LOG: bool = Field(default=True, description="Enable access logging")
    ERROR_LOG: bool = Field(default=True, description="Enable error logging")
    LOG_CONFIG: Optional[str] = Field(default=None, description="Path to logging configuration file")
    SSL_KEYFILE: Optional[str] = Field(default=None, description="SSL key file path")
    SSL_CERTFILE: Optional[str] = Field(default=None, description="SSL certificate file path")
    SSL_VERSION: Optional[int] = Field(default=None, description="SSL version")
    SSL_CERT_REQS: Optional[int] = Field(default=None, description="SSL certificate requirements")
    SSL_CA_CERTS: Optional[str] = Field(default=None, description="SSL CA certificates file")
    SSL_CIPHERS: Optional[str] = Field(default=None, description="SSL ciphers")
    
    # Container/Kubernetes Environment Variables
    CONTAINER_NAME: Optional[str] = Field(default=None, description="Container name")
    NAMESPACE: Optional[str] = Field(default=None, description="Kubernetes namespace")
    POD_NAME: Optional[str] = Field(default=None, description="Kubernetes pod name")
    NODE_NAME: Optional[str] = Field(default=None, description="Kubernetes node name")
    
    # Common CI/CD Environment Variables
    CI: bool = Field(default=False, description="Running in CI environment")
    BUILD_NUMBER: Optional[str] = Field(default=None, description="Build number")
    GIT_COMMIT: Optional[str] = Field(default=None, description="Git commit hash")
    GIT_BRANCH: Optional[str] = Field(default=None, description="Git branch name")
    DEPLOYMENT_ENV: Optional[str] = Field(default=None, description="Deployment environment")

    def __init__(self, **kwargs):
        """Initialize settings and compute derived values."""
        super().__init__(**kwargs)
        # Compute MAX_FILE_SIZE_BYTES from MAX_FILE_SIZE_MB
        self.MAX_FILE_SIZE_BYTES = self.MAX_FILE_SIZE_MB * 1024 * 1024

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v) -> List[str]:
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            try:
                # Try to parse as JSON array first
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
                # If it's a single string, return as list
                return [v]
            except (json.JSONDecodeError, ValueError):
                # If JSON parsing fails, split by comma
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, list):
            return v
        else:
            return ["http://localhost:3005"]  # fallback

    @field_validator("CORS_ALLOW_METHODS", "CORS_ALLOW_HEADERS", "CORS_EXPOSE_HEADERS", "ALLOWED_HOSTS", "ALLOWED_FILE_TYPES", "CERTIFICATE_PINS", mode="before")
    @classmethod
    def parse_list_from_string(cls, v) -> List[str]:
        """Parse list fields from string or list."""
        if isinstance(v, str):
            try:
                # Try to parse as JSON array first
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
                # If it's a single string, return as list
                return [v]
            except (json.JSONDecodeError, ValueError):
                # If JSON parsing fails, split by comma
                return [item.strip().strip('"').strip("'") for item in v.split(",") if item.strip()]
        elif isinstance(v, list):
            return v
        return []

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment is one of allowed values."""
        allowed = {"development", "staging", "production", "testing", "local"}
        if v not in allowed:
            raise ValueError(f"Environment must be one of: {allowed}")
        return v
    
    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level is one of allowed values."""
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        v_upper = v.upper()
        if v_upper not in allowed:
            raise ValueError(f"Log level must be one of: {allowed}")
        return v_upper
    
    @field_validator("ENCRYPTION_ALGORITHM")
    @classmethod
    def validate_encryption_algorithm(cls, v: str) -> str:
        """Validate encryption algorithm is supported."""
        allowed = {"AES-256-GCM", "AES-256-CBC", "ChaCha20-Poly1305"}
        if v not in allowed:
            raise ValueError(f"Encryption algorithm must be one of: {allowed}")
        return v
    
    @field_validator("RATE_LIMIT_STRATEGY")
    @classmethod
    def validate_rate_limit_strategy(cls, v: str) -> str:
        """Validate rate limit strategy."""
        allowed = {"fixed_window", "sliding_window", "token_bucket"}
        if v not in allowed:
            raise ValueError(f"Rate limit strategy must be one of: {allowed}")
        return v
    
    @field_validator("SESSION_COOKIE_SAMESITE")
    @classmethod
    def validate_samesite_policy(cls, v: str) -> str:
        """Validate SameSite cookie policy."""
        allowed = {"strict", "lax", "none"}
        v_lower = v.lower()
        if v_lower not in allowed:
            raise ValueError(f"SameSite policy must be one of: {allowed}")
        return v_lower

    @field_validator("PBKDF2_ITERATIONS", "ENCRYPTION_MIN_ITERATIONS", "ENCRYPTION_RECOMMENDED_ITERATIONS")
    @classmethod
    def validate_iterations(cls, v: int) -> int:
        """Validate PBKDF2 iterations meet security requirements."""
        if v < 10000:
            raise ValueError("PBKDF2 iterations must be at least 10,000 for security")
        return v

    @field_validator("PASSWORD_MIN_LENGTH")
    @classmethod
    def validate_password_min_length(cls, v: int) -> int:
        """Validate minimum password length."""
        if v < 8:
            raise ValueError("Minimum password length must be at least 8 characters")
        return v

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate secret key meets minimum security requirements."""
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT.lower() == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT.lower() == "production"
    
    @property
    def is_testing(self) -> bool:
        """Check if running in testing environment."""
        return self.ENVIRONMENT.lower() == "testing" or self.TESTING_MODE


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()
