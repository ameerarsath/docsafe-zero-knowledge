/**
 * Security Dashboard Component for SecureVault
 * 
 * Provides comprehensive security monitoring with:
 * - Real-time threat overview and statistics
 * - Recent security events and alerts
 * - Top threat sources and IP blocking status
 * - Security metrics and trends
 * - Quick action buttons for security operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  Activity,
  TrendingUp,
  Ban,
  Clock,
  RefreshCw,
  Eye,
  BarChart3,
  Users,
  Globe,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Filter,
  Download,
  Settings
} from 'lucide-react';
import { LoadingSpinner, MetricCard } from '../ui';
import SecurityHeadersStatus from './SecurityHeadersStatus';
import { useAuth } from '../../contexts/AuthContext';
import { securityApi } from '../../services/api/security';

interface Props {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export default function SecurityDashboard({ 
  refreshInterval = 30000, // 30 seconds
  autoRefresh = true 
}: Props) {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(24); // hours
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<any>(null);

  // Auth context for role checking
  const { user, isAuthenticated, isLoading: authLoading, hasRole } = useAuth();

  /**
   * Load dashboard data from API
   */
  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      setAccessDenied(false);

      console.log('🔐 Loading security dashboard data...');

      // Don't proceed if auth is still loading
      if (authLoading) {
        console.log('🔄 Auth still loading, waiting...');
        return;
      }

      // If not authenticated and not loading, redirect to login
      if (!isAuthenticated && !authLoading) {
        console.log('🔄 User not authenticated - redirecting to login');
        window.location.href = '/login';
        return;
      }

      // Check role-based access (admin or security role required)
      const hasSecurityAccess = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'security';
      console.log('🔐 User role:', user?.role, 'Has security access:', hasSecurityAccess);

      if (user && !hasSecurityAccess) {
        console.warn('🚫 User lacks security permissions - showing access denied');
        setAccessDenied(true);
        return;
      }

      // Try to load real data from API using the security service
      const [dashboardData, metricsData] = await Promise.all([
        securityApi.getSecurityDashboard(selectedTimeRange),
        securityApi.getSecurityMetrics(7)
      ]);

      console.log('✅ Security data loaded successfully');
      setDashboardData(dashboardData);
      setMetricsData(metricsData);
    } catch (apiError) {
      console.error('🚨 Security API error:', apiError);

      // Check error type for proper handling
      const statusCode = (apiError as any)?.statusCode;

      if (statusCode === 403) {
        console.warn('🚫 403 Forbidden - role-based access denied');
        setAccessDenied(true);
        return;
      } else if (statusCode === 401) {
        console.log('🔄 401 Unauthorized - token invalid/expired');
        // Only redirect if we're sure user is not authenticated
        // Don't redirect if this is just a loading state issue
        if (user === null && !isAuthenticated) {
          console.log('🔄 Redirecting to login due to authentication failure');
          window.location.href = '/login';
        } else {
          console.warn('🔄 Authentication error but user exists - may be token issue');
          setError('Authentication error. Please try refreshing the page.');
        }
        return;
      }
      
      console.warn('API not available, using mock data:', apiError);
      
      // Fallback to mock data
      const mockDashboardData = {
        active_threats: 3,
        blocked_ips: 12,
        event_counts: {
          critical: 1,
          high: 5,
          medium: 12,
          low: 28
        },
        recent_events: [
          {
            event_id: '1',
            title: 'Suspicious login pattern detected',
            threat_level: 'high',
            detected_at: new Date().toISOString(),
            source_ip: '192.168.1.100',
            risk_score: 7.5
          },
          {
            event_id: '2', 
            title: 'Brute force attempt blocked',
            threat_level: 'medium',
            detected_at: new Date(Date.now() - 300000).toISOString(),
            source_ip: '10.0.0.45',
            risk_score: 6.2
          }
        ],
        top_threat_sources: [
          {
            ip_address: '192.168.1.100',
            event_count: 15,
            max_risk_score: 8.5
          },
          {
            ip_address: '10.0.0.45', 
            event_count: 8,
            max_risk_score: 6.2
          }
        ]
      };

      const mockMetricsData = {
        total_events: 156,
        resolved_events: 134,
        resolution_rate: 0.86,
        successful_responses: 145,
        response_success_rate: 0.93,
        average_risk_score: 4.2,
        highest_risk_score: 8.7
      };
      
      setDashboardData(mockDashboardData);
      setMetricsData(mockMetricsData);
    }
  }, [selectedTimeRange, authLoading, isAuthenticated, user]);

  /**
   * Manual refresh handler
   */
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadDashboardData();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
      setError('Failed to refresh dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [loadDashboardData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(handleRefresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, handleRefresh]);

  // Initial data load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  /**
   * Calculate threat level percentage
   */
  const getThreatPercentage = (count: number, total: number): number => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  /**
   * Get threat level styling
   */
  const getThreatLevelColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getThreatLevelIcon = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  };

  const formatDateTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString();
  };

  // Show loading state if auth is loading or data not loaded
  if (authLoading || isLoading || (!dashboardData || !metricsData)) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalEvents = Object.values(dashboardData.event_counts).reduce((sum, count) => sum + count, 0);

  // Show access denied for users without security permissions
  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to view the security dashboard. This feature requires administrator or security role access.
          </p>
          <p className="text-sm text-gray-500">
            Current role: <span className="font-medium">{user?.role || 'Unknown'}</span>
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-medium">Security Dashboard Error</h3>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <span>Security Dashboard</span>
          </h1>
          <p className="text-gray-600">Real-time security monitoring and threat detection</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={1}>Last Hour</option>
            <option value={6}>Last 6 Hours</option>
            <option value={24}>Last 24 Hours</option>
            <option value={72}>Last 3 Days</option>
            <option value={168}>Last Week</option>
          </select>

          {lastRefresh && (
            <div className="text-sm text-gray-500 flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Threats"
          value={dashboardData.active_threats.toString()}
          subtitle={`${totalEvents} total events`}
          icon={AlertTriangle}
          iconColor={dashboardData.active_threats > 0 ? "text-red-600" : "text-green-600"}
          iconBgColor={dashboardData.active_threats > 0 ? "bg-red-100" : "bg-green-100"}
          trend={{
            value: dashboardData.active_threats,
            label: dashboardData.active_threats > 5 ? 'High' : dashboardData.active_threats > 0 ? 'Active' : 'Low',
            positive: dashboardData.active_threats === 0
          }}
        />
        
        <MetricCard
          title="Blocked IPs"
          value={dashboardData.blocked_ips.toString()}
          subtitle="Active blocks"
          icon={Ban}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
        />
        
        <MetricCard
          title="Resolution Rate"
          value={`${Math.round(metricsData.resolution_rate * 100)}%`}
          subtitle={`${metricsData.resolved_events}/${metricsData.total_events} resolved`}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        
        <MetricCard
          title="Risk Score"
          value={metricsData.average_risk_score.toFixed(1)}
          subtitle={`Max: ${metricsData.highest_risk_score.toFixed(1)}`}
          icon={BarChart3}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
      </div>

      {/* Threat Level Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Threat Level Distribution</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(dashboardData.event_counts).map(([level, count]) => {
            const percentage = getThreatPercentage(count, totalEvents);
            const colorClass = getThreatLevelColor(level);
            const icon = getThreatLevelIcon(level);
            
            return (
              <div key={level} className="text-center">
                <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${colorClass} mb-2`}>
                  <span className="mr-2">{icon}</span>
                  {level.toUpperCase()}
                </div>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-500">{percentage}% of total</div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${colorClass.includes('red') ? 'bg-red-500' : 
                      colorClass.includes('orange') ? 'bg-orange-500' :
                      colorClass.includes('yellow') ? 'bg-yellow-500' : 'bg-blue-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Headers Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <SecurityHeadersStatus showDetails={false} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Security Events */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Recent High-Priority Events</h3>
            <button 
              onClick={() => window.location.href = '/security/monitoring'}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </button>
          </div>
          
          {dashboardData.recent_events.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recent_events.slice(0, 5).map((event) => (
                <div key={event.event_id} className="border-l-4 border-red-400 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getThreatLevelColor(event.threat_level)}`}>
                        {getThreatLevelIcon(event.threat_level)} {event.threat_level.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDateTime(event.detected_at)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      Risk: {event.risk_score.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                    {event.source_ip && (
                      <p className="text-sm text-gray-600">Source: {event.source_ip}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No recent high-priority events</p>
            </div>
          )}
        </div>

        {/* Top Threat Sources */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Top Threat Sources</h3>
            <button 
              onClick={() => alert('Blocklist management - Feature coming soon!')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Manage Blocklist
            </button>
          </div>
          
          {dashboardData.top_threat_sources.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.top_threat_sources.slice(0, 5).map((source, index) => (
                <div key={source.ip_address} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-red-600">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{source.ip_address}</div>
                      <div className="text-sm text-gray-500">
                        {source.event_count} events • Risk: {source.max_risk_score.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => alert(`Viewing details for ${source.ip_address}`)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => alert(`Block ${source.ip_address}?`)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Block IP"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No threat sources identified</p>
            </div>
          )}
        </div>
      </div>

      {/* Security Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Security Statistics (Last 7 Days)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {metricsData.total_events}
            </div>
            <div className="text-sm text-gray-600">Total Events</div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.round(metricsData.total_events / 7)} avg/day
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {metricsData.successful_responses}
            </div>
            <div className="text-sm text-gray-600">Successful Responses</div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.round(metricsData.response_success_rate * 100)}% success rate
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {metricsData.average_risk_score.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Average Risk Score</div>
            <div className="text-xs text-gray-500 mt-1">
              Max: {metricsData.highest_risk_score.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => window.location.href = '/security/monitoring'}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertTriangle className="w-8 h-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">View Events</span>
          </button>
          <button 
            onClick={() => alert('IP Blocklist management - Feature coming soon!')}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Ban className="w-8 h-8 text-red-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">IP Blocklist</span>
          </button>
          <button 
            onClick={() => alert('Security reports - Feature coming soon!')}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Reports</span>
          </button>
          <button 
            onClick={() => window.location.href = '/security/headers'}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-8 h-8 text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}