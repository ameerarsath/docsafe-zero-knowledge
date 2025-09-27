"""
RBAC API endpoints for role and permission management.

This module provides REST API endpoints for:
- Role CRUD operations
- Permission management
- User role assignments
- Access control verification
- Audit and reporting
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from ...core.database import get_db
from ...core.security import get_current_user
from ...core.rbac import (
    RBACService, 
    require_permission, 
    require_role,
    has_permission,
    get_user_permissions,
    get_user_roles as get_user_roles_sync
)
from ...models.user import User
from ...models.rbac import Role, Permission, UserRole, ResourcePermission, RolePermission
from ...services.role_sync_service import RoleSyncService
from ...schemas.rbac import (
    Role as RoleSchema,
    RoleCreate,
    RoleUpdate,
    RoleWithStats,
    RoleListResponse,
    Permission as PermissionSchema,
    PermissionCreate,
    PermissionUpdate,
    PermissionListResponse,
    UserRoleAssignment,
    UserRoleAssignmentResponse,
    UserRoleListResponse,
    ResourcePermission as ResourcePermissionSchema,
    ResourcePermissionCreate,
    ResourcePermissionUpdate,
    BulkRoleAssignment,
    BulkRoleAssignmentResponse,
    PermissionCheckRequest,
    PermissionCheckResponse,
    UserPermissionSummary,
    SystemPermissionMatrix,
    RBACError
)


router = APIRouter(prefix="/rbac", tags=["RBAC"])
logger = logging.getLogger(__name__)


# Role Management Endpoints
@router.get("/roles", response_model=RoleListResponse)
async def list_roles(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    include_stats: bool = Query(False, description="Include usage statistics"),
    active_only: bool = Query(True, description="Only active roles"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all roles with optional filtering and pagination."""
    try:
        logger.info(f"Listing roles: page={page}, size={size}, include_stats={include_stats}, active_only={active_only}")
        logger.info(f"Current user: {current_user.id} ({current_user.username})")
        
        if not has_permission(current_user, "roles:read", db):
            logger.warning(f"User {current_user.id} lacks roles:read permission")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges to list roles"
            )
        
        # Build query
        query = db.query(Role)
        logger.debug("Base query created")
        
        if active_only:
            query = query.filter(Role.is_active == True)
            logger.debug("Applied active_only filter")
        
        # Apply hierarchy restrictions with better error handling
        try:
            if not has_permission(current_user, "system:admin", db):
                logger.debug("User is not system admin, applying hierarchy restrictions")
                # Users can only see roles at their level or below
                if hasattr(current_user, 'get_highest_hierarchy_level'):
                    user_hierarchy_level = current_user.get_highest_hierarchy_level(db)
                    logger.debug(f"User hierarchy level: {user_hierarchy_level}")
                    if user_hierarchy_level == 0:  # If no roles assigned, default to manager level
                        user_hierarchy_level = 3
                        logger.debug("No roles assigned, defaulting to hierarchy level 3")
                    query = query.filter(Role.hierarchy_level <= user_hierarchy_level)
                    logger.debug(f"Applied hierarchy filter: <= {user_hierarchy_level}")
                else:
                    logger.warning("User model missing get_highest_hierarchy_level method")
                    query = query.filter(Role.hierarchy_level <= 3)
            else:
                logger.debug("User is system admin, no hierarchy restrictions")
        except Exception as hierarchy_error:
            logger.error(f"Error in hierarchy check: {hierarchy_error}", exc_info=True)
            # Fallback: allow manager level access
            query = query.filter(Role.hierarchy_level <= 3)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        roles = query.order_by(desc(Role.hierarchy_level), Role.name).offset(offset).limit(size).all()
        
        # Convert roles to appropriate schema format
        if include_stats:
            roles_with_stats = []
            for role in roles:
                user_count = db.query(UserRole).filter(
                    and_(UserRole.role_id == role.id, UserRole.is_active == True)
                ).count()
                
                permission_count = db.query(RolePermission).filter(
                    RolePermission.role_id == role.id
                ).count()
                
                roles_with_stats.append(RoleWithStats(
                    id=role.id,
                    name=role.name,
                    display_name=role.display_name,
                    description=role.description,
                    hierarchy_level=role.hierarchy_level,
                    is_system=role.is_system,
                    is_active=role.is_active,
                    created_at=role.created_at,
                    updated_at=role.updated_at,
                    created_by=role.created_by,
                    user_count=user_count,
                    permission_count=permission_count
                ))
            
            roles_response = roles_with_stats
        else:
            # Convert to RoleWithStats objects (required by RoleListResponse)
            roles_response = []
            for role in roles:
                # Calculate basic statistics
                user_count = db.query(UserRole).filter(
                    UserRole.role_id == role.id,
                    UserRole.is_active == True
                ).count()
                
                permission_count = db.query(RolePermission).filter(
                    RolePermission.role_id == role.id
                ).count()
                
                roles_response.append(RoleWithStats(
                    id=role.id,
                    name=role.name,
                    display_name=role.display_name,
                    description=role.description,
                    hierarchy_level=role.hierarchy_level,
                    is_system=role.is_system,
                    is_active=role.is_active,
                    created_at=role.created_at,
                    updated_at=role.updated_at,
                    created_by=role.created_by,
                    user_count=user_count,
                    permission_count=permission_count
                ))
        
        return RoleListResponse(
            roles=roles_response,
            total=total,
            page=page,
            size=size,
            has_next=offset + size < total
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list roles: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list roles: {str(e)}"
        )


