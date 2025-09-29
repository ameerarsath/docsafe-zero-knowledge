/**
 * Safe Navigation Utilities
 * 
 * Prevents redirect loops and provides safe navigation methods
 */

import { NavigateFunction } from 'react-router-dom';

interface NavigationState {
  redirectCount: number;
  lastRedirect: string;
  redirectHistory: string[];
  timestamp: number;
}

class SafeNavigationManager {
  private static instance: SafeNavigationManager;
  private state: NavigationState = {
    redirectCount: 0,
    lastRedirect: '',
    redirectHistory: [],
    timestamp: Date.now()
  };
  
  private readonly MAX_REDIRECTS = 5;
  private readonly RESET_TIMEOUT = 10000; // 10 seconds

  static getInstance(): SafeNavigationManager {
    if (!SafeNavigationManager.instance) {
      SafeNavigationManager.instance = new SafeNavigationManager();
    }
    return SafeNavigationManager.instance;
  }

  /**
   * Safe navigation that prevents loops
   */
  safeNavigate(navigate: NavigateFunction, to: string, options?: { replace?: boolean }) {
    const now = Date.now();
    
    // Reset counter if enough time has passed
    if (now - this.state.timestamp > this.RESET_TIMEOUT) {
      this.resetState();
    }

    // Check for immediate loop (same URL)
    if (this.state.lastRedirect === to) {
      this.state.redirectCount++;
      console.warn(`🔄 Potential loop detected: ${to} (count: ${this.state.redirectCount})`);
      
      if (this.state.redirectCount >= this.MAX_REDIRECTS) {
        console.error('🚨 Redirect loop prevented! Going to dashboard instead.');
        this.resetState();
        navigate('/dashboard', { replace: true });
        return;
      }
    } else {
      // Different URL, reset counter but track history
      this.state.redirectCount = 1;
    }

    // Check for circular patterns in history
    this.state.redirectHistory.push(to);
    if (this.state.redirectHistory.length > this.MAX_REDIRECTS) {
      this.state.redirectHistory = this.state.redirectHistory.slice(-this.MAX_REDIRECTS);
    }

    if (this.detectCircularPattern()) {
      console.error('🚨 Circular redirect pattern detected! Breaking loop.');
      this.resetState();
      navigate('/dashboard', { replace: true });
      return;
    }

    // Update state
    this.state.lastRedirect = to;
    this.state.timestamp = now;

    // Perform navigation
    try {
      navigate(to, options);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to dashboard
      navigate('/dashboard', { replace: true });
    }
  }

  /**
   * Detect circular patterns in redirect history
   */
  private detectCircularPattern(): boolean {
    const history = this.state.redirectHistory;
    if (history.length < 4) return false;

    // Check for A->B->A->B pattern
    const recent = history.slice(-4);
    if (recent[0] === recent[2] && recent[1] === recent[3]) {
      return true;
    }

    // Check for A->B->C->A pattern
    const uniqueUrls = new Set(history.slice(-3));
    if (uniqueUrls.size <= 2 && history.length >= 3) {
      return true;
    }

    return false;
  }

  /**
   * Reset navigation state
   */
  private resetState() {
    this.state = {
      redirectCount: 0,
      lastRedirect: '',
      redirectHistory: [],
      timestamp: Date.now()
    };
  }

  /**
   * Get current navigation state (for debugging)
   */
  getState(): NavigationState {
    return { ...this.state };
  }
}

// Export singleton instance
export const safeNavigation = SafeNavigationManager.getInstance();

/**
 * React hook for safe navigation
 */
export function useSafeNavigation() {
  const navigate = useNavigate();
  
  const safeNavigate = (to: string, options?: { replace?: boolean }) => {
    safeNavigation.safeNavigate(navigate, to, options);
  };

  return {
    safeNavigate,
    getNavigationState: () => safeNavigation.getState()
  };
}

/**
 * Higher-order component to wrap components with safe navigation
 */
export function withSafeNavigation<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function SafeNavigationWrapper(props: P) {
    const { safeNavigate } = useSafeNavigation();
    
    return (
      <Component 
        {...props} 
        safeNavigate={safeNavigate}
      />
    );
  };
}

/**
 * Safe redirect component that prevents loops
 */
interface SafeRedirectProps {
  to: string;
  replace?: boolean;
  condition?: boolean;
  fallback?: string;
}

export function SafeRedirect({ to, replace = false, condition = true, fallback = '/dashboard' }: SafeRedirectProps) {
  const { safeNavigate } = useSafeNavigation();
  
  React.useEffect(() => {
    if (condition) {
      // Small delay to prevent immediate redirect loops
      const timer = setTimeout(() => {
        safeNavigate(to, { replace });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [to, replace, condition, safeNavigate]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

/**
 * Authentication redirect with loop prevention
 */
export function useAuthRedirect() {
  const { safeNavigate } = useSafeNavigation();
  const location = useLocation();

  const redirectToLogin = (returnUrl?: string) => {
    const currentPath = returnUrl || location.pathname + location.search;
    
    // Prevent login->login loops
    if (location.pathname === '/login') {
      console.warn('Already on login page, preventing redirect loop');
      return;
    }

    const loginUrl = `/login?returnUrl=${encodeURIComponent(currentPath)}`;
    safeNavigate(loginUrl, { replace: true });
  };

  const redirectAfterLogin = () => {
    const urlParams = new URLSearchParams(location.search);
    const returnUrl = urlParams.get('returnUrl');
    
    if (returnUrl && returnUrl !== '/login') {
      // Validate return URL to prevent open redirects
      if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        safeNavigate(returnUrl, { replace: true });
        return;
      }
    }
    
    // Default redirect after login
    safeNavigate('/dashboard', { replace: true });
  };

  return {
    redirectToLogin,
    redirectAfterLogin
  };
}

/**
 * Share link navigation with validation
 */
export function useShareNavigation() {
  const { safeNavigate } = useSafeNavigation();

  const navigateToShare = (shareToken: string) => {
    // Validate share token format
    if (!shareToken || shareToken.length < 10) {
      console.error('Invalid share token format');
      safeNavigate('/dashboard', { replace: true });
      return;
    }

    // Navigate to share page
    safeNavigate(`/share/${shareToken}`);
  };

  const handleShareError = (error: any) => {
    console.error('Share navigation error:', error);
    
    // Determine appropriate fallback based on error
    if (error?.status === 404) {
      safeNavigate('/dashboard', { replace: true });
    } else if (error?.status === 401) {
      const { redirectToLogin } = useAuthRedirect();
      redirectToLogin();
    } else {
      safeNavigate('/dashboard', { replace: true });
    }
  };

  return {
    navigateToShare,
    handleShareError
  };
}

// Import React for hooks
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';