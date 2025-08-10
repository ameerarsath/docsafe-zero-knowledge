/**
 * Focused test to complete the upload flow with careful timing
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'http://localhost:3005';
const TEST_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@',
  encryptionPassword: 'JHNpAZ39g!&Y'
};

test.describe('Focused Upload Test', () => {
  test('Complete Upload Flow with Careful Timing', async ({ page }) => {
    // Set longer timeouts
    test.setTimeout(120000);
    
    // Enable console logging
    page.on('console', msg => {
      console.log(`[CONSOLE] ${msg.text()}`);
    });
    
    await page.goto(BASE_URL);
    console.log('🧪 Starting Focused Upload Test');
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Step 1: Login
    console.log('👤 Step 1: Login');
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for login response (much longer timeout)
    console.log('⏳ Waiting for login response...');
    await page.waitForTimeout(10000);
    
    // Check if we got rate limited
    const rateLimitError = await page.locator('text=Too many login attempts').count();
    if (rateLimitError > 0) {
      console.log('❌ Rate limited, test cannot continue');
      await page.screenshot({ path: 'debug-rate-limited.png' });
      throw new Error('Rate limited - need to reset before testing');
    }
    
    // Step 2: Handle Encryption Unlock
    console.log('🔐 Step 2: Check for Encryption Unlock');
    
    // Wait for either unlock button or dashboard to appear
    try {
      await page.waitForSelector('button:has-text("Unlock Documents"), h1:has-text("Dashboard")', { timeout: 20000 });
    } catch (error) {
      console.log('⚠️ Neither unlock nor dashboard found, checking page state');
      await page.screenshot({ path: 'debug-after-login-timeout.png' });
      
      // Check if we're still on login page
      const stillOnLogin = await page.locator('button[type="submit"]').count();
      if (stillOnLogin > 0) {
        console.log('❌ Still on login page - authentication failed');
        throw new Error('Authentication failed');
      }
    }
    
    const unlockButton = await page.locator('button:has-text("Unlock Documents")');
    if (await unlockButton.count() > 0) {
      console.log('🔑 Found unlock button, entering encryption password');
      await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Unlock Documents")');
      
      // Wait for unlock to complete
      await page.waitForTimeout(8000);
    }
    
    // Step 3: Navigate to Documents/Upload
    console.log('📁 Step 3: Navigate to Upload');
    await page.screenshot({ path: 'debug-after-unlock.png', fullPage: true });
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Try to find and click upload/documents navigation
    const navOptions = [
      'a:has-text("Documents")',
      'a[href*="documents"]',
      'button:has-text("Documents")',
      'a:has-text("Upload")',
      'button:has-text("Upload")'
    ];
    
    for (const selector of navOptions) {
      const element = await page.locator(selector);
      if (await element.count() > 0 && await element.first().isVisible()) {
        console.log(`✅ Clicking navigation: ${selector}`);
        await element.first().click();
        await page.waitForTimeout(3000);
        break;
      }
    }
    
    // Step 4: Look for Upload Functionality
    console.log('🔍 Step 4: Looking for Upload Functionality');
    await page.screenshot({ path: 'debug-looking-for-upload.png', fullPage: true });
    
    // Try different upload triggers
    const uploadTriggers = [
      'button:has-text("Upload")',
      'input[type="file"]',
      'button:has-text("Add")',
      'button:has-text("New")',
      '[data-testid*="upload"]',
      '.upload-button',
      'button[title*="upload"]'
    ];
    
    let uploadFound = false;
    for (const trigger of uploadTriggers) {
      const elements = await page.locator(trigger);
      const count = await elements.count();
      
      if (count > 0) {
        console.log(`✅ Found ${count} element(s) with selector: ${trigger}`);
        
        for (let i = 0; i < Math.min(count, 3); i++) { // Check up to 3 elements
          const element = elements.nth(i);
          const isVisible = await element.isVisible();
          
          if (isVisible) {
            const text = await element.textContent();
            console.log(`   Element ${i}: visible, text="${text}"`);
            
            if (!trigger.includes('input[type="file"]')) {
              console.log(`   Clicking element ${i}`);
              await element.click();
              await page.waitForTimeout(2000);
            }
            
            // Check if file input is now available
            const fileInput = await page.locator('input[type="file"]');
            if (await fileInput.count() > 0 && await fileInput.first().isVisible()) {
              console.log('✅ File input is now visible!');
              
              // Try to upload a file
              const testFilePath = path.join(__dirname, 'test-fixtures', 'test-document.txt');
              console.log(`📤 Uploading file: ${testFilePath}`);
              
              await fileInput.first().setInputFiles(testFilePath);
              uploadFound = true;
              
              // Wait for upload to process
              await page.waitForTimeout(5000);
              await page.screenshot({ path: 'debug-after-upload.png', fullPage: true });
              
              console.log('✅ File upload completed!');
              break;
            }
          } else {
            console.log(`   Element ${i}: not visible`);
          }
        }
        
        if (uploadFound) break;
      } else {
        console.log(`❌ No elements found with selector: ${trigger}`);
      }
    }
    
    if (!uploadFound) {
      console.log('❌ Could not find upload functionality');
      
      // Get all buttons on the page for debugging
      const allButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
        return buttons
          .filter(btn => btn.offsetParent !== null) // visible only
          .map(btn => ({
            tagName: btn.tagName,
            text: btn.textContent?.trim(),
            className: btn.className,
            href: btn.href || null
          }))
          .filter(btn => btn.text)
          .slice(0, 20); // limit to first 20
      });
      
      console.log('🔍 All visible buttons on page:');
      allButtons.forEach((btn, index) => {
        console.log(`   ${index + 1}. ${btn.tagName}: "${btn.text}" (class: ${btn.className})`);
      });
    }
    
    console.log('🎯 Test completed');
  });
});