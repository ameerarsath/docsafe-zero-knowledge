/**
 * Audit and Compliance Interface Component for SecureVault Admin
 * 
 * Comprehensive audit and compliance management with:
 * - Activity log viewer with advanced filtering and search
 * - Compliance report generator with multiple formats
 * - Export functionality for audit data and reports
 * - Advanced filtering and search capabilities
 * - Real-time log monitoring and alerts
 * - Compliance dashboard with key metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSearch,
  Download,
  Filter,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  FileText,
  BarChart3,
  TrendingUp,
  Shield,
  Eye,
  Settings,
  Archive,
  Database,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import {
  adminService,
  AuditLog,
  ComplianceReport
} from '../../services/adminService';
import { LoadingSpinner } from '../ui';

interface Props {
  refreshInterval?: number;
  defaultFilters?: AuditFilters;
  showReportsSection?: boolean;
}

interface AuditFilters {
  user_id?: number;
  action?: string;
  start_date?: string;
  end_date?: string;
  success?: boolean;
}

interface ComplianceReportParams {
  report_type: string;
  start_date: string;
  end_date: string;
  format: 'json' | 'csv';
}

export default function AuditComplianceInterface({ 
  refreshInterval = 30000, // 30 seconds
  defaultFilters = {},
  showReportsSection = false
}: Props) {
  // State management
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Filter state
  const [filters, setFilters] = useState<AuditFilters>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Report generation state
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportParams, setReportParams] = useState<ComplianceReportParams>({
    report_type: 'activity',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end_date: new Date().toISOString().split('T')[0], // today
    format: 'json'
  });

  // Expanded log details
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  // Available actions for filtering
  const availableActions = [
    'read', 'write', 'delete', 'download', 'share', 'move', 'copy', 'login', 'logout'
  ];

  /**
   * Fetch audit logs from API
   */
  const fetchAuditLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params: any = {
        page: currentPage,
        size: pageSize,
        ...filters
      };

      const response = await adminService.getAuditLogs(params);
      setAuditLogs(response.logs);
      setTotalLogs(response.total);
      setLastRefresh(new Date());
    } catch (err: any) {
      // Failed to fetch audit logs
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, filters]);

  // Load audit logs on component mount and dependency changes
  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchAuditLogs, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAuditLogs, refreshInterval]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((newFilters: Partial<AuditFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  /**
   * Generate compliance report
   */
  const generateReport = useCallback(async () => {
    try {
      setGeneratingReport(true);
      
      const report = await adminService.generateComplianceReport(reportParams);
      
      // Create download link
      const dataStr = JSON.stringify(report.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-report-${report.report_id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
    } catch (err: any) {
      // Failed to generate report
      setError(err.message || 'Failed to generate compliance report');
    } finally {
      setGeneratingReport(false);
    }
  }, [reportParams]);

  /**
   * Export audit logs as CSV
   */
  const exportAuditLogs = useCallback(() => {
    if (auditLogs.length === 0) return;

    const headers = [
      'ID', 'Timestamp', 'User ID', 'Action', 'Document ID', 
      'Success', 'IP Address', 'User Agent', 'Error Message'
    ];
    
    const csvContent = [
      headers.join(','),
      ...auditLogs.map(log => [
        log.id,
        log.accessed_at,
        log.user_id,
        log.action,
        log.document_id || '',
        log.success,
        log.ip_address || '',
        log.user_agent || '',
        log.error_message || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, [auditLogs]);

  /**
   * Toggle expanded log details
   */
  const toggleLogDetails = useCallback((logId: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  }, []);

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  /**
   * Get action icon and color
   */
  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'read':
      case 'download':
        return { icon: Eye, color: 'text-blue-600' };
      case 'write':
      case 'upload':
        return { icon: FileText, color: 'text-green-600' };
      case 'delete':
        return { icon: XCircle, color: 'text-red-600' };
      case 'share':
        return { icon: ExternalLink, color: 'text-purple-600' };
      case 'login':
        return { icon: CheckCircle, color: 'text-green-600' };
      case 'logout':
        return { icon: XCircle, color: 'text-gray-600' };
      default:
        return { icon: Activity, color: 'text-gray-600' };
    }
  };

  /**
   * Get success status badge
   */
  const getSuccessBadge = (success: boolean) => {
    if (success) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Success
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </span>
      );
    }
  };

  const totalPages = Math.ceil(totalLogs / pageSize);

  return (
    <div className="space-y-6">
      {showReportsSection && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Security Reports</h2>
            <p className="text-gray-600">Generate compliance and security reports</p>
          </div>
        </div>
      )}

      {!showReportsSection && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
            <p className="text-gray-600">Monitor system activity and access logs</p>
          </div>
          <div className="flex items-center space-x-3">
            {lastRefresh && (
              <div className="text-sm text-gray-500 flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
              </div>
            )}
            <button
              onClick={exportAuditLogs}
              disabled={auditLogs.length === 0}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={fetchAuditLogs}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Compliance Report Generator - Only show when showReportsSection is true */}
      {showReportsSection && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Compliance Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={reportParams.report_type}
                onChange={(e) => setReportParams(prev => ({ ...prev, report_type: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="activity">Activity Report</option>
                <option value="security">Security Report</option>
                <option value="compliance">Compliance Report</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={reportParams.start_date}
                onChange={(e) => setReportParams(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={reportParams.end_date}
                onChange={(e) => setReportParams(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={generatingReport}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {generatingReport ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters - Only show when showReportsSection is false */}
      {!showReportsSection && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Audit Log Filters</h3>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            {showAdvancedFilters ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Hide Filters
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show Filters
              </>
            )}
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search audit logs..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <select
              value={filters.action || ''}
              onChange={(e) => handleFilterChange({ action: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Actions</option>
              {availableActions.map(action => (
                <option key={action} value={action}>{action.charAt(0).toUpperCase() + action.slice(1)}</option>
              ))}
            </select>
            
            <select
              value={filters.success === undefined ? '' : filters.success.toString()}
              onChange={(e) => handleFilterChange({ 
                success: e.target.value === '' ? undefined : e.target.value === 'true' 
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Results</option>
              <option value="true">Success Only</option>
              <option value="false">Failed Only</option>
            </select>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                <input
                  type="number"
                  value={filters.user_id || ''}
                  onChange={(e) => handleFilterChange({ 
                    user_id: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  placeholder="Filter by user ID"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="datetime-local"
                  value={filters.start_date || ''}
                  onChange={(e) => handleFilterChange({ start_date: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="datetime-local"
                  value={filters.end_date || ''}
                  onChange={(e) => handleFilterChange({ end_date: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Filter Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {Object.keys(filters).length > 0 || searchQuery ? (
                <span>Filtering active - {totalLogs} results</span>
              ) : (
                <span>Showing all results - {totalLogs} total</span>
              )}
            </div>
            {(Object.keys(filters).length > 0 || searchQuery) && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Error Display - Only show when showReportsSection is false */}
      {!showReportsSection && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Audit Logs Table - Only show when showReportsSection is false */}
      {!showReportsSection && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log) => {
                    const actionInfo = getActionIcon(log.action);
                    const ActionIcon = actionInfo.icon;
                    const isExpanded = expandedLogs.has(log.id);
                    
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(log.accessed_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            User {log.user_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <ActionIcon className={`w-4 h-4 ${actionInfo.color}`} />
                              <span className="text-sm text-gray-900 capitalize">{log.action}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.document_id ? `Doc ${log.document_id}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getSuccessBadge(log.success)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.ip_address || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleLogDetails(log.id)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded Details */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-2 text-sm">
                                {log.access_method && (
                                  <div><strong>Access Method:</strong> {log.access_method}</div>
                                )}
                                {log.user_agent && (
                                  <div><strong>User Agent:</strong> {log.user_agent}</div>
                                )}
                                {log.error_message && (
                                  <div className="text-red-600">
                                    <strong>Error:</strong> {log.error_message}
                                  </div>
                                )}
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <div>
                                    <strong>Additional Details:</strong>
                                    <pre className="mt-1 p-2 bg-white border rounded text-xs overflow-x-auto">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
                        {' '}-{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * pageSize, totalLogs)}
                        </span>
                        {' '}of{' '}
                        <span className="font-medium">{totalLogs}</span>
                        {' '}results
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="25">25 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                        <option value="200">200 per page</option>
                      </select>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      )}

      {/* Empty State - Only show when showReportsSection is false */}
      {!showReportsSection && !isLoading && auditLogs.length === 0 && (
        <div className="text-center py-12">
          <FileSearch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
          <p className="text-gray-500">
            {Object.keys(filters).length > 0 || searchQuery
              ? 'Try adjusting your filters or search terms'
              : 'Audit logs will appear here as system activity occurs'
            }
          </p>
        </div>
      )}
    </div>
  );
}