"""
TDD tests for RBAC (Role-Based Access Control) system.

This test suite comprehensively tests the RBAC system including:
- Role hierarchy and relationships
- Permission inheritance
- Role assignment and management
- Access control middleware
- Dynamic permission evaluation

All tests are written following TDD principles to define the expected
behavior before implementation.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.user import User
# These imports will be created as part of the implementation
from app.models.rbac import Role, Permission, RolePermission, UserRole
from app.core.rbac import (
    RBACService,
    has_permission,
    has_role,
    require_permission,
    require_role,
    get_user_permissions,
    get_user_roles,
    check_hierarchy_access,
    evaluate_dynamic_permission,
    has_temporary_permission,
    has_conditional_permission,
    check_resource_access
)
from app.schemas.rbac import (
    RoleCreate,
    RoleUpdate,
    PermissionCreate,
    UserRoleAssignment
)


class TestRoleHierarchy:
    """Test the role hierarchy system."""
    
    def test_role_hierarchy_levels(self):
        """Test that roles have correct hierarchy levels."""
        # Given: The RBAC system defines a 5-tier role hierarchy
        # When: We check the hierarchy levels
        # Then: Each role should have the correct level
        
        expected_hierarchy = {
            'super_admin': 5,
            'admin': 4,
            'manager': 3,
            'user': 2,
            'viewer': 1
        }
        
        for role_name, expected_level in expected_hierarchy.items():
            role = Role(name=role_name)
            assert role.hierarchy_level == expected_level
    
    def test_super_admin_has_highest_privileges(self):
        """Test that super_admin has access to all resources."""
        # Given: A super_admin user
        super_admin = User(username="superadmin", role="super_admin")
        
        # When: We check access to any resource
        # Then: Super admin should have access to everything
        assert check_hierarchy_access(super_admin, "admin") is True
        assert check_hierarchy_access(super_admin, "manager") is True
        assert check_hierarchy_access(super_admin, "user") is True
        assert check_hierarchy_access(super_admin, "viewer") is True
    
    def test_admin_hierarchy_access(self):
        """Test admin access within hierarchy."""
        # Given: An admin user
        admin = User(username="admin", role="admin")
        
        # When: We check hierarchy access
        # Then: Admin should access lower roles but not super_admin
        assert check_hierarchy_access(admin, "super_admin") is False
        assert check_hierarchy_access(admin, "admin") is True
        assert check_hierarchy_access(admin, "manager") is True
        assert check_hierarchy_access(admin, "user") is True
        assert check_hierarchy_access(admin, "viewer") is True
    
    def test_manager_hierarchy_access(self):
        """Test manager access within hierarchy."""
        # Given: A manager user
        manager = User(username="manager", role="manager")
        
        # When: We check hierarchy access
        # Then: Manager should access only equal or lower roles
        assert check_hierarchy_access(manager, "super_admin") is False
        assert check_hierarchy_access(manager, "admin") is False
        assert check_hierarchy_access(manager, "manager") is True
        assert check_hierarchy_access(manager, "user") is True
        assert check_hierarchy_access(manager, "viewer") is True
    
    def test_user_hierarchy_access(self):
        """Test user access within hierarchy."""
        # Given: A regular user
        user = User(username="user", role="user")
        
        # When: We check hierarchy access
        # Then: User should access only equal or lower roles
        assert check_hierarchy_access(user, "super_admin") is False
        assert check_hierarchy_access(user, "admin") is False
        assert check_hierarchy_access(user, "manager") is False
        assert check_hierarchy_access(user, "user") is True
        assert check_hierarchy_access(user, "viewer") is True
    
    def test_viewer_hierarchy_access(self):
        """Test viewer access within hierarchy."""
        # Given: A viewer user
        viewer = User(username="viewer", role="viewer")
        
        # When: We check hierarchy access
        # Then: Viewer should only access viewer role
        assert check_hierarchy_access(viewer, "super_admin") is False
        assert check_hierarchy_access(viewer, "admin") is False
        assert check_hierarchy_access(viewer, "manager") is False
        assert check_hierarchy_access(viewer, "user") is False
        assert check_hierarchy_access(viewer, "viewer") is True


class TestPermissionInheritance:
    """Test permission inheritance system."""
    
    def test_role_permission_inheritance(self):
        """Test that higher roles inherit permissions from lower roles."""
        # Given: A permission hierarchy where higher roles inherit lower permissions
        viewer_permissions = {"documents:read"}
        user_permissions = {"documents:read", "documents:create"}
        manager_permissions = {"documents:read", "documents:create", "documents:update", "users:read"}
        admin_permissions = {
            "documents:read", "documents:create", "documents:update", "documents:delete",
            "users:read", "users:create", "users:update", "roles:read"
        }
        super_admin_permissions = {
            "documents:read", "documents:create", "documents:update", "documents:delete",
            "users:read", "users:create", "users:update", "users:delete",
            "roles:read", "roles:create", "roles:update", "roles:delete",
            "system:admin"
        }
        
        # When: We get permissions for each role
        viewer = User(username="viewer", role="viewer")
        user = User(username="user", role="user")
        manager = User(username="manager", role="manager")
        admin = User(username="admin", role="admin")
        super_admin = User(username="superadmin", role="super_admin")
        
        # Then: Each role should have inherited permissions
        assert get_user_permissions(viewer) == viewer_permissions
        assert get_user_permissions(user) == user_permissions
        assert get_user_permissions(manager) == manager_permissions
        assert get_user_permissions(admin) == admin_permissions
        assert get_user_permissions(super_admin) == super_admin_permissions
    
    def test_permission_inheritance_transitivity(self):
        """Test that permission inheritance is transitive."""
        # Given: A user with manager role
        manager = User(username="manager", role="manager")
        
        # When: We check for permissions from lower roles
        # Then: Manager should have all viewer and user permissions
        assert has_permission(manager, "documents:read")  # From viewer
        assert has_permission(manager, "documents:create")  # From user
        assert has_permission(manager, "documents:update")  # From manager
        assert has_permission(manager, "users:read")  # From manager
    
    def test_permission_inheritance_does_not_grant_higher_permissions(self):
        """Test that lower roles don't inherit higher role permissions."""
        # Given: A user with user role
        user = User(username="user", role="user")
        
        # When: We check for higher role permissions
        # Then: User should not have manager, admin, or super_admin permissions
        assert has_permission(user, "documents:read") is True  # User permission
        assert has_permission(user, "documents:create") is True  # User permission
        assert has_permission(user, "documents:update") is False  # Manager permission
        assert has_permission(user, "users:read") is False  # Manager permission
        assert has_permission(user, "users:create") is False  # Admin permission
        assert has_permission(user, "system:admin") is False  # Super admin permission


