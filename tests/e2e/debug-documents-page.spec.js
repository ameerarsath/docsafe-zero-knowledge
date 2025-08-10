/**
 * Debug script to understand the documents page and upload functionality
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3005';
const TEST_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@',
  encryptionPassword: 'JHNpAZ39g!&Y'
};

test.describe('Debug Documents Page', () => {
  test('Explore Documents Page and Upload Options', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`[CONSOLE] ${msg.text()}`);
    });
    
    await page.goto(BASE_URL);
    
    console.log('🧪 Starting Documents Page Debug');
    
    // Login flow
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Handle encryption unlock
    const unlockButton = await page.locator('button:has-text("Unlock Documents")');
    if (await unlockButton.count() > 0) {
      await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Unlock Documents")');
      await page.waitForTimeout(3000);
    }
    
    // Take full page screenshot
    await page.screenshot({ path: 'debug-documents-full-page.png', fullPage: true });
    
    // Check for upload elements
    console.log('🔍 Looking for upload elements...');
    
    const uploadSelectors = [
      'button:has-text("Upload")',
      'a:has-text("Upload")',
      'input[type="file"]',
      '[data-testid*="upload"]',
      '.upload',
      'button[title*="upload"]',
      'button[aria-label*="upload"]',
      '.btn-upload',
      '#upload',
      '[onclick*="upload"]'
    ];
    
    for (const selector of uploadSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`✅ Found ${count} element(s) with selector: ${selector}`);
        
        // Get details about first element
        const firstElement = elements.first();
        const tagName = await firstElement.evaluate(el => el.tagName);
        const className = await firstElement.evaluate(el => el.className);
        const text = await firstElement.evaluate(el => el.textContent);
        const visible = await firstElement.isVisible();
        
        console.log(`   Details: ${tagName}, class="${className}", text="${text}", visible=${visible}`);
        
        if (visible && selector.includes('Upload')) {
          console.log(`   Clicking on: ${selector}`);
          await firstElement.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: `debug-after-click-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png` });
          
          // Check if modal or file input appeared
          const fileInput = await page.locator('input[type="file"]');
          if (await fileInput.count() > 0) {
            console.log('✅ File input appeared after clicking!');
            break;
          }
        }
      } else {
        console.log(`❌ No elements found with selector: ${selector}`);
      }
    }
    
    // Check for modal dialogs
    const modalSelectors = [
      '.modal',
      '[role="dialog"]',
      '.dialog',
      '.popup',
      '.overlay'
    ];
    
    console.log('🔍 Checking for modals...');
    for (const selector of modalSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`✅ Found ${count} modal(s) with selector: ${selector}`);
      }
    }
    
    // Get all buttons on the page
    const allButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"], a');
      return Array.from(buttons).map(btn => ({
        tagName: btn.tagName,
        text: btn.textContent?.trim(),
        className: btn.className,
        id: btn.id,
        visible: btn.offsetParent !== null
      })).filter(btn => btn.text && btn.visible);
    });
    
    console.log('🔍 All visible buttons/clickable elements:');
    allButtons.forEach((btn, index) => {
      console.log(`   ${index + 1}. ${btn.tagName}: "${btn.text}" (class: ${btn.className}, id: ${btn.id})`);
    });
  });
});