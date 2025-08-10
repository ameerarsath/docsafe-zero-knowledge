/**
 * HMR Resilience Test Suite
 * 
 * Specifically tests Hot Module Replacement resilience for the encryption system
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'http://localhost:3005';
const TEST_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@',
  encryptionPassword: 'JHNpAZ39g!&Y'
};

test.describe('HMR Resilience Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Enable detailed console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('DocumentEncryptionService') || 
          text.includes('Master key') || 
          text.includes('🔄') || 
          text.includes('✅') || 
          text.includes('❌')) {
        console.log(`[CONSOLE] ${text}`);
      }
    });
    
    await page.goto(BASE_URL);
  });

  test('Master Key Survives Service Recreation', async ({ page }) => {
    console.log('🧪 Testing Master Key Survival Through Service Recreation');
    
    // Step 1: Login and Initialize Encryption
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

    // Step 2: Verify Initial State
    const initialState = await page.evaluate(async () => {
      const encryptionModule = await import('./src/services/documentEncryption.js');
      const service = encryptionModule.documentEncryptionService;
      return {
        hasMasterKey: service.hasMasterKey(),
        instanceId: service.getDebugInfo().instanceId,
        sessionStorage: {
          has_master_key: sessionStorage.getItem('has_master_key'),
          temp_master_key_data: sessionStorage.getItem('temp_master_key_data') ? 'EXISTS' : 'MISSING',
          master_key_set_at: sessionStorage.getItem('master_key_set_at')
        }
      };
    });

    expect(initialState.hasMasterKey).toBe(true);
    expect(initialState.sessionStorage.has_master_key).toBe('true');
    expect(initialState.sessionStorage.temp_master_key_data).toBe('EXISTS');
    console.log('✅ Initial state verified - master key active');

    // Step 3: Simulate HMR by forcing service recreation
    const postHMRState = await page.evaluate(async () => {
      try {
        // Clear the module cache to simulate HMR
        delete window.__vite__module_cache;
        
        // Force reload the module (simulating HMR)
        const timestamp = Date.now();
        const encryptionModule = await import(`./src/services/documentEncryption.js?t=${timestamp}`);
        
        // Wait a moment for the constructor to run
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const service = encryptionModule.documentEncryptionService;
        return {
          hasMasterKey: service.hasMasterKey(),
          instanceId: service.getDebugInfo().instanceId,
          sessionStorage: {
            has_master_key: sessionStorage.getItem('has_master_key'),
            temp_master_key_data: sessionStorage.getItem('temp_master_key_data') ? 'EXISTS' : 'MISSING',
            master_key_set_at: sessionStorage.getItem('master_key_set_at')
          }
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Verify master key was restored after service recreation
    expect(postHMRState.hasMasterKey).toBe(true);
    expect(postHMRState.instanceId).not.toBe(initialState.instanceId); // New instance created
    expect(postHMRState.sessionStorage.has_master_key).toBe('true');
    console.log('✅ Master key survived service recreation');

    // Step 4: Test Upload Still Works After HMR
    const testFilePath = path.join(__dirname, 'test-fixtures', 'test-document.txt');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Wait for upload completion
    await page.waitForSelector('text=test-document.txt', { timeout: 15000 });
    console.log('✅ Upload still works after HMR simulation');

    // Step 5: Test Preview Still Works After HMR
    await page.click('text=test-document.txt');
    await page.waitForSelector('[data-testid="document-preview"]', { timeout: 10000 });
    
    const previewContent = await page.textContent('[data-testid="document-preview"]');
    expect(previewContent).toContain('This is a test document');
    console.log('✅ Preview and decryption still work after HMR simulation');
  });

  test('SessionStorage Consistency Across Service Instances', async ({ page }) => {
    console.log('🧪 Testing SessionStorage Consistency Across Service Instances');
    
    // Login and initialize
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

    // Create multiple service instances and verify consistency
    const consistencyTest = await page.evaluate(async () => {
      const results = [];
      
      // Create 5 different service instances
      for (let i = 0; i < 5; i++) {
        const timestamp = Date.now() + i;
        const encryptionModule = await import(`./src/services/documentEncryption.js?t=${timestamp}`);
        const service = encryptionModule.documentEncryptionService;
        
        // Give each service time to restore
        await new Promise(resolve => setTimeout(resolve, 50));
        
        results.push({
          instanceId: service.getDebugInfo().instanceId,
          hasMasterKey: service.hasMasterKey(),
          sessionFlags: {
            has_master_key: sessionStorage.getItem('has_master_key'),
            temp_master_key_data: sessionStorage.getItem('temp_master_key_data') ? 'EXISTS' : 'MISSING'
          }
        });
      }
      
      return results;
    });

    // Verify all instances have consistent state
    consistencyTest.forEach((result, index) => {
      expect(result.hasMasterKey).toBe(true);
      expect(result.sessionFlags.has_master_key).toBe('true');
      expect(result.sessionFlags.temp_master_key_data).toBe('EXISTS');
      console.log(`✅ Instance ${index + 1} (${result.instanceId}) is consistent`);
    });

    console.log('✅ All service instances maintain consistent state');
  });

  test('Error Handling During Key Restoration', async ({ page }) => {
    console.log('🧪 Testing Error Handling During Key Restoration');
    
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

    // Set up invalid restoration data
    await page.evaluate(() => {
      sessionStorage.setItem('has_master_key', 'true');
      sessionStorage.setItem('temp_master_key_data', 'invalid-json-data');
      sessionStorage.setItem('master_key_set_at', Date.now().toString());
    });

    // Try to create a new service instance with corrupted data
    const errorHandlingResult = await page.evaluate(async () => {
      try {
        const encryptionModule = await import(`./src/services/documentEncryption.js?t=${Date.now()}`);
        const service = encryptionModule.documentEncryptionService;
        
        // Give service time to attempt restoration
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          hasMasterKey: service.hasMasterKey(),
          sessionFlags: {
            has_master_key: sessionStorage.getItem('has_master_key'),
            temp_master_key_data: sessionStorage.getItem('temp_master_key_data'),
            master_key_set_at: sessionStorage.getItem('master_key_set_at')
          }
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Verify error was handled gracefully
    expect(errorHandlingResult.hasMasterKey).toBe(false);
    expect(errorHandlingResult.sessionFlags.has_master_key).toBe(null); // Should be cleared
    expect(errorHandlingResult.sessionFlags.temp_master_key_data).toBe(null); // Should be cleared
    console.log('✅ Error handling during key restoration works correctly');

    // Verify user can still initialize encryption after error
    await page.click('button:has-text("Upload Files")');
    await page.waitForSelector('button:has-text("Initialize Encryption Session")', { timeout: 5000 });
    console.log('✅ User can still initialize encryption after restoration error');
  });

  test('Performance Impact of Key Restoration', async ({ page }) => {
    console.log('🧪 Testing Performance Impact of Key Restoration');
    
    // Login and initialize
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

    // Measure time for multiple service creations with restoration
    const performanceResults = await page.evaluate(async () => {
      const times = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        const encryptionModule = await import(`./src/services/documentEncryption.js?t=${Date.now() + i}`);
        const service = encryptionModule.documentEncryptionService;
        
        // Wait for restoration to complete
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }
      
      return {
        times,
        average: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times)
      };
    });

    // Verify restoration is performant (should be < 100ms on average)
    expect(performanceResults.average).toBeLessThan(100);
    console.log(`✅ Key restoration performance: ${performanceResults.average.toFixed(2)}ms average`);
    console.log(`   Min: ${performanceResults.min.toFixed(2)}ms, Max: ${performanceResults.max.toFixed(2)}ms`);
  });
});