/**
 * Encryption API service for SecureVault.
 * 
 * This module provides API methods for:
 * - Encryption key management
 * - Key derivation and validation
 * - Cryptographic operations
 * - Key escrow and recovery
 */

import { apiRequest } from '../api';

// Types
export interface CryptoParameters {
  algorithm: string;
  keyDerivation: string;
  minIterations: number;
  recommendedIterations: number;
  saltLength: number;
  ivLength: number;
  authTagLength: number;
  keyLength: number;
}

export interface EncryptionKeyCreateRequest {
  password: string;
  iterations: number;
  salt: string;
  hint?: string;
  validation_ciphertext: string;
  validation_iv: string;
  validation_auth_tag: string;
  replace_existing: boolean;
}

export interface EncryptionKeyResponse {
  keyId: string;
  algorithm: string;
  keyDerivationMethod: string;
  iterations: number;
  salt: string;
  hint?: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  deactivatedAt?: string;
  deactivatedReason?: string;
  escrowAvailable: boolean;
}

export interface EncryptionKeyList {
  keys: EncryptionKeyResponse[];
  total: number;
  activeCount: number;
}

export interface KeyDerivationRequest {
  password: string;
  salt: string;
  iterations: number;
}

export interface KeyDerivationResponse {
  derivedKey: string;
  keyHash: string;
  algorithm: string;
  iterations: number;
}

export interface EncryptionValidationRequest {
  key: string;
  iv: string;
  auth_tag: string;
  ciphertext: string;
  aad?: string;
}

export interface EncryptionValidationResponse {
  valid: boolean;
  algorithm: string;
  plaintextHash?: string;
  errorMessage?: string;
}

export interface SaltGenerationResponse {
  salt: string;
  length: number;
  entropyBits: number;
}

export interface IVGenerationResponse {
  iv: string;
  length: number;
  algorithm: string;
}

export interface EncryptionHealthCheck {
  status: string;
  cryptoFunctional: boolean;
  userKeysCount: number;
  auditLogsCount: number;
  escrowEnabled: boolean;
  supportedAlgorithms: string[];
  supportedKdf: string[];
  error?: string;
}

export interface KeyEscrowCreateRequest {
  keyId: string;
  encryptedKeyMaterial: string;
  escrowMethod: string;
  recoveryHint?: string;
}

export interface KeyEscrowResponse {
  escrowId: number;
  keyId: string;
  userId: number;
  escrowMethod: string;
  recoveryHint?: string;
  createdAt: string;
  createdBy: number;
}

export interface KeyRecoveryRequest {
  keyId: string;
  recoveryReason: string;
}

export interface KeyRecoveryResponse {
  keyId: string;
  userId: number;
  escrowData: string;
  escrowMethod: string;
  recoveryHint?: string;
  recoveredAt: string;
  recoveredBy: number;
}

/**
 * Encryption API client
 */
// Helper function to transform backend response to frontend format
function transformEncryptionKeyResponse(backendKey: any): EncryptionKeyResponse {
  return {
    keyId: backendKey.key_id,
    algorithm: backendKey.algorithm,
    keyDerivationMethod: backendKey.key_derivation_method,
    iterations: backendKey.iterations,
    salt: backendKey.salt,
    hint: backendKey.hint,
    isActive: backendKey.is_active,
    createdAt: backendKey.created_at,
    expiresAt: backendKey.expires_at,
    deactivatedAt: backendKey.deactivated_at,
    deactivatedReason: backendKey.deactivated_reason,
    escrowAvailable: backendKey.escrow_available
  };
}

