/**
 * Metric Card Component
 * 
 * Reusable card component for displaying metrics and statistics
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100',
  trend,
  onClick,
  className = ''
}: MetricCardProps) {
  const cardClasses = `
    bg-white rounded-xl shadow-sm p-6 h-full transition-all duration-200 flex flex-col justify-between
    ${onClick ? 'hover:shadow-md cursor-pointer hover:scale-[1.02]' : ''}
    ${className}
  `.trim();

  return (
    <div className={cardClasses} onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 mb-3">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        
        {Icon && (
          <div className={`h-12 w-12 ${iconBgColor} rounded-lg flex items-center justify-center flex-shrink-0 ml-4`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        )}
      </div>
      
      <div className="mt-auto">
        {trend && (
          <div className={`flex items-center text-sm ${
            trend.positive !== false ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className="font-medium">
              {trend.positive !== false ? '+' : ''}{trend.value}
            </span>
            <span className="ml-1 text-gray-500">{trend.label}</span>
          </div>
        )}
        
        {subtitle && !trend && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}