"""
MFA Service Layer for SecureVault.

This module provides business logic for MFA operations including
database interactions, encryption, and audit logging.
"""

import json
import hashlib
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
import base64

from ..core.database import get_db
from ..core.config import settings
from ..core.security import verify_password
from ..models.user import User
from ..models.mfa import MFAUsedCode, MFAAuditLog, MFAFailedAttempt, MFAConfiguration
from ..core.mfa import (
    generate_totp_secret,
    generate_backup_codes,
    hash_backup_code,
    TOTP_PERIOD,
    MFA_RATE_LIMIT_ATTEMPTS,
    MFA_RATE_LIMIT_WINDOW
)


class MFAService:
    """Service class for MFA operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self._encryption_key = self._get_encryption_key()
    
    def _get_encryption_key(self) -> bytes:
        """Get or generate encryption key for MFA secrets."""
        # In production, this should be stored securely (e.g., environment variable, key management service)
        key_material = settings.SECRET_KEY.encode('utf-8')
        # Use a consistent key derivation
        key = base64.urlsafe_b64encode(hashlib.sha256(key_material).digest())
        return key
    
    def _encrypt_secret(self, secret: str) -> str:
        """Encrypt MFA secret for storage."""
        f = Fernet(self._encryption_key)
        encrypted = f.encrypt(secret.encode('utf-8'))
        return base64.urlsafe_b64encode(encrypted).decode('utf-8')
    
    def _decrypt_secret(self, encrypted_secret: str) -> str:
        """Decrypt MFA secret from storage."""
        f = Fernet(self._encryption_key)
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_secret.encode('utf-8'))
        decrypted = f.decrypt(encrypted_bytes)
        return decrypted.decode('utf-8')
    
    def setup_user_mfa(
        self, 
        user_id: int, 
        password: str,
        issuer: str = "SecureVault"
    ) -> Dict[str, Any]:
        """
        Set up MFA for a user.
        
        Args:
            user_id: User ID
            password: User's password for verification
            issuer: TOTP issuer name
            
        Returns:
            Dictionary with setup information
            
        Raises:
            ValueError: If user not found or password invalid
            Exception: If MFA already enabled
        """
        # Get user
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Verify password
        if not verify_password(password, user.password_hash):
            raise ValueError("Invalid password")
        
        # Check if MFA already enabled
        if user.mfa_enabled:
            raise Exception("MFA is already enabled for this user")
        
        # Generate TOTP secret
        secret = generate_totp_secret()
        
        # Generate backup codes
        backup_codes = generate_backup_codes(user_id)
        
        # Hash backup codes for storage
        hashed_codes = []
        for code in backup_codes:
            hashed_codes.append({
                'hash': hash_backup_code(code),
                'used': False,
                'created_at': datetime.utcnow().isoformat()
            })
        
        # Update user record
        user.mfa_secret = self._encrypt_secret(secret)
        user.mfa_setup_date = datetime.utcnow()
        user.backup_codes = json.dumps(hashed_codes)
        user.backup_codes_generated_at = datetime.utcnow()
        # Don't enable MFA yet - user needs to verify setup first
        
        self.db.commit()
        
        # Log MFA setup
        self._log_mfa_event(
            user_id=user_id,
            event_type="setup",
            event_result="success",
            event_details={"issuer": issuer}
        )
        
        return {
            'secret': secret,
            'backup_codes': backup_codes,
            'user_id': user_id
        }
    
    def enable_user_mfa(self, user_id: int) -> bool:
        """
        Enable MFA for a user after successful verification.
        
        Args:
            user_id: User ID
            
        Returns:
            True if enabled successfully
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.mfa_enabled = True
        self.db.commit()
        
        # Log MFA enablement
        self._log_mfa_event(
            user_id=user_id,
            event_type="enable",
            event_result="success"
        )
        
        return True
    
    def disable_user_mfa(self, user_id: int, admin_override: bool = False) -> bool:
        """
        Disable MFA for a user.
        
        Args:
            user_id: User ID
            admin_override: Whether this is an admin override
            
        Returns:
            True if disabled successfully
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Clear MFA data
        user.mfa_enabled = False
        user.mfa_secret = None
        user.mfa_setup_date = None
        user.mfa_last_used = None
        user.backup_codes = None
        user.backup_codes_generated_at = None
        
        # Clean up related records
        self.db.query(MFAUsedCode).filter(MFAUsedCode.user_id == user_id).delete()
        self.db.query(MFAFailedAttempt).filter(MFAFailedAttempt.user_id == user_id).delete()
        
        self.db.commit()
        
        # Log MFA disable
        self._log_mfa_event(
            user_id=user_id,
            event_type="disable",
            event_result="success",
            event_details={"admin_override": admin_override}
        )
        
        return True
    
    def get_user_mfa_secret(self, user_id: int) -> Optional[str]:
        """
        Get decrypted MFA secret for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Decrypted TOTP secret or None
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.mfa_secret:
            return None
        
        return self._decrypt_secret(user.mfa_secret)
    
    def is_mfa_enabled_for_user(self, user_id: int) -> bool:
        """
        Check if MFA is enabled for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            True if MFA is enabled
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        return user.mfa_enabled if user else False
    
    def get_user_backup_codes(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Get user's backup codes.
        
        Args:
            user_id: User ID
            
        Returns:
            List of backup code dictionaries
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.backup_codes:
            return []
        
        try:
            return json.loads(user.backup_codes)
        except (json.JSONDecodeError, TypeError):
            return []
    
    def verify_backup_code(self, user_id: int, code: str) -> bool:
        """
        Verify a backup code and mark it as used.
        
        Args:
            user_id: User ID
            code: Backup code to verify
            
        Returns:
            True if code is valid and unused
        """
        backup_codes = self.get_user_backup_codes(user_id)
        if not backup_codes:
            return False
        
        # Find matching unused code
        for i, stored_code in enumerate(backup_codes):
            if not stored_code.get('used', False):
                if verify_password(code, stored_code['hash']):
                    # Mark as used
                    backup_codes[i]['used'] = True
                    backup_codes[i]['used_at'] = datetime.utcnow().isoformat()
                    
                    # Update database
                    user = self.db.query(User).filter(User.id == user_id).first()
                    if user:
                        user.backup_codes = json.dumps(backup_codes)
                        user.mfa_last_used = datetime.utcnow()
                        self.db.commit()
                        
                        # Log backup code usage
                        self._log_mfa_event(
                            user_id=user_id,
                            event_type="backup_code_used",
                            event_result="success"
                        )
                        
                        return True
        
        # Log failed backup code attempt
        self._log_mfa_event(
            user_id=user_id,
            event_type="backup_code_verify",
            event_result="failure"
        )
        
        return False
    
    def count_unused_backup_codes(self, user_id: int) -> int:
        """
        Count unused backup codes for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Number of unused backup codes
        """
        backup_codes = self.get_user_backup_codes(user_id)
        return sum(1 for code in backup_codes if not code.get('used', False))
    
    def generate_new_backup_codes(
        self, 
        user_id: int, 
        count: int = 10
    ) -> List[str]:
        """
        Generate new backup codes for a user.
        
        Args:
            user_id: User ID
            count: Number of codes to generate
            
        Returns:
            List of new backup codes
        """
        # Generate new codes
        new_codes = generate_backup_codes(user_id, count)
        
        # Hash for storage
        hashed_codes = []
        for code in new_codes:
            hashed_codes.append({
                'hash': hash_backup_code(code),
                'used': False,
                'created_at': datetime.utcnow().isoformat()
            })
        
        # Update user record
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.backup_codes = json.dumps(hashed_codes)
            user.backup_codes_generated_at = datetime.utcnow()
            self.db.commit()
            
            # Log backup codes generation
            self._log_mfa_event(
                user_id=user_id,
                event_type="backup_codes_generated",
                event_result="success",
                event_details={"count": count}
            )
        
        return new_codes
    
    def is_totp_code_used(self, user_id: int, code: str) -> bool:
        """
        Check if a TOTP code was recently used (replay protection).
        
        Args:
            user_id: User ID
            code: TOTP code
            
        Returns:
            True if code was recently used
        """
        # Calculate current time window
        current_time = int(datetime.utcnow().timestamp())
        time_window = current_time // TOTP_PERIOD
        
        # Hash the code for comparison
        code_hash = hashlib.sha256(f"{user_id}:{code}:{time_window}".encode()).hexdigest()
        
        # Check if used in current or previous window
        for window in [time_window, time_window - 1]:
            existing = self.db.query(MFAUsedCode).filter(
                MFAUsedCode.user_id == user_id,
                MFAUsedCode.code_hash == code_hash,
                MFAUsedCode.time_window == window
            ).first()
            
            if existing:
                return True
        
        return False
    
    def mark_totp_code_used(self, user_id: int, code: str) -> None:
        """
        Mark a TOTP code as used (replay protection).
        
        Args:
            user_id: User ID
            code: TOTP code
        """
        # Calculate current time window
        current_time = int(datetime.utcnow().timestamp())
        time_window = current_time // TOTP_PERIOD
        
        # Hash the code
        code_hash = hashlib.sha256(f"{user_id}:{code}:{time_window}".encode()).hexdigest()
        
        # Create used code record
        used_code = MFAUsedCode(
            user_id=user_id,
            code_hash=code_hash,
            time_window=time_window,
            expires_at=datetime.utcnow() + timedelta(seconds=TOTP_PERIOD * 2)  # Expire after 2 windows
        )
        
        self.db.add(used_code)
        
        # Update user's last MFA usage
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.mfa_last_used = datetime.utcnow()
        
        self.db.commit()
        
        # Log TOTP verification
        self._log_mfa_event(
            user_id=user_id,
            event_type="totp_verify",
            event_result="success"
        )
    
    def is_mfa_rate_limited(self, user_id: int) -> bool:
        """
        Check if user is rate limited for MFA attempts.
        
        Args:
            user_id: User ID
            
        Returns:
            True if user is rate limited
        """
        cutoff_time = datetime.utcnow() - timedelta(seconds=MFA_RATE_LIMIT_WINDOW)
        
        failed_count = self.db.query(MFAFailedAttempt).filter(
            MFAFailedAttempt.user_id == user_id,
            MFAFailedAttempt.attempted_at > cutoff_time
        ).count()
        
        return failed_count >= MFA_RATE_LIMIT_ATTEMPTS
    
    def record_mfa_failure(
        self, 
        user_id: int, 
        attempt_type: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """
        Record a failed MFA attempt.
        
        Args:
            user_id: User ID
            attempt_type: Type of attempt (totp, backup_code)
            ip_address: Client IP address
            user_agent: Client user agent
        """
        failed_attempt = MFAFailedAttempt(
            user_id=user_id,
            attempt_type=attempt_type,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.db.add(failed_attempt)
        self.db.commit()
        
        # Also log in audit
        self._log_mfa_event(
            user_id=user_id,
            event_type=f"{attempt_type}_verify",
            event_result="failure",
            event_details={
                "ip_address": ip_address,
                "user_agent": user_agent
            }
        )
    
    def get_mfa_status(self, user_id: int) -> Dict[str, Any]:
        """
        Get comprehensive MFA status for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary with MFA status information
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {
                'enabled': False,
                'setup_date': None,
                'backup_codes_remaining': 0,
                'last_used': None,
                'required_by_policy': False
            }
        
        return {
            'enabled': user.mfa_enabled,
            'setup_date': user.mfa_setup_date,
            'backup_codes_remaining': self.count_unused_backup_codes(user_id),
            'last_used': user.mfa_last_used,
            'required_by_policy': self._is_mfa_required_by_policy(user.role)
        }
    
    def reset_mfa_for_user(self, user_id: int, admin_id: int) -> bool:
        """
        Reset MFA for a user (admin action).
        
        Args:
            user_id: User ID to reset
            admin_id: Admin user ID performing the reset
            
        Returns:
            True if reset successfully
        """
        success = self.disable_user_mfa(user_id, admin_override=True)
        
        if success:
            # Log admin reset
            self._log_mfa_event(
                user_id=user_id,
                event_type="admin_reset",
                event_result="success",
                event_details={"reset_by": admin_id},
                performed_by=admin_id
            )
        
        return success
    
    def cleanup_expired_codes(self) -> int:
        """
        Clean up expired TOTP codes from database.
        
        Returns:
            Number of records cleaned up
        """
        current_time = datetime.utcnow()
        
        count = self.db.query(MFAUsedCode).filter(
            MFAUsedCode.expires_at < current_time
        ).delete()
        
        self.db.commit()
        return count
    
    def _log_mfa_event(
        self,
        user_id: int,
        event_type: str,
        event_result: str,
        event_details: Optional[Dict[str, Any]] = None,
        performed_by: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> None:
        """
        Log an MFA event for auditing.
        
        Args:
            user_id: User ID
            event_type: Type of event
            event_result: Result of event
            event_details: Additional details
            performed_by: User who performed the action (for admin actions)
            ip_address: Client IP address
            user_agent: Client user agent
            session_id: Session identifier
        """
        audit_log = MFAAuditLog(
            user_id=user_id,
            event_type=event_type,
            event_result=event_result,
            event_details=json.dumps(event_details) if event_details else None,
            performed_by=performed_by,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id
        )
        
        self.db.add(audit_log)
        self.db.commit()
    
    def _is_mfa_required_by_policy(self, role: str) -> bool:
        """
        Check if MFA is required by policy for a role.
        
        Args:
            role: User role
            
        Returns:
            True if MFA is required
        """
        config = self.db.query(MFAConfiguration).first()
        if not config or not config.require_mfa_for_roles:
            return False
        
        try:
            required_roles = json.loads(config.require_mfa_for_roles)
            return role in required_roles
        except (json.JSONDecodeError, TypeError):
            return False


# Convenience functions that use the service
def get_mfa_service(db: Session = None) -> MFAService:
    """Get MFA service instance."""
    if db is None:
        db = next(get_db())
    return MFAService(db)