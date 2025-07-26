/**
 * Progress Bar Component for SecureVault
 * 
 * A flexible progress bar component with multiple variants and animations
 * suitable for file uploads, loading states, and progress tracking.
 */

import React from 'react';

interface ProgressBarProps {
  /** Progress value between 0 and 100 */
  value: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  /** Show percentage text */
  showPercentage?: boolean;
  /** Custom label text */
  label?: string;
  /** Show animated stripes */
  animated?: boolean;
  /** Indeterminate/loading state */
  indeterminate?: boolean;
  /** Custom className */
  className?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showPercentage = false,
  label,
  animated = false,
  indeterminate = false,
  className = '',
  ariaLabel
}) => {
  // Ensure value is within bounds
  const clampedValue = Math.max(0, Math.min(value, max));
  const percentage = (clampedValue / max) * 100;

  // Size classes
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  // Variant classes for the progress fill
  const variantClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
    info: 'bg-cyan-600'
  };

  // Background classes for the track
  const trackClasses = {
    primary: 'bg-blue-100',
    success: 'bg-green-100',
    warning: 'bg-yellow-100',
    error: 'bg-red-100',
    info: 'bg-cyan-100'
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label and percentage */}
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div
        className={`
          relative overflow-hidden rounded-full
          ${sizeClasses[size]}
          ${trackClasses[variant]}
          ${className}
        `}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel || label || 'Progress'}
      >
        {/* Progress fill */}
        <div
          className={`
            h-full rounded-full transition-all duration-300 ease-out
            ${variantClasses[variant]}
            ${indeterminate ? 'w-full' : ''}
            ${animated && !indeterminate ? 'bg-stripe-animated' : ''}
            ${indeterminate ? 'animate-pulse' : ''}
          `}
          style={{
            width: indeterminate ? '100%' : `${percentage}%`,
            background: indeterminate
              ? `linear-gradient(45deg, 
                  transparent 25%, 
                  rgba(255,255,255,0.3) 25%, 
                  rgba(255,255,255,0.3) 50%, 
                  transparent 50%, 
                  transparent 75%, 
                  rgba(255,255,255,0.3) 75%)`
              : undefined,
            backgroundSize: indeterminate ? '20px 20px' : undefined,
            animation: indeterminate ? 'moveStripes 1s linear infinite' : undefined
          }}
        />

        {/* Animated stripes overlay for non-indeterminate bars */}
        {animated && !indeterminate && (
          <div
            className="absolute inset-0 h-full rounded-full opacity-30"
            style={{
              background: `linear-gradient(45deg, 
                transparent 25%, 
                rgba(255,255,255,0.5) 25%, 
                rgba(255,255,255,0.5) 50%, 
                transparent 50%, 
                transparent 75%, 
                rgba(255,255,255,0.5) 75%)`,
              backgroundSize: '20px 20px',
              animation: 'moveStripes 1s linear infinite',
              width: `${percentage}%`
            }}
          />
        )}
      </div>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes moveStripes {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 20px 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;

// Additional helper components

/**
 * Multi-step progress bar for wizards and multi-stage processes
 */
interface MultiStepProgressProps {
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export const MultiStepProgress: React.FC<MultiStepProgressProps> = ({
  steps,
  currentStep,
  completedSteps = [],
  variant = 'primary',
  className = ''
}) => {
  const variantClasses = {
    primary: {
      active: 'bg-blue-600 text-white',
      completed: 'bg-green-600 text-white',
      pending: 'bg-gray-200 text-gray-600',
      line: 'bg-blue-600'
    },
    success: {
      active: 'bg-green-600 text-white',
      completed: 'bg-green-700 text-white',
      pending: 'bg-gray-200 text-gray-600',
      line: 'bg-green-600'
    },
    warning: {
      active: 'bg-yellow-600 text-white',
      completed: 'bg-green-600 text-white',
      pending: 'bg-gray-200 text-gray-600',
      line: 'bg-yellow-600'
    },
    error: {
      active: 'bg-red-600 text-white',
      completed: 'bg-green-600 text-white',
      pending: 'bg-gray-200 text-gray-600',
      line: 'bg-red-600'
    },
    info: {
      active: 'bg-cyan-600 text-white',
      completed: 'bg-green-600 text-white',
      pending: 'bg-gray-200 text-gray-600',
      line: 'bg-cyan-600'
    }
  };

  const colors = variantClasses[variant];

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index);
        const isActive = index === currentStep;
        const isPending = index > currentStep && !isCompleted;

        let stepClasses = colors.pending;
        if (isCompleted) stepClasses = colors.completed;
        else if (isActive) stepClasses = colors.active;

        return (
          <React.Fragment key={index}>
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  transition-all duration-200
                  ${stepClasses}
                `}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className="text-xs text-gray-600 mt-1 text-center max-w-16 truncate">
                {step}
              </span>
            </div>

            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 bg-gray-200 relative">
                <div
                  className={`
                    h-full transition-all duration-300
                    ${isCompleted || (isActive && index < currentStep) ? colors.line : 'bg-gray-200'}
                  `}
                  style={{
                    width: isCompleted || index < currentStep ? '100%' : '0%'
                  }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * Circular progress indicator
 */
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  showPercentage?: boolean;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 64,
  strokeWidth = 4,
  variant = 'primary',
  showPercentage = true,
  className = ''
}) => {
  const percentage = Math.max(0, Math.min((value / max) * 100, 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    primary: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    info: 'text-cyan-600'
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${variantColors[variant]} transition-all duration-300 ease-out`}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};