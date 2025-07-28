/**
 * Dashboard Statistics Component
 * 
 * Displays comprehensive dashboard metrics including document counts,
 * storage usage, user activity, and system statistics.
 */

import React from 'react';
import { 
  FileText, 
  Folder, 
  Trash2, 
  Users, 
  HardDrive, 
  Shield, 
  Share2, 
  Activity,
  TrendingUp,
  UserCheck,
  Clock,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import ActivityTimeline from './ActivityTimeline';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'gray';
  description?: string;
}

function StatCard({ title, value, icon, trend, color = 'blue', description }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1024 * 1024 * 1024) {
        return `${(val / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      } else if (val >= 1024 * 1024) {
        return `${(val / (1024 * 1024)).toFixed(1)} MB`;
      } else if (val >= 1024) {
        return `${(val / 1024).toFixed(1)} KB`;
      } else if (val >= 1000) {
        return val.toLocaleString();
      }
    }
    return val.toString();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{formatValue(value)}</p>
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
          {trend && (
            <div className={`flex items-center mt-2 text-xs ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`w-3 h-3 mr-1 ${
                trend.isPositive ? '' : 'rotate-180'
              }`} />
              {Math.abs(trend.value)}% from last week
            </div>
          )}
        </div>
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center border ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardStats() {
  const { stats, loading, error, refreshStats, lastUpdated } = useDashboardStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Activity className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Failed to load dashboard statistics
            </h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              onClick={refreshStats}
              className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh info */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">System Overview</h2>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1" />
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={refreshStats}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Document Statistics */}
        <StatCard
          title="Active Documents"
          value={stats.active_documents}
          icon={<FileText className="w-6 h-6" />}
          color="blue"
          description="Currently accessible files"
        />
        
        <StatCard
          title="Documents in Trash"
          value={stats.documents_in_trash}
          icon={<Trash2 className="w-6 h-6" />}
          color="red"
          description="Deleted but recoverable"
        />
        
        <StatCard
          title="Total Folders"
          value={stats.total_folders}
          icon={<Folder className="w-6 h-6" />}
          color="yellow"
          description="Organizational structure"
        />
        
        <StatCard
          title="Active Storage"
          value={stats.active_storage_size}
          icon={<HardDrive className="w-6 h-6" />}
          color="green"
          description="Currently used space"
        />

        {/* User Statistics */}
        <StatCard
          title="Total Users"
          value={stats.total_users}
          icon={<Users className="w-6 h-6" />}
          color="indigo"
          description="Registered accounts"
        />
        
        <StatCard
          title="Active Users"
          value={stats.active_users}
          icon={<UserCheck className="w-6 h-6" />}
          color="green"
          description="Enabled accounts"
        />
        
        <StatCard
          title="Daily Logins"
          value={stats.users_logged_in_today}
          icon={<Activity className="w-6 h-6" />}
          color="blue"
          description="Unique logins today"
        />
        
        <StatCard
          title="Trash Storage"
          value={stats.trash_storage_size}
          icon={<Trash2 className="w-6 h-6" />}
          color="gray"
          description="Recoverable data size"
        />

        {/* Security & Activity Statistics */}
        <StatCard
          title="Encrypted Files"
          value={stats.encrypted_documents}
          icon={<Shield className="w-6 h-6" />}
          color="purple"
          description="Protected documents"
        />
        
        <StatCard
          title="Shared Documents"
          value={stats.shared_documents}
          icon={<Share2 className="w-6 h-6" />}
          color="blue"
          description="Collaborative files"
        />
        
        <StatCard
          title="Sensitive Files"
          value={stats.sensitive_documents}
          icon={<Shield className="w-6 h-6" />}
          color="red"
          description="High-security documents"
        />
        
        <StatCard
          title="Recent Activity"
          value={stats.recent_activity_count}
          icon={<BarChart3 className="w-6 h-6" />}
          color="green"
          description="Last 30 days"
        />
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Today's Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Documents Created</span>
              <span className="text-sm font-medium text-gray-900">{stats.documents_created_today}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Documents Modified</span>
              <span className="text-sm font-medium text-gray-900">{stats.documents_modified_today}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Login Events</span>
              <span className="text-sm font-medium text-gray-900">{stats.login_events_today}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">File Types</h3>
          <div className="space-y-2">
            {Object.entries(stats.storage_by_type).slice(0, 5).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Storage Usage</h3>
          <div className="space-y-2">
            {Object.entries(stats.storage_by_user).slice(0, 5).map(([user, size]) => (
              <div key={user} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{user}</span>
                <span className="text-sm font-medium text-gray-900">
                  {typeof size === 'number' ? 
                    (size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(size / 1024)} KB`) 
                    : size
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="mt-6">
        <ActivityTimeline 
          maxEvents={8}
          showUserFilter={false}
          refreshInterval={30000}
        />
      </div>
    </div>
  );
}