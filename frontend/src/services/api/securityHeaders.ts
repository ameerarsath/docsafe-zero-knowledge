/**
 * Security Headers API service for SecureVault frontend.
 *
 * Provides methods for:
 * - CSP violation reporting
 * - Security headers validation
 * - CSP violation analytics
 */

import { apiRequest } from '../api';

// Types
export interface CSPViolation {
  event_id: string;
  timestamp: string;
  source_ip: string;
  user_agent: string;
  violated_directive: string;
  blocked_uri: string;
  document_uri: string;
  line_number: number;
  column_number: number;
  risk_score: number;
}

export interface CSPViolationReport {
  document_uri: string;
  referrer: string;
  violated_directive: string;
  effective_directive: string;
  original_policy: string;
  blocked_uri: string;
  status_code: number;
  line_number: number;
  column_number: number;
  source_file: string;
}

export interface CSPViolationRequest {
  violation: CSPViolationReport;
  timestamp: string;
  user_agent: string;
  url: string;
  session_id?: string;
}

export interface SecurityHeadersCheck {
  url: string;
  headers: Record<string, string>;
}

export interface SecurityHeadersResponse {
  secure: boolean;
  missing_headers: string[];
  weak_headers: string[];
  recommendations: string[];
  score: number;
}

export interface CSPViolationsResponse {
  violations: CSPViolation[];
  total_count: number;
  time_range_hours: number;
}

export interface CSPViolationStats {
  total_violations: number;
  time_range_days: number;
  top_violated_directives: Array<{
    directive: string;
    count: number;
  }>;
  top_source_ips: Array<{
    ip_address: string;
    count: number;
  }>;
  violations_by_day: Record<string, number>;
}

// Security Headers API service
export const securityHeadersApi = {
  // CSP Violation Reporting
  async reportCSPViolation(violationRequest: CSPViolationRequest): Promise<{
    message: string;
    event_id: string;
    timestamp: string;
  }> {
    const response = await apiRequest('POST', '/api/v1/security-headers/csp-violations', violationRequest);
    return response.data;
  },

  // Security Headers Validation
  async validateSecurityHeaders(headersCheck: SecurityHeadersCheck): Promise<SecurityHeadersResponse> {
    const response = await apiRequest('POST', '/api/v1/security-headers/validate-headers', headersCheck);
    return response.data;
  },

  // CSP Violations Retrieval (public endpoint - no authentication required)
  async getCSPViolations(hours: number = 24, limit: number = 100): Promise<CSPViolationsResponse> {
    // Use direct fetch for public endpoint instead of apiRequest
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8002';
    const response = await fetch(`${baseURL}/public/csp-violations?hours=${hours}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSP violations: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  },

  // CSP Violation Statistics
  async getCSPViolationStats(days: number = 7): Promise<CSPViolationStats> {
    const response = await apiRequest('GET', `/api/v1/security-headers/csp-violations/stats?days=${days}`);
    return response.data;
  },

  // Test security headers for current page
  async testCurrentPageHeaders(): Promise<SecurityHeadersResponse> {
    // Get current page headers
    try {
      const response = await fetch(window.location.href, {
        method: 'HEAD',
        cache: 'no-cache'
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return await this.validateSecurityHeaders({
        url: window.location.href,
        headers
      });
    } catch (error) {
      console.error('Failed to test current page headers:', error);
      throw error;
    }
  },

  // Report CSP violation from browser event
  reportBrowserCSPViolation(event: SecurityPolicyViolationEvent): void {
    const violation: CSPViolationReport = {
      document_uri: event.documentURI,
      referrer: event.referrer,
      violated_directive: event.violatedDirective,
      effective_directive: event.effectiveDirective,
      original_policy: event.originalPolicy,
      blocked_uri: event.blockedURI,
      status_code: event.statusCode,
      line_number: event.lineNumber,
      column_number: event.columnNumber,
      source_file: event.sourceFile
    };

    const violationRequest: CSPViolationRequest = {
      violation,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      url: window.location.href,
      session_id: sessionStorage.getItem('session_id') || undefined
    };

    this.reportCSPViolation(violationRequest).catch(error => {
      console.warn('Failed to report CSP violation:', error);
    });
  },

  // Setup automatic CSP violation reporting
  setupCSPReporting(): void {
    document.addEventListener('securitypolicyviolation', (event) => {
      this.reportBrowserCSPViolation(event);
    });
  },

  // Utility methods
  getDirectiveColor(directive: string): string {
    const colors: Record<string, string> = {
      'script-src': 'text-red-600 bg-red-100',
      'style-src': 'text-blue-600 bg-blue-100',
      'img-src': 'text-green-600 bg-green-100',
      'font-src': 'text-purple-600 bg-purple-100',
      'connect-src': 'text-orange-600 bg-orange-100',
      'object-src': 'text-gray-600 bg-gray-100',
      'frame-src': 'text-yellow-600 bg-yellow-100',
      'default-src': 'text-indigo-600 bg-indigo-100'
    };
    return colors[directive] || 'text-gray-600 bg-gray-100';
  },

  getSecurityScore(score: number): {
    label: string;
    color: string;
    bgColor: string;
  } {
    if (score >= 90) {
      return {
        label: 'Excellent',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      };
    } else if (score >= 80) {
      return {
        label: 'Good',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      };
    } else if (score >= 60) {
      return {
        label: 'Fair',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100'
      };
    } else {
      return {
        label: 'Poor',
        color: 'text-red-600',
        bgColor: 'bg-red-100'
      };
    }
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
  }
};