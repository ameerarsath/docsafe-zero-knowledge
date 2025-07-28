/**
 * Session Timeout Warning Component for SecureVault Frontend
 * 
 * Displays a modal warning when the user session is about to expire,
 * offering options to extend the session or logout.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface SessionTimeoutWarningProps {
  className?: string;
}

export default function SessionTimeoutWarning({ className }: SessionTimeoutWarningProps) {
  const { sessionTimeout, extendSession, logout, hideSessionWarning } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!sessionTimeout) {
      setTimeRemaining(0);
      return;
    }

    setTimeRemaining(sessionTimeout);

    // Update countdown every second
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        
        // Auto-logout when time reaches 0
        if (newTime <= 0) {
          logout();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionTimeout]); // Remove logout from dependencies

  // Don't render if no timeout warning
  if (!sessionTimeout || timeRemaining <= 0) {
    return null;
  }

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleExtendSession = async () => {
    try {
      await extendSession();
    } catch (error) {
      // If extend fails, show error but don't logout immediately
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleDismiss = () => {
    hideSessionWarning();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
            {/* Warning Icon */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            {/* Content */}
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Session Expiring Soon
              </h3>
              
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Your session will expire in:
                </p>
                
                <div className="mt-2 text-2xl font-bold text-red-600">
                  {formatTime(timeRemaining)}
                </div>
                
                <p className="mt-2 text-sm text-gray-500">
                  Would you like to extend your session or sign out?
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:col-start-2"
                onClick={handleExtendSession}
              >
                Extend Session
              </button>
              
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>

            {/* Dismiss option */}
            <div className="mt-3">
              <button
                type="button"
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
                onClick={handleDismiss}
              >
                Dismiss warning (session will still expire)
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Session Timeout Manager - Component to handle session management globally
 */
export function SessionTimeoutManager() {
  return <SessionTimeoutWarning />;
}