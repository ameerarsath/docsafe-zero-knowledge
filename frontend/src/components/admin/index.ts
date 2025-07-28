/**
 * Admin Components Index
 * 
 * Exports all admin-related components for SecureVault admin interface:
 * - AdminDashboardOverview: Main admin dashboard with system overview
 * - UserManagementInterface: User CRUD operations and management
 * - SystemMonitoringInterface: Real-time system monitoring and health
 * - AuditComplianceInterface: Audit logs and compliance reporting
 */

export { default as AdminDashboardOverview } from './AdminDashboardOverview';
export { default as UserManagementInterface } from './UserManagementInterface';
export { default as SystemMonitoringInterface } from './SystemMonitoringInterface';
export { default as AuditComplianceInterface } from './AuditComplianceInterface';

// Re-export admin service for convenience
export { adminService } from '../../services/adminService';

// Type exports
export type {
  User,
  UserCreate,
  UserUpdate,
  SystemHealth,
  SystemMetrics,
  AuditLog,
  ComplianceReport,
  UserActivity,
  BulkOperation,
  PasswordResetRequest
} from '../../services/adminService';