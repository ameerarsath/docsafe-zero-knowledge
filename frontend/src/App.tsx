/**
 * Main App Component for SecureVault Frontend
 * 
 * Root application component with routing, authentication context,
 * and global session management.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SessionTimeoutManager } from './components/auth/SessionTimeoutWarning';

// Import auth checker for debugging
import './utils/authChecker';

// Pages
import LoginPage from './pages/LoginPage';
import ZeroKnowledgeLoginPage from './pages/ZeroKnowledgeLoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ModernDashboardPage from './pages/ModernDashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import TrashPage from './pages/TrashPage';
import MFASettingsPageWrapper from './pages/MFASettingsPageWrapper';

// RBAC Components
import { PermissionProvider } from './components/rbac/RoleBasedComponent';
import RBACAdminPage from './pages/RBACAdminPage';

// RBAC Pages
import RoleManagementPage from './pages/rbac/RoleManagementPage';
import UserAssignmentsPage from './pages/rbac/UserAssignmentsPage';
import PermissionMatrixPage from './pages/rbac/PermissionMatrixPage';
import PermissionMatrixPageDebug from './pages/rbac/PermissionMatrixPageDebug';
import PermissionMatrixPageFixed from './pages/rbac/PermissionMatrixPageFixed';
import RoleHierarchyPage from './pages/rbac/RoleHierarchyPage';
import AuditTrailPage from './pages/rbac/AuditTrailPage';

// Admin Pages
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminMonitoringPage from './pages/AdminMonitoringPage';
import AdminAuditPage from './pages/AdminAuditPage';

// Security Pages
import SecurityDashboardPage from './pages/SecurityDashboardPage';
import SecurityHeadersPage from './pages/SecurityHeadersPage';
import SecurityMonitoringPage from './pages/SecurityMonitoringPage';
import KeyManagementPage from './pages/KeyManagementPage';
import SecurityDashboardTest from './components/security/SecurityDashboardTest';

// Shared Document Page
import SharedDocumentPage from './pages/SharedDocumentPage';

// Styles
import './App.css';

function App() {
  return (
    <Router future={{ 
      v7_startTransition: true,
      v7_relativeSplatPath: true 
    }}>
      <AuthProvider>
        <PermissionProvider>
          <div className="App">
            <SessionTimeoutManager />
            {/* Main application routes */}
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<ZeroKnowledgeLoginPage />} />
            <Route path="/login/legacy" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Shared document access (public) */}
            <Route path="/share/:shareToken" element={<SharedDocumentPage />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<ModernDashboardPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/trash" element={<TrashPage />} />
            <Route path="/settings/mfa" element={<MFASettingsPageWrapper />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/monitoring" element={<AdminMonitoringPage />} />
            <Route path="/admin/audit" element={<AdminAuditPage />} />
            
            {/* RBAC Admin Routes */}
            <Route path="/admin/rbac" element={<RBACAdminPage />} />
            <Route path="/admin/rbac/roles" element={<RoleManagementPage />} />
            <Route path="/admin/rbac/assignments" element={<UserAssignmentsPage />} />
            <Route path="/admin/rbac/matrix" element={<PermissionMatrixPageFixed />} />
            <Route path="/admin/rbac/matrix-debug" element={<PermissionMatrixPageDebug />} />
            <Route path="/admin/rbac/matrix-original" element={<PermissionMatrixPage />} />
            <Route path="/admin/rbac/hierarchy" element={<RoleHierarchyPage />} />
            <Route path="/admin/rbac/audit-trail" element={<AuditTrailPage />} />
            
            {/* Security Routes */}
            <Route path="/security" element={<SecurityDashboardPage />} />
            <Route path="/security/dashboard" element={<SecurityDashboardPage />} />
            <Route path="/security/headers" element={<SecurityHeadersPage />} />
            <Route path="/security/monitoring" element={<SecurityMonitoringPage />} />
            <Route path="/security/keys" element={<KeyManagementPage />} />
            <Route path="/security/test" element={<SecurityDashboardTest />} />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* 404 handler */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
        </PermissionProvider>
      </AuthProvider>
    </Router>
  );
}

/**
 * 404 Not Found Page
 */
function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              404 - Page Not Found
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              The page you're looking for doesn't exist.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;