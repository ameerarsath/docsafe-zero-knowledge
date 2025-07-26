"""
Token model for JWT token family management.

This module defines token-related models for SecureVault.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from datetime import datetime

from ..core.database import Base


class TokenFamily(Base):
    """Token family model for refresh token rotation."""
    
    __tablename__ = "token_families"
    
    # Primary key
    id = Column(String(255), primary_key=True, index=True)
    
    # User reference
    user_id = Column(Integer, nullable=False, index=True)
    
    # Token family status
    is_revoked = Column(Boolean, default=False, nullable=False)
    
    # Audit fields
    created_at = Column(DateTime, default=func.now(), nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    
    def __init__(self, id: str, user_id: int, **kwargs):
        """Initialize TokenFamily."""
        self.id = id
        self.user_id = user_id
        
        # Set all other fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def __repr__(self) -> str:
        """String representation of token family."""
        return f"<TokenFamily(id='{self.id}', user_id={self.user_id}, revoked={self.is_revoked})>"