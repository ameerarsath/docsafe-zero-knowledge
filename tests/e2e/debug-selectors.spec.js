/**
 * Debug Test: Validate Selectors
 * 
 * Quick test to validate the correct selectors for the login form
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3005';
const TEST_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@',
  encryptionPassword: 'JHNpAZ39g!&Y'
};

test('Debug Selectors Test', async ({ page }) => {
  console.log('🔍 Starting Selector Debug Test');
  
  // Navigate to login page
  await page.goto(BASE_URL);
  
  // Wait for page to load
  await page.waitForTimeout(2000);
  
  // Debug - take screenshot of initial state
  await page.screenshot({ path: 'debug-initial.png' });
  console.log('📸 Screenshot taken: debug-initial.png');
  
  // Check for username field
  const usernameField = await page.locator('input[name="username"]');
  const usernameExists = await usernameField.count() > 0;
  console.log(`👤 Username field exists: ${usernameExists}`);
  
  // Check for different password field variations
  const passwordVariations = [
    'input[name="password"]',
    'input[name="loginPassword"]',
    'input[type="password"]',
    'input[placeholder*="password"]'
  ];
  
  for (const selector of passwordVariations) {
    const field = await page.locator(selector);
    const exists = await field.count() > 0;
    console.log(`🔐 ${selector}: ${exists}`);
  }
  
  // Try to fill the correct fields
  if (usernameExists) {
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    console.log('✅ Username filled successfully');
  }
  
  // Try loginPassword field
  const loginPasswordField = await page.locator('input[name="loginPassword"]');
  const loginPasswordExists = await loginPasswordField.count() > 0;
  
  if (loginPasswordExists) {
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    console.log('✅ Login password filled successfully');
    
    // Take screenshot after filling
    await page.screenshot({ path: 'debug-filled.png' });
    console.log('📸 Screenshot taken: debug-filled.png');
    
    // Try to submit
    await page.click('button[type="submit"]');
    console.log('🚀 Submit button clicked');
    
    // Wait and see what happens
    await page.waitForTimeout(3000);
    
    // Take final screenshot
    await page.screenshot({ path: 'debug-after-submit.png' });
    console.log('📸 Screenshot taken: debug-after-submit.png');
  }
  
  console.log('🎉 Selector debug test completed');
});