@router.get("/roles/{role_id}", response_model=RoleSchema)
async def get_role(
    role_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific role by ID."""
    if not has_permission(current_user, "roles:read", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to view roles"
        )
    
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Check hierarchy access
    if not has_permission(current_user, "system:admin", db):
        # Get user's actual hierarchy level
        user_level = current_user.get_highest_hierarchy_level(db)
        if user_level == 0:  # If no roles assigned, default to manager level
            user_level = 3
        if role.hierarchy_level > user_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges to view this role"
            )
    
    # Load permissions for this role
    role_permissions = db.query(RolePermission).filter(
        RolePermission.role_id == role.id
    ).all()
    
    permission_ids = [rp.permission_id for rp in role_permissions]
    permissions = db.query(Permission).filter(
        Permission.id.in_(permission_ids)
    ).all() if permission_ids else []
    
    # Create role response with permissions
    role_dict = {
        'id': role.id,
        'name': role.name,
        'display_name': role.display_name,
        'description': role.description,
        'hierarchy_level': role.hierarchy_level,
        'is_system': role.is_system,
        'is_active': role.is_active,
        'created_at': role.created_at,
        'updated_at': role.updated_at,
        'created_by': role.created_by,
        'permissions': permissions
    }
    
    return RoleSchema(**role_dict)


@router.post("/roles", response_model=RoleSchema, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new role."""
    import logging
    logger = logging.getLogger(__name__)

    logger.info(f"[RBAC] Role creation attempt by user {current_user.id} ({current_user.username})")
    logger.info(f"[RBAC] Role data: name='{role_data.name}', display_name='{role_data.display_name}', hierarchy_level={role_data.hierarchy_level}")

    # Check user permissions using the standard permission checking function
    has_create_permission = has_permission(current_user, "roles:create", db)
    logger.info(f"[RBAC] User has 'roles:create' permission: {has_create_permission}")

    if not has_create_permission:
        logger.warning(f"[RBAC] Access denied: user {current_user.id} lacks 'roles:create' permission")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to create roles"
        )

    rbac_service = RBACService(db)

    try:
        logger.info(f"[RBAC] Calling RBACService.create_role()")
        role = rbac_service.create_role(role_data, current_user)
        logger.info(f"[RBAC] Role created successfully: id={role.id}, name='{role.name}'")
        return role
    except HTTPException as he:
        logger.error(f"[RBAC] HTTPException during role creation: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"[RBAC] Unexpected error during role creation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create role: {str(e)}"
        )


@router.put("/roles/{role_id}", response_model=RoleSchema)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing role."""
    rbac_service = RBACService(db)
    
    try:
        role = rbac_service.update_role(role_id, role_data, current_user)
        return role
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update role: {str(e)}"
        )


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a role."""
    rbac_service = RBACService(db)
    
    try:
        rbac_service.delete_role(role_id, current_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete role: {str(e)}"
        )


