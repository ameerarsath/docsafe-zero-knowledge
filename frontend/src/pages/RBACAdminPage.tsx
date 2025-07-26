/**
 * RBAC Admin Dashboard Page
 * 
 * Main entry point for RBAC management with quick access to all RBAC functions
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Shield, 
  Grid, 
  RefreshCw,
  FileText,
  Smartphone
} from 'lucide-react';
import { RequireAuth } from '../components/auth/ProtectedRoute';
import { RoleBasedComponent } from '../components/rbac/RoleBasedComponent';
import AppLayout from '../components/layout/AppLayout';

export default function RBACAdminPage() {
  return (
    <RequireAuth>
      <RoleBasedComponent requiredPermission="roles:read">
        <AppLayout 
          title="RBAC Administration" 
          subtitle="Manage roles, permissions, and access control for SecureVault"
        >
          <RBACAdminContent />
        </AppLayout>
      </RoleBasedComponent>
    </RequireAuth>
  );
}

function RBACAdminContent() {
  const adminFeatures = [
    {
      title: 'Role Management',
      description: 'Create, edit, and manage system roles',
      icon: Shield,
      href: '/admin/rbac/roles',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      permission: 'roles:admin'
    },
    {
      title: 'User Assignments',
      description: 'Assign and manage user roles',
      icon: Users,
      href: '/admin/rbac/assignments',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      permission: 'users:admin'
    },
    {
      title: 'Permission Matrix',
      description: 'View role-permission relationships',
      icon: Grid,
      href: '/admin/rbac/matrix',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      permission: 'permissions:read'
    },
    {
      title: 'Role Hierarchy',
      description: 'Visualize role inheritance structure',
      icon: RefreshCw,
      href: '/admin/rbac/hierarchy',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      permission: 'roles:read'
    },
    {
      title: 'Audit Trail',
      description: 'View permission and role change history',
      icon: FileText,
      href: '/admin/rbac/audit',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      permission: 'audit:read'
    },
    {
      title: 'Mobile Interface',
      description: 'Mobile-optimized RBAC management',
      icon: Smartphone,
      href: '/admin/rbac',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      permission: 'roles:read'
    }
  ];

  return (
    <div className="space-y-8">
        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Roles</dt>
                    <dd className="text-lg font-medium text-gray-900">5</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                    <dd className="text-lg font-medium text-gray-900">4</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Grid className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Permissions</dt>
                    <dd className="text-lg font-medium text-gray-900">24</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Recent Changes</dt>
                    <dd className="text-lg font-medium text-gray-900">12</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {adminFeatures.map((feature) => (
            <RoleBasedComponent key={feature.title} requiredPermission={feature.permission}>
              <Link
                to={feature.href}
                className="group bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className={`inline-flex p-3 rounded-lg ${feature.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-gray-700">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {feature.description}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-gray-400 group-hover:text-gray-600">
                    <span>Open interface</span>
                    <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </RoleBasedComponent>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent RBAC Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-400 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-900">Role "Manager" assigned to user mfah</span>
                </div>
                <span className="text-xs text-gray-500">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-blue-400 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-900">Permission matrix updated</span>
                </div>
                <span className="text-xs text-gray-500">4 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-yellow-400 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-900">New role "Document Reviewer" created</span>
                </div>
                <span className="text-xs text-gray-500">1 day ago</span>
              </div>
            </div>
            <div className="mt-4">
              <Link 
                to="/admin/rbac/audit"
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                View full audit trail →
              </Link>
            </div>
          </div>
        </div>
    </div>
  );
}