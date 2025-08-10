/**
 * Dashboard Page Component for SecureVault Frontend
 * 
 * Main dashboard for authenticated users with navigation and user info.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RequireAuth } from '../components/auth/ProtectedRoute';
import { User, LogOut, Settings, FileText, Users, Shield, BarChart3, Key } from 'lucide-react';
import DashboardStats from '../components/dashboard/DashboardStats';
import { documentEncryptionService } from '../services/documentEncryption';

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const { user, logout, getRoleName } = useAuth();
  
  // Check encryption status
  const hasZeroKnowledgeKey = documentEncryptionService.hasMasterKey();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">SecureVault</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{user?.username}</p>
                    <p className="text-gray-500">{user?.role && getRoleName(user.role)}</p>
                  </div>
                </div>
                
                {/* Encryption Status Indicator */}
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  hasZeroKnowledgeKey ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  <Key className="h-3 w-3 mr-1" />
                  {hasZeroKnowledgeKey ? 'Zero-Knowledge Active' : 'No Master Key'}
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Welcome back, {user?.username}!
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                You're logged in as {user?.role && getRoleName(user.role)}.
              </p>
              
              {/* User Status Indicators */}
              <div className="flex flex-wrap gap-2">
                {user?.mfa_enabled ? (
                  <Link 
                    to="/settings/mfa"
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    MFA Enabled
                  </Link>
                ) : (
                  <Link 
                    to="/settings/mfa"
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    MFA Disabled
                  </Link>
                )}
                
                {user?.must_change_password && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Password Change Required
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Documents */}
            <Link to="/documents" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Documents
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Manage Files & Folders
                      </dd>
                    </dl>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* Settings */}
            <Link to="/settings/mfa" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Settings className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        MFA Settings
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Manage Two-Factor Auth
                      </dd>
                    </dl>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* RBAC Management (if admin or super_admin) */}
            {(user?.is_admin || ['super_admin', 'admin', '5', '4'].includes(user?.role || '')) && (
              <Link to="/admin" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Shield className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          RBAC Management
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          Roles & Permissions
                        </dd>
                      </dl>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>

          {/* Dashboard Statistics */}
          <div className="mt-8">
            <DashboardStats />
          </div>

          {/* Development Info */}
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              ✅ Enhanced Dashboard
            </h3>
            <p className="text-sm text-green-700">
              The dashboard now includes comprehensive system metrics:
            </p>
            <ul className="mt-2 text-sm text-green-700 list-disc list-inside">
              <li>Active documents and folders statistics</li>
              <li>Documents in trash with storage breakdown</li>
              <li>Active user counts and daily login tracking</li>
              <li>Storage usage analytics by user and file type</li>
              <li>Security metrics (encrypted, shared, sensitive files)</li>
              <li>Real-time activity monitoring</li>
              <li>Document creation and modification trends</li>
              <li>Auto-refreshing statistics with manual refresh option</li>
            </ul>
            <p className="mt-3 text-sm text-green-700">
              <strong>Note:</strong> Some advanced metrics require admin privileges for full system visibility.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}