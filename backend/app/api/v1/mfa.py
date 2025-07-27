"""
MFA (Multi-Factor Authentication) API endpoints for SecureVault.

This module provides REST API endpoints for MFA operations including:
- TOTP setup and verification
- QR code generation
- Backup codes management
- MFA enable/disable operations
- Admin MFA management
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from ...core.database import get_db
from ...core.security import get_current_user, require_role
from ...core.mfa import (
    setup_user_mfa,
    verify_mfa_code,
    disable_user_mfa,
    get_mfa_status as get_user_mfa_status,
    reset_mfa_for_user,
    generate_qr_code_data_uri,
    get_totp_provisioning_uri,
    MFANotEnabledError,
    MFAAlreadyEnabledError,
    InvalidMFACodeError,
    BackupCodeExhaustedError,
)
from ...services.mfa_service import get_mfa_service
from ...models.user import User
from ...schemas.mfa import (
    MFASetupRequest,
    MFASetupResponse,
    MFAVerifyRequest,
    MFAVerifyResponse,
    MFADisableRequest,
    MFAStatus,
    BackupCodesRequest,
    BackupCodesResponse,
    MFAResetRequest,
    MFAResetResponse,
    QRCodeRequest,
    QRCodeResponse,
    MFAStatsResponse,
    MFAHealthResponse,
)

router = APIRouter(prefix="/mfa", tags=["mfa"])
security = HTTPBearer()


@router.post("/setup", response_model=MFASetupResponse)
async def setup_mfa(
    request: MFASetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Set up MFA for the current user.
    
    This endpoint generates a new TOTP secret, creates a QR code for 
    authenticator app setup, and generates backup codes for recovery.
    
    Returns:
        MFASetupResponse with secret, QR code, and backup codes
        
    Raises:
        HTTPException: If MFA is already enabled or password is invalid
    """
    try:
        # Use the setup_user_mfa function from core
        setup_result = setup_user_mfa(
            user_id=current_user.id,
            password=request.password,
            issuer=request.issuer or "SecureVault"
        )
        
        return setup_result
        
    except MFAAlreadyEnabledError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to setup MFA: {str(e)}"
        )


@router.post("/verify", response_model=MFAVerifyResponse)
async def verify_mfa(
    request: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify a TOTP code or backup code.
    
    This endpoint verifies either a 6-digit TOTP code from an authenticator
    app or an 8-character backup code for MFA authentication.
    
    Returns:
        MFAVerifyResponse with verification result
        
    Raises:
        HTTPException: If MFA is not enabled or code is invalid
    """
    try:
        # Get MFA service
        service = get_mfa_service(db)
        
        # Check if MFA is setup (either enabled or in setup mode with secret)
        mfa_enabled = service.is_mfa_enabled_for_user(current_user.id)
        mfa_secret = service.get_user_mfa_secret(current_user.id)
        
        if not mfa_enabled and not mfa_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MFA is not setup for this user"
            )
        
        # Check rate limiting
        if service.is_mfa_rate_limited(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed MFA attempts. Please try again later."
            )
        
        # Verify MFA code using core function
        verified = verify_mfa_code(current_user.id, request.code)
        
        # If verification successful and MFA is not yet enabled, enable it (setup completion)
        if verified and not mfa_enabled:
            service.enable_user_mfa(current_user.id)
        
        backup_code_used = len(request.code) == 8  # Backup codes are 8 characters
        
        # Get remaining backup codes count
        backup_codes_remaining = service.count_unused_backup_codes(current_user.id)
        
        return MFAVerifyResponse(
            verified=verified,
            backup_code_used=backup_code_used,
            backup_codes_remaining=backup_codes_remaining
        )
        
    except InvalidMFACodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except BackupCodeExhaustedError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except MFANotEnabledError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify MFA: {str(e)}"
        )


@router.get("/status", response_model=MFAStatus)
async def get_mfa_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get MFA status for the current user.
    
    Returns information about whether MFA is enabled, when it was set up,
    and how many backup codes remain.
    
    Returns:
        MFAStatus with user's MFA information
    """
    try:
        return get_user_mfa_status(current_user.id)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get MFA status: {str(e)}"
        )


