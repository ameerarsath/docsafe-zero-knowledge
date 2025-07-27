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
import { documentsApi } from '../services/api/documents';
import { rbacService } from '../services/rbacService';
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
  BarChart3,
  Folder
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

// Helper function to format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

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

  // Load real dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Get document statistics from dedicated endpoint
        const documentsStatsResponse = await documentsApi.getDocumentStatistics();
        const totalDocuments = documentsStatsResponse.total_documents;
        const totalFolders = documentsStatsResponse.total_folders;
        const storageUsedBytes = documentsStatsResponse.total_size;
        const storageUsedGB = storageUsedBytes / (1024 * 1024 * 1024); // Convert to GB
        
        // Calculate documents this month using recent activity count as approximation
        const documentsThisMonth = documentsStatsResponse.recent_activity_count || 0;
        
        // Get user statistics from RBAC if admin, otherwise use MFA stats
        let activeUsers = 1; // At least current user
        let mfaAdoption = user?.mfa_enabled ? 100 : 0;
        let securityAlerts = user?.mfa_enabled ? 0 : 1;
        
        try {
          if (user?.is_admin || ['super_admin', 'admin'].includes(user?.role || '')) {
            // Admin users can access MFA statistics
            const mfaStatsResponse = await fetch('/api/v1/mfa/admin/stats', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (mfaStatsResponse.ok) {
              const mfaStats = await mfaStatsResponse.json();
              activeUsers = mfaStats.total_users || 1;
              mfaAdoption = mfaStats.mfa_enabled_percentage || (user?.mfa_enabled ? 100 : 0);
              securityAlerts = mfaStats.backup_codes_exhausted || (user?.mfa_enabled ? 0 : 1);
            }
          } else {
            // Non-admin users: try to get user count from roles
            const roles = await rbacService.getRoles({ include_stats: true });
            if (roles.roles.some(role => role.user_count !== undefined)) {
              activeUsers = roles.roles.reduce((sum, role) => sum + (role.user_count || 0), 0);
            }
          }
        } catch (error) {
          console.warn('Could not fetch user/MFA statistics:', error);
          // Use fallback values
        }
        
        // Get sample recent documents for activity feed
        const recentDocsResponse = await documentsApi.listDocuments({
          size: 5,
          sort_by: 'updated_at',
          sort_order: 'desc'
        });
        
        // Generate recent activity from recent documents
        const recentActivity: ActivityItem[] = recentDocsResponse.documents
          .slice(0, 4)
          .map((doc, index) => ({
            id: doc.id.toString(),
            type: 'upload',
            title: doc.document_type === 'folder' ? 'Folder created' : 'Document uploaded',
            description: `${doc.name} ${doc.document_type === 'folder' ? 'created' : 'uploaded'} successfully`,
            timestamp: formatRelativeTime(doc.updated_at),
            user: user?.username || 'Unknown',
            status: 'success' as const,
            icon: doc.document_type === 'folder' ? Folder : FileText
          }));
        
        setStats({
          totalDocuments: totalDocuments + totalFolders, // Combined for display
          documentsThisMonth,
          activeUsers,
          securityAlerts,
          mfaAdoption,
          storageUsed: Math.round(storageUsedGB * 100) / 100, // Round to 2 decimals
          storageLimit: 50, // Default limit - could be made configurable
          recentActivity
        });
        
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Fallback to basic data
        setStats({
          totalDocuments: 0,
          documentsThisMonth: 0,
          activeUsers: 1,
          securityAlerts: user?.mfa_enabled ? 0 : 1,
          mfaAdoption: user?.mfa_enabled ? 100 : 0,
          storageUsed: 0,
          storageLimit: 50,
          recentActivity: []
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

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