class TestRoleAssignment:
    """Test role assignment and management."""
    
    @pytest.fixture
    def rbac_service(self, mock_db_session):
        """Create RBAC service with mocked database."""
        return RBACService(db=mock_db_session)
    
    @pytest.fixture
    def sample_user(self):
        """Create a sample user for testing."""
        return User(
            id=1,
            username="testuser",
            email="test@example.com",
            role="user",
            is_active=True
        )
    
    def test_assign_role_to_user_success(self, rbac_service, sample_user):
        """Test successful role assignment to user."""
        # Given: A user and a valid role
        role = Role(id=1, name="manager", hierarchy_level=3)
        rbac_service.db.query.return_value.filter.return_value.first.return_value = role
        
        # When: We assign the role to the user
        result = rbac_service.assign_role_to_user(sample_user.id, "manager")
        
        # Then: The role should be assigned successfully
        assert result is True
        rbac_service.db.add.assert_called_once()
        rbac_service.db.commit.assert_called_once()
    
    def test_assign_nonexistent_role_fails(self, rbac_service, sample_user):
        """Test that assigning non-existent role fails."""
        # Given: A user and a non-existent role
        rbac_service.db.query.return_value.filter.return_value.first.return_value = None
        
        # When: We try to assign the non-existent role
        # Then: It should raise an exception
        with pytest.raises(HTTPException) as exc_info:
            rbac_service.assign_role_to_user(sample_user.id, "nonexistent")
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Role not found" in str(exc_info.value.detail)
    
    def test_assign_duplicate_role_fails(self, rbac_service, sample_user):
        """Test that assigning duplicate role fails gracefully."""
        # Given: A user who already has the role
        role = Role(id=1, name="manager", hierarchy_level=3)
        rbac_service.db.query.return_value.filter.return_value.first.return_value = role
        rbac_service.db.add.side_effect = IntegrityError("", "", "")
        
        # When: We try to assign the same role again
        # Then: It should handle the duplicate gracefully
        with pytest.raises(HTTPException) as exc_info:
            rbac_service.assign_role_to_user(sample_user.id, "manager")
        
        assert exc_info.value.status_code == status.HTTP_409_CONFLICT
    
    def test_revoke_role_from_user_success(self, rbac_service, sample_user):
        """Test successful role revocation from user."""
        # Given: A user with an assigned role
        user_role = UserRole(user_id=sample_user.id, role_id=1)
        rbac_service.db.query.return_value.filter.return_value.first.return_value = user_role
        
        # When: We revoke the role from the user
        result = rbac_service.revoke_role_from_user(sample_user.id, "manager")
        
        # Then: The role should be revoked successfully
        assert result is True
        rbac_service.db.delete.assert_called_once_with(user_role)
        rbac_service.db.commit.assert_called_once()
    
    def test_revoke_nonexistent_role_assignment_fails(self, rbac_service, sample_user):
        """Test that revoking non-existent role assignment fails."""
        # Given: A user without the specified role
        rbac_service.db.query.return_value.filter.return_value.first.return_value = None
        
        # When: We try to revoke a role the user doesn't have
        # Then: It should raise an exception
        with pytest.raises(HTTPException) as exc_info:
            rbac_service.revoke_role_from_user(sample_user.id, "manager")
        
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Role assignment not found" in str(exc_info.value.detail)
    
    def test_get_user_roles_success(self, rbac_service, sample_user):
        """Test retrieving user roles successfully."""
        # Given: A user with assigned roles
        roles = [
            Role(id=1, name="user", hierarchy_level=2),
            Role(id=2, name="manager", hierarchy_level=3)
        ]
        mock_query = rbac_service.db.query.return_value
        mock_query.join.return_value.filter.return_value.all.return_value = roles
        
        # When: We get the user's roles
        result = get_user_roles(sample_user.id, rbac_service.db)
        
        # Then: We should get the assigned roles
        assert len(result) == 2
        assert any(role.name == "user" for role in result)
        assert any(role.name == "manager" for role in result)
    
    def test_hierarchy_prevents_invalid_assignments(self, rbac_service):
        """Test that hierarchy rules prevent invalid role assignments."""
        # Given: A manager trying to assign super_admin role
        manager = User(username="manager", role="manager")
        target_user = User(username="target", role="user")
        
        # When: Manager tries to assign super_admin role
        # Then: It should be denied due to hierarchy rules
        with pytest.raises(HTTPException) as exc_info:
            rbac_service.assign_role_to_user(
                target_user.id, 
                "super_admin", 
                assigning_user=manager
            )
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Insufficient privileges" in str(exc_info.value.detail)


