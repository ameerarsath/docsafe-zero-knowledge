/**
 * Activity Feed Component
 * 
 * Reusable component for displaying activity logs, recent actions, and timeline events
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  icon?: LucideIcon;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  title?: string;
  showUser?: boolean;
  maxItems?: number;
  className?: string;
  emptyMessage?: string;
  viewAllLink?: string;
  onItemClick?: (item: ActivityItem) => void;
}

export default function ActivityFeed({
  items,
  title = 'Recent Activity',
  showUser = true,
  maxItems,
  className = '',
  emptyMessage = 'No recent activity',
  viewAllLink,
  onItemClick
}: ActivityFeedProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-600';
      case 'warning': return 'bg-yellow-100 text-yellow-600';
      case 'error': return 'bg-red-100 text-red-600';
      case 'info': return 'bg-blue-100 text-blue-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusDot = (status?: string) => {
    switch (status) {
      case 'success': return 'bg-green-400';
      case 'warning': return 'bg-yellow-400';
      case 'error': return 'bg-red-400';
      case 'info': return 'bg-blue-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {viewAllLink && (
              <a
                href={viewAllLink}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all
              </a>
            )}
          </div>
        </div>
      )}

      <div className="p-6">
        {displayItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3-6h3m-3 3h3m-3 3h3M6.75 6.75h.75v.75h-.75v-.75zM6.75 9.75h.75v.75h-.75v-.75zM6.75 12.75h.75v.75h-.75v-.75z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-start space-x-4 ${
                  onItemClick ? 'cursor-pointer hover:bg-gray-50 -mx-3 px-3 py-2 rounded-lg' : ''
                }`}
                onClick={() => onItemClick?.(item)}
              >
                {/* Activity indicator */}
                <div className="flex flex-col items-center">
                  {item.icon ? (
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getStatusColor(item.status)}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className={`h-3 w-3 rounded-full ${getStatusDot(item.status)}`} />
                  )}
                  
                  {/* Connecting line (except for last item) */}
                  {index < displayItems.length - 1 && (
                    <div className="w-px h-6 bg-gray-200 mt-2" />
                  )}
                </div>

                {/* Activity content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center mt-2 text-xs text-gray-500 space-x-2">
                        <span>{item.timestamp}</span>
                        {showUser && item.user && (
                          <>
                            <span>•</span>
                            <span>{item.user}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}