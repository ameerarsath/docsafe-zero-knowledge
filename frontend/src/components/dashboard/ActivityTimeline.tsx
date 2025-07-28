/**
 * Activity Timeline Component
 * 
 * Displays recent system activity in a timeline format with
 * real-time updates and filtering capabilities.
 */

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  FileText, 
  Folder, 
  UserPlus, 
  LogIn, 
  Share2, 
  Trash2,
  Edit,
  Eye,
  Upload,
  Download,
  Shield
} from 'lucide-react';

interface ActivityEvent {
  id: string;
  timestamp: string;
  user_id: number;
  username: string;
  action: string;
  resource_type: string;
  resource_name: string;
  details?: string;
}

interface ActivityTimelineProps {
  events?: ActivityEvent[];
  maxEvents?: number;
  showUserFilter?: boolean;
  refreshInterval?: number;
}

export default function ActivityTimeline({ 
  events = [], 
  maxEvents = 10,
  showUserFilter = false,
  refreshInterval = 30000 
}: ActivityTimelineProps) {
  const [filteredEvents, setFilteredEvents] = useState<ActivityEvent[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Filter events based on selected user
  useEffect(() => {
    let filtered = events;
    
    if (selectedUser !== 'all') {
      filtered = events.filter(event => event.username === selectedUser);
    }
    
    // Sort by timestamp (most recent first) and limit
    filtered = filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxEvents);
    
    setFilteredEvents(filtered);
  }, [events, selectedUser, maxEvents]);

  // Get unique users for filter
  const uniqueUsers = [...new Set(events.map(event => event.username))];

  // Get icon for action type
  const getActionIcon = (action: string, resourceType: string) => {
    const iconClass = "w-4 h-4";
    
    switch (action) {
      case 'create':
        return resourceType === 'folder' ? 
          <Folder className={`${iconClass} text-green-600`} /> : 
          <FileText className={`${iconClass} text-green-600`} />;
      case 'upload':
        return <Upload className={`${iconClass} text-blue-600`} />;
      case 'download':
        return <Download className={`${iconClass} text-purple-600`} />;
      case 'edit':
      case 'update':
        return <Edit className={`${iconClass} text-orange-600`} />;
      case 'delete':
        return <Trash2 className={`${iconClass} text-red-600`} />;
      case 'share':
        return <Share2 className={`${iconClass} text-indigo-600`} />;
      case 'view':
      case 'read':
        return <Eye className={`${iconClass} text-gray-600`} />;
      case 'login':
        return <LogIn className={`${iconClass} text-green-600`} />;
      case 'register':
        return <UserPlus className={`${iconClass} text-blue-600`} />;
      case 'encrypt':
      case 'decrypt':
        return <Shield className={`${iconClass} text-purple-600`} />;
      default:
        return <Clock className={`${iconClass} text-gray-600`} />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Get action description
  const getActionDescription = (event: ActivityEvent) => {
    const { action, resource_type, resource_name, username } = event;
    
    switch (action) {
      case 'create':
        return `${username} created ${resource_type} "${resource_name}"`;
      case 'upload':
        return `${username} uploaded "${resource_name}"`;
      case 'download':
        return `${username} downloaded "${resource_name}"`;
      case 'edit':
      case 'update':
        return `${username} modified "${resource_name}"`;
      case 'delete':
        return `${username} deleted "${resource_name}"`;
      case 'share':
        return `${username} shared "${resource_name}"`;
      case 'view':
      case 'read':
        return `${username} viewed "${resource_name}"`;
      case 'login':
        return `${username} logged in`;
      case 'register':
        return `${username} registered`;
      default:
        return `${username} performed ${action} on "${resource_name}"`;
    }
  };

  // Auto-refresh indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Mock data for demonstration if no events provided
  const mockEvents: ActivityEvent[] = events.length === 0 ? [
    {
      id: '1',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      user_id: 1,
      username: 'john_doe',
      action: 'upload',
      resource_type: 'document',
      resource_name: 'project_report.pdf'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      user_id: 2,
      username: 'jane_smith',
      action: 'create',
      resource_type: 'folder',
      resource_name: 'Client Documents'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      user_id: 1,
      username: 'john_doe',
      action: 'share',
      resource_type: 'document',
      resource_name: 'meeting_notes.docx'
    }
  ] : filteredEvents;

  const displayEvents = events.length === 0 ? mockEvents : filteredEvents;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        <div className="flex items-center space-x-4">
          {showUserFilter && uniqueUsers.length > 1 && (
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          )}
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            Updated {formatTimestamp(lastUpdate.toISOString())}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {displayEvents.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No recent activity</p>
          </div>
        ) : (
          displayEvents.map((event) => (
            <div key={event.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                {getActionIcon(event.action, event.resource_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  {getActionDescription(event)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTimestamp(event.timestamp)}
                </p>
                {event.details && (
                  <p className="text-xs text-gray-400 mt-1">
                    {event.details}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {displayEvents.length >= maxEvents && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="text-sm text-blue-600 hover:text-blue-800">
            View all activity →
          </button>
        </div>
      )}
    </div>
  );
}