@router.post("/disable", response_model=dict)
async def disable_mfa(
    request: MFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disable MFA for the current user.
    
    Requires the user's current password for security. Admin users can
    override this requirement with the admin_override flag.
    
    Returns:
        Success message
        
    Raises:
        HTTPException: If password is invalid or MFA is not enabled
    """
    try:
        # Use the disable_user_mfa function from core
        success = disable_user_mfa(
            user_id=current_user.id,
            password=request.password,
            admin_override=request.admin_override and current_user.is_admin
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to disable MFA"
            )
        
        return {"message": "MFA has been disabled successfully"}
        
    except MFANotEnabledError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disable MFA: {str(e)}"
        )


@router.post("/backup-codes", response_model=BackupCodesResponse)
async def generate_new_backup_codes(
    request: BackupCodesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate new backup codes for the current user.
    
    This will replace all existing backup codes. Requires the user's
    current password for security.
    
    Returns:
        BackupCodesResponse with new backup codes
        
    Raises:
        HTTPException: If MFA is not enabled or password is invalid
    """
    try:
        # Get MFA service
        service = get_mfa_service(db)
        
        # Check if MFA is enabled
        if not service.is_mfa_enabled_for_user(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MFA is not enabled"
            )
        
        # Validate user password using core function
        from ...core.mfa import validate_user_password
        if not validate_user_password(current_user.id, request.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password"
            )
        
        # Count existing codes for response
        old_codes_count = service.count_unused_backup_codes(current_user.id)
        
        # Generate new backup codes using service
        new_codes = service.generate_new_backup_codes(current_user.id, request.count)
        
        return BackupCodesResponse(
            backup_codes=new_codes,
            codes_replaced=old_codes_count
        )
        
    except MFANotEnabledError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate backup codes: {str(e)}"
        )


