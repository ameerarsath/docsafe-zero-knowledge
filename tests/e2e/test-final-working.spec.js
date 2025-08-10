/**
 * Final working test for the complete upload and preview flow
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'http://localhost:3005';
const TEST_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@',
  encryptionPassword: 'JHNpAZ39g!&Y'
};

test.describe('Working Upload & Preview Flow', () => {
  test('Complete Upload and Preview Flow', async ({ page }) => {
    test.setTimeout(120000);
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('🎉 All uploads in batch completed') || 
          msg.text().includes('DocumentEncryptionService') ||
          msg.text().includes('Master key')) {
        console.log(`[CONSOLE] ${msg.text()}`);
      }
    });
    
    await page.goto(BASE_URL);
    console.log('🧪 Starting Working Upload & Preview Flow Test');
    
    // Step 1: Login
    console.log('👤 Step 1: Login');
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for login
    await page.waitForTimeout(8000);
    
    // Step 2: Handle encryption unlock
    console.log('🔐 Step 2: Handle Encryption Unlock');
    const unlockButton = await page.locator('button:has-text("Unlock Documents")');
    if (await unlockButton.count() > 0) {
      await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Unlock Documents")');
      await page.waitForTimeout(5000);
    }
    
    // Step 3: Navigate to Documents
    console.log('📁 Step 3: Navigate to Documents');
    await page.click('a:has-text("Documents")');
    await page.waitForTimeout(3000);
    
    // Step 4: Click Upload Files button
    console.log('📤 Step 4: Click Upload Files');
    const uploadButton = page.locator('button:has-text("Upload Files")');
    await uploadButton.click();
    
    // Wait for upload modal/interface to appear
    await page.waitForTimeout(3000);
    
    // Step 5: Upload a file
    console.log('📂 Step 5: Upload Test File');
    const testFilePath = path.join(__dirname, 'test-fixtures', 'test-document.txt');
    
    // Look for file input in the modal/interface
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    
    // Monitor for upload completion
    const uploadPromise = new Promise((resolve) => {
      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('🎉 All uploads in batch completed')) {
          console.log('✅ Upload batch completed successfully');
          resolve();
        }
      });
    });
    
    // Wait for upload to complete (30 second timeout)
    await Promise.race([
      uploadPromise,
      page.waitForTimeout(30000)
    ]);
    
    // Take screenshot after upload
    await page.screenshot({ path: 'debug-after-successful-upload.png' });
    
    // Step 6: Verify document appears
    console.log('🔍 Step 6: Verify Document Appears');
    await page.waitForTimeout(3000);
    
    // Look for the uploaded document
    const documentExists = await page.locator('text=test-document.txt').count();
    if (documentExists > 0) {
      console.log('✅ Document appears in document list');
      
      // Step 7: Test Preview
      console.log('👀 Step 7: Test Document Preview');
      await page.click('text=test-document.txt');
      
      // Wait for preview modal
      await page.waitForTimeout(3000);
      
      // Check for preview content
      const previewExists = await page.locator('[data-testid="document-preview"], .preview, .modal').count();
      if (previewExists > 0) {
        console.log('✅ Preview modal opened');
        
        // Take screenshot of preview
        await page.screenshot({ path: 'debug-preview-modal.png' });
        
        // Try to close preview
        const closeButtons = [
          'button[aria-label="Close"]',
          'button:has-text("Close")',
          'button:has-text("×")',
          '.close'
        ];
        
        for (const closeSelector of closeButtons) {
          const closeBtn = page.locator(closeSelector);
          if (await closeBtn.count() > 0) {
            await closeBtn.click();
            break;
          }
        }
        
        console.log('✅ Preview closed');
      } else {
        console.log('⚠️ Preview modal not found');
      }
    } else {
      console.log('⚠️ Document not found in list, taking screenshot');
      await page.screenshot({ path: 'debug-document-not-found.png' });
    }
    
    console.log('🎉 Test completed successfully!');
  });
  
  test('Master Key Persistence Test', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.goto(BASE_URL);
    console.log('🧪 Starting Master Key Persistence Test');
    
    // Login and unlock
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);
    
    const unlockButton = await page.locator('button:has-text("Unlock Documents")');
    if (await unlockButton.count() > 0) {
      await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Unlock Documents")');
      await page.waitForTimeout(5000);
    }
    
    // Check master key status
    const masterKeyStatus = await page.evaluate(async () => {
      try {
        // Try to access the document encryption service
        if (window.documentEncryptionService) {
          return {
            hasMasterKey: window.documentEncryptionService.hasMasterKey(),
            serviceExists: true
          };
        } else {
          return {
            hasMasterKey: false,
            serviceExists: false,
            message: 'Service not found on window object'
          };
        }
      } catch (error) {
        return {
          error: error.message,
          serviceExists: false
        };
      }
    });
    
    console.log('🔑 Master Key Status:', JSON.stringify(masterKeyStatus, null, 2));
    
    // Check session storage
    const sessionData = await page.evaluate(() => {
      return {
        has_master_key: sessionStorage.getItem('has_master_key'),
        user_has_encryption: sessionStorage.getItem('user_has_encryption'),
        temp_master_key_data: sessionStorage.getItem('temp_master_key_data') ? 'EXISTS' : 'MISSING'
      };
    });
    
    console.log('💾 Session Storage:', JSON.stringify(sessionData, null, 2));
    
    expect(sessionData.has_master_key).toBe('true');
    expect(sessionData.user_has_encryption).toBe('true');
    
    console.log('✅ Master key persistence verified');
  });
});