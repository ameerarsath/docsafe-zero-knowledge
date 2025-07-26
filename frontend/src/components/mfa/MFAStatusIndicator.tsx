/**
 * MFA Status Indicator Components
 * 
 * Various components to display MFA status throughout the application:
 * - Badge indicators for user profiles
 * - Inline status displays
 * - Warning indicators for disabled MFA
 * - Setup prompts and notifications
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mfaService } from '../../services/mfaService';
import { MFAStatus } from '../../types/mfa';

// Basic MFA status badge
interface MFAStatusBadgeProps {
  status?: MFAStatus | null;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function MFAStatusBadge({ 
  status, 
  size = 'md', 
  showText = true,
  className = '' 
}: MFAStatusBadgeProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3', 
    lg: 'h-4 w-4'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (!status) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div className={`${sizeClasses[size]} bg-gray-400 rounded-full mr-2`}></div>
        {showText && (
          <span className={`${textSizeClasses[size]} text-gray-500`}>
            MFA Unknown
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className={`
        ${sizeClasses[size]} rounded-full mr-2
        ${status.enabled 
          ? 'bg-green-400' 
          : status.required_by_policy 
            ? 'bg-red-400' 
            : 'bg-gray-400'
        }
      `}></div>
      {showText && (
        <span className={`
          ${textSizeClasses[size]}
          ${status.enabled 
            ? 'text-green-600' 
            : status.required_by_policy 
              ? 'text-red-600' 
              : 'text-gray-500'
          }
        `}>
          MFA {status.enabled ? 'Enabled' : 'Disabled'}
          {status.required_by_policy && !status.enabled && ' (Required)'}
        </span>
      )}
    </div>
  );
}

// Detailed MFA status card
interface MFAStatusCardProps {
  status?: MFAStatus | null;
  onSetupClick?: () => void;
  className?: string;
}

export function MFAStatusCard({ 
  status, 
  onSetupClick, 
  className = '' 
}: MFAStatusCardProps) {
  if (!status) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-3"></div>
          <span className="text-sm text-gray-600">Loading MFA status...</span>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={`
      rounded-lg p-4 border-2 
      ${status.enabled 
        ? 'bg-green-50 border-green-200' 
        : status.required_by_policy 
          ? 'bg-red-50 border-red-200'
          : 'bg-yellow-50 border-yellow-200'
      }
      ${className}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div className={`
            w-4 h-4 rounded-full mr-3 mt-0.5
            ${status.enabled 
              ? 'bg-green-400' 
              : status.required_by_policy 
                ? 'bg-red-400' 
                : 'bg-yellow-400'
            }
          `}></div>
          <div>
            <h4 className={`
              text-sm font-medium
              ${status.enabled 
                ? 'text-green-800' 
                : status.required_by_policy 
                  ? 'text-red-800'
                  : 'text-yellow-800'
              }
            `}>
              MFA {status.enabled ? 'Enabled' : 'Disabled'}
              {status.required_by_policy && !status.enabled && ' (Required)'}
            </h4>
            <p className={`
              text-xs mt-1
              ${status.enabled 
                ? 'text-green-600' 
                : status.required_by_policy 
                  ? 'text-red-600'
                  : 'text-yellow-600'
              }
            `}>
              {status.enabled 
                ? `Setup: ${formatDate(status.setup_date)} • Last used: ${formatDate(status.last_used)}`
                : 'Additional security recommended'
              }
            </p>
            
            {status.enabled && (
              <p className="text-xs text-gray-600 mt-1">
                {status.backup_codes_remaining} backup codes remaining
              </p>
            )}
          </div>
        </div>

        {!status.enabled && onSetupClick && (
          <button
            onClick={onSetupClick}
            className="text-xs font-medium text-blue-600 hover:text-blue-500 underline"
          >
            Setup MFA
          </button>
        )}
      </div>
    </div>
  );
}

// MFA warning banner
interface MFAWarningBannerProps {
  status?: MFAStatus | null;
  onSetupClick?: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
  className?: string;
}

export function MFAWarningBanner({ 
  status, 
  onSetupClick, 
  onDismiss, 
  dismissible = true,
  className = '' 
}: MFAWarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  // Don't show if MFA is enabled or banner is dismissed
  if (!status || status.enabled || isDismissed) {
    return null;
  }

  return (
    <div className={`
      rounded-lg p-4 
      ${status.required_by_policy 
        ? 'bg-red-50 border border-red-200' 
        : 'bg-yellow-50 border border-yellow-200'
      }
      ${className}
    `}>
      <div className="flex items-start">
        <svg 
          className={`
            w-5 h-5 mr-3 flex-shrink-0 mt-0.5
            ${status.required_by_policy ? 'text-red-400' : 'text-yellow-400'}
          `} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        
        <div className="flex-1">
          <h4 className={`
            text-sm font-medium 
            ${status.required_by_policy ? 'text-red-800' : 'text-yellow-800'}
          `}>
            {status.required_by_policy 
              ? 'Multi-Factor Authentication Required' 
              : 'Secure Your Account with MFA'
            }
          </h4>
          <p className={`
            text-sm mt-1
            ${status.required_by_policy ? 'text-red-700' : 'text-yellow-700'}
          `}>
            {status.required_by_policy 
              ? 'Your account role requires two-factor authentication. Please set it up now to maintain access.'
              : 'Add an extra layer of security to your account by enabling two-factor authentication.'
            }
          </p>
          
          <div className="mt-3 flex items-center space-x-3">
            {onSetupClick && (
              <button
                onClick={onSetupClick}
                className={`
                  text-sm font-medium underline
                  ${status.required_by_policy 
                    ? 'text-red-800 hover:text-red-600' 
                    : 'text-yellow-800 hover:text-yellow-600'
                  }
                `}
              >
                Set up MFA now
              </button>
            )}
            
            {dismissible && !status.required_by_policy && (
              <button
                onClick={handleDismiss}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {dismissible && (
          <button
            onClick={handleDismiss}
            className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Comprehensive MFA status component with automatic data loading
interface MFAStatusDisplayProps {
  variant?: 'badge' | 'card' | 'banner';
  showSetupButton?: boolean;
  refreshInterval?: number; // in milliseconds, 0 to disable
  onSetupClick?: () => void;
  className?: string;
}

export default function MFAStatusDisplay({ 
  variant = 'badge', 
  showSetupButton = true,
  refreshInterval = 0,
  onSetupClick,
  className = '' 
}: MFAStatusDisplayProps) {
  const { user } = useAuth();
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMFAStatus();
    
    // Set up refresh interval if specified
    if (refreshInterval > 0) {
      const interval = setInterval(loadMFAStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const loadMFAStatus = async () => {
    if (!user) return;
    
    try {
      const response = await mfaService.getMFAStatus();
      if (response.success && response.data) {
        setMfaStatus(response.data);
        setError(null);
      } else {
        setError(response.error?.detail || 'Failed to load MFA status');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`inline-flex items-center text-red-600 ${className}`}>
        <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="text-sm">MFA Error</span>
      </div>
    );
  }

  const handleSetupClick = () => {
    if (onSetupClick) {
      onSetupClick();
    } else {
      // Default behavior: navigate to MFA settings
      window.location.href = '/profile/mfa';
    }
  };

  switch (variant) {
    case 'badge':
      return <MFAStatusBadge status={mfaStatus} className={className} />;
    
    case 'card':
      return (
        <MFAStatusCard 
          status={mfaStatus} 
          onSetupClick={showSetupButton ? handleSetupClick : undefined}
          className={className} 
        />
      );
    
    case 'banner':
      return (
        <MFAWarningBanner 
          status={mfaStatus} 
          onSetupClick={showSetupButton ? handleSetupClick : undefined}
          className={className} 
        />
      );
    
    default:
      return <MFAStatusBadge status={mfaStatus} className={className} />;
  }
}

// Export individual components for direct use
export { MFAStatusDisplay };