/**
 * Modern Dashboard Page for SecureVault
 * 
 * Redesigned dashboard with modern UI/UX patterns, metrics, and visual hierarchy
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RequireAuth } from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import MetricCard from '../components/ui/MetricCard';
import ActionCard from '../components/ui/ActionCard';
import ActivityFeed, { ActivityItem } from '../components/ui/ActivityFeed';
import { SkeletonGrid } from '../components/ui/SkeletonLoader';
import TrashManagementCard from '../components/dashboard/TrashManagementCard';
import { documentsApi } from '../services/api/documents';
import { rbacService } from '../services/rbacService';
import { dashboardApi } from '../services/api/dashboard';
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
  Folder,
  Trash2,
  HardDrive,
  Share2,
  UserCheck
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
  // Enhanced statistics
  activeDocuments: number;
  documentsInTrash: number;
  totalFolders: number;
  activeStorageSize: number;
  trashStorageSize: number;
  encryptedDocuments: number;
  sharedDocuments: number;
  sensitiveDocuments: number;
  documentsCreatedToday: number;
  documentsModifiedToday: number;
  usersLoggedInToday: number;
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
  const loadDashboardData = useCallback(async () => {
      try {
        setIsLoading(true);
        
        // Check authentication status first
        const { AuthChecker } = await import('../utils/authChecker');
        const authStatus = AuthChecker.checkAuthStatus();
        
        if (!authStatus.isAuthenticated) {
          console.warn('User not authenticated, showing limited dashboard');
          // Set fallback data for unauthenticated users
          setStats({
            documentsTotal: 0,
            foldersTotal: 0,
            storageUsedGB: 0,
            storageUsedPercentage: 0,
            storageQuotaGB: 100,
            recentFiles: [],
            activeUsers: 0,
            mfaAdoption: 0,
            securityAlerts: 1,
            systemHealth: 'good',
            quickActions: []
          });
          return;
        }
        
        // Get enhanced dashboard statistics
        const enhancedStats = await dashboardApi.getEnhancedDashboardStats();
        
        // Calculate storage in GB
        const storageUsedGB = enhancedStats.active_storage_size / (1024 * 1024 * 1024);
        const trashStorageGB = enhancedStats.trash_storage_size / (1024 * 1024 * 1024);
        
        // Use enhanced statistics
        const totalDocuments = enhancedStats.active_documents;
        const totalFolders = enhancedStats.total_folders;
        const documentsThisMonth = enhancedStats.documents_created_today;
        
        // Use enhanced user statistics
        let activeUsers = enhancedStats.active_users || 1;
        let mfaAdoption = user?.mfa_enabled ? 100 : 0;
        let securityAlerts = enhancedStats.sensitive_documents > 0 ? 1 : (user?.mfa_enabled ? 0 : 1);
        
        try {
          if (user?.is_admin || ['super_admin', 'admin'].includes(user?.role || '')) {
            // Admin users can access MFA statistics
            // Use the proper API service instead of direct fetch
            const { apiRequest } = await import('../services/api');
            const mfaStatsApiResponse = await apiRequest('GET', '/api/v1/mfa/admin/stats');
            
            if (mfaStatsApiResponse.success && mfaStatsApiResponse.data) {
              const mfaStats = mfaStatsApiResponse.data;
              activeUsers = mfaStats.total_users || enhancedStats.active_users || 1;
              mfaAdoption = mfaStats.mfa_enabled_percentage || (user?.mfa_enabled ? 100 : 0);
              securityAlerts = mfaStats.backup_codes_exhausted || (enhancedStats.sensitive_documents > 0 ? 1 : 0);
            }
          }
        } catch (error) {
          // Could not fetch MFA statistics, use enhanced stats
          activeUsers = enhancedStats.total_users || enhancedStats.active_users || 1;
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
          recentActivity,
          // Enhanced statistics
          activeDocuments: enhancedStats.active_documents,
          documentsInTrash: enhancedStats.documents_in_trash,
          totalFolders: enhancedStats.total_folders,
          activeStorageSize: Math.round(storageUsedGB * 100) / 100,
          trashStorageSize: Math.round(trashStorageGB * 100) / 100,
          encryptedDocuments: enhancedStats.encrypted_documents,
          sharedDocuments: enhancedStats.shared_documents,
          sensitiveDocuments: enhancedStats.sensitive_documents,
          documentsCreatedToday: enhancedStats.documents_created_today,
          documentsModifiedToday: enhancedStats.documents_modified_today,
          usersLoggedInToday: enhancedStats.users_logged_in_today
        });
        
      } catch (error) {
        // Failed to load dashboard data
        // Fallback to basic data
        setStats({
          totalDocuments: 0,
          documentsThisMonth: 0,
          activeUsers: 1,
          securityAlerts: user?.mfa_enabled ? 0 : 1,
          mfaAdoption: user?.mfa_enabled ? 100 : 0,
          storageUsed: 0,
          storageLimit: 50,
          recentActivity: [],
          // Enhanced statistics fallbacks
          activeDocuments: 0,
          documentsInTrash: 0,
          totalFolders: 0,
          activeStorageSize: 0,
          trashStorageSize: 0,
          encryptedDocuments: 0,
          sharedDocuments: 0,
          sensitiveDocuments: 0,
          documentsCreatedToday: 0,
          documentsModifiedToday: 0,
          usersLoggedInToday: 0
        });
      } finally {
        setIsLoading(false);
      }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
          title="Active Documents"
          value={stats?.activeDocuments || 0}
          icon={FileText}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          trend={{
            value: stats?.documentsCreatedToday || 0,
            label: "created today",
            positive: true
          }}
        />

        <TrashManagementCard
          documentsInTrash={stats?.documentsInTrash || 0}
        />

        <MetricCard
          title="Active Users"
          value={stats?.activeUsers || 0}
          subtitle={`${stats?.usersLoggedInToday || 0} logged in today`}
          icon={UserCheck}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />

        <MetricCard
          title="Active Storage"
          value={`${stats?.activeStorageSize || 0}GB`}
          subtitle={`${stats?.trashStorageSize || 0}GB in trash`}
          icon={HardDrive}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
      </div>

      {/* Additional Enhanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Folders"
          value={stats?.totalFolders || 0}
          subtitle="Organization structure"
          icon={Folder}
          iconColor="text-yellow-600"
          iconBgColor="bg-yellow-100"
        />

        <MetricCard
          title="Encrypted Files"
          value={stats?.encryptedDocuments || 0}
          subtitle="Protected documents"
          icon={Lock}
          iconColor="text-indigo-600"
          iconBgColor="bg-indigo-100"
        />

        <MetricCard
          title="Shared Documents"
          value={stats?.sharedDocuments || 0}
          subtitle="Collaborative files"
          icon={Share2}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />

        <MetricCard
          title="Sensitive Files"
          value={stats?.sensitiveDocuments || 0}
          subtitle="High-security documents"
          icon={Shield}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
        />
      </div>

      {/* Today's Activity Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Today's Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats?.documentsCreatedToday || 0}</div>
            <div className="text-sm text-gray-500">Documents Created</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.documentsModifiedToday || 0}</div>
            <div className="text-sm text-gray-500">Documents Modified</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats?.usersLoggedInToday || 0}</div>
            <div className="text-sm text-gray-500">User Logins</div>
          </div>
        </div>
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