# Permission Management Endpoints
@router.get("/permissions", response_model=PermissionListResponse)
async def list_permissions(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=200, description="Page size"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all permissions with optional filtering."""
    try:
        if not has_permission(current_user, "roles:read", db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges to list permissions"
            )
        
        # Build query
        query = db.query(Permission)
        
        if resource_type:
            query = query.filter(Permission.resource_type == resource_type)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        permissions = query.order_by(Permission.resource_type, Permission.name).offset(offset).limit(size).all()
        
        return PermissionListResponse(
            permissions=permissions,
            total=total,
            page=page,
            size=size,
            has_next=offset + size < total
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list permissions: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list permissions: {str(e)}"
        )


@router.post("/permissions", response_model=PermissionSchema, status_code=status.HTTP_201_CREATED)
async def create_permission(
    permission_data: PermissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new permission."""
    if not has_permission(current_user, "roles:create", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to create permissions"
        )
    
    try:
        # Check if permission already exists
        existing = db.query(Permission).filter(Permission.name == permission_data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Permission already exists"
            )
        
        permission = Permission(**permission_data.dict())
        db.add(permission)
        db.commit()
        db.refresh(permission)
        
        return permission
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create permission: {str(e)}"
        )


# User Role Assignment Endpoints
@router.get("/users/{user_id}/roles", response_model=UserRoleListResponse)
async def get_user_roles(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all roles assigned to a user."""
    try:
        logger.info(f"Getting roles for user {user_id}, requested by user {current_user.id} ({current_user.username})")
        
        if not has_permission(current_user, "users:read", db):
            # Users can view their own roles
            if current_user.id != user_id:
                logger.warning(f"User {current_user.id} attempted to view roles for user {user_id} without permission")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient privileges to view user roles"
                )
        
        # Check if user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"User {user_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"Found user {user.username} (ID: {user_id})")
        
        # Get user role assignments with role details
        user_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
        logger.info(f"Found {len(user_roles)} role assignments for user {user_id}")
        
        # Convert to response format
        user_role_responses = []
        for user_role in user_roles:
            try:
                # Get the role details
                role = db.query(Role).filter(Role.id == user_role.role_id).first()
                if role:
                    logger.debug(f"Processing role assignment: user {user_role.user_id}, role {role.name} (ID: {role.id})")
                    user_role_responses.append(UserRoleAssignmentResponse(
                        user_id=user_role.user_id,
                        role_id=user_role.role_id,
                        is_primary=user_role.is_primary,
                        expires_at=user_role.expires_at,
                        assigned_at=user_role.assigned_at,
                        assigned_by=user_role.assigned_by,
                        is_active=user_role.is_active,
                        role=role
                    ))
                else:
                    logger.error(f"Role {user_role.role_id} not found for user role assignment {user_role.id}")
            except Exception as e:
                logger.error(f"Error processing user role {user_role.id}: {e}", exc_info=True)
                # Continue processing other roles instead of failing completely
                continue
        
        logger.info(f"Successfully processed {len(user_role_responses)} role assignments")
        
        return UserRoleListResponse(
            user_roles=user_role_responses,
            total=len(user_role_responses),
            user_id=user_id,
            username=user.username
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user roles for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user roles: {str(e)}"
        )


@router.post("/users/{user_id}/roles", response_model=UserRoleAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_role_to_user(
    user_id: int,
    assignment: UserRoleAssignment,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a role to a user."""
    rbac_service = RBACService(db)
    
    # Get role name
    role = db.query(Role).filter(Role.id == assignment.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    try:
        # Use the new role sync service for automatic synchronization
        success = RoleSyncService.assign_role_with_sync(
            db=db,
            user_id=user_id,
            role_name=role.name,
            assigned_by=current_user.id,
            is_primary=assignment.is_primary
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to assign role"
            )

        # Return the assignment
        user_role = db.query(UserRole).filter(
            and_(UserRole.user_id == user_id, UserRole.role_id == assignment.role_id)
        ).first()

        return user_role
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign role: {str(e)}"
        )


@router.delete("/users/{user_id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_role_from_user(
    user_id: int,
    role_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke a role from a user."""
    rbac_service = RBACService(db)
    
    # Get role name
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    try:
        # Use the new role sync service for automatic synchronization
        success = RoleSyncService.remove_role_with_sync(
            db=db,
            user_id=user_id,
            role_name=role.name
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to revoke role"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke role: {str(e)}"
        )


@router.put("/users/{user_id}/roles/{role_id}", response_model=UserRoleAssignmentResponse)
async def replace_user_role(
    user_id: int,
    role_id: int,
    assignment: UserRoleAssignment,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Atomically replace a user's role with a new role.
    
    This ensures the single role policy by deactivating the old role
    and assigning the new role in a single transaction.
    """
    if not has_permission(current_user, "users:update", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges for role replacement"
        )
    
    # Validate target user exists
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate new role exists
    new_role = db.query(Role).filter(Role.id == assignment.role_id).first()
    if not new_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="New role not found"
        )
    
    # Validate old role exists (if provided)
    old_role = db.query(Role).filter(Role.id == role_id).first()
    if not old_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Current role not found"
        )
    
    try:
        # Begin transaction for atomic role replacement
        logger.info(f"Replacing role {old_role.name} with {new_role.name} for user {user_id}")
        
        # 1. DELETE ALL existing roles for the user (single role policy)
        existing_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
        for existing_role in existing_roles:
            db.delete(existing_role)
        
        # 2. Create new role assignment
        new_assignment = UserRole(
            user_id=user_id,
            role_id=assignment.role_id,
            is_primary=True,  # Always primary for single role policy
            is_active=True,
            assigned_by=current_user.id,
            expires_at=assignment.expires_at
        )
        db.add(new_assignment)
        
        # 3. Commit the transaction
        db.commit()
        db.refresh(new_assignment)
        
        logger.info(f"Successfully replaced role for user {user_id}")
        
        # Return the new assignment
        return UserRoleAssignmentResponse(
            user_id=new_assignment.user_id,
            role_id=new_assignment.role_id,
            is_primary=new_assignment.is_primary,
            expires_at=new_assignment.expires_at,
            assigned_at=new_assignment.assigned_at,
            assigned_by=new_assignment.assigned_by,
            is_active=new_assignment.is_active,
            role=new_role
        )
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to replace role for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to replace role: {str(e)}"
        )


