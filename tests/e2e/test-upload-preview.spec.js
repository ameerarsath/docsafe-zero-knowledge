/**
 * Playwright E2E Test: Upload & Preview Flow
 * 
 * Tests the complete zero-knowledge document upload and preview flow:
 * 1. Login and encryption session initialization
 * 2. File upload with batch completion tracking
 * 3. Document preview with decryption
 * 4. HMR resilience testing
 * 5. Error recovery flows
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3005';
const TEST_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@',
  encryptionPassword: 'JHNpAZ39g!&Y'
};

// Create test fixtures
const createTestFile = (filename, content = 'Test file content for upload testing') => {
  const filePath = path.join(__dirname, 'test-fixtures', filename);
  const fs = require('fs');
  
  // Ensure fixtures directory exists
  const fixturesDir = path.dirname(filePath);
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }
  
  // Create test file
  fs.writeFileSync(filePath, content);
  return filePath;
};

test.describe('Zero-Knowledge Upload & Preview Flow', () => {
  test.beforeAll(async () => {
    // Create test fixtures
    createTestFile('test-document.txt', 'This is a test document for upload and preview testing.');
    createTestFile('test-image.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));
  });

  test.beforeEach(async ({ page }) => {
    // Set up console logging
    page.on('console', msg => {
      console.log(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Set up error tracking
    page.on('pageerror', error => {
      console.error(`[PAGE ERROR] ${error.message}`);
    });
    
    // Navigate to app
    await page.goto(BASE_URL);
  });

  test('Complete Upload and Preview Flow', async ({ page }) => {
    console.log('🧪 Starting Complete Upload and Preview Flow Test');
    
    // Step 1: Login
    console.log('👤 Step 1: Login');
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for encryption unlock page
    await page.waitForSelector('button:has-text("Unlock Documents")', { timeout: 10000 });
    console.log('✅ Login successful, now on encryption unlock page');
    
    // Enter encryption password and unlock
    await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
    await page.click('button:has-text("Unlock Documents")');
    
    // Wait for dashboard/documents page to load
    await page.waitForTimeout(3000);
    console.log('✅ Encryption unlocked, dashboard should be accessible');

    // Step 2: Navigate to Upload (encryption already initialized)
    console.log('📁 Step 2: Navigate to Upload');
    
    // Look for upload functionality - it might be a button or link
    await page.waitForTimeout(2000); // Let page fully load
    
    // Try different possible upload triggers
    const uploadTriggers = [
      'button:has-text("Upload Files")',
      'button:has-text("Upload")',
      'a:has-text("Upload")',
      '[data-testid="upload-button"]',
      'input[type="file"]'
    ];
    
    let uploadFound = false;
    for (const trigger of uploadTriggers) {
      const element = await page.locator(trigger);
      if (await element.count() > 0) {
        console.log(`✅ Found upload trigger: ${trigger}`);
        if (!trigger.includes('input[type="file"]')) {
          await element.click();
        }
        uploadFound = true;
        break;
      }
    }
    
    if (!uploadFound) {
      console.log('❌ No upload trigger found, taking screenshot for debugging');
      await page.screenshot({ path: 'debug-no-upload-trigger.png' });
    }

    // Step 3: Upload Test File
    console.log('📤 Step 3: Upload Test File');
    const testFilePath = path.join(__dirname, 'test-fixtures', 'test-document.txt');
    
    // Set up file upload
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    
    // Monitor console for upload batch messages
    const uploadPromise = new Promise((resolve) => {
      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('🎉 All uploads in batch completed! Calling onAllUploadsComplete...')) {
          console.log('✅ Upload batch completed successfully');
          resolve();
        }
      });
    });
    
    // Wait for upload to complete
    await Promise.race([
      uploadPromise,
      page.waitForTimeout(30000) // 30 second timeout
    ]);
    
    // Verify upload dialog closes and document appears
    await page.waitForSelector('text=test-document.txt', { timeout: 10000 });
    console.log('✅ File uploaded and appears in document list');

    // Step 4: Test Preview
    console.log('🖼️ Step 4: Test Document Preview');
    await page.click('text=test-document.txt');
    
    // Wait for preview modal
    await page.waitForSelector('[data-testid="document-preview"]', { timeout: 10000 });
    
    // Check for successful decryption
    const previewContent = await page.textContent('[data-testid="document-preview"]');
    expect(previewContent).toContain('This is a test document');
    console.log('✅ Document preview and decryption successful');
    
    // Close preview
    await page.click('button[aria-label="Close preview"]');

    // Step 5: Test HMR Resilience
    console.log('🔄 Step 5: Test HMR Resilience');
    
    // Trigger a code change by modifying a file (simulating HMR)
    await page.evaluate(() => {
      // Add a small change to trigger HMR
      const style = document.createElement('style');
      style.textContent = '/* test change */';
      document.head.appendChild(style);
      
      // Simulate HMR by creating a new service instance
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('test-hmr-trigger'));
      }
    });
    
    // Wait a moment for HMR to process
    await page.waitForTimeout(2000);
    
    // Test that master key is still available after HMR simulation
    const masterKeyStatus = await page.evaluate(async () => {
      try {
        const encryptionModule = await import('./src/services/documentEncryption.js');
        const service = encryptionModule.documentEncryptionService;
        return {
          hasMasterKey: service.hasMasterKey(),
          debugInfo: service.getDebugInfo()
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    expect(masterKeyStatus.hasMasterKey).toBe(true);
    console.log('✅ Master key survived HMR simulation');

    // Step 6: Test Preview Again After HMR
    console.log('🔄 Step 6: Test Preview After HMR');
    await page.click('text=test-document.txt');
    await page.waitForSelector('[data-testid="document-preview"]', { timeout: 10000 });
    
    const previewContentAfterHMR = await page.textContent('[data-testid="document-preview"]');
    expect(previewContentAfterHMR).toContain('This is a test document');
    console.log('✅ Document preview still works after HMR');
    
    await page.click('button[aria-label="Close preview"]');

    console.log('🎉 All tests passed successfully!');
  });

  test('Error Recovery Flow', async ({ page }) => {
    console.log('🧪 Starting Error Recovery Flow Test');
    
    // Login first
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    // Handle encryption unlock if needed
    const unlockButton = await page.locator('button:has-text("Unlock Documents")');
    if (await unlockButton.count() > 0) {
      await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Unlock Documents")');
      await page.waitForTimeout(3000);
    }

    // Clear master key to simulate error state
    await page.evaluate(() => {
      sessionStorage.removeItem('has_master_key');
      sessionStorage.removeItem('temp_master_key_data');
      sessionStorage.removeItem('master_key_set_at');
    });

    // Try to preview a document (should trigger error)
    await page.click('button:has-text("Upload Files")');
    
    // Should show the encryption session initialization
    await page.waitForSelector('button:has-text("Initialize Encryption Session")', { timeout: 5000 });
    console.log('✅ Error state detected, showing recovery option');

    // Test recovery
    await page.click('button:has-text("Initialize Encryption Session")');
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    await page.fill('input[type="password"]', TEST_CREDENTIALS.encryptionPassword);
    await page.click('button:has-text("Initialize Session")');
    
    await page.waitForSelector('text=Zero-Knowledge Encryption Active', { timeout: 10000 });
    console.log('✅ Error recovery successful');
  });

  test('Master Key Persistence Validation', async ({ page }) => {
    console.log('🧪 Starting Master Key Persistence Validation');
    
    // Login and initialize encryption
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    // Handle encryption unlock if needed
    const unlockButton = await page.locator('button:has-text("Unlock Documents")');
    if (await unlockButton.count() > 0) {
      await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Unlock Documents")');
      await page.waitForTimeout(3000);
    }

    await page.click('button:has-text("Upload Files")');
    await page.click('button:has-text("Initialize Encryption Session")');
    await page.fill('input[type="password"]', TEST_CREDENTIALS.encryptionPassword);
    await page.click('button:has-text("Initialize Session")');
    await page.waitForSelector('text=Zero-Knowledge Encryption Active', { timeout: 10000 });

    // Check that master key data is properly stored in sessionStorage
    const storageState = await page.evaluate(() => {
      return {
        has_master_key: sessionStorage.getItem('has_master_key'),
        temp_master_key_data: sessionStorage.getItem('temp_master_key_data') ? 'EXISTS' : 'MISSING',
        master_key_set_at: sessionStorage.getItem('master_key_set_at'),
        user_has_encryption: sessionStorage.getItem('user_has_encryption')
      };
    });

    expect(storageState.has_master_key).toBe('true');
    expect(storageState.temp_master_key_data).toBe('EXISTS');
    expect(storageState.user_has_encryption).toBe('true');
    console.log('✅ Master key persistence data properly stored');

    // Test service state
    const serviceState = await page.evaluate(async () => {
      try {
        const encryptionModule = await import('./src/services/documentEncryption.js');
        const service = encryptionModule.documentEncryptionService;
        return {
          hasMasterKey: service.hasMasterKey(),
          debugInfo: service.getDebugInfo()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(serviceState.hasMasterKey).toBe(true);
    console.log('✅ Document encryption service has master key loaded');
  });

  test('Upload Batch Completion Tracking', async ({ page }) => {
    console.log('🧪 Starting Upload Batch Completion Tracking Test');
    
    // Setup
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    // Handle encryption unlock if needed
    const unlockButton = await page.locator('button:has-text("Unlock Documents")');
    if (await unlockButton.count() > 0) {
      await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Unlock Documents")');
      await page.waitForTimeout(3000);
    }

    await page.click('button:has-text("Upload Files")');
    await page.click('button:has-text("Initialize Encryption Session")');
    await page.fill('input[type="password"]', TEST_CREDENTIALS.encryptionPassword);
    await page.click('button:has-text("Initialize Session")');
    await page.waitForSelector('text=Zero-Knowledge Encryption Active', { timeout: 10000 });

    // Track console messages for batch completion
    const batchMessages = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('🚀 Starting new upload batch:') ||
          text.includes('📊 Upload batch status check:') ||
          text.includes('🎉 All uploads in batch completed!') ||
          text.includes('📁 All uploads completed, refreshing document list...')) {
        batchMessages.push(text);
      }
    });

    // Upload multiple files
    const testFiles = [
      path.join(__dirname, 'test-fixtures', 'test-document.txt'),
      path.join(__dirname, 'test-fixtures', 'test-image.png')
    ];

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles);

    // Wait for batch completion
    await page.waitForFunction(() => {
      return window.console.logs && window.console.logs.some(log => 
        log.includes('🎉 All uploads in batch completed!')
      );
    }, { timeout: 30000 });

    // Verify batch tracking messages appeared
    expect(batchMessages.length).toBeGreaterThan(0);
    expect(batchMessages.some(msg => msg.includes('🚀 Starting new upload batch:'))).toBe(true);
    expect(batchMessages.some(msg => msg.includes('🎉 All uploads in batch completed!'))).toBe(true);
    console.log('✅ Upload batch completion tracking working correctly');
  });
});

// Helper function for test utilities
test.describe('Test Utilities', () => {
  test('Service Instance Debug', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Login
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    // Handle encryption unlock if needed
    const unlockButton = await page.locator('button:has-text("Unlock Documents")');
    if (await unlockButton.count() > 0) {
      await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Unlock Documents")');
      await page.waitForTimeout(3000);
    }

    // Get detailed service debug info
    const debugInfo = await page.evaluate(async () => {
      try {
        const encryptionModule = await import('./src/services/documentEncryption.js');
        const service = encryptionModule.documentEncryptionService;
        return {
          debugInfo: service.getDebugInfo(),
          sessionStorage: {
            has_master_key: sessionStorage.getItem('has_master_key'),
            temp_master_key_data: sessionStorage.getItem('temp_master_key_data') ? 'EXISTS' : 'MISSING',
            user_has_encryption: sessionStorage.getItem('user_has_encryption'),
            master_key_set_at: sessionStorage.getItem('master_key_set_at')
          }
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('🔍 Service Debug Info:', JSON.stringify(debugInfo, null, 2));
  });
});