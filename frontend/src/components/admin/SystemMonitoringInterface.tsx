/**
 * System Monitoring Interface Component for SecureVault Admin
 * 
 * Provides comprehensive system monitoring with:
 * - Real-time performance graphs (CPU, Memory, Disk)
 * - Storage usage visualization and trends
 * - Error logs and alerts with severity levels
 * - System health indicators and component status
 * - Historical data visualization and analysis
 * - Automated alerting and threshold management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Database,
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Wifi,
  Shield,
  RefreshCw,
  Settings,
  Download,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  BarChart3,
  LineChart
} from 'lucide-react';
import {
  adminService,
  SystemHealth,
  SystemMetrics
} from '../../services/adminService';
import { LoadingSpinner, MetricCard } from '../ui';

interface Props {
  refreshInterval?: number; // Auto-refresh interval in milliseconds
  enableRealTime?: boolean; // Enable real-time updates
}

interface AlertThreshold {
  metric: string;
  warning: number;
  critical: number;
  enabled: boolean;
}

interface PerformanceData {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
}

export default function SystemMonitoringInterface({ 
  refreshInterval = 10000, // 10 seconds default
  enableRealTime = true 
}: Props) {
  // State management
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Display preferences
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'historical'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(enableRealTime);
  const [showAlerts, setShowAlerts] = useState(true);

  // Alert configuration
  const [alertThresholds, setAlertThresholds] = useState<AlertThreshold[]>([
    { metric: 'cpu', warning: 70, critical: 90, enabled: true },
    { metric: 'memory', warning: 80, critical: 95, enabled: true },
    { metric: 'disk', warning: 85, critical: 95, enabled: true }
  ]);

  /**
   * Fetch system monitoring data
   */
  const fetchMonitoringData = useCallback(async () => {
    try {
      setError(null);
      const [health, metrics] = await Promise.all([
        adminService.getSystemHealth(),
        adminService.getSystemMetrics()
      ]);
      
      setSystemHealth(health);
      setSystemMetrics(metrics);
      setLastRefresh(new Date());

      // Add to performance history
      if (metrics) {
        setPerformanceHistory(prev => {
          const newData: PerformanceData = {
            timestamp: metrics.timestamp,
            cpu: metrics.cpu_usage,
            memory: metrics.memory_usage,
            disk: metrics.disk_usage
          };
          const updated = [...prev, newData];
          // Keep only last 50 data points
          return updated.slice(-50);
        });
      }
    } catch (err: any) {
      // Failed to fetch monitoring data
      setError(err.message || 'Failed to load monitoring data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Manual refresh handler
   */
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await fetchMonitoringData();
  }, [fetchMonitoringData]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchMonitoringData();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchMonitoringData, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchMonitoringData, refreshInterval, autoRefresh]);

  /**
   * Get status information for metrics
   */
  const getMetricStatus = (value: number, thresholds: AlertThreshold) => {
    if (!thresholds.enabled) return { level: 'normal', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    
    if (value >= thresholds.critical) {
      return { level: 'critical', color: 'text-red-600', bgColor: 'bg-red-100' };
    } else if (value >= thresholds.warning) {
      return { level: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else {
      return { level: 'normal', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
  };

  /**
   * Get component status icon and color
   */
  const getComponentStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return { icon: CheckCircle, color: 'text-green-500' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-yellow-500' };
      case 'critical':
      case 'unhealthy':
        return { icon: XCircle, color: 'text-red-500' };
      default:
        return { icon: AlertTriangle, color: 'text-gray-500' };
    }
  };

  /**
   * Format uptime for display
   */
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  /**
   * Format bytes for display
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Get current alerts based on thresholds
   */
  const getCurrentAlerts = useCallback(() => {
    if (!systemMetrics) return [];
    
    const alerts = [];
    
    alertThresholds.forEach(threshold => {
      if (!threshold.enabled) return;
      
      let currentValue = 0;
      switch (threshold.metric) {
        case 'cpu':
          currentValue = systemMetrics.cpu_usage;
          break;
        case 'memory':
          currentValue = systemMetrics.memory_usage;
          break;
        case 'disk':
          currentValue = systemMetrics.disk_usage;
          break;
      }
      
      if (currentValue >= threshold.critical) {
        alerts.push({
          level: 'critical',
          metric: threshold.metric.toUpperCase(),
          value: currentValue,
          threshold: threshold.critical,
          message: `${threshold.metric.toUpperCase()} usage is critically high at ${currentValue.toFixed(1)}%`
        });
      } else if (currentValue >= threshold.warning) {
        alerts.push({
          level: 'warning',
          metric: threshold.metric.toUpperCase(),
          value: currentValue,
          threshold: threshold.warning,
          message: `${threshold.metric.toUpperCase()} usage is high at ${currentValue.toFixed(1)}%`
        });
      }
    });
    
    return alerts;
  }, [systemMetrics, alertThresholds]);

  const currentAlerts = getCurrentAlerts();

  if (isLoading && !systemHealth && !systemMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !systemHealth && !systemMetrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-medium">Failed to load monitoring data</h3>
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

  if (!systemHealth || !systemMetrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Monitoring</h2>
          <p className="text-gray-600">Real-time system performance and health monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          {lastRefresh && (
            <div className="text-sm text-gray-500 flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
            </div>
          )}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center px-3 py-2 rounded-lg transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
            Auto-refresh
          </button>
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

      {/* Alerts Banner */}
      {showAlerts && currentAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-medium text-red-800">System Alerts</h3>
            </div>
            <button
              onClick={() => setShowAlerts(false)}
              className="text-red-400 hover:text-red-600"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {currentAlerts.map((alert, index) => (
              <div key={index} className={`p-2 rounded ${
                alert.level === 'critical' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                <div className={`text-sm font-medium ${
                  alert.level === 'critical' ? 'text-red-800' : 'text-yellow-800'
                }`}>
                  {alert.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Mode Selector */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
        {(['overview', 'detailed', 'historical'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <>
          {/* System Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="System Status"
              value={systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
              icon={systemHealth.status === 'healthy' ? CheckCircle : AlertTriangle}
              iconColor={systemHealth.status === 'healthy' ? 'text-green-600' : 'text-red-600'}
              iconBgColor={systemHealth.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'}
            />
            
            <MetricCard
              title="Uptime"
              value={formatUptime(systemMetrics.uptime_seconds)}
              icon={Server}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
            />
            
            <MetricCard
              title="Total Users"
              value={systemMetrics.database_stats.total_users.toString()}
              subtitle={`${systemMetrics.database_stats.active_users} active`}
              icon={Database}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
            />
            
            <MetricCard
              title="Storage Used"
              value={formatBytes(systemMetrics.database_stats.total_storage_bytes)}
              subtitle={`${systemMetrics.database_stats.total_documents} documents`}
              icon={HardDrive}
              iconColor="text-orange-600"
              iconBgColor="bg-orange-100"
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
                  {systemMetrics.cpu_usage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    systemMetrics.cpu_usage > 80 ? 'bg-red-500' :
                    systemMetrics.cpu_usage > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(systemMetrics.cpu_usage, 100)}%` }}
                />
              </div>
              <div className="text-sm text-gray-500">
                {getMetricStatus(systemMetrics.cpu_usage, alertThresholds.find(t => t.metric === 'cpu')!).level} load
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
                  {systemMetrics.memory_usage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    systemMetrics.memory_usage > 80 ? 'bg-red-500' :
                    systemMetrics.memory_usage > 60 ? 'bg-yellow-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(systemMetrics.memory_usage, 100)}%` }}
                />
              </div>
              <div className="text-sm text-gray-500">
                {getMetricStatus(systemMetrics.memory_usage, alertThresholds.find(t => t.metric === 'memory')!).level} usage
              </div>
            </div>

            {/* Disk Usage */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-5 h-5 text-orange-600" />
                  <h3 className="font-medium text-gray-900">Disk Usage</h3>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {systemMetrics.disk_usage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    systemMetrics.disk_usage > 80 ? 'bg-red-500' :
                    systemMetrics.disk_usage > 60 ? 'bg-yellow-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(systemMetrics.disk_usage, 100)}%` }}
                />
              </div>
              <div className="text-sm text-gray-500">
                {getMetricStatus(systemMetrics.disk_usage, alertThresholds.find(t => t.metric === 'disk')!).level} space
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detailed Mode */}
      {viewMode === 'detailed' && (
        <>
          {/* Component Health Status */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Component Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(systemHealth.components).map(([component, status]) => {
                const statusInfo = getComponentStatusIcon(status.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div key={component} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                        <span className="font-medium text-gray-900 capitalize">
                          {component.replace('_', ' ')}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        adminService.getStatusColor(status.status)
                      }`}>
                        {status.status}
                      </span>
                    </div>
                    {status.response_time_ms && (
                      <div className="text-sm text-gray-600">
                        Response time: {status.response_time_ms.toFixed(1)}ms
                      </div>
                    )}
                    {status.usage_percent && (
                      <div className="text-sm text-gray-600">
                        Usage: {status.usage_percent.toFixed(1)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Statistics */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Activity Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {systemMetrics.activity_stats.logins}
                </div>
                <div className="text-sm text-gray-600">Recent Logins</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {systemMetrics.activity_stats.document_uploads}
                </div>
                <div className="text-sm text-gray-600">Document Uploads</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {systemMetrics.activity_stats.document_downloads}
                </div>
                <div className="text-sm text-gray-600">Document Downloads</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Historical Mode */}
      {viewMode === 'historical' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Performance History</h3>
          {performanceHistory.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Showing last {performanceHistory.length} data points
              </div>
              {/* Simple performance history visualization */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">CPU Trend</h4>
                  <div className="text-2xl font-bold text-blue-600">
                    {performanceHistory[performanceHistory.length - 1]?.cpu.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Memory Trend</h4>
                  <div className="text-2xl font-bold text-purple-600">
                    {performanceHistory[performanceHistory.length - 1]?.memory.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Disk Trend</h4>
                  <div className="text-2xl font-bold text-orange-600">
                    {performanceHistory[performanceHistory.length - 1]?.disk.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No historical data available yet. Data will appear as monitoring continues.
            </div>
          )}
        </div>
      )}

      {/* Alert Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Alert Thresholds</h3>
        <div className="space-y-4">
          {alertThresholds.map((threshold, index) => (
            <div key={threshold.metric} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={threshold.enabled}
                  onChange={(e) => {
                    const updated = [...alertThresholds];
                    updated[index].enabled = e.target.checked;
                    setAlertThresholds(updated);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900 capitalize">
                  {threshold.metric} Alerts
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div>
                  Warning: {threshold.warning}%
                </div>
                <div>
                  Critical: {threshold.critical}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}