/**
 * Admin Dashboard Overview Component for SecureVault
 * 
 * Provides comprehensive admin dashboard with:
 * - System status widgets and health indicators
 * - Usage statistics charts and metrics
 * - Recent activity feed with real-time updates
 * - Quick action buttons for common admin tasks
 * - Performance monitoring and alerts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Users,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Upload,
  Database,
  Cpu,
  MemoryStick,
  Server,
  RefreshCw,
  Settings,
  UserPlus,
  FileSearch,
  Shield,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { adminService, SystemHealth, SystemMetrics, AuditLog } from '../../services/adminService';
import { MetricCard, ActivityFeed, LoadingSpinner } from '../ui';

interface DashboardData {
  systemHealth: SystemHealth;
  systemMetrics: SystemMetrics;
  recentActivity: AuditLog[];
  userStats: {
    total_users: number;
    active_users: number;
    recent_logins: number;
  };
}

interface Props {
  refreshInterval?: number; // Auto-refresh interval in milliseconds
  onNavigate?: (page: string) => void; // Navigation callback
}

export default function AdminDashboardOverview({ 
  refreshInterval = 30000, // 30 seconds default
  onNavigate 
}: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  /**
   * Fetch dashboard data from API
   */
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const dashboardData = await adminService.getDashboardData();
      setData(dashboardData);
      setLastRefresh(new Date());
    } catch (err: any) {
      // Failed to fetch dashboard data
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Manual refresh handler
   */
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await fetchDashboardData();
  }, [fetchDashboardData]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchDashboardData();

    // Set up auto-refresh interval
    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchDashboardData, refreshInterval]);

  /**
   * Get system status color and icon
   */
  const getSystemStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: CheckCircle,
          label: 'Healthy'
        };
      case 'warning':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          icon: AlertTriangle,
          label: 'Warning'
        };
      case 'critical':
      case 'unhealthy':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: AlertTriangle,
          label: 'Critical'
        };
      case 'degraded':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          icon: AlertTriangle,
          label: 'Degraded'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: AlertTriangle,
          label: 'Unknown'
        };
    }
  };

  /**
   * Format percentage for display
   */
  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100) / 100}%`;
  };

  /**
   * Quick action handlers
   */
  const quickActions = [
    {
      label: 'Create User',
      icon: UserPlus,
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: () => onNavigate?.('users')
    },
    {
      label: 'View Audit Logs',
      icon: FileSearch,
      color: 'bg-purple-600 hover:bg-purple-700',
      onClick: () => onNavigate?.('audit')
    },
    {
      label: 'System Settings',
      icon: Settings,
      color: 'bg-gray-600 hover:bg-gray-700',
      onClick: () => onNavigate?.('settings')
    },
    {
      label: 'Security Report',
      icon: Shield,
      color: 'bg-green-600 hover:bg-green-700',
      onClick: () => onNavigate?.('compliance')
    }
  ];

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-medium">Failed to load dashboard</h3>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const systemStatus = getSystemStatusInfo(data.systemHealth.status);
  const StatusIcon = systemStatus.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            System overview and management console
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {lastRefresh && (
            <div className="text-sm text-gray-500 flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall System Status */}
        <MetricCard
          title="System Status"
          value={systemStatus.label}
          icon={StatusIcon}
          iconColor={systemStatus.color}
          iconBgColor={systemStatus.bgColor}
        />

        {/* Active Users */}
        <MetricCard
          title="Active Users"
          value={data.userStats.active_users.toString()}
          subtitle={`of ${data.userStats.total_users} total`}
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />

        {/* Storage Usage */}
        <MetricCard
          title="Storage Used"
          value={adminService.formatFileSize(data.systemMetrics.database_stats.total_storage_bytes)}
          subtitle={`${data.systemMetrics.database_stats.total_documents} documents`}
          icon={HardDrive}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />

        {/* System Uptime */}
        <MetricCard
          title="System Uptime"
          value={adminService.formatUptime(data.systemMetrics.uptime_seconds)}
          icon={Server}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CPU Usage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">CPU Usage</h3>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {formatPercentage(data.systemMetrics.cpu_usage)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                data.systemMetrics.cpu_usage > 80 ? 'bg-red-500' :
                data.systemMetrics.cpu_usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(data.systemMetrics.cpu_usage, 100)}%` }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MemoryStick className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium text-gray-900">Memory Usage</h3>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {formatPercentage(data.systemMetrics.memory_usage)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                data.systemMetrics.memory_usage > 80 ? 'bg-red-500' :
                data.systemMetrics.memory_usage > 60 ? 'bg-yellow-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(data.systemMetrics.memory_usage, 100)}%` }}
            />
          </div>
        </div>

        {/* Disk Usage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-orange-600" />
              <h3 className="font-medium text-gray-900">Disk Usage</h3>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {formatPercentage(data.systemMetrics.disk_usage)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                data.systemMetrics.disk_usage > 80 ? 'bg-red-500' :
                data.systemMetrics.disk_usage > 60 ? 'bg-yellow-500' : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(data.systemMetrics.disk_usage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Activity Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Activity Overview</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">Recent Logins</span>
              </div>
              <span className="font-medium text-gray-900">
                {data.systemMetrics.activity_stats.logins}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">Document Uploads</span>
              </div>
              <span className="font-medium text-gray-900">
                {data.systemMetrics.activity_stats.document_uploads}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-600">Document Downloads</span>
              </div>
              <span className="font-medium text-gray-900">
                {data.systemMetrics.activity_stats.document_downloads}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <ActivityFeed 
            items={data.recentActivity.map(log => ({
              id: log.id.toString(),
              type: log.action,
              title: log.action.charAt(0).toUpperCase() + log.action.slice(1),
              description: log.document_id ? `Document ${log.document_id}` : 'System action',
              timestamp: new Date(log.accessed_at).toLocaleTimeString(),
              user: `User ${log.user_id}`,
              status: log.success ? 'success' : 'error' as 'success' | 'error'
            }))}
            maxItems={5}
            title=""
            showUser={true}
          />
          {data.recentActivity.length === 0 && (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  // Quick action clicked
                  action.onClick();
                }}
                className={`flex flex-col items-center space-y-2 p-4 rounded-lg text-white transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${action.color}`}
              >
                <ActionIcon className="w-6 h-6" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Component Health Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Component Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data.systemHealth.components).map(([component, status]) => {
            const statusInfo = getSystemStatusInfo(status.status);
            const ComponentIcon = statusInfo.icon;
            
            return (
              <div key={component} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ComponentIcon className={`w-4 h-4 ${statusInfo.color}`} />
                  <span className="font-medium text-gray-900 capitalize">
                    {component.replace('_', ' ')}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                  {status.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}