class TestAccessControlMiddleware:
    """Test access control middleware functionality."""
    
    @pytest.fixture
    def mock_request(self):
        """Create a mock FastAPI request."""
        mock_request = MagicMock()
        mock_request.state = MagicMock()
        mock_request.url = MagicMock()
        mock_request.url.path = "/api/v1/documents"
        mock_request.method = "GET"
        return mock_request
    
    @pytest.fixture
    def mock_current_user(self):
        """Create a mock current user."""
        return User(
            id=1,
            username="testuser",
            role="user",
            is_active=True
        )
    
    def test_require_permission_decorator_success(self, mock_current_user):
        """Test permission decorator allows access with correct permission."""
        # Given: A user with the required permission
        mock_current_user.role = "manager"
        
        @require_permission("documents:read")
        async def protected_endpoint(current_user: User = mock_current_user):
            return {"message": "Access granted"}
        
        # When: We call the protected endpoint
        # Then: Access should be granted
        result = asyncio.run(protected_endpoint())
        assert result == {"message": "Access granted"}
    
    def test_require_permission_decorator_denial(self, mock_current_user):
        """Test permission decorator denies access without required permission."""
        # Given: A user without the required permission
        mock_current_user.role = "viewer"
        
        @require_permission("documents:create")
        async def protected_endpoint(current_user: User = mock_current_user):
            return {"message": "Access granted"}
        
        # When: We call the protected endpoint
        # Then: Access should be denied
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(protected_endpoint())
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    
    def test_require_role_decorator_success(self, mock_current_user):
        """Test role decorator allows access with correct role."""
        # Given: A user with the required role
        mock_current_user.role = "admin"
        
        @require_role("admin")
        async def protected_endpoint(current_user: User = mock_current_user):
            return {"message": "Access granted"}
        
        # When: We call the protected endpoint
        # Then: Access should be granted
        result = asyncio.run(protected_endpoint())
        assert result == {"message": "Access granted"}
    
    def test_require_role_decorator_denial(self, mock_current_user):
        """Test role decorator denies access without required role."""
        # Given: A user without the required role
        mock_current_user.role = "user"
        
        @require_role("admin")
        async def protected_endpoint(current_user: User = mock_current_user):
            return {"message": "Access granted"}
        
        # When: We call the protected endpoint
        # Then: Access should be denied
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(protected_endpoint())
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    
    def test_multiple_permission_requirements(self, mock_current_user):
        """Test endpoint requiring multiple permissions."""
        # Given: A user with some but not all required permissions
        mock_current_user.role = "user"
        
        @require_permission("documents:read")
        @require_permission("documents:update")
        async def protected_endpoint(current_user: User = mock_current_user):
            return {"message": "Access granted"}
        
        # When: We call the endpoint requiring multiple permissions
        # Then: Access should be denied if user lacks any required permission
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(protected_endpoint())
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    
    def test_resource_level_access_control(self, mock_current_user):
        """Test resource-level access control."""
        # Given: A user and a resource with specific permissions
        document_id = 123
        resource_permissions = {"owner_id": mock_current_user.id}
        
        # When: We check resource-level access
        # Then: Owner should have access, others should not
        assert check_resource_access(
            mock_current_user, 
            "documents", 
            document_id, 
            "read",
            resource_permissions
        ) is True
        
        # Test with different user
        other_user = User(id=2, username="other", role="user")
        assert check_resource_access(
            other_user, 
            "documents", 
            document_id, 
            "read",
            resource_permissions
        ) is False


