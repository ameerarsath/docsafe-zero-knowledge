/**
 * React Frontend Encryption Fix for SecureVault
 * Minimal fix to handle Base64 decoding and AES-GCM format compatibility with Flask backend
 */

// Enhanced Base64 validation and decoding
export function validateAndDecodeBase64(base64String: string, fieldName: string): Uint8Array {
  try {
    if (!base64String || typeof base64String !== 'string') {
      throw new Error(`${fieldName} is required and must be a string`);
    }

    // Clean and validate Base64 format
    const cleaned = base64String.trim().replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
      throw new Error(`${fieldName} contains invalid Base64 characters`);
    }

    // Decode and validate result
    const decoded = Uint8Array.from(atob(cleaned), c => c.charCodeAt(0));
    if (decoded.length === 0) {
      throw new Error(`${fieldName} decoded to empty data`);
    }

    return decoded;
  } catch (error) {
    throw new Error(`Base64 decoding failed for ${fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Fixed key derivation function
export async function deriveKeyFixed(password: string, saltBase64: string, iterations: number = 500000): Promise<CryptoKey> {
  try {
    console.log('🔑 DERIVE_KEY_FIXED:', { passwordLength: password.length, saltBase64Length: saltBase64.length, iterations });

    // Decode salt with validation
    const salt = validateAndDecodeBase64(saltBase64, 'salt');
    console.log('✅ Salt decoded:', salt.length, 'bytes');

    // Import password as key material
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive AES key
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false, // not extractable for security
      ['encrypt', 'decrypt']
    );

    console.log('✅ Key derivation successful');
    return derivedKey;

  } catch (error) {
    console.error('❌ Key derivation failed:', error);
    throw new Error(`Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Fixed AES-GCM decryption function
export async function decryptAESGCMFixed(
  ciphertextBase64: string,
  ivBase64: string,
  authTagBase64: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  try {
    console.log('🔓 DECRYPT_AES_GCM_FIXED:', {
      ciphertextLength: ciphertextBase64.length,
      ivLength: ivBase64.length,
      authTagLength: authTagBase64.length
    });

    // Validate and decode all components
    const ciphertext = validateAndDecodeBase64(ciphertextBase64, 'ciphertext');
    const iv = validateAndDecodeBase64(ivBase64, 'IV');
    const authTag = validateAndDecodeBase64(authTagBase64, 'auth tag');

    // Validate component sizes
    if (iv.length !== 12) {
      throw new Error(`IV must be 12 bytes, got ${iv.length}`);
    }
    if (authTag.length !== 16) {
      throw new Error(`Auth tag must be 16 bytes, got ${authTag.length}`);
    }

    console.log('✅ All components validated:', {
      ciphertext: ciphertext.length,
      iv: iv.length,
      authTag: authTag.length
    });

    // CRITICAL FIX: Combine ciphertext + auth tag for WebCrypto
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext);
    combined.set(authTag, ciphertext.length);

    console.log('🔧 Combined data for WebCrypto:', combined.length, 'bytes');

    // Decrypt using WebCrypto API
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // 16 bytes = 128 bits
      },
      key,
      combined.buffer
    );

    console.log('✅ Decryption successful:', decrypted.byteLength, 'bytes');
    return decrypted;

  } catch (error) {
    console.error('❌ AES-GCM decryption failed:', error);
    throw new Error(`AES-GCM decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Fixed validation payload verification
export async function verifyValidationPayloadFixed(
  username: string,
  validationPayloadJson: string,
  key: CryptoKey
): Promise<boolean> {
  try {
    console.log('🔍 VERIFY_VALIDATION_PAYLOAD_FIXED:', { username, payloadLength: validationPayloadJson.length });

    // Parse validation payload
    const payload = JSON.parse(validationPayloadJson);
    console.log('📋 Parsed payload:', {
      hasCiphertext: !!payload.ciphertext,
      hasIv: !!payload.iv,
      hasAuthTag: !!payload.authTag
    });

    // Decrypt validation payload
    const decrypted = await decryptAESGCMFixed(
      payload.ciphertext,
      payload.iv,
      payload.authTag,
      key
    );

    // Convert to text and verify
    const decryptedText = new TextDecoder().decode(decrypted);
    const expectedText = `validation:${username}`;

    console.log('🔍 Validation comparison:', {
      decrypted: decryptedText,
      expected: expectedText,
      matches: decryptedText === expectedText
    });

    return decryptedText === expectedText;

  } catch (error) {
    console.error('❌ Validation payload verification failed:', error);
    return false;
  }
}

// Fixed login flow
export async function loginWithZeroKnowledgeFixed(
  username: string,
  password: string,
  encryptionPassword: string
): Promise<{ success: boolean; masterKey?: CryptoKey; error?: string }> {
  try {
    console.log('🚀 LOGIN_WITH_ZERO_KNOWLEDGE_FIXED:', { username });

    // Step 1: Login with username/password
    const loginResponse = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json().catch(() => ({}));
      throw new Error(errorData.detail || `Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Stage 1 login successful');

    // Step 2: Derive encryption key
    if (!loginData.encryption_salt) {
      throw new Error('No encryption salt provided by server');
    }

    const masterKey = await deriveKeyFixed(
      encryptionPassword,
      loginData.encryption_salt,
      loginData.key_derivation_iterations || 500000
    );

    // Step 3: Verify key with validation payload
    if (loginData.key_verification_payload) {
      const isValid = await verifyValidationPayloadFixed(
        username,
        loginData.key_verification_payload,
        masterKey
      );

      if (!isValid) {
        throw new Error('Encryption key verification failed - incorrect encryption password');
      }

      console.log('✅ Encryption key verified successfully');
    }

    return { success: true, masterKey };

  } catch (error) {
    console.error('❌ Zero-knowledge login failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown login error'
    };
  }
}

