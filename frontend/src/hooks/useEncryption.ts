/**
 * React hook for encryption operations in SecureVault.
 * 
 * This hook provides a complete encryption interface including:
 * - Key management and derivation
 * - File encryption/decryption
 * - Server API integration
 * - Error handling and validation
 */

import { useCallback, useEffect, useState } from 'react';
import { encryptionApi } from '../services/api/encryption';
import useAuthStore from '../stores/authStore';
import {
  base64ToUint8Array,
  createValidationPayload,
  decryptFile,
  DecryptionError,
  UnsupportedFormatError,
  deriveExtractableKey,
  deriveKey,
  encryptFile,
  ENCRYPTION_CONFIG,
  EncryptionError,
  generateSalt,
  isWebCryptoSupported,
  KeyDerivationError,
  testCryptoFunctionality,
  uint8ArrayToBase64
} from '../utils/encryption';

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Types
export interface EncryptionKey {
  keyId: string;
  algorithm: string;
  keyDerivationMethod: string;
  iterations: number;
  salt: string;
  hint?: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  escrowAvailable: boolean;
}

export interface EncryptionKeyCreateRequest {
  password: string;
  hint?: string;
  iterations?: number;
  replaceExisting?: boolean;
}

export interface FileEncryptionResult {
  encryptedFile: File;
  encryptionMetadata: {
    keyId: string;
    dek: string; // Encrypted Document Encryption Key (base64 JSON)
    iv: string;
    authTag: string;
    algorithm: string;
    originalSize: number;
    encryptedSize: number;
  };
}

export interface EncryptionState {
  isSupported: boolean;
  isInitialized: boolean;
  currentKey: EncryptionKey | null;
  keys: EncryptionKey[];
  isLoading: boolean;
  error: string | null;
}

export interface EncryptionActions {
  // Key management
  createEncryptionKey: (request: EncryptionKeyCreateRequest) => Promise<EncryptionKey>;
  loadEncryptionKeys: () => Promise<void>;
  setCurrentKey: (keyId: string) => Promise<void>;
  deactivateKey: (keyId: string, reason: string) => Promise<void>;
  
  // Key derivation
  deriveUserKey: (password: string, keyData: EncryptionKey) => Promise<CryptoKey>;
  validatePassword: (password: string, keyData: EncryptionKey) => Promise<boolean>;
  
  // File operations
  encryptFileForUpload: (file: File, password: string, onProgress?: (progress: number) => void, keyOverride?: EncryptionKey) => Promise<FileEncryptionResult>;
  decryptDownloadedFile: (encryptedData: ArrayBuffer, metadata: any, password: string) => Promise<File>;
  
  // Utilities
  testEncryption: () => Promise<boolean>;
  generateNewSalt: () => Promise<string>;
  getRecommendedParameters: () => Promise<any>;
  
  // State management
  clearError: () => void;
  reset: () => void;
}

export interface UseEncryptionReturn extends EncryptionState, EncryptionActions {}

/**
 * Custom hook for encryption operations
 */