class TestDynamicPermissionEvaluation:
    """Test dynamic permission evaluation system."""
    
    def test_context_aware_permissions(self):
        """Test permissions that depend on context."""
        # Given: A user and a context-sensitive permission
        user = User(username="user", role="user")
        context = {
            "resource_type": "document",
            "resource_id": 123,
            "owner_id": user.id,
            "department": "engineering"
        }
        
        # When: We evaluate dynamic permissions
        # Then: Context should influence permission decisions
        assert evaluate_dynamic_permission(
            user, 
            "documents:read_own", 
            context
        ) is True
        
        assert evaluate_dynamic_permission(
            user, 
            "documents:read_department", 
            context
        ) is True
        
        # Different department should fail
        context["department"] = "marketing"
        assert evaluate_dynamic_permission(
            user, 
            "documents:read_department", 
            context
        ) is False
    
    def test_time_based_permissions(self):
        """Test permissions that depend on time."""
        # Given: A user with temporary elevated permissions
        user = User(username="user", role="user")
        
        # Mock temporary permission that expires
        with patch('app.core.rbac.get_temporary_permissions') as mock_temp_perms:
            future_time = datetime.utcnow() + timedelta(hours=1)
            mock_temp_perms.return_value = {
                "documents:admin": {"expires_at": future_time}
            }
            
            # When: We check temporary permission before expiry
            # Then: Permission should be granted
            assert has_temporary_permission(user, "documents:admin") is True
        
        # Test expired permission
        with patch('app.core.rbac.get_temporary_permissions') as mock_temp_perms:
            past_time = datetime.utcnow() - timedelta(hours=1)
            mock_temp_perms.return_value = {
                "documents:admin": {"expires_at": past_time}
            }
            
            # When: We check expired temporary permission
            # Then: Permission should be denied
            assert has_temporary_permission(user, "documents:admin") is False
    
    def test_conditional_permissions(self):
        """Test permissions with conditional logic."""
        # Given: A user with conditional permissions
        user = User(username="user", role="user")
        
        # Mock business hours permission
        with patch('app.core.rbac.is_business_hours') as mock_business_hours:
            mock_business_hours.return_value = True
            
            # When: We check permission during business hours
            # Then: Permission should be granted
            assert has_conditional_permission(
                user, 
                "documents:create", 
                conditions=["business_hours"]
            ) is True
        
        # Test outside business hours
        with patch('app.core.rbac.is_business_hours') as mock_business_hours:
            mock_business_hours.return_value = False
            
            # When: We check permission outside business hours
            # Then: Permission should be denied
            assert has_conditional_permission(
                user, 
                "documents:create", 
                conditions=["business_hours"]
            ) is False


