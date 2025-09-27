/**
 * Share Indicator Component
 * Shows when a document is shared with visual indicators
 */

import React from 'react';
import { Share2, Users, Globe, Shield } from 'lucide-react';
import { DocumentShare } from '../../services/api/shares';

interface ShareIndicatorProps {
  shares: DocumentShare[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  showTooltip?: boolean;
}

export const ShareIndicator: React.FC<ShareIndicatorProps> = ({
  shares,
  className = '',
  size = 'sm',
  showCount = false,
  showTooltip = true
}) => {
  // Filter for active, non-expired shares
  const activeShares = shares.filter(share =>
    share.isActive && !isExpired(share.expiresAt)
  );

  if (activeShares.length === 0) {
    return null;
  }

  // Determine the most permissive share type for display
  const shareTypes = activeShares.map(share => share.shareType);
  const hasExternal = shareTypes.includes('external');
  const hasPublic = shareTypes.includes('public');
  const hasInternal = shareTypes.includes('internal');

  let icon;
  let color;
  let label;

  if (hasPublic) {
    icon = <Globe className={getIconSize(size)} />;
    color = 'text-purple-600 bg-purple-100';
    label = 'Public';
  } else if (hasExternal) {
    icon = <Share2 className={getIconSize(size)} />;
    color = 'text-green-600 bg-green-100';
    label = 'External';
  } else if (hasInternal) {
    icon = <Users className={getIconSize(size)} />;
    color = 'text-blue-600 bg-blue-100';
    label = 'Internal';
  } else {
    icon = <Shield className={getIconSize(size)} />;
    color = 'text-gray-600 bg-gray-100';
    label = 'Shared';
  }

  const tooltipContent = showTooltip ? generateTooltipContent(activeShares) : null;

  return (
    <div
      className={`inline-flex items-center rounded-full px-2 py-1 ${color} ${className}`}
      title={tooltipContent || undefined}
    >
      {icon}
      {showCount && activeShares.length > 1 && (
        <span className={`ml-1 font-medium ${getTextSize(size)}`}>
          {activeShares.length}
        </span>
      )}
      {size === 'lg' && (
        <span className={`ml-1 font-medium ${getTextSize(size)}`}>
          {label}
        </span>
      )}
    </div>
  );
};

function getIconSize(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm': return 'w-3 h-3';
    case 'md': return 'w-4 h-4';
    case 'lg': return 'w-5 h-5';
  }
}

function getTextSize(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm': return 'text-xs';
    case 'md': return 'text-sm';
    case 'lg': return 'text-base';
  }
}

function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function generateTooltipContent(shares: DocumentShare[]): string {
  const shareTypes = Array.from(new Set(shares.map(share => share.shareType)));
  const totalAccess = shares.reduce((sum, share) => sum + share.accessCount, 0);

  let content = `${shares.length} active share${shares.length > 1 ? 's' : ''}`;

  if (shareTypes.length === 1) {
    content += ` (${shareTypes[0]})`;
  } else {
    content += ` (${shareTypes.join(', ')})`;
  }

  if (totalAccess > 0) {
    content += `\n${totalAccess} total access${totalAccess > 1 ? 'es' : ''}`;
  }

  // Show expiration info if any shares expire soon
  const expiringSoon = shares.filter(share => {
    if (!share.expiresAt) return false;
    const expiresAt = new Date(share.expiresAt);
    const now = new Date();
    const daysDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff > 0 && daysDiff <= 7; // Expires within 7 days
  });

  if (expiringSoon.length > 0) {
    content += `\n${expiringSoon.length} expiring soon`;
  }

  return content;
}

export default ShareIndicator;