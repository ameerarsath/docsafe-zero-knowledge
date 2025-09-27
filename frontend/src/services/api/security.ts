/**
 * Security API service for SecureVault frontend.
 * 
 * Provides methods for:
 * - Security event management
 * - Threat response operations
 * - IP blocklist management
 * - Security metrics and dashboard data
 * - Security alerts and notifications
 */

import { apiRequest } from '../api';

// Types
export interface SecurityEvent {
  id: number;
  event_id: string;
  event_type: string;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  title: string;
  description: string;
  source_ip?: string;
  user_id?: number;
  document_id?: number;
  risk_score: number;
  confidence: number;
  detection_method: string;
  detection_rule?: string;
  detected_at: string;
  resolved_at?: string;
  additional_data: Record<string, any>;
}

export interface SecurityEventListResponse {
  events: SecurityEvent[];
  total: number;
  page: number;
  size: number;
  has_next: boolean;
}

export interface ThreatResponse {
  id: number;
  response_id: string;
  event_id: string;
  action: 'log_only' | 'alert' | 'rate_limit' | 'block_ip' | 'disable_user' | 'require_mfa';
  target_type: string;
  target_value: string;
  duration_minutes?: number;
  executed_at: string;
  executed_by: string;
  success: boolean;
  error_message?: string;
  reversed_at?: string;
}

export interface SecurityAlert {
  id: number;
  alert_id: string;
  event_id: string;
  alert_type: string;
  recipient: string;
  subject: string;
  message: string;
  sent_at?: string;
  delivered_at?: string;
  delivery_status: string;
  viewed_at?: string;
  acknowledged_at?: string;
}

export interface IPBlocklistEntry {
  id: number;
  ip_address: string;
  reason: string;
  blocked_at: string;
  blocked_by: string;
  expires_at?: string;
  is_permanent: boolean;
  block_count: number;
  is_active: boolean;
}

export interface SecurityMetrics {
  period_days: number;
  total_events: number;
  resolved_events: number;
  resolution_rate: number;
  total_responses: number;
  successful_responses: number;
  response_success_rate: number;
  average_risk_score: number;
  highest_risk_score: number;
  threat_level_distribution: Record<string, number>;
}

export interface SecurityDashboard {
  period_hours: number;
  event_counts: Record<string, number>;
  active_threats: number;
  blocked_ips: number;
  recent_events: Array<{
    event_id: string;
    title: string;
    threat_level: string;
    source_ip?: string;
    detected_at: string;
    risk_score: number;
  }>;
  top_threat_sources: Array<{
    ip_address: string;
    event_count: number;
    max_risk_score: number;
  }>;
}

export interface SecurityEventFilters {
  threat_level?: string;
  event_type?: string;
  status?: string;
  source_ip?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  size?: number;
}

export interface CreateSecurityEventRequest {
  event_type: string;
  source_ip?: string;
  user_id?: number;
  user_agent?: string;
  session_id?: string;
  timestamp?: string;
  additional_data?: Record<string, any>;
}

export interface UpdateSecurityEventRequest {
  status?: 'active' | 'investigating' | 'resolved' | 'false_positive';
  resolution_notes?: string;
}

export interface IPBlockRequest {
  ip_address: string;
  reason: string;
  expires_at?: string;
  is_permanent?: boolean;
}

// Security API service
export const securityApi = {
  // Security Events
  async getSecurityEvents(filters: SecurityEventFilters = {}): Promise<SecurityEventListResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await apiRequest('GET', `/security/events?${params.toString()}`);
    return response.data;
  },

  async getSecurityEvent(eventId: string): Promise<SecurityEvent> {
    const response = await apiRequest('GET', `/security/events/${eventId}`);
    return response.data;
  },

  async updateSecurityEvent(eventId: string, data: UpdateSecurityEventRequest): Promise<SecurityEvent> {
    const response = await apiRequest('PUT', `/security/events/${eventId}`, data);
    return response.data;
  },

  async analyzeSecurityEvent(data: CreateSecurityEventRequest): Promise<{
    analyzed: boolean;
    event_created: boolean;
    event_id?: string;
    threat_level?: string;
    risk_score?: number;
    message?: string;
  }> {
    const response = await apiRequest('POST', '/security/events/analyze', data);
    return response.data;
  },

  // Security Dashboard
  async getSecurityDashboard(hours: number = 24): Promise<SecurityDashboard> {
    console.log('🔐 Requesting security dashboard (hours:', hours, ')');
    const response = await apiRequest('GET', `/api/v1/security/dashboard?hours=${hours}`);
    if (!response.success) {
      const error = response.error;
      console.error('🚨 Security dashboard request failed:', error);
      
      // Create a custom error with status code for role-based handling
      const customError = new Error(error?.detail || 'Failed to load security dashboard');
      (customError as any).statusCode = error?.status_code;
      (customError as any).errorCode = error?.error_code;
      throw customError;
    }
    return response.data;
  },

  async getSecurityMetrics(days: number = 7): Promise<SecurityMetrics> {
    console.log('🔐 Requesting security metrics (days:', days, ')');
    const response = await apiRequest('GET', `/api/v1/security/metrics?days=${days}`);
    if (!response.success) {
      const error = response.error;
      console.error('🚨 Security metrics request failed:', error);
      
      const customError = new Error(error?.detail || 'Failed to load security metrics');
      (customError as any).statusCode = error?.status_code;
      (customError as any).errorCode = error?.error_code;
      throw customError;
    }
    return response.data;
  },

  // IP Blocklist Management
  async getIPBlocklist(activeOnly: boolean = true): Promise<IPBlocklistEntry[]> {
    const response = await apiRequest('GET', `/security/blocklist?active_only=${activeOnly}`);
    return response.data;
  },

  async blockIPAddress(data: IPBlockRequest): Promise<IPBlocklistEntry> {
    const response = await apiRequest('POST', '/security/blocklist', data);
    return response.data;
  },

  async unblockIPAddress(ipAddress: string, reason: string): Promise<{ message: string }> {
    const response = await apiRequest('DELETE', `/security/blocklist/${encodeURIComponent(ipAddress)}?reason=${encodeURIComponent(reason)}`);
    return response.data;
  },

  // Background Tasks
  async triggerEventCorrelation(): Promise<{ message: string }> {
    const response = await apiRequest('POST', '/security/tasks/correlate-events');
    return response.data;
  },

  async triggerBlockCleanup(): Promise<{ message: string }> {
    const response = await apiRequest('POST', '/security/tasks/cleanup-blocks');
    return response.data;
  },

  // Utility methods
  getThreatLevelColor(level: string): string {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  },

  getThreatLevelIcon(level: string): string {
    switch (level.toLowerCase()) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  },

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-red-600 bg-red-100';
      case 'investigating':
        return 'text-yellow-600 bg-yellow-100';
      case 'resolved':
        return 'text-green-600 bg-green-100';
      case 'false_positive':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  },

  formatRiskScore(score: number): string {
    if (score >= 8) return 'Critical';
    if (score >= 6) return 'High';
    if (score >= 4) return 'Medium';
    if (score >= 2) return 'Low';
    return 'Minimal';
  },

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  }
};