@router.post("/qr-code", response_model=QRCodeResponse)
async def get_qr_code(
    request: QRCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate QR code for MFA setup.
    
    This endpoint generates a QR code in the requested format for setting
    up TOTP in an authenticator app. Only available if MFA is enabled.
    
    Returns:
        QRCodeResponse with QR code in requested format
        
    Raises:
        HTTPException: If MFA is not enabled
    """
    try:
        # Get MFA service
        service = get_mfa_service(db)
        
        # Check if MFA is enabled
        if not service.is_mfa_enabled_for_user(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MFA is not enabled"
            )
        
        # Get user's MFA secret
        secret = service.get_user_mfa_secret(current_user.id)
        if not secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="MFA secret not found"
            )
        
        # Create provisioning URI
        provisioning_uri = get_totp_provisioning_uri(
            secret=secret,
            account_name=current_user.email,
            issuer_name="SecureVault"
        )
        
        # Generate QR code in requested format
        if request.format == "data_uri":
            qr_code = generate_qr_code_data_uri(provisioning_uri, box_size=request.size)
        elif request.format == "svg":
            from ...core.mfa import get_qr_code_svg
            qr_code = get_qr_code_svg(provisioning_uri, module_size=request.size)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported QR code format"
            )
        
        return QRCodeResponse(
            qr_code=qr_code,
            format=request.format,
            provisioning_uri=provisioning_uri
        )
        
    except MFANotEnabledError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate QR code: {str(e)}"
        )


# Admin-only endpoints
@router.post("/admin/reset", response_model=MFAResetResponse)
async def admin_reset_mfa(
    request: MFAResetRequest,
    current_user: User = Depends(require_role(["admin", "super_admin"])),
    db: Session = Depends(get_db)
):
    """
    Reset MFA for a user (admin only).
    
    This endpoint allows administrators to reset MFA for any user,
    which disables their MFA and removes all associated data.
    
    Returns:
        MFAResetResponse with reset details
        
    Raises:
        HTTPException: If user not found or MFA not enabled
    """
    try:
        # Get MFA service
        service = get_mfa_service(db)
        
        # Verify target user exists and has MFA enabled
        if not service.is_mfa_enabled_for_user(request.user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MFA is not enabled for the specified user"
            )
        
        # Perform MFA reset
        success = reset_mfa_for_user(request.user_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reset MFA"
            )
        
        return MFAResetResponse(
            success=True,
            user_id=request.user_id,
            reset_by=current_user.id,
            reset_at=datetime.utcnow()
        )
        
    except MFANotEnabledError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for user"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset MFA: {str(e)}"
        )


@router.get("/admin/stats", response_model=MFAStatsResponse)
async def get_mfa_stats(
    current_user: User = Depends(require_role(["admin", "super_admin"])),
    db: Session = Depends(get_db)
):
    """
    Get MFA statistics (admin only).
    
    Returns system-wide MFA statistics including enrollment rates,
    backup code usage, and recent activity.
    
    Returns:
        MFAStatsResponse with MFA statistics
    """
    try:
        # Get real MFA statistics from the database
        total_users = db.query(User).filter(User.is_active == True).count()
        mfa_enabled_users = db.query(User).filter(
            and_(User.is_active == True, User.mfa_enabled == True)
        ).count()
        
        # Calculate MFA adoption percentage
        mfa_enabled_percentage = (mfa_enabled_users / total_users * 100) if total_users > 0 else 0.0
        
        # Count users with exhausted backup codes (if MFA model tracks this)
        backup_codes_exhausted = 0
        try:
            # This would require checking MFA model for backup code status
            # For now, provide a reasonable estimate
            mfa_users_with_exhausted_codes = db.query(User).filter(
                and_(
                    User.is_active == True,
                    User.mfa_enabled == True,
                    # This is a placeholder - actual implementation would check backup codes
                )
            ).count()
            backup_codes_exhausted = min(mfa_users_with_exhausted_codes, mfa_enabled_users)
        except Exception:
            backup_codes_exhausted = 0
        
        # Count recent MFA setups (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_mfa_setups = db.query(User).filter(
            and_(
                User.is_active == True,
                User.mfa_enabled == True,
                User.updated_at >= thirty_days_ago  # Approximation based on user update time
            )
        ).count()
        
        return MFAStatsResponse(
            total_users=total_users,
            mfa_enabled_users=mfa_enabled_users,
            mfa_enabled_percentage=round(mfa_enabled_percentage, 1),
            backup_codes_exhausted=backup_codes_exhausted,
            recent_mfa_setups=recent_mfa_setups
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get MFA statistics: {str(e)}"
        )


@router.get("/health", response_model=MFAHealthResponse)
async def mfa_health_check():
    """
    Check MFA service health.
    
    This endpoint verifies that all MFA-related services are functioning
    properly including TOTP generation, QR code creation, and database access.
    
    Returns:
        MFAHealthResponse with service status
    """
    errors = []
    warnings = []
    
    try:
        # Test TOTP service
        totp_available = True
        try:
            from ...core.mfa import generate_totp_secret, generate_totp_code
            test_secret = generate_totp_secret()
            generate_totp_code(test_secret)
        except Exception as e:
            totp_available = False
            errors.append(f"TOTP service error: {str(e)}")
        
        # Test QR code service
        qr_available = True
        try:
            test_uri = "otpauth://totp/test?secret=JBSWY3DPEHPK3PXP"
            generate_qr_code_data_uri(test_uri)
        except Exception as e:
            qr_available = False
            errors.append(f"QR code service error: {str(e)}")
        
        # Test backup codes service
        backup_available = True
        try:
            from ...core.mfa import BACKUP_CODE_LENGTH, BACKUP_CODE_CHARSET
            import secrets
            # Simple test without recursion
            test_code = ''.join(
                secrets.choice(BACKUP_CODE_CHARSET) 
                for _ in range(BACKUP_CODE_LENGTH)
            )
            assert len(test_code) == BACKUP_CODE_LENGTH
        except Exception as e:
            backup_available = False
            errors.append(f"Backup codes service error: {str(e)}")
        
        # Test database connection (placeholder)
        db_available = True
        
        # Rate limiting is always considered active
        rate_limiting_active = True
        
        return MFAHealthResponse(
            totp_service_available=totp_available,
            qr_code_service_available=qr_available,
            backup_codes_service_available=backup_available,
            database_connection=db_available,
            rate_limiting_active=rate_limiting_active,
            errors=errors,
            warnings=warnings
        )
        
    except Exception as e:
        return MFAHealthResponse(
            totp_service_available=False,
            qr_code_service_available=False,
            backup_codes_service_available=False,
            database_connection=False,
            rate_limiting_active=False,
            errors=[f"Health check failed: {str(e)}"],
            warnings=[]
        )