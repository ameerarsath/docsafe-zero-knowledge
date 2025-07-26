/**
 * Action Card Component
 * 
 * Reusable card component for actions, features, and navigation items
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon, ArrowRight } from 'lucide-react';

interface ActionCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  href?: string;
  onClick?: () => void;
  showArrow?: boolean;
  disabled?: boolean;
  className?: string;
  external?: boolean;
}

export default function ActionCard({
  title,
  description,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100',
  href,
  onClick,
  showArrow = true,
  disabled = false,
  className = '',
  external = false
}: ActionCardProps) {
  const baseClasses = `
    group p-6 border border-gray-200 rounded-xl transition-all duration-200 h-full flex flex-col
    ${disabled 
      ? 'opacity-50 cursor-not-allowed' 
      : 'hover:border-blue-300 hover:shadow-md hover:scale-[1.02] cursor-pointer'
    }
    ${className}
  `.trim();

  const content = (
    <>
      <div className="flex items-start justify-between flex-1">
        <div className="flex items-start space-x-4 flex-1">
          {Icon && (
            <div className={`h-12 w-12 ${iconBgColor} rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
              !disabled ? `group-hover:${iconBgColor.replace('100', '200')}` : ''
            }`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-gray-700">
              {title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        
        {showArrow && !disabled && (
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 ml-4 mt-1" />
        )}
      </div>
    </>
  );

  if (disabled) {
    return (
      <div className={baseClasses}>
        {content}
      </div>
    );
  }

  if (href) {
    if (external) {
      return (
        <a 
          href={href}
          className={baseClasses}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      );
    } else {
      return (
        <Link to={href} className={baseClasses}>
          {content}
        </Link>
      );
    }
  }

  return (
    <div className={baseClasses} onClick={onClick}>
      {content}
    </div>
  );
}