@router.post("/users/bulk-assign-roles", response_model=BulkRoleAssignmentResponse)
async def bulk_assign_roles(
    assignment: BulkRoleAssignment,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a role to multiple users."""
    if not has_permission(current_user, "users:update", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges for bulk role assignment"
        )
    
    rbac_service = RBACService(db)
    successful = []
    failed = []
    
    for user_id in assignment.user_ids:
        try:
            rbac_service.assign_role_to_user(
                user_id=user_id,
                role_name=assignment.role_name,
                assigning_user=current_user,
                is_primary=assignment.is_primary,
                expires_at=assignment.expires_at
            )
            successful.append(user_id)
            
        except Exception as e:
            failed.append({
                "user_id": user_id,
                "error": str(e)
            })
    
    return BulkRoleAssignmentResponse(
        successful=successful,
        failed=failed,
        total_processed=len(assignment.user_ids)
    )


# Permission Checking Endpoints
@router.post("/check-permission", response_model=PermissionCheckResponse)
async def check_permission(
    request: PermissionCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a user has a specific permission."""
    # Only allow checking own permissions unless user has admin privileges
    if request.user_id != current_user.id:
        if not has_permission(current_user, "users:read", db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only check own permissions"
            )
    
    # Get target user
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permission
    granted = has_permission(
        user=user,
        permission=request.permission,
        db=db,
        resource_type=request.resource_type,
        resource_id=request.resource_id
    )
    
    # Determine reason and source
    if granted:
        user_permissions = get_user_permissions(user, db)
        if request.permission in user_permissions:
            reason = "Permission granted through role assignment"
            source = "role"
        else:
            reason = "Permission granted through resource access"
            source = "resource"
    else:
        reason = "Permission denied: insufficient privileges"
        source = "none"
    
    return PermissionCheckResponse(
        granted=granted,
        reason=reason,
        source=source
    )


# Note: This route must come BEFORE /users/{user_id}/permissions to avoid route conflicts
@router.get("/users/me/permissions", response_model=List[str])
async def get_current_user_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get permissions for the current authenticated user."""
    try:
        permissions = get_user_permissions(current_user, db)
        print(f"[RBAC] DEBUG: Returning permissions for current user {current_user.id} ({current_user.username}): {permissions}")

        # Ensure we return a proper list to avoid content-length issues
        if permissions is None:
            permissions = []
        elif not isinstance(permissions, list):
            permissions = list(permissions)

        return permissions
    except Exception as e:
        logging.error(f"Error getting user permissions: {e}")
        # Return empty list on error to avoid content-length mismatch
        return []


@router.get("/users/{user_id}/permissions", response_model=List[str])
async def get_user_permissions_endpoint(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all permissions for a user."""
    # Always allow users to view their own permissions
    # Only require admin permissions for viewing other users' permissions
    if user_id != current_user.id:
        if not has_permission(current_user, "users:read", db):
            # Provide better error logging for debugging
            print(f"[RBAC] DEBUG: User {current_user.id} ({current_user.username}) attempted to access permissions for user {user_id}")
            print(f"[RBAC] DEBUG: User permissions: {get_user_permissions(current_user, db)}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Access denied",
                    "message": f"Access denied: You can only view your own permissions. Missing permission: users:read"
                }
            )

    # Get target user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "User not found",
                "message": f"User with ID {user_id} does not exist"
            }
        )

    permissions = get_user_permissions(user, db)
    return sorted(list(permissions))


