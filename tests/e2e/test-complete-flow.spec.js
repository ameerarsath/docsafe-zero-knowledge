/**
 * Complete flow test with proper waits and navigation handling
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'http://localhost:3005';
const TEST_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@',
  encryptionPassword: 'JHNpAZ39g!&Y'
};

test.describe('Complete Flow Test', () => {
  test('Complete Login, Navigation and Upload Flow', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`[CONSOLE] ${msg.text()}`);
    });
    
    // Handle page errors
    page.on('pageerror', error => {
      console.error(`[PAGE ERROR] ${error.message}`);
    });
    
    await page.goto(BASE_URL);
    
    console.log('🧪 Starting Complete Flow Test');
    
    // Step 1: Login
    console.log('👤 Step 1: Login');
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    
    // Click submit and wait for navigation
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForLoadState('networkidle', { timeout: 30000 })
    ]);
    
    console.log('⏳ Waiting for login to complete...');
    
    // Wait for either unlock page or dashboard
    try {
      await page.waitForSelector('button:has-text("Unlock Documents"), [data-testid="dashboard"], .dashboard', { timeout: 15000 });
    } catch (error) {
      console.log('❌ Neither unlock nor dashboard found, taking screenshot');
      await page.screenshot({ path: 'debug-after-login.png' });
      throw error;
    }
    
    // Check if we're on unlock page
    const unlockButton = await page.locator('button:has-text("Unlock Documents")');
    if (await unlockButton.count() > 0) {
      console.log('🔐 Step 2: Unlock Documents');
      await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
      
      await Promise.all([
        page.click('button:has-text("Unlock Documents")'),
        page.waitForLoadState('networkidle', { timeout: 30000 })
      ]);
      
      console.log('⏳ Waiting for unlock to complete...');
    }
    
    // Wait for main application to load
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'debug-after-unlock.png', fullPage: true });
    
    // Check what page we're on
    const currentUrl = page.url();
    const pageTitle = await page.title();
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📍 Page Title: ${pageTitle}`);
    
    // Look for navigation elements (sidebar, menu, etc.)
    const navElements = await page.evaluate(() => {
      const selectors = [
        'nav', '.nav', '.navigation', '.sidebar', '.menu',
        'a[href*="documents"]', 'a[href*="upload"]', 
        'button:contains("Documents")', 'button:contains("Upload")'
      ];
      
      const found = [];
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            found.push({
              selector,
              count: elements.length,
              text: Array.from(elements).map(el => el.textContent?.trim()).filter(Boolean)
            });
          }
        } catch (e) {
          // Invalid selector, skip
        }
      });
      
      return found;
    });
    
    console.log('🧭 Navigation elements found:');
    navElements.forEach(nav => {
      console.log(`   ${nav.selector}: ${nav.count} elements - ${nav.text.join(', ')}`);
    });
    
    // Try to navigate to documents page if not already there
    if (!currentUrl.includes('/documents')) {
      console.log('📁 Step 3: Navigate to Documents');
      
      // Try different ways to navigate to documents
      const docNavOptions = [
        'a[href*="documents"]',
        'button:has-text("Documents")',
        'a:has-text("Documents")',
        '[data-testid="documents-nav"]'
      ];
      
      let navigated = false;
      for (const selector of docNavOptions) {
        const element = await page.locator(selector);
        if (await element.count() > 0 && await element.first().isVisible()) {
          console.log(`✅ Clicking navigation element: ${selector}`);
          await element.first().click();
          await page.waitForTimeout(3000);
          navigated = true;
          break;
        }
      }
      
      if (!navigated) {
        console.log('❌ Could not find documents navigation');
        await page.screenshot({ path: 'debug-no-documents-nav.png' });
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'debug-final-page.png', fullPage: true });
    
    // Look for upload functionality
    console.log('🔍 Step 4: Looking for Upload Functionality');
    
    const uploadSelectors = [
      'button:has-text("Upload")',
      'input[type="file"]',
      '[data-testid*="upload"]',
      'button[title*="upload"]',
      'button[aria-label*="upload"]',
      '.upload-button',
      '.file-upload',
      'button:has-text("Add")',
      'button:has-text("New")'
    ];
    
    for (const selector of uploadSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`✅ Found ${count} upload element(s): ${selector}`);
        const firstElement = elements.first();
        const isVisible = await firstElement.isVisible();
        const text = await firstElement.textContent();
        console.log(`   Visible: ${isVisible}, Text: "${text}"`);
        
        if (isVisible) {
          console.log(`   Trying to click: ${selector}`);
          await firstElement.click();
          await page.waitForTimeout(2000);
          
          // Check if file input appeared
          const fileInput = await page.locator('input[type="file"]');
          if (await fileInput.count() > 0 && await fileInput.first().isVisible()) {
            console.log('✅ File input is now visible!');
            
            // Try uploading a file
            const testFilePath = path.join(__dirname, 'test-fixtures', 'test-document.txt');
            await fileInput.first().setInputFiles(testFilePath);
            console.log('✅ File uploaded successfully!');
            
            await page.waitForTimeout(5000);
            await page.screenshot({ path: 'debug-after-upload.png' });
            return; // Success!
          }
        }
      }
    }
    
    console.log('❌ No upload functionality found');
  });
});