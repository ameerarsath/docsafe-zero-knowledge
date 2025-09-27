// tests/encryption.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt, deriveKey, generateSalt } from '../utils/encryption';

describe('Document Decryption Integration', () => {
  let testKey: CryptoKey;
  let testPassword = 'TestPassword123!';
  let testSalt: Uint8Array;

  beforeAll(async () => {
    testSalt = generateSalt();
    testKey = await deriveKey({
      password: testPassword,
      salt: testSalt,
      iterations: 500000
    });
  });

  it('should successfully encrypt and decrypt document content', async () => {
    const originalData = 'This is test document content for SecureVault';
    const dataBuffer = new TextEncoder().encode(originalData);

    // Encrypt the data
    const encrypted = await encrypt(
      dataBuffer,
      testKey
    );

    // Decrypt the data
    const decrypted = await decrypt({
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      key: testKey
    });

    const decryptedText = new TextDecoder().decode(decrypted);
    expect(decryptedText).toBe(originalData);
  });

  it('should fail gracefully with corrupted ciphertext', async () => {
    const corruptedBase64 = 'INVALID_BASE64_!!!_CONTENT_###';

    await expect(decrypt({
      ciphertext: corruptedBase64,
      iv: 'dGVzdGl2MTIzNDU2Nzg=', // valid base64
      authTag: 'dGVzdGF1dGh0YWcxMjM0', // valid base64
      key: testKey
    })).rejects.toThrow(/Invalid base64 format/);
  });

  it('should fail with proper error for empty ciphertext', async () => {
    await expect(decrypt({
      ciphertext: '',
      iv: 'dGVzdGl2MTIzNDU2Nzg=',
      authTag: 'dGVzdGF1dGh0YWcxMjM0',
      key: testKey
    })).rejects.toThrow(/Invalid base64 input: must be a non-empty string/);
  });

  it('should handle URL-safe base64 conversion', async () => {
    const originalData = 'Test data with special characters + / =';
    const dataBuffer = new TextEncoder().encode(originalData);

    // Encrypt the data
    const encrypted = await encrypt(
      dataBuffer,
      testKey
    );

    // Convert to URL-safe base64 (replace + with -, / with _)
    const urlSafeCiphertext = encrypted.ciphertext.replace(/\+/g, '-').replace(/\//g, '_');

    // Should still decrypt successfully
    const decrypted = await decrypt({
      ciphertext: urlSafeCiphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      key: testKey
    });

    const decryptedText = new TextDecoder().decode(decrypted);
    expect(decryptedText).toBe(originalData);
  });
});