@router.get("/users/{user_id}/permission-summary", response_model=UserPermissionSummary)
async def get_user_permission_summary(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get permission summary for a user."""
    if user_id != current_user.id:
        if not has_permission(current_user, "users:read", db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Access denied",
                    "message": f"Access denied: You can only view your own permission summary. Missing permission: users:read"
                }
            )
    
    # Get target user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get user roles and permissions
    roles = get_user_roles_sync(user_id, db)
    permissions = get_user_permissions(user, db)
    primary_role_obj = user.get_primary_role(db)
    
    return UserPermissionSummary(
        user_id=user_id,
        username=user.username,
        primary_role=primary_role_obj.name if primary_role_obj else None,
        all_roles=[role.name for role in roles],
        permission_count=len(permissions),
        highest_hierarchy_level=user.get_highest_hierarchy_level(db),
        last_login=user.last_login
    )


# System-wide reporting endpoints
@router.get("/system/permission-matrix", response_model=SystemPermissionMatrix)
async def get_system_permission_matrix(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get system-wide permission matrix."""
    if not has_permission(current_user, "system:admin", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to view system permission matrix"
        )
    
    # Get all roles and permissions
    roles = db.query(Role).filter(Role.is_active == True).all()
    permissions = db.query(Permission).all()
    
    # Build permission matrix
    matrix = {}
    hierarchy = {}
    
    for role in roles:
        role_permissions = [perm.name for perm in role.permissions]
        matrix[role.name] = role_permissions
        hierarchy[role.name] = role.hierarchy_level
    
    return SystemPermissionMatrix(
        roles=roles,
        permissions=permissions,
        matrix=matrix,
        hierarchy=hierarchy
    )


# Resource Permission Endpoints (for document-level access control)
@router.post("/resource-permissions", response_model=ResourcePermissionSchema, status_code=status.HTTP_201_CREATED)
async def create_resource_permission(
    permission_data: ResourcePermissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a resource-level permission."""
    # Check if user can manage this resource type
    manage_permission = f"{permission_data.resource_type}:admin"
    if not has_permission(current_user, manage_permission, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient privileges to manage {permission_data.resource_type} permissions"
        )
    
    try:
        resource_permission = ResourcePermission(**permission_data.dict())
        resource_permission.granted_by = current_user.id
        
        db.add(resource_permission)
        db.commit()
        db.refresh(resource_permission)
        
        return resource_permission
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create resource permission: {str(e)}"
        )


@router.get("/resource-permissions/{resource_type}/{resource_id}")
async def get_resource_permissions(
    resource_type: str,
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all permissions for a specific resource."""
    # Check if user can view this resource
    read_permission = f"{resource_type}:read"
    if not has_permission(current_user, read_permission, db, resource_type, resource_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to view resource permissions"
        )
    
    permissions = db.query(ResourcePermission).filter(
        and_(
            ResourcePermission.resource_type == resource_type,
            ResourcePermission.resource_id == resource_id
        )
    ).all()
    
    return permissions



# Permission Matrix Endpoint  
@router.get("/matrix", response_model=SystemPermissionMatrix)
async def get_permission_matrix(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the complete permission matrix showing role-permission mappings."""
    try:
        # Check permissions
        if not has_permission(current_user, "system:read", db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges to view permission matrix"
            )
        
        # Get all roles
        roles = db.query(Role).filter(Role.is_active == True).all()
        
        # Get all permissions  
        permissions = db.query(Permission).all()
        
        # Build the matrix
        matrix = {}
        hierarchy = {}
        
        for role in roles:
            # Get role permissions
            role_permissions = db.query(RolePermission).filter(
                RolePermission.role_id == role.id
            ).all()
            
            permission_names = []
            for rp in role_permissions:
                permission = db.query(Permission).filter(
                    Permission.id == rp.permission_id
                ).first()
                if permission:
                    permission_names.append(permission.name)
            
            matrix[role.name] = permission_names
            hierarchy[role.name] = role.hierarchy_level
        
        return SystemPermissionMatrix(
            roles=roles,
            permissions=permissions,
            matrix=matrix,
            hierarchy=hierarchy
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get permission matrix: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve permission matrix: {str(e)}"
        )


# Role Synchronization Endpoints
@router.post("/users/{user_id}/sync-role")
async def sync_user_role(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Synchronize a user's role field with their active role assignments."""
    try:
        if not has_permission(current_user, "users:update", db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges to sync user roles"
            )

        # Check if target user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Sync the role
        new_role = RoleSyncService.sync_user_role(db, user_id)
        db.commit()

        return {
            "message": "Role synchronized successfully",
            "user_id": user_id,
            "username": user.username,
            "new_role": new_role,
            "synced_by": current_user.username
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync user role: {str(e)}"
        )


@router.post("/sync-all-roles")
async def sync_all_user_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Synchronize all users' role fields with their active role assignments."""
    try:
        if not has_permission(current_user, "system:admin", db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges to sync all user roles"
            )

        sync_count = RoleSyncService.sync_all_users(db)
        db.commit()

        return {
            "message": f"Synchronized roles for {sync_count} users",
            "synced_count": sync_count,
            "synced_by": current_user.username
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync all user roles: {str(e)}"
        )


@router.get("/users/{user_id}/role-validation")
async def validate_user_role(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate that a user's role field matches their role assignments."""
    try:
        if not has_permission(current_user, "users:read", db):
            # Users can validate their own roles
            if current_user.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient privileges to validate user role"
                )

        validation_result = RoleSyncService.validate_user_role_consistency(db, user_id)

        return {
            "validation": validation_result,
            "recommendations": {
                "auto_sync_available": True,
                "sync_endpoint": f"/api/v1/rbac/users/{user_id}/sync-role"
            } if not validation_result.get('consistent', True) else None
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate user role: {str(e)}"
        )


# Health check endpoint
@router.get("/health")
async def rbac_health_check(db: Session = Depends(get_db)):
    """Check RBAC system health."""
    try:
        # Check database connectivity
        role_count = db.query(Role).count()
        permission_count = db.query(Permission).count()

        # Check for role inconsistencies
        inconsistent_users = db.execute(text("""
            SELECT COUNT(DISTINCT u.id) as count
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.is_active = true
              AND (
                (ur.role_id IS NOT NULL AND u.role != r.name) OR
                (ur.role_id IS NULL AND u.role != 'viewer')
              )
        """)).fetchone()

        return {
            "status": "healthy",
            "roles": role_count,
            "permissions": permission_count,
            "role_inconsistencies": inconsistent_users.count if inconsistent_users else 0,
            "auto_sync_enabled": True,
            "timestamp": "2024-01-01T00:00:00Z"  # Would use actual timestamp
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"RBAC system unhealthy: {str(e)}"
        )