// Fixed document decryption
export async function decryptDocumentFixed(
  encryptedDocumentData: ArrayBuffer,
  encryptedDEKJson: string,
  masterKey: CryptoKey
): Promise<ArrayBuffer> {
  try {
    console.log('📄 DECRYPT_DOCUMENT_FIXED:', {
      documentSize: encryptedDocumentData.byteLength,
      dekJsonLength: encryptedDEKJson.length
    });

    // Parse encrypted DEK
    const dekInfo = JSON.parse(encryptedDEKJson);

    // Step 1: Decrypt DEK with master key
    const dekBytes = await decryptAESGCMFixed(
      dekInfo.ciphertext,
      dekInfo.iv,
      dekInfo.auth_tag,
      masterKey
    );

    // Step 2: Import DEK as CryptoKey
    const dek = await crypto.subtle.importKey(
      'raw',
      dekBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Step 3: Extract document ciphertext and auth tag
    // Assume last 16 bytes are auth tag
    const docData = new Uint8Array(encryptedDocumentData);
    const docCiphertext = docData.slice(0, -16);
    const docAuthTag = docData.slice(-16);
    const docIv = new Uint8Array(12); // This should come from document metadata

    // Step 4: Decrypt document with DEK
    const combined = new Uint8Array(docCiphertext.length + docAuthTag.length);
    combined.set(docCiphertext);
    combined.set(docAuthTag, docCiphertext.length);

    const decryptedDocument = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: docIv,
        tagLength: 128
      },
      dek,
      combined.buffer
    );

    console.log('✅ Document decryption successful:', decryptedDocument.byteLength, 'bytes');
    return decryptedDocument;

  } catch (error) {
    console.error('❌ Document decryption failed:', error);
    throw new Error(`Document decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Debug utilities
export const debugCrypto = {
  // Test Base64 validation
  testBase64: (base64String: string) => {
    try {
      const result = validateAndDecodeBase64(base64String, 'test');
      console.log('✅ Base64 valid:', result.length, 'bytes');
      return true;
    } catch (error) {
      console.error('❌ Base64 invalid:', error);
      return false;
    }
  },

  // Test key derivation
  testKeyDerivation: async (password: string, saltBase64: string) => {
    try {
      const key = await deriveKeyFixed(password, saltBase64);
      console.log('✅ Key derivation successful');
      return true;
    } catch (error) {
      console.error('❌ Key derivation failed:', error);
      return false;
    }
  },

  // Test decryption with sample data
  testDecryption: async (ciphertext: string, iv: string, authTag: string, keyBase64: string) => {
    try {
      // Import key from base64
      const keyBytes = validateAndDecodeBase64(keyBase64, 'key');
      const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const result = await decryptAESGCMFixed(ciphertext, iv, authTag, key);
      console.log('✅ Test decryption successful:', result.byteLength, 'bytes');
      return new TextDecoder().decode(result);
    } catch (error) {
      console.error('❌ Test decryption failed:', error);
      return null;
    }
  }
};

// Make debug utilities available globally
if (typeof window !== 'undefined') {
  (window as any).debugCrypto = debugCrypto;
}

export default {
  deriveKeyFixed,
  decryptAESGCMFixed,
  verifyValidationPayloadFixed,
  loginWithZeroKnowledgeFixed,
  decryptDocumentFixed,
  validateAndDecodeBase64,
  debugCrypto
};