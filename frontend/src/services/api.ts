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
const API_TIMEOUT = 10000; // 10 seconds

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
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
    if (token && !TokenManager.isTokenExpired()) {
      config.headers = config.headers || {} as AxiosRequestHeaders;
      config.headers.Authorization = `Bearer ${token}`;
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
    
    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token, refresh_token: newRefreshToken, expires_in } = response.data;
          TokenManager.setTokens(
            access_token, 
            newRefreshToken, 
            expires_in, 
            TokenManager.getRememberMe()
          );
          
          // Retry original request with new token
          originalRequest.headers = originalRequest.headers || {} as AxiosRequestHeaders;
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        TokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
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

// Generic API error handler
export const handleApiError = (error: AxiosError): ApiError => {
  if (error.response) {
    // Server responded with error status
    return {
      detail: (error.response.data as any)?.detail || 'An error occurred',
      status_code: error.response.status,
      error_code: (error.response.data as any)?.error_code,
    };
  } else if (error.request) {
    // Network error
    return {
      detail: 'Network error. Please check your connection.',
      status_code: 0,
      error_code: 'NETWORK_ERROR',
    };
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