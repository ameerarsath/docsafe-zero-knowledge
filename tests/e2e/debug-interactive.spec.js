/**
 * Interactive Debug Test for Zero-Knowledge Upload Flow
 * Runs with visible browser and detailed logging
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3005';
const TEST_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@',
  encryptionPassword: 'JHNpAZ39g!&Y'
};

test.describe('Interactive Debug Session', () => {
  test('Debug Login and Navigation', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes
    
    // Enable comprehensive console logging
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    
    // Log all network requests
    page.on('request', request => {
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
    });
    
    // Log all responses
    page.on('response', response => {
      console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
    });
    
    console.log('🚀 Starting Interactive Debug Session');
    console.log(`📍 Navigating to: ${BASE_URL}`);
    
    await page.goto(BASE_URL);
    
    // Take initial screenshot
    await page.screenshot({ path: 'debug-interactive-initial.png', fullPage: true });
    console.log('📸 Initial screenshot taken');
    
    // Step 1: Login
    console.log('👤 Step 1: Attempting Login');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    
    // Take screenshot before submit
    await page.screenshot({ path: 'debug-interactive-filled.png', fullPage: true });
    console.log('📸 Form filled screenshot taken');
    
    // Submit login
    await page.click('button[type="submit"]');
    console.log('✅ Login form submitted');
    
    // Wait longer for login to process
    await page.waitForTimeout(10000);
    
    // Take screenshot after login attempt
    await page.screenshot({ path: 'debug-interactive-after-login.png', fullPage: true });
    console.log('📸 After login screenshot taken');
    
    // Step 2: Handle encryption unlock if needed
    console.log('🔐 Step 2: Checking for Encryption Unlock');
    
    const unlockButton = await page.locator('button:has-text("Unlock Documents")');
    const unlockCount = await unlockButton.count();
    console.log(`🔍 Found ${unlockCount} unlock button(s)`);
    
    if (unlockCount > 0) {
      console.log('🔓 Unlock button found, proceeding with unlock');
      
      // Fill encryption password
      await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Unlock Documents")');
      
      console.log('✅ Unlock attempted');
      await page.waitForTimeout(8000);
      
      // Take screenshot after unlock
      await page.screenshot({ path: 'debug-interactive-after-unlock.png', fullPage: true });
      console.log('📸 After unlock screenshot taken');
    } else {
      console.log('ℹ️ No unlock button found');
    }
    
    // Step 3: Analyze current page state
    console.log('🔍 Step 3: Analyzing Current Page State');
    
    // Get current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Get page title
    const pageTitle = await page.title();
    console.log(`📄 Page Title: ${pageTitle}`);
    
    // Find all navigation links
    const navLinks = await page.locator('a').allTextContents();
    console.log(`🧭 Navigation Links Found: ${JSON.stringify(navLinks, null, 2)}`);
    
    // Look for any buttons
    const buttons = await page.locator('button').allTextContents();
    console.log(`🔘 Buttons Found: ${JSON.stringify(buttons, null, 2)}`);
    
    // Check for any modals or overlays
    const modals = await page.locator('[role="dialog"], .modal, .overlay').count();
    console.log(`🪟 Modals/Overlays Found: ${modals}`);
    
    // Take final comprehensive screenshot
    await page.screenshot({ path: 'debug-interactive-final-state.png', fullPage: true });
    console.log('📸 Final state screenshot taken');
    
    // Step 4: Try to find Documents section
    console.log('📁 Step 4: Looking for Documents Navigation');
    
    // Try different possible selectors for Documents
    const documentSelectors = [
      'a:has-text("Documents")',
      'a[href*="documents"]',
      'a[href*="Documents"]',
      'nav a:has-text("Documents")',
      '[data-testid="documents-nav"]',
      'text=Documents'
    ];
    
    for (const selector of documentSelectors) {
      const count = await page.locator(selector).count();
      console.log(`🔍 Selector "${selector}": ${count} elements found`);
      
      if (count > 0) {
        const elements = await page.locator(selector).all();
        for (let i = 0; i < elements.length; i++) {
          const text = await elements[i].textContent();
          const href = await elements[i].getAttribute('href');
          console.log(`  Element ${i + 1}: Text="${text}", Href="${href}"`);
        }
      }
    }
    
    // Step 5: Try clicking on Documents if found
    const documentsLink = page.locator('text=Documents').first();
    const documentsLinkCount = await documentsLink.count();
    
    if (documentsLinkCount > 0) {
      console.log('✅ Documents link found, attempting to click');
      await documentsLink.click();
      await page.waitForTimeout(5000);
      
      // Take screenshot after navigation
      await page.screenshot({ path: 'debug-interactive-documents-page.png', fullPage: true });
      console.log('📸 Documents page screenshot taken');
      
      // Look for upload functionality
      const uploadButtons = await page.locator('button').allTextContents();
      console.log(`📤 Upload buttons available: ${JSON.stringify(uploadButtons, null, 2)}`);
      
    } else {
      console.log('❌ Documents link not found');
    }
    
    console.log('🎉 Interactive Debug Session Complete');
    console.log('📋 Summary of screenshots taken:');
    console.log('  - debug-interactive-initial.png');
    console.log('  - debug-interactive-filled.png');
    console.log('  - debug-interactive-after-login.png');
    console.log('  - debug-interactive-after-unlock.png (if unlock was needed)');
    console.log('  - debug-interactive-final-state.png');
    console.log('  - debug-interactive-documents-page.png (if Documents link was found)');
    
    // Pause at the end to allow manual inspection
    await page.waitForTimeout(5000);
  });
});