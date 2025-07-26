/**
 * User Role Indicators Components
 * 
 * Various UI components for displaying user roles, permissions, and access levels
 * throughout the application interface.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Crown,
  Key,
  Eye,
  Info,
  ChevronDown,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from './RoleBasedComponent';
import { rbacService } from '../../services/rbacService';

// Types for role indicators
interface RoleBadgeProps {
  role: string;
  variant?: 'default' | 'compact' | 'detailed';
  showLevel?: boolean;
  showTooltip?: boolean;
  isPrimary?: boolean;
  isExpired?: boolean;
  expiresAt?: string;
  className?: string;
  onClick?: () => void;
}

interface UserRoleDisplayProps {
  userId?: number;
  username?: string;
  roles?: string[];
  hierarchyLevel?: number;
  variant?: 'badge' | 'list' | 'card' | 'dropdown';
  showPermissionCount?: boolean;
  showLastLogin?: boolean;
  interactive?: boolean;
  onRoleClick?: (role: string) => void;
}

interface PermissionIndicatorProps {
  permissions: string[];
  variant?: 'count' | 'list' | 'grouped';
  maxDisplay?: number;
  showAll?: boolean;
  compact?: boolean;
}

/**
 * Role Badge Component
 * Displays a single role as a styled badge
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  variant = 'default',
  showLevel = true,
  showTooltip = true,
  isPrimary = false,
  isExpired = false,
  expiresAt,
  className = '',
  onClick
}) => {
  const [showTooltipContent, setShowTooltipContent] = useState(false);
  
  // Get role display information
  const displayName = rbacService.getRoleDisplayName(role);
  const hierarchyLevel = {
    'viewer': 1,
    'user': 2,
    'manager': 3,
    'admin': 4,
    'super_admin': 5
  }[role] || 1;
  
  const colorClass = rbacService.getRoleColor(hierarchyLevel);
  
  // Determine badge styling based on status
  let badgeClasses = `inline-flex items-center rounded-full text-xs font-medium ${colorClass}`;
  
  if (isExpired) {
    badgeClasses = 'inline-flex items-center rounded-full text-xs font-medium bg-red-100 text-red-800';
  }
  
  // Size variants
  const sizeClasses = {
    default: 'px-2.5 py-0.5',
    compact: 'px-2 py-0.5 text-xs',
    detailed: 'px-3 py-1'
  };
  
  badgeClasses += ` ${sizeClasses[variant]} ${className}`;
  
  const getRoleIcon = () => {
    switch (role) {
      case 'super_admin':
        return <Crown className="w-3 h-3 mr-1" />;
      case 'admin':
        return <ShieldCheck className="w-3 h-3 mr-1" />;
      case 'manager':
        return <User className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };
  
  const badge = (
    <span 
      className={badgeClasses}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {variant === 'detailed' && getRoleIcon()}
      {displayName}
      {showLevel && variant !== 'compact' && (
        <span className="ml-1 text-xs opacity-75">({hierarchyLevel})</span>
      )}
      {isPrimary && (
        <CheckCircle className="w-3 h-3 ml-1" />
      )}
      {isExpired && (
        <AlertTriangle className="w-3 h-3 ml-1" />
      )}
      {expiresAt && !isExpired && (
        <Clock className="w-3 h-3 ml-1" />
      )}
    </span>
  );
  
  // Add tooltip if enabled
  if (showTooltip) {
    return (
      <span
        className="relative inline-block"
        onMouseEnter={() => setShowTooltipContent(true)}
        onMouseLeave={() => setShowTooltipContent(false)}
      >
        {badge}
        {showTooltipContent && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
            <div>Role: {displayName}</div>
            <div>Level: {hierarchyLevel}</div>
            {isPrimary && <div>Primary Role</div>}
            {isExpired && <div>Expired</div>}
            {expiresAt && !isExpired && (
              <div>Expires: {new Date(expiresAt).toLocaleDateString()}</div>
            )}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </span>
    );
  }
  
  return badge;
};

/**
 * User Role Display Component
 * Shows all roles for a user in various formats
 */