export const encryptionApi = {
  /**
   * Get recommended cryptographic parameters
   */
  async getParameters(): Promise<CryptoParameters> {
    const response = await apiRequest<CryptoParameters>('GET', '/api/v1/encryption/parameters');
    if (!response.success || !response.data) {
      throw new EncryptionApiError('Failed to get crypto parameters', 500, response.error);
    }
    return response.data;
  },

  /**
   * Generate cryptographically secure salt
   */
  async generateSalt(length?: number): Promise<SaltGenerationResponse> {
    const params = length ? `?length=${length}` : '';
    const response = await apiRequest<SaltGenerationResponse>('GET', `/api/v1/encryption/generate-salt${params}`);
    if (!response.success || !response.data) {
      throw new EncryptionApiError('Failed to generate salt', 500, response.error);
    }
    return response.data;
  },

  /**
   * Generate cryptographically secure IV
   */
  async generateIV(): Promise<IVGenerationResponse> {
    const response = await apiRequest<IVGenerationResponse>('POST', '/api/v1/encryption/generate-iv');
    if (!response.success || !response.data) {
      throw new EncryptionApiError('Failed to generate IV', 500, response.error);
    }
    return response.data;
  },

  /**
   * Create new encryption key
   */
  async createKey(request: EncryptionKeyCreateRequest): Promise<EncryptionKeyResponse> {
    const response = await apiRequest<any>('POST', '/api/v1/encryption/keys', request);
    if (!response.success || !response.data) {
      throw new EncryptionApiError('Failed to create encryption key', 500, response.error);
    }
    return transformEncryptionKeyResponse(response.data);
  },

  /**
   * List user's encryption keys with fallback to alternative endpoint
   */
  async listKeys(includeInactive?: boolean): Promise<EncryptionKeyList> {
    const params = includeInactive ? '?include_inactive=true' : '';
    const primaryEndpoint = `/api/v1/encryption/keys${params}`;
    const fallbackEndpoint = `/api/v1/encryption/keys/all${params}`;

    console.log('Requesting encryption keys from:', primaryEndpoint);

    try {
      // Try primary endpoint first
      const response = await apiRequest<any>('GET', primaryEndpoint);

      console.log('Encryption keys response:', {
        success: response.success,
        error: response.error,
        data: response.data
      });

      if (!response.success) {
        const errorMessage = response.error?.detail || 'Failed to list encryption keys';
        const statusCode = response.error?.status_code || 500;
        console.error('Encryption keys API error:', errorMessage, 'Status:', statusCode);

        // If it's an encoding error, try the fallback endpoint
        if (errorMessage.includes('charmap') || errorMessage.includes('codec') || errorMessage.includes('encoding')) {
          console.log('Encoding error detected, trying fallback endpoint:', fallbackEndpoint);
          return this.listKeysFallback(fallbackEndpoint, includeInactive);
        }

        throw new EncryptionApiError(errorMessage, statusCode, response.error);
      }

      if (!response.data) {
        throw new EncryptionApiError('No data received from encryption keys API', 500, response.error);
      }

      // Transform the keys in the response
      const transformedKeys = response.data.keys?.map(transformEncryptionKeyResponse) || [];

      console.log('Transformed encryption keys:', transformedKeys.length, 'keys');

      return {
        keys: transformedKeys,
        total: response.data.total || 0,
        activeCount: response.data.active_count || 0
      };
    } catch (error) {
      // If primary endpoint fails with encoding error, try fallback
      if (error instanceof EncryptionApiError &&
          (error.message.includes('charmap') || error.message.includes('codec') || error.message.includes('encoding'))) {
        console.log('Primary endpoint failed with encoding error, trying fallback');
        return this.listKeysFallback(fallbackEndpoint, includeInactive);
      }
      throw error;
    }
  },

  /**
   * Fallback method for listing keys when primary endpoint has encoding issues
   */
  async listKeysFallback(endpoint: string, includeInactive?: boolean): Promise<EncryptionKeyList> {
    console.log('Using fallback endpoint:', endpoint);

    const response = await apiRequest<any>('GET', endpoint);

    if (!response.success) {
      const errorMessage = response.error?.detail || 'Failed to list encryption keys (fallback)';
      const statusCode = response.error?.status_code || 500;
      console.error('Fallback encryption keys API error:', errorMessage, 'Status:', statusCode);
      throw new EncryptionApiError(errorMessage, statusCode, response.error);
    }

    if (!response.data) {
      throw new EncryptionApiError('No data received from fallback encryption keys API', 500, response.error);
    }

    // Transform the keys in the response
    const transformedKeys = response.data.keys?.map(transformEncryptionKeyResponse) || [];

    console.log('Fallback transformed encryption keys:', transformedKeys.length, 'keys');

    return {
      keys: transformedKeys,
      total: response.data.total || 0,
      activeCount: response.data.active_count || 0
    };
  },

  /**
   * Get specific encryption key
   */
  async getKey(keyId: string): Promise<EncryptionKeyResponse> {
    const response = await apiRequest<any>('GET', `/api/v1/encryption/keys/${keyId}`);
    if (!response.success || !response.data) {
      throw new EncryptionApiError('Failed to get encryption key', 500, response.error);
    }
    return transformEncryptionKeyResponse(response.data);
  },

  /**
   * Deactivate encryption key
   */
  async deactivateKey(keyId: string, reason: string): Promise<void> {
    const response = await apiRequest<void>('DELETE', `/api/v1/encryption/keys/${keyId}?reason=${encodeURIComponent(reason)}`);
    if (!response.success) {
      throw new EncryptionApiError('Failed to deactivate encryption key', 500, response.error);
    }
  },

  /**
   * Derive encryption key from password
   */
  async deriveKey(request: KeyDerivationRequest): Promise<KeyDerivationResponse> {
    const response = await apiRequest<KeyDerivationResponse>('POST', '/api/v1/encryption/derive-key', request);
    if (!response.success || !response.data) {
      throw new EncryptionApiError('Failed to derive encryption key', 500, response.error);
    }
    return response.data;
  },

  /**
   * Validate encryption/decryption
   */
  async validateEncryption(request: EncryptionValidationRequest): Promise<EncryptionValidationResponse> {
    const response = await apiRequest<EncryptionValidationResponse>('POST', '/api/v1/encryption/validate', request);
    if (!response.success || !response.data) {
      throw new EncryptionApiError('Failed to validate encryption', 500, response.error);
    }
    return response.data;
  },

  /**
   * Create key escrow (admin only)
   */
  async createEscrow(request: KeyEscrowCreateRequest): Promise<KeyEscrowResponse> {
    const response = await apiRequest<KeyEscrowResponse>('POST', '/api/v1/encryption/escrow', request);
    if (!response.success || !response.data) {
      throw new EncryptionApiError('Failed to create key escrow', 500, response.error);
    }
    return response.data;
  },

  /**
   * Recover encryption key from escrow (admin only)
   */
  async recoverKey(request: KeyRecoveryRequest): Promise<KeyRecoveryResponse> {
    const response = await apiRequest<KeyRecoveryResponse>('POST', '/api/v1/encryption/recover', request);
    if (!response.success || !response.data) {
      throw new EncryptionApiError('Failed to recover encryption key', 500, response.error);
    }
    return response.data;
  },

  /**
   * Check encryption system health
   */
  async healthCheck(): Promise<EncryptionHealthCheck> {
    const response = await apiRequest<EncryptionHealthCheck>('GET', '/api/v1/encryption/health');
    if (!response.success || !response.data) {
      throw new EncryptionApiError('Failed to check encryption health', 500, response.error);
    }
    return response.data;
  },

  /**
   * Test UTF-8 encoding functionality
   */
  async testEncoding(): Promise<any> {
    const response = await apiRequest<any>('GET', '/api/v1/encryption/encoding-test');
    if (!response.success || !response.data) {
      throw new EncryptionApiError('Failed to test encoding', 500, response.error);
    }
    return response.data;
  }
};

