/**
 * Security Events Management Interface for SecureVault
 * 
 * Provides comprehensive security event management with:
 * - Real-time security events monitoring and filtering
 * - Event status management and resolution tracking
 * - Detailed event information and correlation data
 * - Advanced search and filtering capabilities
 * - Bulk operations for event management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Download,
  MoreHorizontal,
  Shield,
  User,
  Globe,
  Calendar,
  Activity,
  TrendingUp,
  FileText,
  ExternalLink
} from 'lucide-react';
import {
  securityApi,
  SecurityEvent,
  SecurityEventListResponse,
  SecurityEventFilters,
  UpdateSecurityEventRequest
} from '../../services/api/security';
import { LoadingSpinner } from '../ui';

interface Props {
  refreshInterval?: number;
  autoRefresh?: boolean;
  showFilters?: boolean;
}

export default function SecurityEventsInterface({
  refreshInterval = 30000, // 30 seconds
  autoRefresh = true,
  showFilters = true
}: Props) {
  // State management
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Filter state
  const [filters, setFilters] = useState<SecurityEventFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Selection and bulk operations
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Available filter options
  const threatLevels = ['low', 'medium', 'high', 'critical'];
  const eventStatuses = ['active', 'investigating', 'resolved', 'false_positive'];
  const eventTypes = [
    'failed_login', 'login', 'logout', 'download', 'upload', 'api_call',
    'admin_access', 'suspicious_access', 'brute_force', 'bulk_download'
  ];

  /**
   * Fetch security events
   */
  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const currentFilters: SecurityEventFilters = {
        ...filters,
        page: currentPage,
        size: pageSize
      };

      const response: SecurityEventListResponse = await securityApi.getSecurityEvents(currentFilters);
      setEvents(response.events);
      setTotalEvents(response.total);
      setLastRefresh(new Date());
    } catch (err: any) {
      // Failed to fetch security events
      setError(err.message || 'Failed to load security events');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, filters]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchEvents();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchEvents, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchEvents, refreshInterval, autoRefresh]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((newFilters: Partial<SecurityEventFilters>) => {
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
   * Update event status
   */
  const updateEventStatus = useCallback(async (eventId: string, updates: UpdateSecurityEventRequest) => {
    try {
      await securityApi.updateSecurityEvent(eventId, updates);
      await fetchEvents(); // Refresh the list
    } catch (err: any) {
      // Failed to update event
      setError(err.message || 'Failed to update event');
    }
  }, [fetchEvents]);

  /**
   * Toggle event selection
   */
  const toggleEventSelection = useCallback((eventId: string) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  }, []);

  /**
   * Toggle event details expansion
   */
  const toggleEventExpansion = useCallback((eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  }, []);

  /**
   * Select all events on current page
   */
  const selectAllEvents = useCallback(() => {
    const eventIds = events.map(event => event.event_id);
    setSelectedEvents(new Set(eventIds));
  }, [events]);

  /**
   * Clear all selections
   */
  const clearSelections = useCallback(() => {
    setSelectedEvents(new Set());
  }, []);

  /**
   * Bulk status update
   */
  const bulkUpdateStatus = useCallback(async (status: string) => {
    try {
      const promises = Array.from(selectedEvents).map(eventId =>
        securityApi.updateSecurityEvent(eventId, { status: status as any })
      );
      await Promise.all(promises);
      await fetchEvents();
      clearSelections();
    } catch (err: any) {
      // Failed to bulk update events
      setError(err.message || 'Failed to bulk update events');
    }
  }, [selectedEvents, fetchEvents, clearSelections]);

  /**
   * Export events as CSV
   */
  const exportEvents = useCallback(() => {
    if (events.length === 0) return;

    const headers = [
      'Event ID', 'Type', 'Threat Level', 'Status', 'Title', 'Source IP',
      'User ID', 'Risk Score', 'Detected At', 'Resolved At'
    ];
    
    const csvContent = [
      headers.join(','),
      ...events.map(event => [
        event.event_id,
        event.event_type,
        event.threat_level,
        event.status,
        `"${event.title}"`,
        event.source_ip || '',
        event.user_id || '',
        event.risk_score,
        event.detected_at,
        event.resolved_at || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-events-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, [events]);

  /**
   * Get event status icon and color
   */
  const getEventStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return { icon: AlertTriangle, color: 'text-red-500' };
      case 'investigating':
        return { icon: Clock, color: 'text-yellow-500' };
      case 'resolved':
        return { icon: CheckCircle, color: 'text-green-500' };
      case 'false_positive':
        return { icon: XCircle, color: 'text-gray-500' };
      default:
        return { icon: AlertTriangle, color: 'text-gray-500' };
    }
  };

  const totalPages = Math.ceil(totalEvents / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <span>Security Events</span>
          </h2>
          <p className="text-gray-600">Monitor and manage security threats and incidents</p>
        </div>
        <div className="flex items-center space-x-3">
          {lastRefresh && (
            <div className="text-sm text-gray-500 flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Updated: {lastRefresh.toLocaleTimeString()}</span>
            </div>
          )}
          <button
            onClick={exportEvents}
            disabled={events.length === 0}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={fetchEvents}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              {showAdvancedFilters ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Hide Advanced
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show Advanced
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
                    placeholder="Search events by title, IP, or event ID..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <select
                value={filters.threat_level || ''}
                onChange={(e) => handleFilterChange({ threat_level: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Threat Levels</option>
                {threatLevels.map(level => (
                  <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                ))}
              </select>
              
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                {eventStatuses.map(status => (
                  <option key={status} value={status}>
                    {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <select
                    value={filters.event_type || ''}
                    onChange={(e) => handleFilterChange({ event_type: e.target.value || undefined })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    {eventTypes.map(type => (
                      <option key={type} value={type}>
                        {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source IP</label>
                  <input
                    type="text"
                    value={filters.source_ip || ''}
                    onChange={(e) => handleFilterChange({ source_ip: e.target.value || undefined })}
                    placeholder="e.g., 192.168.1.1"
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
                  <span>Filtering active - {totalEvents} results</span>
                ) : (
                  <span>Showing all results - {totalEvents} total</span>
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

      {/* Bulk Actions */}
      {selectedEvents.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-800">
                {selectedEvents.size} events selected
              </span>
              <button
                onClick={clearSelections}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => bulkUpdateStatus('investigating')}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
              >
                Mark Investigating
              </button>
              <button
                onClick={() => bulkUpdateStatus('resolved')}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Mark Resolved
              </button>
              <button
                onClick={() => bulkUpdateStatus('false_positive')}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Mark False Positive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Events Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedEvents.size === events.length && events.length > 0}
                    onChange={() => selectedEvents.size === events.length ? clearSelections() : selectAllEvents()}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {events.length} of {totalEvents} events
                  </span>
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
                  </select>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {events.map((event) => {
                const isSelected = selectedEvents.has(event.event_id);
                const isExpanded = expandedEvents.has(event.event_id);
                const statusInfo = getEventStatusIcon(event.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <React.Fragment key={event.event_id}>
                    <div className={`p-6 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEventSelection(event.event_id)}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${securityApi.getThreatLevelColor(event.threat_level)}`}>
                                {securityApi.getThreatLevelIcon(event.threat_level)} {event.threat_level.toUpperCase()}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${securityApi.getStatusColor(event.status)}`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {event.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                              </span>
                              <span className="text-sm text-gray-500">
                                {securityApi.formatDateTime(event.detected_at)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                Risk: {event.risk_score.toFixed(1)}
                              </span>
                              <button
                                onClick={() => toggleEventExpansion(event.event_id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5" />
                                ) : (
                                  <ChevronDown className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            <h4 className="text-lg font-medium text-gray-900">{event.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          </div>
                          
                          <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
                            {event.source_ip && (
                              <div className="flex items-center space-x-1">
                                <Globe className="w-4 h-4" />
                                <span>{event.source_ip}</span>
                              </div>
                            )}
                            {event.user_id && (
                              <div className="flex items-center space-x-1">
                                <User className="w-4 h-4" />
                                <span>User {event.user_id}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Activity className="w-4 h-4" />
                              <span>{event.event_type.replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Shield className="w-4 h-4" />
                              <span>{event.detection_method}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Event Details</h5>
                            <div className="space-y-2 text-sm">
                              <div><span className="font-medium">Event ID:</span> {event.event_id}</div>
                              <div><span className="font-medium">Detection Rule:</span> {event.detection_rule || 'N/A'}</div>
                              <div><span className="font-medium">Confidence:</span> {Math.round(event.confidence * 100)}%</div>
                              {event.document_id && (
                                <div><span className="font-medium">Document ID:</span> {event.document_id}</div>
                              )}
                              {event.resolved_at && (
                                <div><span className="font-medium">Resolved At:</span> {securityApi.formatDateTime(event.resolved_at)}</div>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Additional Data</h5>
                            {Object.keys(event.additional_data).length > 0 ? (
                              <pre className="text-xs bg-white border rounded p-2 overflow-x-auto">
                                {JSON.stringify(event.additional_data, null, 2)}
                              </pre>
                            ) : (
                              <p className="text-sm text-gray-500">No additional data available</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-4 flex items-center space-x-2">
                          {event.status === 'active' && (
                            <>
                              <button
                                onClick={() => updateEventStatus(event.event_id, { status: 'investigating' })}
                                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                              >
                                Start Investigation
                              </button>
                              <button
                                onClick={() => updateEventStatus(event.event_id, { status: 'false_positive' })}
                                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                              >
                                Mark False Positive
                              </button>
                            </>
                          )}
                          {event.status === 'investigating' && (
                            <button
                              onClick={() => updateEventStatus(event.event_id, { status: 'resolved' })}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
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
                          {Math.min(currentPage * pageSize, totalEvents)}
                        </span>
                        {' '}of{' '}
                        <span className="font-medium">{totalEvents}</span>
                        {' '}results
                      </p>
                    </div>
                    <div>
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

      {/* Empty State */}
      {!isLoading && events.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No security events found</h3>
          <p className="text-gray-500">
            {Object.keys(filters).length > 0 || searchQuery
              ? 'Try adjusting your filters or search terms'
              : 'Security events will appear here when threats are detected'
            }
          </p>
        </div>
      )}
    </div>
  );
}