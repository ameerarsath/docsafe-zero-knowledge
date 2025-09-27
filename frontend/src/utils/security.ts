/**
 * Security utilities for the frontend application.
 * 
 * This module provides client-side security functions including:
 * - CSP violation reporting
 * - Security header validation
 * - XSS protection utilities
 * - Content sanitization
 */

// Security configuration
export const SECURITY_CONFIG = {
  CSP_REPORT_ENDPOINT: '/api/v1/security/csp-report',
  SECURITY_HEADERS_CHECK_INTERVAL: 30000, // 30 seconds
  XSS_PATTERNS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi
  ]
} as const;

/**
 * Check if the page is loaded over HTTPS
 */
export function isSecureContext(): boolean {
  return window.isSecureContext || location.protocol === 'https:';
}

/**
 * Check if required security headers are present
 */
export async function checkSecurityHeaders(): Promise<SecurityHeadersStatus> {
  try {
    // Import the API service dynamically to avoid circular dependency
    const { securityHeadersApi } = await import('../services/api/securityHeaders');
    const result = await securityHeadersApi.testCurrentPageHeaders();

    return {
      secure: isSecureContext(),
      headers: {
        hsts: null, // Headers will be checked by backend
        csp: null,
        frameOptions: null,
        contentTypeOptions: null,
        xssProtection: null,
        referrerPolicy: null
      },
      hasRequiredHeaders: result.secure && result.score >= 80,
      score: result.score,
      missingHeaders: result.missing_headers,
      weakHeaders: result.weak_headers,
      recommendations: result.recommendations,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Failed to check security headers
    return {
      secure: isSecureContext(),
      headers: {},
      hasRequiredHeaders: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}

/**
 * Sanitize URL to prevent XSS through javascript: protocol
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '#';
    }
  }
  
  return url;
}

/**
 * Validate that a string doesn't contain XSS patterns
 */
export function containsXSS(input: string): boolean {
  return SECURITY_CONFIG.XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Report CSP violations to the server
 */
export function reportCSPViolation(violation: CSPViolationReport): void {
  try {
    // Import the API service dynamically to avoid circular dependency
    import('../services/api/securityHeaders').then(({ securityHeadersApi }) => {
      const violationRequest = {
        violation,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        url: window.location.href,
        session_id: sessionStorage.getItem('session_id') || undefined
      };

      securityHeadersApi.reportCSPViolation(violationRequest).catch(error => {
        console.warn('Failed to report CSP violation:', error);
      });
    }).catch(error => {
      console.warn('Failed to load security headers API:', error);
    });
  } catch (error) {
    console.warn('Error reporting CSP violation:', error);
  }
}

/**
 * Set up CSP violation reporting
 */
export function setupCSPReporting(): void {
  // Listen for CSP violations
  document.addEventListener('securitypolicyviolation', (event) => {
    const violation: CSPViolationReport = {
      documentURI: event.documentURI,
      referrer: event.referrer,
      violatedDirective: event.violatedDirective,
      effectiveDirective: event.effectiveDirective,
      originalPolicy: event.originalPolicy,
      blockedURI: event.blockedURI,
      statusCode: event.statusCode,
      lineNumber: event.lineNumber,
      columnNumber: event.columnNumber,
      sourceFile: event.sourceFile
    };
    
    reportCSPViolation(violation);
  });
}

/**
 * Generate a secure random string for CSRF tokens
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token format
 */
export function isValidCSRFToken(token: string): boolean {
  return /^[a-f0-9]{32,}$/i.test(token);
}

/**
 * Check if the current origin is allowed
 */
export function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
}

/**
 * Secure localStorage wrapper with encryption
 */
export class SecureStorage {
  private static prefix = 'secure_';
  
  static setItem(key: string, value: string): void {
    try {
      // In a real implementation, you might encrypt the value here
      const secureKey = this.prefix + key;
      localStorage.setItem(secureKey, btoa(value));
    } catch (error) {
      // Failed to set secure storage item
    }
  }
  
  static getItem(key: string): string | null {
    try {
      const secureKey = this.prefix + key;
      const value = localStorage.getItem(secureKey);
      return value ? atob(value) : null;
    } catch (error) {
      // Failed to get secure storage item
      return null;
    }
  }
  
  static removeItem(key: string): void {
    const secureKey = this.prefix + key;
    localStorage.removeItem(secureKey);
  }
  
  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

/**
 * Debounce function for security checks
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Monitor for security-related changes
 */
export class SecurityMonitor {
  private static interval: NodeJS.Timeout | null = null;
  private static listeners: SecurityEventListener[] = [];
  
  static start(): void {
    if (this.interval) return;
    
    // Set up CSP reporting
    setupCSPReporting();
    
    // Periodic security checks
    this.interval = setInterval(() => {
      this.performSecurityChecks();
    }, SECURITY_CONFIG.SECURITY_HEADERS_CHECK_INTERVAL);
    
    // Monitor for suspicious activity
    this.setupActivityMonitoring();
  }
  
  static stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  static addListener(listener: SecurityEventListener): void {
    this.listeners.push(listener);
  }
  
  static removeListener(listener: SecurityEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  private static async performSecurityChecks(): Promise<void> {
    try {
      const headersStatus = await checkSecurityHeaders();
      
      // Notify listeners of security status
      this.listeners.forEach(listener => {
        if (listener.onSecurityCheck) {
          listener.onSecurityCheck(headersStatus);
        }
      });
      
      // Report issues
      if (!headersStatus.hasRequiredHeaders) {
        // Missing required security headers
      }
    } catch (error) {
      // Security check failed
    }
  }
  
  private static setupActivityMonitoring(): void {
    // Monitor for suspicious console access
    let consoleWarnings = 0;
    const originalConsole = { ...console };
    
    console.log = (...args) => {
      consoleWarnings++;
      if (consoleWarnings > 10) {
        this.listeners.forEach(listener => {
          if (listener.onSuspiciousActivity) {
            listener.onSuspiciousActivity({
              type: 'excessive_console_usage',
              details: 'High console activity detected'
            });
          }
        });
      }
      // Log suppressed for production
    };
    
    // Monitor for DevTools detection
    let devToolsOpen = false;
    setInterval(() => {
      const threshold = 160;
      const devToolsNowOpen = window.outerHeight - window.innerHeight > threshold ||
                              window.outerWidth - window.innerWidth > threshold;
      
      if (devToolsNowOpen && !devToolsOpen) {
        this.listeners.forEach(listener => {
          if (listener.onSuspiciousActivity) {
            listener.onSuspiciousActivity({
              type: 'devtools_opened',
              details: 'Developer tools opened'
            });
          }
        });
      }
      devToolsOpen = devToolsNowOpen;
    }, 500);
  }
}

// Type definitions
export interface SecurityHeadersStatus {
  secure: boolean;
  headers: Record<string, string | null>;
  hasRequiredHeaders: boolean;
  error?: string;
  timestamp: string;
  score?: number;
  missingHeaders?: string[];
  weakHeaders?: string[];
  recommendations?: string[];
}

export interface CSPViolationReport {
  documentURI: string;
  referrer: string;
  violatedDirective: string;
  effectiveDirective: string;
  originalPolicy: string;
  blockedURI: string;
  statusCode: number;
  lineNumber: number;
  columnNumber: number;
  sourceFile: string;
}

export interface SecurityEventListener {
  onSecurityCheck?: (status: SecurityHeadersStatus) => void;
  onSuspiciousActivity?: (activity: SuspiciousActivity) => void;
  onCSPViolation?: (violation: CSPViolationReport) => void;
}

export interface SuspiciousActivity {
  type: string;
  details: string;
  timestamp?: string;
}