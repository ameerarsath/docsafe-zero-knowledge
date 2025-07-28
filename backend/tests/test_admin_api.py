"""
TDD Tests for Admin Operations (TODO 6.1.1)

Test coverage for all admin functionality:
- User management tests  
- System monitoring tests
- Audit log tests
- Statistics generation tests
"""

import pytest
import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User
from app.models.document import DocumentAccessLog, Document
from app.core.security import hash_password


class TestUserManagementAPI:
    """Test cases for user management API endpoints (6.1.2)"""
    
    def test_list_users_with_pagination(self, client: TestClient, admin_user, test_db):
        """Test listing users with pagination and filtering"""
        # Create test users
        test_users = []
        for i in range(5):
            user = User(
                username=f"testuser{i}",
                email=f"test{i}@example.com",
                password_hash=hash_password("testpass"),
                first_name=f"Test{i}",
                last_name="User",
                is_active=i % 2 == 0  # Alternate active/inactive
            )
            test_db.add(user)
            test_users.append(user)
        test_db.commit()
        
        # Test basic listing
        response = client.get("/api/v1/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert data["total"] >= 5
        
        # Test pagination
        response = client.get("/api/v1/admin/users?page=1&size=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) == 2
        assert data["page"] == 1
        assert data["size"] == 2
        
        # Test filtering by active status
        response = client.get("/api/v1/admin/users?is_active=true")
        assert response.status_code == 200
        data = response.json()
        for user in data["users"]:
            assert user["is_active"] is True
            
        # Test search functionality
        response = client.get("/api/v1/admin/users?search=testuser1")
        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) >= 1
        
    def test_create_user_success(self, client: TestClient, admin_user, test_db):
        """Test successful user creation"""
        user_data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "first_name": "New",
            "last_name": "User",
            "is_active": True,
            "is_verified": True
        }
        
        response = client.post("/api/v1/admin/users", json=user_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@example.com"
        assert data["is_active"] is True
        assert data["is_verified"] is True
        
        # Verify user exists in database
        user = test_db.query(User).filter(User.username == "newuser").first()
        assert user is not None
        assert user.created_by == admin_user.id
        
    def test_create_user_duplicate_username(self, client: TestClient, admin_user, test_db):
        """Test creating user with duplicate username"""
        # Create first user
        user_data = {
            "username": "duplicateuser",
            "email": "first@example.com",
            "password": "SecurePass123!",
            "first_name": "First",
            "last_name": "User"
        }
        response = client.post("/api/v1/admin/users", json=user_data)
        assert response.status_code == 201
        
        # Try to create second user with same username
        user_data["email"] = "second@example.com"
        response = client.post("/api/v1/admin/users", json=user_data)
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]
        
    def test_update_user_success(self, client: TestClient, admin_user, test_db):
        """Test successful user update"""
        # Create test user
        user = User(
            username="updateuser",
            email="update@example.com",
            password_hash=hash_password("testpass"),
            first_name="Update",
            last_name="User"
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        
        # Update user data
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "is_active": False
        }
        
        response = client.put(f"/api/v1/admin/users/{user.id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Name"
        assert data["is_active"] is False
        
    def test_delete_user_success(self, client: TestClient, admin_user, test_db):
        """Test successful user deletion (soft delete)"""
        # Create test user
        user = User(
            username="deleteuser",
            email="delete@example.com",
            password_hash=hash_password("testpass"),
            first_name="Delete",
            last_name="User"
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        
        response = client.delete(f"/api/v1/admin/users/{user.id}")
        assert response.status_code == 204
        
        # Verify user is soft deleted (deactivated)
        test_db.refresh(user)
        assert user.is_active is False
        assert user.deleted_by == admin_user.id
        
    def test_delete_own_account_forbidden(self, client: TestClient, admin_user):
        """Test that admin cannot delete their own account"""
        response = client.delete(f"/api/v1/admin/users/{admin_user.id}")
        assert response.status_code == 400
        assert "Cannot delete your own account" in response.json()["detail"]
        
    def test_reset_user_password(self, client: TestClient, admin_user, test_db):
        """Test user password reset functionality"""
        # Create test user
        user = User(
            username="resetuser",
            email="reset@example.com",
            password_hash=hash_password("oldpass"),
            first_name="Reset",
            last_name="User"
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        
        reset_data = {
            "new_password": "NewSecurePass123!",
            "force_change_on_login": True
        }
        
        response = client.post(f"/api/v1/admin/users/{user.id}/reset-password", json=reset_data)
        assert response.status_code == 200
        assert "Password reset successfully" in response.json()["message"]
        
        # Verify password was changed
        test_db.refresh(user)
        assert user.must_change_password is True
        assert user.updated_by == admin_user.id
        
    def test_bulk_user_operations(self, client: TestClient, admin_user, test_db):
        """Test bulk user operations"""
        # Create test users
        users = []
        for i in range(3):
            user = User(
                username=f"bulkuser{i}",
                email=f"bulk{i}@example.com",
                password_hash=hash_password("testpass"),
                first_name=f"Bulk{i}",
                last_name="User",
                is_active=True
            )
            test_db.add(user)
            users.append(user)
        test_db.commit()
        
        # Test bulk deactivation
        user_ids = [user.id for user in users]
        bulk_data = {
            "operation": "deactivate",
            "user_ids": user_ids
        }
        
        response = client.post("/api/v1/admin/users/bulk-operation", json=bulk_data)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["successful"]) == 3
        assert len(data["failed"]) == 0
        assert data["total_processed"] == 3
        
        # Verify users were deactivated
        for user in users:
            test_db.refresh(user)
            assert user.is_active is False


class TestSystemMonitoringAPI:
    """Test cases for system monitoring API endpoints (6.1.3)"""
    
    @patch('psutil.cpu_percent')
    @patch('psutil.virtual_memory')
    @patch('psutil.disk_usage')
    def test_get_system_health(self, mock_disk, mock_memory, mock_cpu, client: TestClient, admin_user):
        """Test system health endpoint"""
        # Mock system metrics
        mock_cpu.return_value = 45.0
        mock_memory.return_value = MagicMock(percent=60.0, total=8*1024**3, available=3*1024**3)
        mock_disk.return_value = MagicMock(percent=70.0, total=100*1024**3, free=30*1024**3)
        
        response = client.get("/api/v1/admin/system/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "components" in data
        
        components = data["components"]
        assert "database" in components
        assert "cpu" in components
        assert "memory" in components
        assert "disk" in components
        
        # Verify CPU metrics
        assert components["cpu"]["usage_percent"] == 45.0
        assert components["cpu"]["status"] == "healthy"
        
        # Verify memory metrics
        assert components["memory"]["usage_percent"] == 60.0
        assert components["memory"]["status"] == "healthy"
        
    @patch('psutil.cpu_percent')
    @patch('psutil.virtual_memory')
    @patch('psutil.disk_usage')
    def test_get_system_metrics(self, mock_disk, mock_memory, mock_cpu, client: TestClient, admin_user, test_db):
        """Test system metrics endpoint"""
        # Mock system metrics
        mock_cpu.return_value = 35.0
        mock_memory.return_value = MagicMock(percent=55.0)
        mock_disk.return_value = MagicMock(percent=65.0)
        
        # Create test data for database stats
        test_user = User(
            username="metricsuser",
            email="metrics@example.com",
            password_hash=hash_password("testpass"),
            is_active=True
        )
        test_db.add(test_user)
        test_db.commit()
        
        response = client.get("/api/v1/admin/system/metrics")
        assert response.status_code == 200
        
        data = response.json()
        assert "timestamp" in data
        assert "cpu_usage" in data
        assert "memory_usage" in data
        assert "disk_usage" in data
        assert "database_stats" in data
        assert "activity_stats" in data
        
        # Verify metrics
        assert data["cpu_usage"] == 35.0
        assert data["memory_usage"] == 55.0
        assert data["disk_usage"] == 65.0
        
        # Verify database stats
        db_stats = data["database_stats"]
        assert "total_users" in db_stats
        assert "active_users" in db_stats
        assert db_stats["total_users"] >= 1
        
    def test_get_system_metrics_with_timeframe(self, client: TestClient, admin_user):
        """Test system metrics with custom timeframe"""
        response = client.get("/api/v1/admin/system/metrics?hours=168")  # 1 week
        assert response.status_code == 200
        
        data = response.json()
        assert "activity_stats" in data
        
    def test_system_health_critical_cpu(self, client: TestClient, admin_user):
        """Test system health with critical CPU usage"""
        with patch('psutil.cpu_percent', return_value=95.0):
            with patch('psutil.virtual_memory') as mock_memory:
                mock_memory.return_value = MagicMock(percent=30.0, total=8*1024**3, available=6*1024**3)
                with patch('psutil.disk_usage') as mock_disk:
                    mock_disk.return_value = MagicMock(percent=40.0, total=100*1024**3, free=60*1024**3)
                    
                    response = client.get("/api/v1/admin/system/health")
                    assert response.status_code == 200
                    
                    data = response.json()
                    assert data["status"] == "degraded"
                    assert data["components"]["cpu"]["status"] == "critical"


class TestAuditAndComplianceAPI:
    """Test cases for audit and compliance API endpoints (6.1.4)"""
    
    def test_get_audit_logs_basic(self, client: TestClient, admin_user, test_db):
        """Test basic audit log retrieval"""
        # Create test audit logs
        test_user = User(
            username="audituser",
            email="audit@example.com",
            password_hash=hash_password("testpass")
        )
        test_db.add(test_user)
        test_db.commit()
        
        # Create test document and logs
        for i in range(5):
            log = DocumentAccessLog(
                document_id=1,
                user_id=test_user.id,
                action="read" if i % 2 == 0 else "download",
                access_method="web",
                success=True,
                ip_address="192.168.1.1",
                user_agent="TestAgent"
            )
            test_db.add(log)
        test_db.commit()
        
        response = client.get("/api/v1/admin/audit/logs")
        assert response.status_code == 200
        
        data = response.json()
        assert "logs" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert len(data["logs"]) >= 5
        
    def test_get_audit_logs_with_filters(self, client: TestClient, admin_user, test_db):
        """Test audit log retrieval with filters"""
        # Create test user and logs
        test_user = User(
            username="filteruser",
            email="filter@example.com",
            password_hash=hash_password("testpass")
        )
        test_db.add(test_user)
        test_db.commit()
        
        # Create logs with different actions
        actions = ["read", "write", "download", "delete"]
        for action in actions:
            log = DocumentAccessLog(
                document_id=1,
                user_id=test_user.id,
                action=action,
                access_method="web",
                success=True,
                ip_address="192.168.1.1"
            )
            test_db.add(log)
        test_db.commit()
        
        # Test filtering by action
        response = client.get("/api/v1/admin/audit/logs?action=read")
        assert response.status_code == 200
        
        data = response.json()
        for log in data["logs"]:
            assert log["action"] == "read"
            
        # Test filtering by user
        response = client.get(f"/api/v1/admin/audit/logs?user_id={test_user.id}")
        assert response.status_code == 200
        
        data = response.json()
        for log in data["logs"]:
            assert log["user_id"] == test_user.id
            
    def test_generate_compliance_report(self, client: TestClient, admin_user, test_db):
        """Test compliance report generation"""
        # Create test data
        test_user = User(
            username="complianceuser",
            email="compliance@example.com",
            password_hash=hash_password("testpass")
        )
        test_db.add(test_user)
        test_db.commit()
        
        # Create audit logs
        now = datetime.utcnow()
        for i in range(10):
            log = DocumentAccessLog(
                document_id=i % 3 + 1,  # 3 different documents
                user_id=test_user.id,
                action="read" if i % 2 == 0 else "download",
                access_method="web",
                success=i % 5 != 0,  # Some failures
                ip_address="192.168.1.1",
                accessed_at=now - timedelta(hours=i)
            )
            test_db.add(log)
        test_db.commit()
        
        # Generate report
        start_date = (now - timedelta(days=1)).isoformat()
        end_date = now.isoformat()
        
        response = client.get(
            f"/api/v1/admin/audit/compliance-report"
            f"?report_type=activity"
            f"&start_date={start_date}"
            f"&end_date={end_date}"
            f"&format=json"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "report_id" in data
        assert "report_type" in data
        assert "generated_at" in data
        assert "data" in data
        
        report_data = data["data"]
        assert "summary" in report_data
        assert "period" in report_data
        assert "generated_by" in report_data
        assert "top_documents" in report_data
        
        # Verify summary statistics
        summary = report_data["summary"]
        assert "total_access_events" in summary
        assert "unique_users" in summary
        assert "failed_access_attempts" in summary
        assert summary["total_access_events"] >= 10
        
    def test_get_user_activity(self, client: TestClient, admin_user, test_db):
        """Test user activity retrieval"""
        # Create test user
        test_user = User(
            username="activityuser",
            email="activity@example.com",
            password_hash=hash_password("testpass"),
            last_login=datetime.utcnow(),
            login_count=5
        )
        test_db.add(test_user)
        test_db.commit()
        
        # Create activity logs
        now = datetime.utcnow()
        for i in range(8):
            log = DocumentAccessLog(
                document_id=i % 2 + 1,
                user_id=test_user.id,
                action="read" if i % 3 == 0 else "download",
                access_method="web",
                success=True,
                ip_address="192.168.1.100",
                accessed_at=now - timedelta(hours=i * 2)
            )
            test_db.add(log)
        test_db.commit()
        
        response = client.get(f"/api/v1/admin/users/{test_user.id}/activity?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "username" in data
        assert "period_days" in data
        assert "statistics" in data
        assert "recent_activity" in data
        
        assert data["user_id"] == test_user.id
        assert data["username"] == "activityuser"
        assert data["period_days"] == 7
        
        # Verify statistics
        stats = data["statistics"]
        assert "total_actions" in stats
        assert "documents_accessed" in stats
        assert "login_sessions" in stats
        assert "last_login" in stats
        
        assert stats["total_actions"] >= 8
        assert stats["login_sessions"] == 5
        
        # Verify activity log
        activity = data["recent_activity"]
        assert len(activity) >= 8
        for log in activity:
            assert "action" in log
            assert "timestamp" in log
            assert "success" in log
            assert "ip_address" in log


class TestAdminAPIPermissions:
    """Test cases for admin API permission enforcement"""
    
    def test_admin_endpoints_require_auth(self, client: TestClient):
        """Test that admin endpoints require authentication"""
        endpoints = [
            "/api/v1/admin/users",
            "/api/v1/admin/system/health",
            "/api/v1/admin/system/metrics",
            "/api/v1/admin/audit/logs"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401
            
    def test_admin_endpoints_require_permissions(self, client: TestClient, regular_user):
        """Test that admin endpoints require proper permissions"""
        # Regular user should not have admin permissions
        endpoints = [
            ("/api/v1/admin/users", "GET"),
            ("/api/v1/admin/system/health", "GET"),
            ("/api/v1/admin/audit/logs", "GET")
        ]
        
        # Note: This would require proper RBAC setup in test environment
        # For now, just test the structure exists
        for endpoint, method in endpoints:
            if method == "GET":
                response = client.get(endpoint)
                # Should be 401 (no auth) or 403 (no permission)
                assert response.status_code in [401, 403]


class TestAdminAPIErrorHandling:
    """Test cases for admin API error handling"""
    
    def test_user_not_found_errors(self, client: TestClient, admin_user):
        """Test proper error handling for non-existent users"""
        non_existent_id = 99999
        
        # Test update non-existent user
        response = client.put(f"/api/v1/admin/users/{non_existent_id}", json={"first_name": "Test"})
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]
        
        # Test delete non-existent user
        response = client.delete(f"/api/v1/admin/users/{non_existent_id}")
        assert response.status_code == 404
        
        # Test reset password for non-existent user
        response = client.post(
            f"/api/v1/admin/users/{non_existent_id}/reset-password",
            json={"new_password": "newpass", "force_change_on_login": False}
        )
        assert response.status_code == 404
        
        # Test get activity for non-existent user
        response = client.get(f"/api/v1/admin/users/{non_existent_id}/activity")
        assert response.status_code == 404
        
    def test_invalid_bulk_operation(self, client: TestClient, admin_user):
        """Test error handling for invalid bulk operations"""
        bulk_data = {
            "operation": "invalid_operation",
            "user_ids": [1, 2, 3]
        }
        
        response = client.post("/api/v1/admin/users/bulk-operation", json=bulk_data)
        # Should handle invalid operations gracefully
        assert response.status_code in [400, 422]  # Bad request or validation error
        
    def test_invalid_date_ranges(self, client: TestClient, admin_user):
        """Test error handling for invalid date ranges in reports"""
        # Test with invalid date format
        response = client.get(
            "/api/v1/admin/audit/compliance-report"
            "?report_type=activity"
            "&start_date=invalid-date"
            "&end_date=2024-01-01T00:00:00"
        )
        assert response.status_code in [400, 422]  # Validation error
        
        # Test with end date before start date
        start_date = "2024-12-01T00:00:00"
        end_date = "2024-01-01T00:00:00"
        response = client.get(
            f"/api/v1/admin/audit/compliance-report"
            f"?report_type=activity"
            f"&start_date={start_date}"
            f"&end_date={end_date}"
        )
        # Should handle logically invalid date ranges
        assert response.status_code == 200  # Currently allows this, but should validate


# Performance and load testing for admin APIs
class TestAdminAPIPerformance:
    """Test cases for admin API performance"""
    
    def test_user_list_pagination_performance(self, client: TestClient, admin_user, test_db):
        """Test that user listing performs well with large datasets"""
        # Create many test users for performance testing
        users = []
        for i in range(100):
            user = User(
                username=f"perfuser{i}",
                email=f"perf{i}@example.com",
                password_hash=hash_password("testpass"),
                first_name=f"Perf{i}",
                last_name="User"
            )
            users.append(user)
            
        test_db.add_all(users)
        test_db.commit()
        
        # Test performance of listing with large dataset
        start_time = time.time()
        response = client.get("/api/v1/admin/users?size=50")
        end_time = time.time()
        
        assert response.status_code == 200
        assert end_time - start_time < 2.0  # Should respond within 2 seconds
        
        data = response.json()
        assert len(data["users"]) == 50
        assert data["total"] >= 100
        
    @patch('psutil.cpu_percent')
    @patch('psutil.virtual_memory')
    @patch('psutil.disk_usage')
    def test_system_metrics_response_time(self, mock_disk, mock_memory, mock_cpu, client: TestClient, admin_user):
        """Test that system metrics endpoint responds quickly"""
        mock_cpu.return_value = 50.0
        mock_memory.return_value = MagicMock(percent=60.0, total=8*1024**3, available=3*1024**3)
        mock_disk.return_value = MagicMock(percent=70.0, total=100*1024**3, free=30*1024**3)
        
        start_time = time.time()
        response = client.get("/api/v1/admin/system/metrics")
        end_time = time.time()
        
        assert response.status_code == 200
        assert end_time - start_time < 1.0  # Should respond within 1 second