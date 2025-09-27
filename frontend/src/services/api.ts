/**
 * API Service Layer for SecureVault Frontend
 * 
 * Provides centralized HTTP client configuration with authentication,
 * token refresh, error handling, and request/response interceptors.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError, AxiosRequestHeaders } from 'axios';
import { ApiError, ApiResponse } from '../types/auth';

// Extend the InternalAxiosRequestConfig to include our custom properties
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';
const API_TIMEOUT = 15000; // 15 seconds - increased for shares operations

// FIXED: Create axios instance with CORS-friendly configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Enable credentials for CORS
});

// Token management utility
class TokenManager {
  private static ACCESS_TOKEN_KEY = 'access_token';
  private static REFRESH_TOKEN_KEY = 'refresh_token';
  private static EXPIRES_AT_KEY = 'expires_at';
  private static REMEMBER_ME_KEY = 'remember_me';

  static getAccessToken(): string | null {
    if (this.getRememberMe()) {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    if (this.getRememberMe()) {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setTokens(
    accessToken: string, 
    refreshToken: string, 
    expiresIn: number, 
    rememberMe: boolean = false
  ): void {
    const expiresAt = Date.now() + (expiresIn * 1000);
    const storage = rememberMe ? localStorage : sessionStorage;
    
    storage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    storage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    storage.setItem(this.EXPIRES_AT_KEY, expiresAt.toString());
    localStorage.setItem(this.REMEMBER_ME_KEY, rememberMe.toString());
  }

  static clearTokens(): void {
    // Clear from both storages to be safe
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_AT_KEY);
    localStorage.removeItem(this.REMEMBER_ME_KEY);
    
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.EXPIRES_AT_KEY);
  }

  static getExpiresAt(): number | null {
    const storage = this.getRememberMe() ? localStorage : sessionStorage;
    const expiresAt = storage.getItem(this.EXPIRES_AT_KEY);
    return expiresAt ? parseInt(expiresAt, 10) : null;
  }

  static getRememberMe(): boolean {
    return localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
  }

  static isTokenExpired(): boolean {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return true;
    
    // Add 1 minute buffer to prevent edge cases
    return Date.now() > (expiresAt - 60000);
  }

  static getTimeUntilExpiry(): number {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return 0;
    
    return Math.max(0, expiresAt - Date.now());
  }
}

// Request interceptor to add authentication token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = TokenManager.getAccessToken();
    const isExpired = TokenManager.isTokenExpired();
    
    console.log('🌐 API REQUEST:', config.url, 'token exists:', !!token, 'isExpired:', isExpired);
    
    // Debug: Log token details for security endpoints
    if (config.url?.includes('/security/')) {
      console.log('🔐 SECURITY ENDPOINT - Token:', token ? `${token.substring(0, 20)}...` : 'null');
    }
    
    if (token && !isExpired) {
      config.headers = config.headers || {} as AxiosRequestHeaders;
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ API REQUEST: Authorization header added');
    } else {
      console.warn('❌ API REQUEST: No valid token available');
      // Don't fail the request here - let the backend return 401
      // This allows public endpoints to still work
      
      // For security endpoints, redirect to login immediately if no token
      if (config.url?.includes('/security/')) {
        console.error('🚨 SECURITY ENDPOINT requires authentication - redirecting to login');
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh and error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    
    console.log('🚨 API ERROR:', error.response?.status, error.config?.url);
    
    // Enhanced logging for security endpoint errors
    if (error.response?.status === 403 && originalRequest?.url?.includes('/security/')) {
      console.warn('🔒 403 FORBIDDEN - Role-based access denied for security endpoint:', originalRequest.url);
      console.error('🔒 Current token:', TokenManager.getAccessToken() ? 'exists' : 'missing');
      console.error('🔒 Token expired:', TokenManager.isTokenExpired());
    }
    
    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      console.log('🔄 Attempting token refresh...');
      originalRequest._retry = true;
      
      try {
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          console.log('🔑 Found refresh token, attempting refresh...');
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          }, {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          const { access_token, refresh_token: newRefreshToken, expires_in } = response.data;
          TokenManager.setTokens(
            access_token, 
            newRefreshToken, 
            expires_in, 
            TokenManager.getRememberMe()
          );
          
          console.log('✅ Token refresh successful, retrying original request...');
          
          // Retry original request with new token
          originalRequest.headers = originalRequest.headers || {} as AxiosRequestHeaders;
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          
          return apiClient(originalRequest);
        } else {
          console.warn('❌ No refresh token available');
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        // Refresh failed, clear tokens but don't redirect immediately
        TokenManager.clearTokens();
        
        // Only redirect to login if this is not a public endpoint
        const isPublicEndpoint = originalRequest.url?.includes('/health') || 
                                originalRequest.url?.includes('/login') ||
                                originalRequest.url?.includes('/register');
        
        if (!isPublicEndpoint) {
          console.log('🔄 Redirecting to login...');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    // Handle 403 Forbidden - role-based access control (do NOT redirect to login)
    if (error.response?.status === 403) {
      console.warn('🚨 403 Forbidden - insufficient permissions for:', originalRequest?.url);
      // Let the error bubble up to be handled by the component
      // Do NOT redirect to login - user is authenticated but lacks permissions
    }
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        
        // Wait for the specified time and retry
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
        return apiClient(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

// Error logging rate limiter
const errorLogCache = new Map<string, { count: number, lastLogged: number }>();
const MAX_LOGS_PER_ERROR = 3; // Only log first 3 occurrences of same error
const LOG_RESET_TIME = 60000; // Reset error count every 60 seconds

const shouldLogError = (errorKey: string): boolean => {
  const now = Date.now();
  const existing = errorLogCache.get(errorKey);

  if (!existing) {
    errorLogCache.set(errorKey, { count: 1, lastLogged: now });
    return true;
  }

  // Reset count if enough time has passed
  if (now - existing.lastLogged > LOG_RESET_TIME) {
    errorLogCache.set(errorKey, { count: 1, lastLogged: now });
    return true;
  }

  // Only log if under the limit
  if (existing.count < MAX_LOGS_PER_ERROR) {
    existing.count++;
    existing.lastLogged = now;
    return true;
  }

  return false; // Don't log - too many similar errors
};

// Generic API error handler
export const handleApiError = (error: AxiosError): ApiError => {
  // Create unique error key to prevent spam
  const errorKey = `${error.config?.method?.toUpperCase()}_${error.config?.url}_${error.response?.status}`;

  // Only log if not spamming
  if (shouldLogError(errorKey)) {
    console.error('API Error Details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method
    });
  }

  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data as any;

    // Enhanced error detail extraction to handle structured responses
    const extractErrorMessage = (errorData: any): string => {
      // Handle new structured error format: { error: "...", message: "..." }
      if (typeof errorData === 'object' && errorData !== null) {
        if (errorData.message) {
          return errorData.message;
        }
        if (errorData.error) {
          return errorData.error;
        }
        if (errorData.detail) {
          // Handle nested detail objects
          if (typeof errorData.detail === 'object' && errorData.detail.message) {
            return errorData.detail.message;
          }
          if (typeof errorData.detail === 'string') {
            return errorData.detail;
          }
        }
      }

      // Handle string responses
      if (typeof errorData === 'string') {
        return errorData;
      }

      // Fallback for unknown formats
      return JSON.stringify(errorData);
    };

    // Handle specific error cases
    if (status === 404) {
      return {
        detail: extractErrorMessage(data) || 'Resource not found',
        status_code: status,
        error_code: 'NOT_FOUND',
      };
    } else if (status === 401) {
      return {
        detail: extractErrorMessage(data) || 'Authentication required',
        status_code: status,
        error_code: 'UNAUTHORIZED',
      };
    } else if (status === 403) {
      return {
        detail: extractErrorMessage(data) || 'Access denied - insufficient permissions',
        status_code: status,
        error_code: 'FORBIDDEN',
      };
    } else if (status === 429) {
      return {
        detail: extractErrorMessage(data) || 'Too many requests. Please wait before trying again.',
        status_code: status,
        error_code: 'RATE_LIMITED',
      };
    } else if (status === 500) {
      return {
        detail: extractErrorMessage(data) || 'Internal server error. Please try again later.',
        status_code: status,
        error_code: 'SERVER_ERROR',
      };
    } else if (status >= 500) {
      return {
        detail: 'Server error. Please try again later.',
        status_code: status,
        error_code: 'SERVER_ERROR',
      };
    }

    return {
      detail: extractErrorMessage(data) || 'An error occurred',
      status_code: status,
      error_code: data?.error_code || 'API_ERROR',
    };
  } else if (error.request) {
    // Network error - no response received
    if (error.code === 'ECONNREFUSED') {
      return {
        detail: 'Cannot connect to server. Please check if the server is running.',
        status_code: 0,
        error_code: 'CONNECTION_REFUSED',
      };
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        detail: 'Request timeout. The server took too long to respond.',
        status_code: 0,
        error_code: 'TIMEOUT_ERROR',
      };
    } else if (error.code === 'NETWORK_ERROR') {
      return {
        detail: 'Network error. Please check your internet connection.',
        status_code: 0,
        error_code: 'NETWORK_ERROR',
      };
    } else {
      return {
        detail: 'Network error. Please check your connection and try again.',
        status_code: 0,
        error_code: 'NETWORK_ERROR',
      };
    }
  } else {
    // Request setup error
    return {
      detail: 'Request failed. Please try again.',
      status_code: 0,
      error_code: 'REQUEST_ERROR',
    };
  }
};

// Generic API wrapper function
export const apiRequest = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: any,
  config?: CustomAxiosRequestConfig
): Promise<ApiResponse<T>> => {
  try {
    let response: AxiosResponse<T>;
    
    switch (method) {
      case 'GET':
        response = await apiClient.get(url, config);
        break;
      case 'POST':
        response = await apiClient.post(url, data, config);
        break;
      case 'PUT':
        response = await apiClient.put(url, data, config);
        break;
      case 'DELETE':
        response = await apiClient.delete(url, config);
        break;
      case 'PATCH':
        response = await apiClient.patch(url, data, config);
        break;
    }
    
    return {
      data: response.data,
      success: true,
    };
  } catch (error) {
    return {
      error: handleApiError(error as AxiosError),
      success: false,
    };
  }
};

// Export API client and token manager
export { apiClient, TokenManager };
export default apiClient;