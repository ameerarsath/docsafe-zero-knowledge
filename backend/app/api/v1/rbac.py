"""
RBAC API endpoints for role and permission management.

This module provides REST API endpoints for:
- Role CRUD operations
- Permission management
- User role assignments
- Access control verification
- Audit and reporting
"""

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
    if not has_permission(current_user, "roles:read", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to list roles"
        )
    
    # Build query
    query = db.query(Role)
    
    if active_only:
        query = query.filter(Role.is_active == True)
    
    # Apply hierarchy restrictions
    if not has_permission(current_user, "system:admin", db):
        # Users can only see roles at their level or below
        user_hierarchy_level = 3  # Default to manager level if not available
        query = query.filter(Role.hierarchy_level <= user_hierarchy_level)
    
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
        # Convert to basic Role schema objects
        roles_response = [
            RoleSchema(
                id=role.id,
                name=role.name,
                display_name=role.display_name,
                description=role.description,
                hierarchy_level=role.hierarchy_level,
                is_system=role.is_system,
                is_active=role.is_active,
                created_at=role.created_at,
                updated_at=role.updated_at,
                created_by=role.created_by
            ) for role in roles
        ]
    
    return RoleListResponse(
        roles=roles_response,
        total=total,
        page=page,
        size=size,
        has_next=offset + size < total
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
        # Use a default hierarchy level if user doesn't have the method
        user_level = getattr(current_user, 'hierarchy_level', 3)  # Default to manager level
        if role.hierarchy_level > user_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges to view this role"
            )
    
    return role


@router.post("/roles", response_model=RoleSchema, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new role."""
    rbac_service = RBACService(db)
    
    try:
        role = rbac_service.create_role(role_data, current_user)
        return role
    except HTTPException:
        raise
    except Exception as e:
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
    if not has_permission(current_user, "users:read", db):
        # Users can view their own roles
        if current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges to view user roles"
            )
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get user role assignments with role details
    user_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
    
    # Convert to response format
    user_role_responses = []
    for user_role in user_roles:
        # Get the role details
        role = db.query(Role).filter(Role.id == user_role.role_id).first()
        if role:
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
    
    return UserRoleListResponse(
        user_roles=user_role_responses,
        total=len(user_role_responses),
        user_id=user_id,
        username=user.username
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
        rbac_service.assign_role_to_user(
            user_id=user_id,
            role_name=role.name,
            assigning_user=current_user,
            is_primary=assignment.is_primary,
            expires_at=assignment.expires_at
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
        rbac_service.revoke_role_from_user(
            user_id=user_id,
            role_name=role.name,
            revoking_user=current_user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke role: {str(e)}"
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
            print(f"🚫 RBAC DEBUG: User {current_user.id} ({current_user.username}) attempted to access permissions for user {user_id}")
            print(f"🚫 RBAC DEBUG: User permissions: {get_user_permissions(current_user, db)}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only view own permissions"
            )
    
    # Get target user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
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
                detail="Can only view own permission summary"
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


@router.get("/users/me/permissions", response_model=List[str])
async def get_current_user_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get permissions for the current authenticated user."""
    permissions = get_user_permissions(current_user, db)
    print(f"✅ RBAC DEBUG: Returning permissions for current user {current_user.id} ({current_user.username}): {permissions}")
    return permissions


# Health check endpoint
@router.get("/health")
async def rbac_health_check(db: Session = Depends(get_db)):
    """Check RBAC system health."""
    try:
        # Check database connectivity
        role_count = db.query(Role).count()
        permission_count = db.query(Permission).count()
        
        return {
            "status": "healthy",
            "roles": role_count,
            "permissions": permission_count,
            "timestamp": "2024-01-01T00:00:00Z"  # Would use actual timestamp
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"RBAC system unhealthy: {str(e)}"
        )