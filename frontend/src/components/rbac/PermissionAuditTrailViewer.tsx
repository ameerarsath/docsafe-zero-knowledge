/**
 * Permission Audit Trail Viewer Component
 * 
 * Comprehensive audit trail viewer for RBAC permission changes,
 * role assignments, and access events with advanced filtering and search.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  FileText,
  Clock,
  User,
  ShieldCheck,
  Key,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
  Eye,
  Download,
  Calendar,
  Settings
} from 'lucide-react';

import { rbacService } from '../../services/rbacService';
import LoadingSpinner from '../ui/LoadingSpinner';

// Audit trail types
interface AuditEvent {
  id: string;
  timestamp: string;
  event_type: 'role_assigned' | 'role_revoked' | 'permission_granted' | 'permission_denied' | 'access_attempt' | 'login' | 'logout' | 'role_created' | 'role_updated' | 'role_deleted';
  user_id: number;
  username: string;
  target_user_id?: number;
  target_username?: string;
  role_name?: string;
  permission_name?: string;
  resource?: string;
  action?: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface AuditFilters {
  event_types: string[];
  users: number[];
  success?: boolean;
  start_date?: string;
  end_date?: string;
  search_query?: string;
  resource?: string;
  role?: string;
  permission?: string;
}

interface PermissionAuditTrailViewerProps {
  userId?: number;
  maxEvents?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showExport?: boolean;
  compact?: boolean;
}

const PermissionAuditTrailViewer: React.FC<PermissionAuditTrailViewerProps> = ({
  userId,
  maxEvents = 100,
  autoRefresh = false,
  refreshInterval = 30000,
  showExport = true,
  compact = false
}) => {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>([]);
  const [filters, setFilters] = useState<AuditFilters>({
    event_types: [],
    users: userId ? [userId] : []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [eventsPerPage, setEventsPerPage] = useState(compact ? 10 : 25);

  // Event type options
  const eventTypeOptions = [
    { value: 'role_assigned', label: 'Role Assigned', icon: '👤', color: 'text-green-600' },
    { value: 'role_revoked', label: 'Role Revoked', icon: '❌', color: 'text-red-600' },
    { value: 'permission_granted', label: 'Permission Granted', icon: '✅', color: 'text-green-600' },
    { value: 'permission_denied', label: 'Permission Denied', icon: '🚫', color: 'text-red-600' },
    { value: 'access_attempt', label: 'Access Attempt', icon: '🔍', color: 'text-blue-600' },
    { value: 'login', label: 'Login', icon: '🔐', color: 'text-blue-600' },
    { value: 'logout', label: 'Logout', icon: '🚪', color: 'text-gray-600' },
    { value: 'role_created', label: 'Role Created', icon: '🆕', color: 'text-green-600' },
    { value: 'role_updated', label: 'Role Updated', icon: '✏️', color: 'text-yellow-600' },
    { value: 'role_deleted', label: 'Role Deleted', icon: '🗑️', color: 'text-red-600' }
  ];

  // Load audit events
  const loadAuditEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Mock API call - replace with actual RBAC service call
      const mockEvents: AuditEvent[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          event_type: 'role_assigned',
          user_id: 1,
          username: 'arahuman',
          target_user_id: 2,
          target_username: 'mfah',
          role_name: 'manager',
          success: true,
          ip_address: '192.168.1.100',
          details: { previous_role: 'user', reason: 'Promotion' }
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          event_type: 'permission_denied',
          user_id: 2,
          username: 'mfah',
          permission_name: 'users:delete',
          resource: 'users',
          action: 'delete',
          success: false,
          ip_address: '192.168.1.101',
          details: { required_role: 'admin', current_role: 'user' }
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          event_type: 'login',
          user_id: 3,
          username: 'zr',
          success: true,
          ip_address: '192.168.1.102',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          event_type: 'access_attempt',
          user_id: 4,
          username: 'mfaiz',
          resource: 'admin_panel',
          action: 'view',
          success: false,
          ip_address: '192.168.1.103',
          details: { required_level: 4, current_level: 2 }
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 18000000).toISOString(),
          event_type: 'role_created',
          user_id: 1,
          username: 'arahuman',
          role_name: 'document_reviewer',
          success: true,
          details: { hierarchy_level: 2, permissions: ['documents:read', 'documents:review'] }
        }
      ];

      setAuditEvents(mockEvents);
    } catch (err) {
      setError('Failed to load audit events');
    } finally {
      setIsLoading(false);
    }
  }, [userId, maxEvents, filters]);

  // Filter events based on current filters and search
  useEffect(() => {
    let filtered = [...auditEvents];

    // Apply filters
    if (filters.event_types.length > 0) {
      filtered = filtered.filter(event => filters.event_types.includes(event.event_type));
    }

    if (filters.users.length > 0) {
      filtered = filtered.filter(event => 
        filters.users.includes(event.user_id) || 
        (event.target_user_id && filters.users.includes(event.target_user_id))
      );
    }

    if (filters.success !== undefined) {
      filtered = filtered.filter(event => event.success === filters.success);
    }

    if (filters.start_date) {
      filtered = filtered.filter(event => 
        new Date(event.timestamp) >= new Date(filters.start_date!)
      );
    }

    if (filters.end_date) {
      filtered = filtered.filter(event => 
        new Date(event.timestamp) <= new Date(filters.end_date!)
      );
    }

    if (filters.resource) {
      filtered = filtered.filter(event => 
        event.resource?.toLowerCase().includes(filters.resource!.toLowerCase())
      );
    }

    if (filters.role) {
      filtered = filtered.filter(event => 
        event.role_name?.toLowerCase().includes(filters.role!.toLowerCase())
      );
    }

    if (filters.permission) {
      filtered = filtered.filter(event => 
        event.permission_name?.toLowerCase().includes(filters.permission!.toLowerCase())
      );
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.username.toLowerCase().includes(query) ||
        event.target_username?.toLowerCase().includes(query) ||
        event.role_name?.toLowerCase().includes(query) ||
        event.permission_name?.toLowerCase().includes(query) ||
        event.resource?.toLowerCase().includes(query) ||
        event.ip_address?.includes(query)
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setFilteredEvents(filtered);
    setCurrentPage(1);
  }, [auditEvents, filters, searchQuery]);

  // Load data on mount
  useEffect(() => {
    loadAuditEvents();
  }, [loadAuditEvents]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadAuditEvents, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, loadAuditEvents]);

  // Get event type info
  const getEventTypeInfo = (eventType: string) => {
    return eventTypeOptions.find(option => option.value === eventType) || {
      value: eventType,
      label: eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: '📝',
      color: 'text-gray-600'
    };
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      const minutes = Math.floor(diffMs / (1000 * 60));
      return `${minutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)} hours ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)} days ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  };

  // Export audit data
  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Event Type', 'User', 'Target User', 'Role', 'Permission', 'Resource', 'Success', 'IP Address'].join(','),
      ...filteredEvents.map(event => [
        event.timestamp,
        event.event_type,
        event.username,
        event.target_username || '',
        event.role_name || '',
        event.permission_name || '',
        event.resource || '',
        event.success.toString(),
        event.ip_address || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * eventsPerPage,
    currentPage * eventsPerPage
  );

  const renderEventRow = (event: AuditEvent) => {
    const eventInfo = getEventTypeInfo(event.event_type);
    
    return (
      <tr
        key={event.id}
        className={`hover:bg-gray-50 cursor-pointer ${
          !event.success ? 'bg-red-50' : ''
        }`}
        onClick={() => setSelectedEvent(event)}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <span className="text-lg mr-2">{eventInfo.icon}</span>
            <div>
              <div className={`text-sm font-medium ${eventInfo.color}`}>
                {eventInfo.label}
              </div>
              <div className="text-xs text-gray-500">
                {formatTimestamp(event.timestamp)}
              </div>
            </div>
          </div>
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <User className="h-4 w-4 text-gray-400 mr-2" />
            <div>
              <div className="text-sm font-medium text-gray-900">{event.username}</div>
              {event.target_username && (
                <div className="text-xs text-gray-500">→ {event.target_username}</div>
              )}
            </div>
          </div>
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {event.role_name && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {event.role_name}
            </span>
          )}
          {event.permission_name && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {event.permission_name}
            </span>
          )}
          {event.resource && (
            <div className="text-xs text-gray-500 mt-1">{event.resource}</div>
          )}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap">
          {event.success ? (
            <CheckCircle className="h-5 w-5 text-green-400" />
          ) : (
            <X className="h-5 w-5 text-red-400" />
          )}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {event.ip_address}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button className="text-blue-600 hover:text-blue-900">
            <Eye className="h-4 w-4" />
          </button>
        </td>
      </tr>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">Loading audit trail...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permission Audit Trail</h1>
          <p className="text-gray-600">
            {filteredEvents.length} events {userId ? `for user ${userId}` : 'system-wide'}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              showFilters ? 'bg-gray-100' : ''
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          
          <button
            onClick={loadAuditEvents}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          
          {showExport && (
            <button
              onClick={handleExport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search events by user, role, permission, resource, or IP address..."
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Event Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Types
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {eventTypeOptions.map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.event_types.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({
                            ...prev,
                            event_types: [...prev.event_types, option.value]
                          }));
                        } else {
                          setFilters(prev => ({
                            ...prev,
                            event_types: prev.event_types.filter(t => t !== option.value)
                          }));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {option.icon} {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Success Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Result
              </label>
              <select
                value={filters.success === undefined ? '' : filters.success.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters(prev => ({
                    ...prev,
                    success: value === '' ? undefined : value === 'true'
                  }));
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Results</option>
                <option value="true">Success Only</option>
                <option value="false">Failed Only</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  start_date: e.target.value || undefined
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  end_date: e.target.value || undefined
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setFilters({ event_types: [], users: userId ? [userId] : [] });
                setSearchQuery('');
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No audit events</h3>
            <p className="mt-1 text-sm text-gray-500">
              No events match your current filters.
            </p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedEvents.map(renderEventRow)}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(currentPage - 1) * eventsPerPage + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * eventsPerPage, filteredEvents.length)}
                      </span>{' '}
                      of <span className="font-medium">{filteredEvents.length}</span> results
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
            )}
          </>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Event Details
                </h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Event Type</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {getEventTypeInfo(selectedEvent.event_type).label}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(selectedEvent.timestamp).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">User</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedEvent.username}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Result</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {selectedEvent.success ? 'Success' : 'Failed'}
                    </dd>
                  </div>
                </div>
                
                {selectedEvent.details && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Details</dt>
                    <dd className="mt-1">
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                        {JSON.stringify(selectedEvent.details, null, 2)}
                      </pre>
                    </dd>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionAuditTrailViewer;