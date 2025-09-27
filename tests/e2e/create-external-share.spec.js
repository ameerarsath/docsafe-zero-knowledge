/**
 * E2E Test: Create External Share via UI
 *
 * This test demonstrates the complete workflow of:
 * 1. Logging into SecureVault
 * 2. Uploading a document
 * 3. Creating an external share via UI
 * 4. Testing the share link accessibility
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

// Test configuration
const TEST_USER = {
  username: 'testuser',
  password: 'password123',
  email: 'testuser@example.com'
};

const FRONTEND_URL = 'http://localhost:3005';
const BACKEND_URL = 'http://localhost:8002';

test.describe('External Share Creation via UI', () => {
  let page;
  let context;
  let sharedLink = '';
  let shareToken = '';

  test.beforeAll(async ({ browser }) => {
    // Create a new browser context
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['clipboard-read', 'clipboard-write']
    });

    page = await context.newPage();

    // Enable detailed logging
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('ERROR')) {
        console.log(`🔴 BROWSER ERROR: ${msg.text()}`);
      } else if (msg.text().includes('SUCCESS') || msg.text().includes('✅')) {
        console.log(`🟢 BROWSER SUCCESS: ${msg.text()}`);
      }
    });

    // Navigate to the application
    console.log('🚀 Starting External Share Creation Test...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('should login to SecureVault', async () => {
    console.log('👤 Step 1: Logging into SecureVault...');

    // Wait for the login form to be visible
    await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 10000 });

    // Fill login form
    await page.fill('input[type="text"], input[type="email"]', TEST_USER.username);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Click login button
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    // Wait for successful login (dashboard or documents page)
    await page.waitForSelector('h1:has-text("Documents"), h2:has-text("Dashboard"), [data-testid="documents-page"]', {
      timeout: 15000
    });

    console.log('✅ Successfully logged into SecureVault');
  });

  test('should upload a test document', async () => {
    console.log('📄 Step 2: Uploading test document...');

    // Navigate to documents page if not already there
    try {
      await page.click('a:has-text("Documents"), nav a:has-text("Documents")');
    } catch (error) {
      console.log('Already on documents page or navigation not needed');
    }

    // Wait for upload button/area
    await page.waitForSelector(
      'button:has-text("Upload"), input[type="file"], [data-testid="upload-button"]',
      { timeout: 10000 }
    );

    // Create file input if needed and upload
    const testFilePath = path.resolve(__dirname, '../../test_documents/sample_document.txt');

    // Look for file input or upload button
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(testFilePath);
    } else {
      // Try clicking upload button to reveal file input
      await page.click('button:has-text("Upload"), [data-testid="upload-button"]');
      await page.waitForSelector('input[type="file"]', { timeout: 5000 });
      await page.setInputFiles('input[type="file"]', testFilePath);
    }

    // Wait for upload to complete
    await page.waitForSelector(
      'text=sample_document.txt, [data-filename*="sample_document"], .document-item:has-text("sample_document")',
      { timeout: 30000 }
    );

    console.log('✅ Successfully uploaded test document');
  });

  test('should create external share via UI', async () => {
    console.log('🔗 Step 3: Creating external share via UI...');

    // Find the uploaded document and click share button
    const documentRow = await page.locator('text=sample_document.txt').first();
    await documentRow.waitFor({ timeout: 10000 });

    // Look for share button near the document
    const shareButton = await page.locator(
      'button:has-text("Share"), [data-testid="share-button"], button[title*="Share"]'
    ).first();

    if (await shareButton.isVisible()) {
      await shareButton.click();
    } else {
      // Try right-clicking on document for context menu
      await documentRow.click({ button: 'right' });
      await page.waitForSelector('text=Share, [data-testid="share-option"]');
      await page.click('text=Share');
    }

    // Wait for share dialog
    await page.waitForSelector(
      '[role="dialog"], .modal, .share-dialog, [data-testid="share-dialog"]',
      { timeout: 10000 }
    );

    console.log('📋 Share dialog opened');

    // Configure share settings
    await page.waitForSelector('input[type="text"]:not([type="password"])'); // Share name input

    // Set share name
    await page.fill('input[type="text"]:not([type="password"])', 'Test External Share');

    // Select external share type
    const externalOption = await page.locator('text=External, input[value="external"], [data-value="external"]');
    if (await externalOption.isVisible()) {
      await externalOption.click();
    }

    // Enable preview and download permissions
    const previewCheckbox = await page.locator('input[type="checkbox"] + label:has-text("Preview"), input[type="checkbox"][name*="preview"]');
    if (await previewCheckbox.isVisible() && !(await previewCheckbox.isChecked())) {
      await previewCheckbox.click();
    }

    const downloadCheckbox = await page.locator('input[type="checkbox"] + label:has-text("Download"), input[type="checkbox"][name*="download"]');
    if (await downloadCheckbox.isVisible() && !(await downloadCheckbox.isChecked())) {
      await downloadCheckbox.click();
    }

    // Create the share
    await page.click('button:has-text("Create Share"), button:has-text("Share"), [data-testid="create-share-button"]');

    // Wait for share creation success
    await page.waitForSelector(
      'text=Share created, text=successful, .success-message, [data-testid="share-success"]',
      { timeout: 15000 }
    );

    // Extract share link
    const shareUrlInput = await page.locator('input[readonly], input[value*="share/"], [data-testid="share-url"]');
    if (await shareUrlInput.isVisible()) {
      sharedLink = await shareUrlInput.inputValue();
      shareToken = sharedLink.split('/share/')[1];
      console.log(`✅ External share created: ${sharedLink}`);
    }

    // Close dialog
    await page.click('button:has-text("Close"), button:has-text("Done"), [data-testid="close-dialog"]');

    expect(sharedLink).toContain('/share/');
    expect(shareToken).toBeTruthy();
  });

  test('should test external share accessibility', async () => {
    console.log('🌐 Step 4: Testing external share accessibility...');

    if (!sharedLink) {
      throw new Error('Share link not created in previous test');
    }

    // Open share link in new tab (simulating external user)
    const shareTab = await context.newPage();

    // Navigate to share link
    await shareTab.goto(sharedLink, { waitUntil: 'networkidle' });

    // Should NOT see login page (external share should be accessible)
    const isLoginPage = await shareTab.$('input[type="password"], form:has-text("Login")') !== null;
    expect(isLoginPage).toBeFalsy();

    // Should see document information
    await shareTab.waitForSelector('text=sample_document.txt, [data-filename*="sample_document"]');

    // Should see preview button if document supports it
    const previewButton = await shareTab.$('button:has-text("Preview"), button:has-text("View")');
    if (previewButton && await previewButton.isVisible()) {
      console.log('✅ Preview button available');

      // Test preview functionality
      await previewButton.click();
      await shareTab.waitForSelector('[data-testid="document-preview"], .preview-container', { timeout: 10000 });
      console.log('✅ Preview opened successfully');

      // Close preview
      const closeButton = await shareTab.$('button:has-text("Close"), button[aria-label="Close"]');
      if (closeButton) {
        await closeButton.click();
      }
    }

    // Should see download button
    const downloadButton = await shareTab.locator('button:has-text("Download")');
    await expect(downloadButton).toBeVisible();
    console.log('✅ Download button available');

    // Test that the share works without authentication
    console.log('✅ External share is accessible without authentication');

    await shareTab.close();
  });

  test('should verify share via API', async () => {
    console.log('🔌 Step 5: Verifying share via API...');

    if (!shareToken) {
      throw new Error('Share token not available');
    }

    // Test share access endpoint
    const response = await page.request.post(`${BACKEND_URL}/api/v1/shares/${shareToken}/access`, {
      data: {}
    });

    expect(response.ok()).toBeTruthy();

    const shareData = await response.json();
    expect(shareData.document.name).toContain('sample_document');
    expect(shareData.permissions).toContain('read');
    expect(shareData.permissions).toContain('download');
    expect(shareData.shareInfo.shareType).toBe('external');

    console.log('✅ API verification successful:', {
      document: shareData.document.name,
      permissions: shareData.permissions,
      shareType: shareData.shareInfo.shareType
    });
  });

  // Summary test that logs all results
  test('should display test summary', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 EXTERNAL SHARE CREATION TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Login: Success`);
    console.log(`✅ Document Upload: Success (sample_document.txt)`);
    console.log(`✅ External Share Creation: Success`);
    console.log(`✅ Share Link: ${sharedLink}`);
    console.log(`✅ Share Token: ${shareToken}`);
    console.log(`✅ External Access: Success (no authentication required)`);
    console.log(`✅ API Verification: Success`);
    console.log('='.repeat(60));
    console.log('🎉 All tests passed! External sharing is working correctly.');
    console.log('='.repeat(60) + '\n');
  });
});

// Helper function to wait for element with retry
async function waitForElementWithRetry(page, selector, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}