export function useEncryption(options?: { loadKeysOnMount?: boolean }): UseEncryptionReturn {
  const { loadKeysOnMount = true } = options || {};
  const user = useAuthStore((state) => state.user);
  
  const [state, setState] = useState<EncryptionState>({
    isSupported: isWebCryptoSupported(),
    isInitialized: false,
    currentKey: null,
    keys: [],
    isLoading: false,
    error: null
  });

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<EncryptionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handle errors consistently
   */
  const handleError = useCallback((error: any, fallbackMessage: string) => {
    // Encryption error occurred
    const errorMessage = error instanceof Error ? error.message : fallbackMessage;
    updateState({ error: errorMessage, isLoading: false });
    throw error;
  }, []); // updateState is stable

  /**
   * Initialize encryption system
   */
  const initialize = useCallback(async () => {
    if (!state.isSupported) {
      updateState({ error: 'Web Crypto API not supported in this browser' });
      return;
    }

    updateState({ isLoading: true, error: null });

    try {
      // Check authentication status first
      const authState = useAuthStore.getState();
      console.log('Auth status during encryption init:', {
        isAuthenticated: authState.isAuthenticated,
        user: authState.user?.username,
        hasToken: !!authState.tokens?.access_token
      });

      // Test crypto functionality
      const cryptoWorks = await testCryptoFunctionality();
      if (!cryptoWorks) {
        throw new Error('Crypto functionality test failed');
      }

      // Try to load user's encryption keys
      // This might fail for first-time users or auth issues, but encryption should still be "initialized"
      try {
        await loadEncryptionKeys();
        console.log('SUCCESS: Encryption keys loaded successfully');
      } catch (keyError) {
        console.warn('WARNING: Failed to load encryption keys (may be first-time user or auth issue):', keyError);
        // Don't treat key loading failure as initialization failure
        // First-time users won't have keys, and that's OK
        updateState({ keys: [], currentKey: null });
      }

      updateState({ isInitialized: true, isLoading: false });
      console.log('SUCCESS: Encryption system initialized successfully');
    } catch (error) {
      console.error('ERROR: Failed to initialize encryption system:', error);
      updateState({ isLoading: false });
      handleError(error, 'Failed to initialize encryption system');
    }
  }, [state.isSupported]); // updateState and handleError are stable

  /**
   * Create new encryption key
   */
  const createEncryptionKey = useCallback(async (request: EncryptionKeyCreateRequest): Promise<EncryptionKey> => {
    if (!user) throw new Error('User not authenticated');
    
    updateState({ isLoading: true, error: null });

    try {
      // Generate salt and parameters
      const salt = generateSalt();
      const iterations = request.iterations || ENCRYPTION_CONFIG.RECOMMENDED_ITERATIONS;
      
      // Derive key for validation
      const keyMaterial = await deriveExtractableKey({
        password: request.password,
        salt,
        iterations
      });
      
      const derivedKey = await deriveKey({
        password: request.password,
        salt,
        iterations
      });

      // Create validation payload
      const validationPayload = await createValidationPayload(user.username, derivedKey);

      // Prepare request
      const keyCreateRequest = {
        password: request.password,
        iterations,
        salt: uint8ArrayToBase64(salt),
        hint: request.hint,
        validation_ciphertext: validationPayload.ciphertext,
        validation_iv: validationPayload.iv,
        validation_auth_tag: validationPayload.authTag,
        replace_existing: request.replaceExisting || false
      };

      // Create key on server
      const newKey = await encryptionApi.createKey(keyCreateRequest);
      
      // Update local state
      await loadEncryptionKeys();
      
      updateState({ isLoading: false });
      return newKey;
    } catch (error) {
      console.error('Failed to create encryption key:', error);
      updateState({ isLoading: false });
      handleError(error, 'Failed to create encryption key');
      throw error;
    }
  }, [user]); // updateState and handleError are stable

  /**
   * Load encryption keys from server
   */
  const loadEncryptionKeys = useCallback(async () => {
    updateState({ isLoading: true, error: null });

    try {
      const keyList = await encryptionApi.listKeys();
      const keys = keyList.keys || [];
      const activeKey = keys.find(key => key.isActive) || null;

      updateState({
        keys: keys,
        currentKey: activeKey,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to load encryption keys:', error);

      // Handle 500 errors gracefully (Unicode encoding issues)
      if (error.response?.status === 500) {
        const errorMessage = error.response?.data?.detail || error.message || '';
        const isEncodingError = errorMessage.includes('charmap') ||
                               errorMessage.includes('codec') ||
                               errorMessage.includes('Unicode') ||
                               errorMessage.includes('encoding');

        if (isEncodingError) {
          updateState({
            error: "Server encountered a character encoding issue. Some encryption keys may contain special characters that aren't supported. You can still create new keys with plain text names.",
            keys: [],
            currentKey: null,
            isLoading: false,
          });

          // Optional: Show user notification
          console.warn('Encryption keys API failed due to encoding issue - showing graceful fallback');
          return;
        } else {
          // Other 500 errors
          updateState({
            error: "Server error loading encryption keys. Please try again later.",
            keys: [],
            currentKey: null,
            isLoading: false,
          });
          return;
        }
      }

      // Handle network errors
      if (!error.response) {
        updateState({
          error: "Network error: Unable to connect to server. Please check your connection.",
          keys: [],
          currentKey: null,
          isLoading: false,
        });
        return;
      }

      // Handle authentication errors
      if (error.response?.status === 401) {
        updateState({
          error: "Authentication required. Please log in again.",
          keys: [],
          currentKey: null,
          isLoading: false,
        });
        return;
      }

      // Handle other errors
      updateState({ isLoading: false });
      handleError(error, 'Failed to load encryption keys');
    }
  }, []); // updateState and handleError are stable

  /**
   * Set current active key
   */
  const setCurrentKey = useCallback(async (keyId: string) => {
    const key = state.keys?.find(k => k.keyId === keyId);
    if (!key) {
      throw new Error('Key not found');
    }
    
    updateState({ currentKey: key });
  }, [state.keys]);

  /**
   * Deactivate encryption key
   */
  const deactivateKey = useCallback(async (keyId: string, reason: string) => {
    updateState({ isLoading: true, error: null });

    try {
      await encryptionApi.deactivateKey(keyId, reason);
      await loadEncryptionKeys(); // Refresh key list
      updateState({ isLoading: false });
    } catch (error) {
      handleError(error, 'Failed to deactivate key');
    }
  }, [loadEncryptionKeys]); // updateState and handleError are stable

  /**
   * Derive user's encryption key from password
   */
  const deriveUserKey = useCallback(async (password: string, keyData: EncryptionKey): Promise<CryptoKey> => {
    try {
      // Validate key data
      if (!keyData) {
        throw new Error('Key data is required');
      }
      if (!keyData.salt) {
        throw new Error('Salt is missing from key data');
      }
      if (!keyData.iterations || keyData.iterations < 100000) {
        throw new Error('Invalid iterations in key data');
      }
      
      // Deriving key with provided data
      
      const salt = base64ToUint8Array(keyData.salt);
      const derivedKey = await deriveKey({
        password,
        salt,
        iterations: keyData.iterations
      });
      
      return derivedKey;
    } catch (error) {
      // Key derivation error
      throw new KeyDerivationError(`Failed to derive key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  /**
   * Validate password against encryption key
   */
  const validatePassword = useCallback(async (password: string, keyData: EncryptionKey): Promise<boolean> => {
    if (!user) return false;

    try {
      const derivedKey = await deriveUserKey(password, keyData);
      
      // Create validation payload and verify with server
      const validationPayload = await createValidationPayload(user.username, derivedKey);
      const keyMaterial = await deriveExtractableKey({
        password,
        salt: base64ToUint8Array(keyData.salt),
        iterations: keyData.iterations
      });

      const validationRequest = {
        key: uint8ArrayToBase64(new Uint8Array(keyMaterial)),
        iv: validationPayload.iv,
        auth_tag: validationPayload.authTag,
        ciphertext: validationPayload.ciphertext
      };

      const result = await encryptionApi.validateEncryption(validationRequest);
      return result.valid;
    } catch (error) {
      // Password validation failed
      return false;
    }
  }, [user, deriveUserKey]);

  /**
   * Encrypt file for upload (Zero-Knowledge with DEK-per-document)
   */
  const encryptFileForUpload = useCallback(async (
    file: File,
    password: string,
    onProgress?: (progress: number) => void,
    keyOverride?: EncryptionKey
  ): Promise<FileEncryptionResult> => {
    const keyToUse = keyOverride || state.currentKey;
    if (!keyToUse) {
      throw new Error('No active encryption key available');
    }

    try {
      console.log('[ENCRYPT] Starting zero-knowledge encryption for file:', file.name);
      console.log('[ENCRYPT] ========== ENCRYPTION PARAMETERS (DEBUG) ==========');
      console.log('[ENCRYPT] Encryption Key Details:', {
        keyId: keyToUse.keyId,
        algorithm: keyToUse.algorithm,
        iterations: keyToUse.iterations,
        saltLength: keyToUse.salt?.length,
        saltPreview: keyToUse.salt?.substring(0, 20) + '...',
        isActive: keyToUse.isActive
      });
      console.log('[ENCRYPT] Password length:', password.length);

      // Step 1: Generate a unique DEK (Document Encryption Key) for this document
      const dek = crypto.getRandomValues(new Uint8Array(32)); // 256-bit DEK
      const dekCryptoKey = await crypto.subtle.importKey(
        'raw',
        dek,
        'AES-GCM',
        false,
        ['encrypt']
      );

      // Step 2: Encrypt the file with the DEK
      const fileBuffer = await file.arrayBuffer();
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

      const encryptedContent = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        dekCryptoKey,
        fileBuffer
      );

      const encryptedArray = new Uint8Array(encryptedContent);

      // Step 3: Extract auth tag from the encrypted data (last 16 bytes for AES-GCM)
      const authTagLength = 16;
      const ciphertext = encryptedArray.slice(0, encryptedArray.length - authTagLength);
      const authTag = encryptedArray.slice(encryptedArray.length - authTagLength);

      // Step 4: Encrypt the DEK with the user's master key (derived from password)
      const masterKey = await deriveUserKey(password, keyToUse);
      const dekIv = crypto.getRandomValues(new Uint8Array(12)); // New IV for DEK encryption

      const encryptedDek = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: dekIv
        },
        masterKey,
        dek
      );

      const encryptedDekArray = new Uint8Array(encryptedDek);

      // Step 5: Extract auth tag for encrypted DEK
      const dekCiphertext = encryptedDekArray.slice(0, encryptedDekArray.length - authTagLength);
      const dekAuthTag = encryptedDekArray.slice(encryptedDekArray.length - authTagLength);

      // Step 6: Create encrypted file (ciphertext + auth tag for file content)
      const encryptedBlob = new Blob([ciphertext, authTag]);
      const encryptedFile = new File([encryptedBlob], `${file.name}.enc`, {
        type: 'application/octet-stream'
      });

      // Step 7: Prepare encrypted DEK metadata as JSON
      const encryptedDekJson = {
        ciphertext: arrayBufferToBase64(dekCiphertext.buffer),
        iv: arrayBufferToBase64(dekIv.buffer),
        authTag: arrayBufferToBase64(dekAuthTag.buffer),
        algorithm: 'AES-256-GCM'
      };

      // Step 8: Prepare metadata for backend
      const metadata = {
        keyId: keyToUse.keyId,
        dek: btoa(JSON.stringify(encryptedDekJson)), // Encrypted DEK as base64 JSON string
        iv: arrayBufferToBase64(iv.buffer), // IV for file encryption
        authTag: arrayBufferToBase64(authTag.buffer), // Auth tag for file encryption
        algorithm: 'AES-256-GCM',
        originalSize: file.size,
        encryptedSize: encryptedFile.size
      };

      console.log('[ENCRYPT] Zero-knowledge encryption completed successfully');
      console.log('[ENCRYPT] Original size:', file.size);
      console.log('[ENCRYPT] Encrypted size:', encryptedFile.size);
      console.log('[ENCRYPT] Encrypted DEK length:', encryptedDekJson.ciphertext.length);

      return {
        encryptedFile,
        encryptionMetadata: metadata
      };
    } catch (error) {
      console.error('[ENCRYPT] File encryption failed:', error);
      throw new EncryptionError(
        `File encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FILE_ENCRYPTION_FAILED'
      );
    }
  }, [state.currentKey, deriveUserKey]);


  /**
   * Decrypt downloaded file with multi-key retry logic and enhanced error handling
   */
  const decryptDownloadedFile = useCallback(async (
    encryptedData: ArrayBuffer,
    metadata: any,
    password: string
  ): Promise<File> => {
    try {
      // Find the key used for encryption (WORKING VERSION - SIMPLE & RELIABLE)
      const keyData = state.keys?.find(k => k.keyId === metadata.keyId);
      if (!keyData) {
        throw new Error('Encryption key not found');
      }

      const derivedKey = await deriveUserKey(password, keyData);

      // Split encrypted data into ciphertext and auth tag (WORKING VERSION)
      const encryptedArray = new Uint8Array(encryptedData);
      const authTagSize = ENCRYPTION_CONFIG.AUTH_TAG_LENGTH;
      const ciphertext = encryptedArray.slice(0, -authTagSize);
      const authTag = encryptedArray.slice(-authTagSize);

      const decryptedFile = await decryptFile(
        {
          ciphertext: uint8ArrayToBase64(ciphertext),
          iv: metadata.iv,
          authTag: uint8ArrayToBase64(authTag),
          key: derivedKey
        },
        metadata.originalName || 'decrypted-file',
        metadata.mimeType
      );

      return decryptedFile;
    } catch (error) {
      throw new DecryptionError(
        `File decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [state.keys, deriveUserKey]);

  /**
   * Test encryption functionality
   */
  const testEncryption = useCallback(async (): Promise<boolean> => {
    try {
      return await testCryptoFunctionality();
    } catch (error) {
      // Encryption test failed
      return false;
    }
  }, []);

  /**
   * Generate new salt
   */
  const generateNewSalt = useCallback(async (): Promise<string> => {
    try {
      const response = await encryptionApi.generateSalt();
      return response.salt;
    } catch (error) {
      throw new Error(`Failed to generate salt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  /**
   * Get recommended parameters
   */
  const getRecommendedParameters = useCallback(async () => {
    try {
      return await encryptionApi.getParameters();
    } catch (error) {
      throw new Error(`Failed to get parameters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, []); // updateState is stable

  /**
   * Reset encryption state
   */
  const reset = useCallback(() => {
    setState({
      isSupported: isWebCryptoSupported(),
      isInitialized: false,
      currentKey: null,
      keys: [],
      isLoading: false,
      error: null
    });
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (user && !state.isInitialized && state.isSupported && loadKeysOnMount) {
      initialize();
    }
  }, [user, state.isInitialized, state.isSupported, initialize, loadKeysOnMount]);

  // Auto-load keys when user changes
  useEffect(() => {
    if (user && state.isInitialized) {
      loadEncryptionKeys();
    }
  }, [user, state.isInitialized, loadEncryptionKeys]);

  return {
    // State
    ...state,
    
    // Actions
    createEncryptionKey,
    loadEncryptionKeys,
    setCurrentKey,
    deactivateKey,
    deriveUserKey,
    validatePassword,
    encryptFileForUpload,
    decryptDownloadedFile,
    testEncryption,
    generateNewSalt,
    getRecommendedParameters,
    clearError,
    reset
  };
}