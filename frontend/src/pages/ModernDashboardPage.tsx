/**
 * Modern Dashboard Page for SecureVault
 * 
 * Redesigned dashboard with modern UI/UX patterns, metrics, and visual hierarchy
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RequireAuth } from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import MetricCard from '../components/ui/MetricCard';
import ActionCard from '../components/ui/ActionCard';
import ActivityFeed, { ActivityItem } from '../components/ui/ActivityFeed';
import { SkeletonGrid } from '../components/ui/SkeletonLoader';
import { 
  FileText, 
  Shield, 
  Users, 
  Activity, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Upload,
  Lock,
  Unlock,
  ArrowRight,
  Calendar,
  BarChart3
} from 'lucide-react';

interface DashboardStats {
  totalDocuments: number;
  documentsThisMonth: number;
  activeUsers: number;
  securityAlerts: number;
  mfaAdoption: number;
  storageUsed: number;
  storageLimit: number;
  recentActivity: ActivityItem[];
}

// Remove this interface since we're now importing it from ActivityFeed

export default function ModernDashboardPage() {
  return (
    <RequireAuth>
      <AppLayout title="Dashboard" subtitle="Welcome to SecureVault - Overview of your secure document management">
        <ModernDashboardContent />
      </AppLayout>
    </RequireAuth>
  );
}

function ModernDashboardContent() {
  const { user, getRoleName } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadDashboardData = async () => {
      // Simulate API call
      setTimeout(() => {
        setStats({
          totalDocuments: 1247,
          documentsThisMonth: 89,
          activeUsers: 24,
          securityAlerts: 2,
          mfaAdoption: 78,
          storageUsed: 12.4,
          storageLimit: 50,
          recentActivity: [
            {
              id: '1',
              type: 'upload',
              title: 'Document uploaded',
              description: 'Financial_Report_Q4.pdf uploaded successfully',
              timestamp: '2 minutes ago',
              user: 'John Doe',
              status: 'success',
              icon: Upload
            },
            {
              id: '2',
              type: 'mfa',
              title: 'Security updated',
              description: 'MFA enabled for account',
              timestamp: '15 minutes ago',
              user: 'Jane Smith',
              status: 'success',
              icon: Shield
            },
            {
              id: '3',
              type: 'share',
              title: 'Document shared',
              description: 'Contract shared with external user',
              timestamp: '1 hour ago',
              user: 'Mike Johnson',
              status: 'warning',
              icon: Users
            },
            {
              id: '4',
              type: 'download',
              title: 'Document accessed',
              description: 'Employee_Handbook.pdf downloaded',
              timestamp: '2 hours ago',
              user: 'Sarah Wilson',
              status: 'success',
              icon: Download
            }
          ]
        });
        setIsLoading(false);
      }, 1000);
    };

    loadDashboardData();
  }, []);

  // Helper functions removed - now handled by reusable components

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Loading skeleton */}
        <div className="bg-gray-200 animate-pulse rounded-xl h-48"></div>
        <SkeletonGrid items={4} columns={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-200 animate-pulse rounded-xl h-64"></div>
          </div>
          <div className="bg-gray-200 animate-pulse rounded-xl h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Welcome back, {user?.username}!
            </h2>
            <p className="text-blue-100 text-base md:text-lg">
              You're logged in as {user?.role && getRoleName(user.role)}
            </p>
          </div>
          <div className="text-left md:text-right">
            <div className="text-blue-100 text-sm">Today</div>
            <div className="text-xl md:text-2xl font-semibold">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>

        {/* Quick Status Indicators */}
        <div className="mt-6 flex flex-wrap gap-3">
          {user?.mfa_enabled ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500 bg-opacity-20 text-green-100">
              <CheckCircle className="h-4 w-4 mr-2" />
              MFA Enabled
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-500 bg-opacity-20 text-yellow-100">
              <AlertTriangle className="h-4 w-4 mr-2" />
              MFA Disabled
            </span>
          )}
          
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500 bg-opacity-20 text-blue-100">
            <Clock className="h-4 w-4 mr-2" />
            Active Session
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Documents"
          value={stats?.totalDocuments || 0}
          icon={FileText}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          trend={{
            value: stats?.documentsThisMonth || 0,
            label: "this month",
            positive: true
          }}
        />

        <MetricCard
          title="Active Users"
          value={stats?.activeUsers || 0}
          subtitle="Online now"
          icon={Users}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />

        <MetricCard
          title="Security Alerts"
          value={stats?.securityAlerts || 0}
          subtitle="Need attention"
          icon={Shield}
          iconColor="text-yellow-600"
          iconBgColor="bg-yellow-100"
        />

        <MetricCard
          title="Storage Used"
          value={`${stats?.storageUsed || 0}GB`}
          subtitle={`of ${stats?.storageLimit || 0}GB limit`}
          icon={BarChart3}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              <ActionCard
                title="Manage Documents"
                description="Upload, organize, and share files"
                icon={FileText}
                iconColor="text-blue-600"
                iconBgColor="bg-blue-100"
                href="/documents"
              />

              <ActionCard
                title="Security Settings"
                description="Configure MFA and security"
                icon={Shield}
                iconColor="text-green-600"
                iconBgColor="bg-green-100"
                href="/settings/mfa"
              />

              {(user?.is_admin || ['super_admin', 'admin', '5', '4'].includes(user?.role || '')) && (
                <ActionCard
                  title="Administration"
                  description="Manage users and permissions"
                  icon={Users}
                  iconColor="text-purple-600"
                  iconBgColor="bg-purple-100"
                  href="/admin"
                />
              )}

              <ActionCard
                title="Analytics"
                description="View usage reports"
                icon={BarChart3}
                iconColor="text-gray-600"
                iconBgColor="bg-gray-100"
                disabled={true}
              />
            </div>
          </div>

          {/* MFA Adoption Chart (Admin Only) */}
          {(user?.is_admin || ['super_admin', 'admin'].includes(user?.role || '')) && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">MFA Adoption Rate</h3>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="mb-4 sm:mb-0">
                  <p className="text-2xl md:text-3xl font-bold text-blue-600">{stats?.mfaAdoption}%</p>
                  <p className="text-sm text-gray-500">of users have enabled MFA</p>
                </div>
                <div className="h-16 w-16 md:h-20 md:w-20 mx-auto sm:mx-0">
                  <svg className="transform -rotate-90 h-full w-full">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 30}`}
                      strokeDashoffset={`${2 * Math.PI * 30 * (1 - (stats?.mfaAdoption || 0) / 100)}`}
                      className="text-blue-600"
                    />
                  </svg>
                </div>
              </div>
              <Link 
                to="/admin/rbac"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                Manage user security settings
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <ActivityFeed
          items={stats?.recentActivity || []}
          title="Recent Activity"
          maxItems={5}
          viewAllLink="/admin/rbac/audit"
          showUser={true}
        />
      </div>
    </div>
  );
}