// Error handling utilities
export class EncryptionApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'EncryptionApiError';
  }
}

/**
 * Handle encryption API errors with specific error types
 */
export function handleEncryptionApiError(error: any): never {
  if (error.response) {
    const { status, data } = error.response;
    const message = data.detail || data.message || 'Encryption API error';
    
    // Specific error handling
    switch (status) {
      case 400:
        if (message.toLowerCase().includes('validation')) {
          throw new EncryptionApiError('Key validation failed - incorrect password or corrupted key', status, data);
        }
        if (message.toLowerCase().includes('iterations')) {
          throw new EncryptionApiError('Insufficient PBKDF2 iterations for security requirements', status, data);
        }
        throw new EncryptionApiError(`Invalid request: ${message}`, status, data);
      
      case 401:
        throw new EncryptionApiError('Authentication required for encryption operations', status, data);
      
      case 403:
        throw new EncryptionApiError('Insufficient privileges for this encryption operation', status, data);
      
      case 404:
        throw new EncryptionApiError('Encryption key or resource not found', status, data);
      
      case 409:
        throw new EncryptionApiError('Encryption key already exists - use replace option if intended', status, data);
      
      case 500:
        throw new EncryptionApiError('Server error during encryption operation', status, data);
      
      default:
        throw new EncryptionApiError(message, status, data);
    }
  }
  
  if (error.request) {
    throw new EncryptionApiError('Network error during encryption operation', 0);
  }
  
  throw new EncryptionApiError(error.message || 'Unknown encryption API error', 0);
}

// Validation utilities
export function validateEncryptionKeyRequest(request: Partial<EncryptionKeyCreateRequest>): string[] {
  const errors: string[] = [];
  
  if (!request.password) {
    errors.push('Password is required');
  } else if (request.password.length < 10) {
    errors.push('Password must be at least 10 characters');
  }
  
  if (request.iterations && request.iterations < 100000) {
    errors.push('Iterations must be at least 100,000');
  }
  
  if (!request.salt) {
    errors.push('Salt is required');
  }
  
  if (!request.validation_ciphertext || !request.validation_iv || !request.validation_auth_tag) {
    errors.push('Validation payload is required');
  }
  
  return errors;
}

export function validateKeyDerivationRequest(request: Partial<KeyDerivationRequest>): string[] {
  const errors: string[] = [];
  
  if (!request.password) {
    errors.push('Password is required');
  }
  
  if (!request.salt) {
    errors.push('Salt is required');
  }
  
  if (!request.iterations) {
    errors.push('Iterations is required');
  } else if (request.iterations < 100000) {
    errors.push('Iterations must be at least 100,000');
  }
  
  return errors;
}

export function validateEncryptionRequest(request: Partial<EncryptionValidationRequest>): string[] {
  const errors: string[] = [];
  
  if (!request.key) {
    errors.push('Encryption key is required');
  }
  
  if (!request.iv) {
    errors.push('Initialization vector is required');
  }
  
  if (!request.auth_tag) {
    errors.push('Authentication tag is required');
  }
  
  if (!request.ciphertext) {
    errors.push('Ciphertext is required');
  }
  
  return errors;
}

// Re-export types for convenience
// Types are already exported above, removing duplicate exports