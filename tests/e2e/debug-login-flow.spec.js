/**
 * Debug script to understand the login flow and page elements
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3005';
const TEST_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@',
  encryptionPassword: 'JHNpAZ39g!&Y'
};

test.describe('Debug Login Flow', () => {
  test('Debug Login and Page Structure', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`[CONSOLE] ${msg.text()}`);
    });
    
    await page.goto(BASE_URL);
    
    console.log('🧪 Starting Login Flow Debug');
    
    // Take initial screenshot
    await page.screenshot({ path: 'debug-login-initial.png' });
    
    // Fill login form
    console.log('📝 Filling login form...');
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    
    // Take screenshot after filling form
    await page.screenshot({ path: 'debug-login-filled.png' });
    
    // Submit form
    console.log('🚀 Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait a moment and take screenshot
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'debug-login-after-submit.png' });
    
    // Check what elements are available
    console.log('🔍 Checking available elements...');
    
    // Check for various possible elements
    const elements = await page.evaluate(() => {
      const selectors = [
        '[data-testid="dashboard"]',
        '[data-testid="encryption-page"]', 
        '.dashboard',
        'h1',
        'h2',
        'button:has-text("Upload Files")',
        'button:has-text("Initialize Encryption Session")',
        'text=Zero-Knowledge Encryption Active',
        'text=Unlock Your Documents',
        'input[type="password"]'
      ];
      
      const results = {};
      selectors.forEach(selector => {
        const element = document.querySelector(selector);
        results[selector] = {
          exists: !!element,
          text: element ? element.textContent : null,
          tag: element ? element.tagName : null
        };
      });
      
      // Also get page title and current URL
      results._pageInfo = {
        title: document.title,
        url: window.location.href,
        pathname: window.location.pathname
      };
      
      return results;
    });
    
    console.log('📊 Element Analysis:');
    console.log(JSON.stringify(elements, null, 2));
    
    // Try to handle the encryption unlock if needed
    const unlockButton = await page.locator('button:has-text("Unlock Documents")');
    if (await unlockButton.count() > 0) {
      console.log('🔐 Found encryption unlock page, entering encryption password...');
      await page.fill('input[type="password"]', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Unlock Documents")');
      
      // Wait and take another screenshot
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'debug-login-after-unlock.png' });
      
      // Check elements again
      const elementsAfterUnlock = await page.evaluate(() => {
        const selectors = [
          '[data-testid="dashboard"]',
          '[data-testid="documents-page"]',
          '.dashboard',
          'h1',
          'h2',
          'button:has-text("Upload Files")'
        ];
        
        const results = {};
        selectors.forEach(selector => {
          const element = document.querySelector(selector);
          results[selector] = {
            exists: !!element,
            text: element ? element.textContent : null
          };
        });
        
        results._pageInfo = {
          title: document.title,
          url: window.location.href,
          pathname: window.location.pathname
        };
        
        return results;
      });
      
      console.log('📊 Elements After Unlock:');
      console.log(JSON.stringify(elementsAfterUnlock, null, 2));
    }
  });
});