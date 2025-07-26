/**
 * Skeleton Loader Component
 * 
 * Provides loading skeleton placeholders for better UX
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export function Skeleton({ className = '', width, height, rounded = false }: SkeletonProps) {
  const baseClasses = `animate-pulse bg-gray-200 ${rounded ? 'rounded-full' : 'rounded'}`;
  const sizeClasses = width || height ? '' : 'h-4 w-full';
  const customStyles = {
    ...(width && { width }),
    ...(height && { height })
  };

  return (
    <div 
      className={`${baseClasses} ${sizeClasses} ${className}`}
      style={customStyles}
    />
  );
}

interface SkeletonCardProps {
  className?: string;
  showIcon?: boolean;
}

export function SkeletonCard({ className = '', showIcon = true }: SkeletonCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-4 w-1/2 mb-3" />
          <Skeleton className="h-8 w-3/4 mb-2" />
        </div>
        {showIcon && (
          <Skeleton className="h-12 w-12 flex-shrink-0 ml-4" rounded />
        )}
      </div>
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

interface SkeletonGridProps {
  items?: number;
  columns?: number;
  className?: string;
}

export function SkeletonGrid({ items = 4, columns = 4, className = '' }: SkeletonGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6 ${className}`}>
      {[...Array(items)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default Skeleton;