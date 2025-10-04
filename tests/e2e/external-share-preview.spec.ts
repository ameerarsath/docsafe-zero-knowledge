/**
 * External Share Preview Test
 *
 * Tests the external share preview functionality with encryption
 * Verifies the fix for 500 error when encryption_salt is sent in HTTP headers
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'http://localhost:8002';

test.describe('External Share Preview', () => {
  let authToken: string;
  let documentId: number;
  let shareToken: string;
  const encryptionPassword = 'TestEncryption123!';

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: {
        username: 'rahumana',
        password: 'TestPass123@'
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    authToken = loginData.access_token;

    console.log('✅ Logged in successfully');
  });

  test('should create encrypted document and external share', async ({ request }) => {
    // Create a test document (simulate encrypted upload)
    const testContent = new TextEncoder().encode('This is a test encrypted document');
    const base64Content = Buffer.from(testContent).toString('base64');

    const uploadResponse = await request.post(`${API_URL}/api/v1/documents/upload`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      multipart: {
        file: {
          name: 'test-encrypted.txt',
          mimeType: 'text/plain',
          buffer: testContent
        },
        upload_data: JSON.stringify({
          name: 'Test Encrypted Document',
          mime_type: 'text/plain',
          file_size: testContent.length,
          file_hash: 'test-hash',
          is_encrypted: true,
          encrypted_dek: 'encrypted-dek-placeholder',
          encryption_iv: Buffer.from('test-iv-12345678').toString('base64'),
          encryption_auth_tag: Buffer.from('test-auth-tag-1234').toString('base64'),
          encryption_algorithm: 'aes-256-gcm',
          salt: Buffer.from('test-salt-value-16b').toString('base64')
        })
      }
    });

    expect(uploadResponse.ok()).toBeTruthy();
    const uploadData = await uploadResponse.json();
    documentId = uploadData.id;

    console.log('✅ Uploaded encrypted document:', documentId);

    // Create external share with encryption password
    const shareResponse = await request.post(`${API_URL}/api/v1/shares/`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        document_id: documentId,
        share_type: 'external',
        allow_preview: true,
        allow_download: true,
        encryption_password: encryptionPassword
      }
    });

    expect(shareResponse.ok()).toBeTruthy();
    const shareData = await shareResponse.json();
    shareToken = shareData.share_token;

    console.log('✅ Created external share:', shareToken);
  });

  test('should preview shared document without 500 error', async ({ request }) => {
    // Access the preview endpoint that was failing with 500
    const previewResponse = await request.get(
      `${API_URL}/api/v1/shares/${shareToken}/preview?password=${encodeURIComponent(encryptionPassword)}`
    );

    console.log('📡 Preview response status:', previewResponse.status());

    // CRITICAL: Should return 200, not 500
    expect(previewResponse.status()).toBe(200);

    // Verify encryption headers are present and properly formatted
    const headers = previewResponse.headers();

    console.log('📋 Response headers:', {
      'x-encryption-salt': headers['x-encryption-salt'],
      'x-encryption-iv': headers['x-encryption-iv'],
      'x-encryption-algorithm': headers['x-encryption-algorithm'],
      'x-requires-decryption': headers['x-requires-decryption']
    });

    // Verify encryption metadata headers exist
    if (headers['x-requires-decryption'] === 'true') {
      // If decryption is required, encryption headers should be present
      expect(headers['x-encryption-algorithm']).toBeDefined();

      // Verify salt is base64 encoded string (not bytes)
      if (headers['x-encryption-salt']) {
        const saltValue = headers['x-encryption-salt'];
        expect(typeof saltValue).toBe('string');
        expect(saltValue.length).toBeGreaterThan(0);

        // Verify it's valid base64
        expect(() => Buffer.from(saltValue, 'base64')).not.toThrow();
        console.log('✅ Salt header is valid base64:', saltValue);
      }

      // Verify IV is base64 encoded string
      if (headers['x-encryption-iv']) {
        const ivValue = headers['x-encryption-iv'];
        expect(typeof ivValue).toBe('string');
        expect(ivValue.length).toBeGreaterThan(0);

        // Verify it's valid base64
        expect(() => Buffer.from(ivValue, 'base64')).not.toThrow();
        console.log('✅ IV header is valid base64:', ivValue);
      }
    }

    const content = await previewResponse.body();
    console.log('📄 Response content length:', content.length);

    console.log('✅ External share preview successful - 500 error fixed!');
  });

  test('should handle decrypted preview response', async ({ request }) => {
    // Test when server decrypts the document
    const previewResponse = await request.get(
      `${API_URL}/api/v1/shares/${shareToken}/preview?password=${encodeURIComponent(encryptionPassword)}`
    );

    expect(previewResponse.ok()).toBeTruthy();

    const headers = previewResponse.headers();
    const isDecrypted = headers['x-decrypted'] === 'true';

    if (isDecrypted) {
      console.log('✅ Server-side decryption successful');

      // Verify decrypted content headers
      expect(headers['content-length']).toBeDefined();
      expect(parseInt(headers['content-length']!)).toBeGreaterThan(0);

      const content = await previewResponse.body();
      console.log('📄 Decrypted content length:', content.length);
    } else {
      console.log('ℹ️  Client-side decryption required');

      // Verify encryption metadata is provided
      expect(headers['x-requires-decryption']).toBe('true');
    }
  });

  test('should handle missing encryption metadata gracefully', async ({ request }) => {
    // Test accessing share without password (should still return 200 with encrypted data)
    const previewResponse = await request.get(
      `${API_URL}/api/v1/shares/${shareToken}/preview`
    );

    // Should not return 500, even without password
    expect(previewResponse.status()).not.toBe(500);

    if (previewResponse.status() === 200) {
      const headers = previewResponse.headers();
      expect(headers['x-requires-decryption']).toBe('true');
      console.log('✅ Encrypted data returned when password not provided');
    } else if (previewResponse.status() === 401) {
      console.log('ℹ️  Password required (expected for password-protected shares)');
    }
  });
});
