/**
 * Simple login test to verify credentials and flow
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3005';
const TEST_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@',
  encryptionPassword: 'JHNpAZ39g!&Y'
};

test.describe('Simple Login Test', () => {
  test('Test Login and Identify Next Step', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`[CONSOLE] ${msg.text()}`);
    });
    
    await page.goto(BASE_URL);
    
    console.log('🧪 Starting Simple Login Test');
    
    // Fill and submit login form
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Take screenshot to see what happens
    await page.screenshot({ path: 'simple-login-result.png' });
    
    // Get page info
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        pathname: window.location.pathname,
        hasErrorMessage: !!document.querySelector('[data-testid="error-message"], .error, .alert-error'),
        hasUnlockForm: !!document.querySelector('input[type="password"]:not([name="loginPassword"])'),
        hasDashboard: !!document.querySelector('[data-testid="dashboard"]'),
        hasUploadButton: !!document.querySelector('button:contains("Upload")'),
        visibleText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('📊 Page Info After Login:');
    console.log(JSON.stringify(pageInfo, null, 2));
    
    // Check if we're on encryption unlock page
    if (pageInfo.hasUnlockForm) {
      console.log('🔐 Found encryption unlock form, entering encryption password...');
      await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Unlock")');
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'after-unlock.png' });
      
      const afterUnlockInfo = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          pathname: window.location.pathname,
          hasDashboard: !!document.querySelector('[data-testid="dashboard"]'),
          hasDocumentsPage: !!document.querySelector('[data-testid="documents-page"]'),
          visibleText: document.body.innerText.substring(0, 300)
        };
      });
      
      console.log('📊 Page Info After Unlock:');
      console.log(JSON.stringify(afterUnlockInfo, null, 2));
    }
  });
});