class TestRoleManagementAPI:
    """Test role management API functionality."""
    
    @pytest.fixture
    def rbac_service(self, mock_db_session):
        """Create RBAC service with mocked database."""
        return RBACService(db=mock_db_session)
    
    def test_create_role_success(self, rbac_service):
        """Test successful role creation."""
        # Given: Valid role data
        role_data = RoleCreate(
            name="custom_role",
            description="A custom role for testing",
            hierarchy_level=2,
            permissions=["documents:read", "documents:create"]
        )
        
        # When: We create the role
        result = rbac_service.create_role(role_data)
        
        # Then: Role should be created successfully
        rbac_service.db.add.assert_called_once()
        rbac_service.db.commit.assert_called_once()
        assert result.name == "custom_role"
        assert result.hierarchy_level == 2
    
    def test_create_role_duplicate_name_fails(self, rbac_service):
        """Test that creating role with duplicate name fails."""
        # Given: A role name that already exists
        rbac_service.db.add.side_effect = IntegrityError("", "", "")
        
        role_data = RoleCreate(
            name="existing_role",
            description="A role that already exists",
            hierarchy_level=2
        )
        
        # When: We try to create the duplicate role
        # Then: It should raise an exception
        with pytest.raises(HTTPException) as exc_info:
            rbac_service.create_role(role_data)
        
        assert exc_info.value.status_code == status.HTTP_409_CONFLICT
    
    def test_update_role_success(self, rbac_service):
        """Test successful role update."""
        # Given: An existing role and update data
        existing_role = Role(
            id=1, 
            name="test_role", 
            description="Original description",
            hierarchy_level=2
        )
        rbac_service.db.query.return_value.filter.return_value.first.return_value = existing_role
        
        update_data = RoleUpdate(
            description="Updated description",
            permissions=["documents:read", "documents:update"]
        )
        
        # When: We update the role
        result = rbac_service.update_role(1, update_data)
        
        # Then: Role should be updated successfully
        rbac_service.db.commit.assert_called_once()
        assert result.description == "Updated description"
    
    def test_delete_role_success(self, rbac_service):
        """Test successful role deletion."""
        # Given: An existing role
        existing_role = Role(id=1, name="test_role")
        rbac_service.db.query.return_value.filter.return_value.first.return_value = existing_role
        
        # When: We delete the role
        result = rbac_service.delete_role(1)
        
        # Then: Role should be deleted successfully
        rbac_service.db.delete.assert_called_once_with(existing_role)
        rbac_service.db.commit.assert_called_once()
        assert result is True
    
    def test_delete_system_role_fails(self, rbac_service):
        """Test that system roles cannot be deleted."""
        # Given: A system role
        system_role = Role(id=1, name="admin", is_system=True)
        rbac_service.db.query.return_value.filter.return_value.first.return_value = system_role
        
        # When: We try to delete the system role
        # Then: It should raise an exception
        with pytest.raises(HTTPException) as exc_info:
            rbac_service.delete_role(1)
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Cannot delete system role" in str(exc_info.value.detail)


class TestAuditAndCompliance:
    """Test audit and compliance features for RBAC."""
    
    def test_role_change_audit_logging(self, rbac_service):
        """Test that role changes are properly audited."""
        # Given: A role assignment operation
        user_id = 1
        role_name = "manager"
        assigning_user_id = 2
        
        with patch('app.core.rbac.audit_logger') as mock_audit:
            # When: We assign a role
            rbac_service.assign_role_to_user(
                user_id, 
                role_name, 
                assigning_user_id=assigning_user_id
            )
            
            # Then: The action should be audited
            mock_audit.log_role_assignment.assert_called_once_with(
                user_id=user_id,
                role_name=role_name,
                assigning_user_id=assigning_user_id,
                timestamp=pytest.any(datetime)
            )
    
    def test_permission_check_audit_logging(self):
        """Test that permission checks are audited for compliance."""
        # Given: A permission check operation
        user = User(username="user", role="user")
        permission = "documents:read"
        resource_id = 123
        
        with patch('app.core.rbac.audit_logger') as mock_audit:
            # When: We check permissions
            result = has_permission(user, permission, resource_id=resource_id)
            
            # Then: The permission check should be audited
            mock_audit.log_permission_check.assert_called_once_with(
                user_id=user.id,
                permission=permission,
                resource_id=resource_id,
                granted=result,
                timestamp=pytest.any(datetime)
            )
    
    def test_failed_access_attempt_logging(self):
        """Test that failed access attempts are logged for security."""
        # Given: A failed access attempt
        user = User(username="user", role="user")
        
        with patch('app.core.rbac.security_logger') as mock_security:
            # When: Access is denied
            with pytest.raises(HTTPException):
                @require_permission("admin:system")
                async def admin_endpoint(current_user: User = user):
                    return {"message": "Access granted"}
                
                asyncio.run(admin_endpoint())
            
            # Then: The failed attempt should be logged
            mock_security.log_access_denied.assert_called_once()


# Helper functions are now imported from app.core.rbac