export const UserRoleDisplay: React.FC<UserRoleDisplayProps> = ({
  userId,
  username,
  roles,
  hierarchyLevel,
  variant = 'badge',
  showPermissionCount = false,
  showLastLogin = false,
  interactive = false,
  onRoleClick
}) => {
  const { user } = useAuth();
  const { userRoles, userPermissions, hierarchyLevel: currentHierarchy } = usePermissions();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Use current user data if no specific user provided
  const displayRoles = roles || userRoles;
  const displayLevel = hierarchyLevel || currentHierarchy;
  const displayUsername = username || user?.username;
  
  if (displayRoles.length === 0) {
    return (
      <span className="text-sm text-gray-500 italic">No roles assigned</span>
    );
  }
  
  const handleRoleClick = (role: string) => {
    if (interactive && onRoleClick) {
      onRoleClick(role);
    }
  };
  
  // Badge variant - show roles as badges
  if (variant === 'badge') {
    return (
      <div className="flex flex-wrap gap-1">
        {displayRoles.map((role, index) => (
          <RoleBadge
            key={`${role}-${index}`}
            role={role}
            isPrimary={index === 0}
            className={interactive ? 'cursor-pointer hover:opacity-80' : ''}
            onClick={interactive ? () => handleRoleClick(role) : undefined}
          />
        ))}
      </div>
    );
  }
  
  // List variant - show roles as a simple list
  if (variant === 'list') {
    return (
      <div className="space-y-1">
        {displayRoles.map((role, index) => (
          <div
            key={`${role}-${index}`}
            className={`flex items-center text-sm ${
              interactive ? 'cursor-pointer hover:text-blue-600' : 'text-gray-700'
            }`}
            onClick={interactive ? () => handleRoleClick(role) : undefined}
          >
            <ShieldCheck className="w-4 h-4 mr-2 text-gray-400" />
            <span>{rbacService.getRoleDisplayName(role)}</span>
            {index === 0 && (
              <span className="ml-2 text-xs text-gray-500">(Primary)</span>
            )}
          </div>
        ))}
      </div>
    );
  }
  
  // Card variant - show roles in a card format
  if (variant === 'card') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <User className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-sm font-medium text-gray-900">
              {displayUsername || 'User'}
            </h3>
          </div>
          <span className="text-xs text-gray-500">Level {displayLevel}</span>
        </div>
        
        <div className="space-y-2">
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Roles ({displayRoles.length})
            </h4>
            <div className="mt-1 flex flex-wrap gap-1">
              {displayRoles.map((role, index) => (
                <RoleBadge
                  key={`${role}-${index}`}
                  role={role}
                  variant="compact"
                  isPrimary={index === 0}
                  className={interactive ? 'cursor-pointer hover:opacity-80' : ''}
                  onClick={interactive ? () => handleRoleClick(role) : undefined}
                />
              ))}
            </div>
          </div>
          
          {showPermissionCount && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permissions
              </h4>
              <div className="mt-1 text-sm text-gray-700">
                {userPermissions.length} total permissions
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Dropdown variant - show roles in a dropdown format
  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <User className="w-4 h-4 mr-2" />
          {displayRoles.length === 1 
            ? rbacService.getRoleDisplayName(displayRoles[0])
            : `${displayRoles.length} roles`
          }
          <ChevronDown className="w-4 h-4 ml-2" />
        </button>
        
        {isExpanded && (
          <div className="absolute z-10 mt-1 w-48 bg-white shadow-lg rounded-md border border-gray-200">
            <div className="py-1">
              {displayRoles.map((role, index) => (
                <div
                  key={`${role}-${index}`}
                  className={`px-4 py-2 text-sm hover:bg-gray-100 ${
                    interactive ? 'cursor-pointer' : ''
                  }`}
                  onClick={interactive ? () => handleRoleClick(role) : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span>{rbacService.getRoleDisplayName(role)}</span>
                    {index === 0 && (
                      <span className="text-xs text-blue-600">Primary</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return null;
};

/**
 * Permission Indicator Component
 * Shows user permissions in various formats
 */
export const PermissionIndicator: React.FC<PermissionIndicatorProps> = ({
  permissions,
  variant = 'count',
  maxDisplay = 5,
  showAll = false,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(showAll);
  
  if (permissions.length === 0) {
    return (
      <span className="text-sm text-gray-500 italic">No permissions</span>
    );
  }
  
  // Count variant - just show the count
  if (variant === 'count') {
    return (
      <div className="inline-flex items-center">
        <Key className="w-4 h-4 text-gray-400 mr-1" />
        <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-700`}>
          {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
        </span>
      </div>
    );
  }
  
  // List variant - show permissions as a list
  if (variant === 'list') {
    const displayPermissions = expanded ? permissions : permissions.slice(0, maxDisplay);
    const hasMore = permissions.length > maxDisplay;
    
    return (
      <div className="space-y-1">
        {displayPermissions.map((permission) => (
          <div key={permission} className={`flex items-center ${compact ? 'text-xs' : 'text-sm'} text-gray-700`}>
            <Key className="w-3 h-3 mr-2 text-gray-400" />
            <span>{rbacService.formatPermissionName(permission)}</span>
          </div>
        ))}
        
        {hasMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-blue-600 hover:text-blue-500 ml-5"
          >
            Show {permissions.length - maxDisplay} more...
          </button>
        )}
        
        {expanded && hasMore && (
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-gray-600 hover:text-gray-500 ml-5"
          >
            Show less
          </button>
        )}
      </div>
    );
  }
  
  // Grouped variant - show permissions grouped by resource type
  if (variant === 'grouped') {
    const groupedPermissions = permissions.reduce((groups, permission) => {
      const [resource] = permission.split(':');
      if (!groups[resource]) {
        groups[resource] = [];
      }
      groups[resource].push(permission);
      return groups;
    }, {} as Record<string, string[]>);
    
    return (
      <div className="space-y-2">
        {Object.entries(groupedPermissions).map(([resource, perms]) => (
          <div key={resource}>
            <h4 className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-900 capitalize`}>
              {resource} ({perms.length})
            </h4>
            <div className="ml-4 space-y-1">
              {perms.map((permission) => (
                <div key={permission} className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600`}>
                  {permission.split(':')[1]}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return null;
};

/**
 * Current User Role Indicator
 * Shows the current user's role information in the header/navbar
 */
export const CurrentUserRoleIndicator: React.FC<{
  variant?: 'compact' | 'detailed';
  showDropdown?: boolean;
}> = ({ variant = 'compact', showDropdown = true }) => {
  const { user } = useAuth();
  const { userRoles, hierarchyLevel, userPermissions } = usePermissions();
  const [showDetails, setShowDetails] = useState(false);
  
  if (!user || userRoles.length === 0) {
    return null;
  }
  
  const primaryRole = userRoles[0];
  const displayName = rbacService.getRoleDisplayName(primaryRole);
  
  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={() => showDropdown && setShowDetails(!showDetails)}
          className={`inline-flex items-center text-sm text-gray-700 hover:text-gray-900 ${
            showDropdown ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          <RoleBadge role={primaryRole} variant="compact" showTooltip={false} />
          {showDropdown && (
            <ChevronDown className="w-3 h-3 ml-1" />
          )}
        </button>
        
        {showDetails && showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-md border border-gray-200 z-50">
            <div className="p-4">
              <div className="flex items-center mb-3">
                <User className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  <div className="text-xs text-gray-500">Access Level {hierarchyLevel}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </h4>
                  <div className="mt-1 space-y-1">
                    {userRoles.map((role, index) => (
                      <div key={role} className="flex items-center justify-between">
                        <RoleBadge role={role} variant="compact" showTooltip={false} />
                        {index === 0 && (
                          <span className="text-xs text-blue-600">Primary</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </h4>
                  <div className="mt-1 text-xs text-gray-600">
                    {userPermissions.length} total permissions
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Detailed variant
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <User className="w-4 h-4 text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-900">{user.username}</span>
        </div>
        <span className="text-xs text-gray-500">Level {hierarchyLevel}</span>
      </div>
      
      <UserRoleDisplay
        roles={userRoles}
        variant="badge"
      />
      
      {userPermissions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <PermissionIndicator
            permissions={userPermissions}
            variant="count"
            compact
          />
        </div>
      )}
    </div>
  );
};

/**
 * Role Status Indicator
 * Shows the status of a role (active, expired, etc.)
 */
interface RoleStatusIndicatorProps {
  isActive: boolean;
  isExpired?: boolean;
  expiresAt?: string;
  isPrimary?: boolean;
  compact?: boolean;
}

export const RoleStatusIndicator: React.FC<RoleStatusIndicatorProps> = ({
  isActive,
  isExpired = false,
  expiresAt,
  isPrimary = false,
  compact = false
}) => {
  if (!isActive || isExpired) {
    return (
      <span className={`inline-flex items-center ${compact ? 'text-xs' : 'text-sm'} text-red-600`}>
        <AlertTriangle className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
        {isExpired ? 'Expired' : 'Inactive'}
      </span>
    );
  }
  
  if (expiresAt) {
    const daysUntilExpiry = Math.ceil(
      (new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiry <= 7) {
      return (
        <span className={`inline-flex items-center ${compact ? 'text-xs' : 'text-sm'} text-orange-600`}>
          <Clock className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
          Expires in {daysUntilExpiry} days
        </span>
      );
    }
  }
  
  return (
    <span className={`inline-flex items-center ${compact ? 'text-xs' : 'text-sm'} text-green-600`}>
      <CheckCircle className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
      Active{isPrimary && ' (Primary)'}
    </span>
  );
};

export default {
  RoleBadge,
  UserRoleDisplay,
  PermissionIndicator,
  CurrentUserRoleIndicator,
  RoleStatusIndicator
};