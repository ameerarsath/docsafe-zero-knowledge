/**
 * Security Headers Status Component
 * 
 * Displays the status of security headers and CSP violations
 * Provides real-time monitoring of browser security features
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Eye,
  Globe,
  Lock,
  AlertCircle,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useSecurity, useSecurityStatus, useCSPViolations } from '../../hooks/useSecurity';
import { SecurityHeadersStatus as HeadersStatus } from '../../utils/security';

interface Props {
  showDetails?: boolean;
  refreshInterval?: number;
}

// Static headers configuration to prevent recreation on each render
const SECURITY_HEADERS = [
  { 
    name: 'HSTS', 
    key: 'strict-transport-security',
    description: 'HTTP Strict Transport Security',
    icon: Lock
  },
  { 
    name: 'CSP', 
    key: 'content-security-policy',
    description: 'Content Security Policy',
    icon: Shield
  },
  { 
    name: 'X-Frame-Options', 
    key: 'x-frame-options',
    description: 'Clickjacking Protection',
    icon: Globe
  },
  { 
    name: 'X-Content-Type-Options', 
    key: 'x-content-type-options',
    description: 'MIME Sniffing Protection',
    icon: Eye
  },
  { 
    name: 'X-XSS-Protection', 
    key: 'x-xss-protection',
    description: 'XSS Filter',
    icon: Shield
  },
  { 
    name: 'Referrer-Policy', 
    key: 'referrer-policy',
    description: 'Referrer Information Control',
    icon: Globe
  }
];

export default function SecurityHeadersStatus({ 
  showDetails = false 
}: Props) {
  const security = useSecurity({ 
    autoStart: true,
    onSecurityEvent: (event) => {
      // Prevent recursion by only handling non-suspicious activity events
      if (event.type !== 'suspicious_activity') {
        // Security event received
      }
    }
  });
  
  const securityStatus = useSecurityStatus();
  const cspViolations = useCSPViolations();
  
  const [isExpanded, setIsExpanded] = useState(showDetails);

  /**
   * Get status icon and color
   */
  const getStatusDisplay = (status: 'secure' | 'warning' | 'insecure') => {
    switch (status) {
      case 'secure':
        return { 
          icon: CheckCircle, 
          color: 'text-green-500', 
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'warning':
        return { 
          icon: AlertTriangle, 
          color: 'text-yellow-500', 
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'insecure':
        return { 
          icon: XCircle, 
          color: 'text-red-500', 
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
    }
  };

  /**
   * Render security header details
   */
  const renderHeaderDetails = (headersStatus: HeadersStatus) => {
    const score = headersStatus.score || 0;
    const missingHeaders = headersStatus.missingHeaders || [];
    const weakHeaders = headersStatus.weakHeaders || [];
    const recommendations = headersStatus.recommendations || [];

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Security Headers Analysis</h4>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Score:</span>
            <span className={`text-lg font-bold ${
              score >= 90 ? 'text-green-600' :
              score >= 80 ? 'text-blue-600' :
              score >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {score}/100
            </span>
          </div>
        </div>

        {/* Missing Headers */}
        {missingHeaders.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <h5 className="font-medium text-red-800 mb-2">Missing Headers</h5>
            <div className="space-y-1">
              {missingHeaders.map((header, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700">{header}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak Headers */}
        {weakHeaders.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h5 className="font-medium text-yellow-800 mb-2">Weak Configuration</h5>
            <div className="space-y-1">
              {weakHeaders.map((header, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">{header}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-medium text-blue-800 mb-2">Recommendations</h5>
            <div className="space-y-1">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">{recommendation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Good status */}
        {missingHeaders.length === 0 && weakHeaders.length === 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">Security headers are properly configured</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render CSP violations summary
   */
  const renderCSPViolations = () => {
    if (cspViolations.totalCount === 0) {
      return (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">No CSP Violations</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Content Security Policy is working correctly
          </p>
        </div>
      );
    }

    const violationTypes = Object.keys(cspViolations.violationsByDirective);

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">CSP Violations</h4>
          <button
            onClick={cspViolations.clearViolations}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Total Violations</span>
            </div>
            <p className="text-lg font-bold text-yellow-900 mt-1">
              {cspViolations.totalCount}
            </p>
          </div>
          
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Violation Types</span>
            </div>
            <p className="text-lg font-bold text-orange-900 mt-1">
              {violationTypes.length}
            </p>
          </div>
        </div>

        {violationTypes.length > 0 && (
          <div className="mt-3">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Violated Directives</h5>
            <div className="space-y-2">
              {violationTypes.slice(0, 5).map(directive => (
                <div 
                  key={directive}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm text-gray-700">{directive}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {cspViolations.violationsByDirective[directive].length}
                  </span>
                </div>
              ))}
              {violationTypes.length > 5 && (
                <p className="text-sm text-gray-500">
                  +{violationTypes.length - 5} more...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const statusDisplay = getStatusDisplay(securityStatus.status);
  const StatusIcon = statusDisplay.icon;

  return (
    <div className={`border rounded-lg ${statusDisplay.borderColor} ${statusDisplay.bgColor}`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StatusIcon className={`w-5 h-5 ${statusDisplay.color}`} />
            <div>
              <h3 className="font-medium text-gray-900">Security Headers</h3>
              <p className="text-sm text-gray-600">{securityStatus.message}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {securityStatus.lastCheck && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>
                  {new Date(securityStatus.lastCheck).toLocaleTimeString()}
                </span>
              </div>
            )}
            
            <button
              onClick={security.checkHeaders}
              disabled={security.isLoading}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="Refresh security status"
            >
              <RefreshCw className={`w-4 h-4 ${security.isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="Toggle details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500">Secure Connection</p>
            <p className={`text-sm font-medium ${security.isSecure ? 'text-green-600' : 'text-red-600'}`}>
              {security.isSecure ? 'Yes' : 'No'}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">CSP Violations</p>
            <p className={`text-sm font-medium ${
              securityStatus.violationsCount > 0 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {securityStatus.violationsCount}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">Monitoring</p>
            <p className={`text-sm font-medium ${
              securityStatus.isMonitoring ? 'text-green-600' : 'text-gray-600'
            }`}>
              {securityStatus.isMonitoring ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          {security.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Error</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{security.error}</p>
            </div>
          )}

          {security.headersStatus && renderHeaderDetails(security.headersStatus)}
          
          {renderCSPViolations()}

          {/* Suspicious Activities */}
          {security.suspiciousActivities.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Recent Suspicious Activities</h4>
              <div className="space-y-2">
                {security.suspiciousActivities.slice(0, 3).map((activity, index) => (
                  <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-yellow-800">
                        {activity.type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {activity.timestamp && (
                        <span className="text-xs text-yellow-600">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-yellow-700">{activity.details}</p>
                  </div>
                ))}
                {security.suspiciousActivities.length > 3 && (
                  <p className="text-sm text-gray-500">
                    +{security.suspiciousActivities.length - 3} more activities...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}