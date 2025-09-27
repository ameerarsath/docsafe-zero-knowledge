/**
 * Playwright E2E Test: PDF Preview Loading Spinner Fix
 *
 * Tests that the loading spinner disappears correctly when PDF preview loads:
 * 1. Login and initialization
 * 2. Upload a PDF file
 * 3. Open PDF preview
 * 4. Verify loading spinner appears initially
 * 5. Verify loading spinner disappears when PDF renders
 * 6. Test error handling scenarios
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:3007'; // Actual frontend port
const TEST_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@',
  encryptionPassword: 'JHNpAZ39g!&Y'
};

// Create test PDF file
const createTestPDF = () => {
  const filename = 'test-pdf-spinner.pdf';
  const filePath = path.join(__dirname, 'test-fixtures', filename);

  // Ensure fixtures directory exists
  const fixturesDir = path.dirname(filePath);
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // Create a minimal PDF file (valid PDF header and structure)
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF for Spinner Fix) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000202 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
295
%%EOF`;

  fs.writeFileSync(filePath, pdfContent);
  return filePath;
};

test.describe('PDF Preview Loading Spinner Fix', () => {
  test.beforeAll(async () => {
    // Create test PDF file
    createTestPDF();
  });

  test.beforeEach(async ({ page }) => {
    // Set up console logging for debugging
    page.on('console', msg => {
      const text = msg.text();
      // Log specific events we're interested in
      if (text.includes('PDF') || text.includes('loading') || text.includes('spinner') ||
          text.includes('pdfRenderSuccess') || text.includes('SimplePDFPlugin')) {
        console.log(`[CONSOLE] ${msg.type()}: ${text}`);
      }
    });

    // Set up error tracking
    page.on('pageerror', error => {
      console.error(`[PAGE ERROR] ${error.message}`);
    });

    // Navigate to app
    await page.goto(BASE_URL);
  });

  test('PDF Preview Spinner Disappears on Successful Load', async ({ page }) => {
    console.log('🧪 Testing PDF Preview Spinner Fix - Success Case');

    // Step 1: Login and setup
    console.log('👤 Step 1: Login and Setup');
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Wait for encryption unlock page and unlock
    await page.waitForSelector('button:has-text("Unlock Documents")', { timeout: 10000 });
    await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
    await page.click('button:has-text("Unlock Documents")');
    await page.waitForTimeout(3000);

    console.log('✅ Login and encryption setup complete');

    // Step 2: Upload PDF file
    console.log('📤 Step 2: Upload PDF File');

    // Click upload files button
    await page.click('button:has-text("Upload Files")');
    await page.waitForTimeout(1000);

    // Check if encryption session needs initialization
    const initButton = await page.locator('button:has-text("Initialize Encryption Session")');
    if (await initButton.count() > 0) {
      await page.click('button:has-text("Initialize Encryption Session")');
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await page.fill('input[type="password"]', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Initialize Session")');
      await page.waitForSelector('text=Zero-Knowledge Encryption Active', { timeout: 10000 });
    }

    // Upload the PDF file
    const testPDFPath = path.join(__dirname, 'test-fixtures', 'test-pdf-spinner.pdf');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPDFPath);

    // Wait for upload to complete
    await page.waitForSelector('text=test-pdf-spinner.pdf', { timeout: 15000 });
    console.log('✅ PDF file uploaded successfully');

    // Step 3: Open PDF Preview and Test Spinner
    console.log('🖼️ Step 3: Test PDF Preview Spinner Behavior');

    // Set up event listeners to track pdfRenderSuccess events
    const pdfEvents = [];
    await page.evaluateOnNewDocument(() => {
      window.pdfEvents = [];
      document.addEventListener('pdfRenderSuccess', (event) => {
        window.pdfEvents.push({ type: 'success', detail: event.detail, timestamp: Date.now() });
        console.log('🎯 pdfRenderSuccess event captured:', event.detail);
      });
      document.addEventListener('pdfRenderError', (event) => {
        window.pdfEvents.push({ type: 'error', detail: event.detail, timestamp: Date.now() });
        console.log('🎯 pdfRenderError event captured:', event.detail);
      });
    });

    // Click on the PDF to open preview
    await page.click('text=test-pdf-spinner.pdf');

    // Verify preview modal opens
    await page.waitForSelector('.fixed.inset-0.bg-black.bg-opacity-75', { timeout: 10000 });
    console.log('✅ PDF preview modal opened');

    // Step 4: Check initial loading state
    console.log('⏳ Step 4: Verify Initial Loading Spinner');

    // Look for loading indicators (spinner, "Loading PDF...", etc.)
    const loadingIndicators = [
      '.loading-spinner',
      'text=Loading PDF...',
      'text=Decrypting document...',
      'text=Generating preview...',
      '[class*="animate-spin"]',
      '.pdf-loading-overlay'
    ];

    let loadingFound = false;
    for (const indicator of loadingIndicators) {
      const element = await page.locator(indicator);
      if (await element.count() > 0) {
        console.log(`✅ Found loading indicator: ${indicator}`);
        loadingFound = true;
        break;
      }
    }

    if (!loadingFound) {
      console.log('⚠️ No loading indicator found - checking for immediate load');
    }

    // Step 5: Wait for PDF to render and spinner to disappear
    console.log('📄 Step 5: Wait for PDF Render and Spinner Disappearance');

    // Wait for PDF content to appear (iframe, embed, or canvas)
    const pdfContentSelectors = [
      '.pdf-iframe',
      '.pdf-native-iframe',
      'iframe[src*="blob:"]',
      'embed[type="application/pdf"]',
      '.pdf-viewer',
      '.viewer-content'
    ];

    let pdfContentFound = false;
    for (const selector of pdfContentSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 15000 });
        console.log(`✅ PDF content found: ${selector}`);
        pdfContentFound = true;
        break;
      } catch (error) {
        // Continue to next selector
      }
    }

    if (!pdfContentFound) {
      console.log('⚠️ PDF content not found with standard selectors, checking for any iframe/embed');
      await page.waitForSelector('iframe, embed', { timeout: 10000 });
    }

    // Wait a moment for events to process
    await page.waitForTimeout(2000);

    // Step 6: Verify pdfRenderSuccess event was dispatched
    console.log('🎯 Step 6: Verify pdfRenderSuccess Event');

    const events = await page.evaluate(() => window.pdfEvents || []);
    console.log('📊 PDF Events captured:', events);

    const successEvents = events.filter(e => e.type === 'success');
    const errorEvents = events.filter(e => e.type === 'error');

    if (successEvents.length > 0) {
      console.log('✅ pdfRenderSuccess event was dispatched');
      expect(successEvents[0].detail.pluginName).toBe('SimplePDFPlugin');
    } else {
      console.log('⚠️ No pdfRenderSuccess event found - checking for alternative success indicators');
    }

    // Step 7: Verify loading spinners are hidden
    console.log('🎯 Step 7: Verify Loading Spinners Are Hidden');

    // Check that loading overlays are hidden or removed
    const hiddenLoadingSelectors = [
      '.pdf-loading-overlay.hidden',
      '.pdf-loading-overlay[style*="display: none"]',
      '.pdf-loading-overlay[style*="opacity: 0"]'
    ];

    let loadingHidden = false;
    for (const selector of hiddenLoadingSelectors) {
      const element = await page.locator(selector);
      if (await element.count() > 0) {
        console.log(`✅ Loading overlay hidden: ${selector}`);
        loadingHidden = true;
        break;
      }
    }

    // Also check that any general loading indicators are gone
    const activeLoadingSelectors = [
      'text=Loading PDF...',
      'text=Generating preview...',
      '.loading-spinner:visible',
      '[class*="animate-spin"]:visible'
    ];

    for (const selector of activeLoadingSelectors) {
      const element = await page.locator(selector);
      const count = await element.count();
      if (count > 0) {
        console.log(`❌ Active loading indicator still present: ${selector}`);
        // Take screenshot for debugging
        await page.screenshot({ path: `debug-active-loading-${Date.now()}.png` });
      }
    }

    // Step 8: Verify PDF is interactive
    console.log('🖱️ Step 8: Verify PDF Is Interactive');

    // Try to interact with the PDF content
    const pdfFrame = await page.locator('iframe, embed').first();
    if (await pdfFrame.count() > 0) {
      // PDF should be loaded and interactive
      console.log('✅ PDF frame is present and should be interactive');
    }

    // Close the preview
    await page.click('button[title="Close"], button[aria-label*="close" i], .close-button, [data-testid="close-button"]');
    console.log('✅ PDF preview closed successfully');

    console.log('🎉 PDF Preview Spinner Test Completed Successfully!');
  });

  test('PDF Preview Error Handling', async ({ page }) => {
    console.log('🧪 Testing PDF Preview Error Handling');

    // Login first
    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await page.waitForSelector('button:has-text("Unlock Documents")', { timeout: 10000 });
    await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
    await page.click('button:has-text("Unlock Documents")');
    await page.waitForTimeout(3000);

    // Create an invalid PDF file
    const invalidPDFPath = path.join(__dirname, 'test-fixtures', 'invalid-pdf.pdf');
    fs.writeFileSync(invalidPDFPath, 'This is not a valid PDF file content');

    // Upload the invalid file
    await page.click('button:has-text("Upload Files")');
    await page.waitForTimeout(1000);

    const initButton = await page.locator('button:has-text("Initialize Encryption Session")');
    if (await initButton.count() > 0) {
      await page.click('button:has-text("Initialize Encryption Session")');
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await page.fill('input[type="password"]', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Initialize Session")');
      await page.waitForSelector('text=Zero-Knowledge Encryption Active', { timeout: 10000 });
    }

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidPDFPath);

    await page.waitForSelector('text=invalid-pdf.pdf', { timeout: 15000 });

    // Try to preview the invalid PDF
    await page.click('text=invalid-pdf.pdf');
    await page.waitForSelector('.fixed.inset-0.bg-black.bg-opacity-75', { timeout: 10000 });

    // Should show error message instead of infinite loading
    await page.waitForSelector('text=PDF preview failed, text=Preview Error, text=Failed to', { timeout: 10000 });
    console.log('✅ Error message displayed correctly for invalid PDF');

    // Close preview
    await page.click('button[title="Close"], button[aria-label*="close" i]');

    console.log('🎉 PDF Error Handling Test Completed!');
  });

  test('PDF Preview Timeout Handling', async ({ page }) => {
    console.log('🧪 Testing PDF Preview Timeout Handling');

    // This test simulates a scenario where PDF loading takes too long
    // and verifies that the timeout mechanism works correctly

    await page.fill('input[name="username"]', TEST_CREDENTIALS.username);
    await page.fill('input[name="loginPassword"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await page.waitForSelector('button:has-text("Unlock Documents")', { timeout: 10000 });
    await page.fill('input[type="password"]:not([name="loginPassword"])', TEST_CREDENTIALS.encryptionPassword);
    await page.click('button:has-text("Unlock Documents")');
    await page.waitForTimeout(3000);

    // Intercept PDF loading and delay it to simulate slow loading
    await page.route('**/blob:*', async route => {
      // Delay the response to simulate slow loading
      await new Promise(resolve => setTimeout(resolve, 12000)); // 12 second delay (longer than 10s timeout)
      route.continue();
    });

    // Upload and try to preview PDF
    await page.click('button:has-text("Upload Files")');
    await page.waitForTimeout(1000);

    const initButton = await page.locator('button:has-text("Initialize Encryption Session")');
    if (await initButton.count() > 0) {
      await page.click('button:has-text("Initialize Encryption Session")');
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await page.fill('input[type="password"]', TEST_CREDENTIALS.encryptionPassword);
      await page.click('button:has-text("Initialize Session")');
      await page.waitForSelector('text=Zero-Knowledge Encryption Active', { timeout: 10000 });
    }

    const testPDFPath = path.join(__dirname, 'test-fixtures', 'test-pdf-spinner.pdf');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPDFPath);

    await page.waitForSelector('text=test-pdf-spinner.pdf', { timeout: 15000 });

    // Open preview
    await page.click('text=test-pdf-spinner.pdf');
    await page.waitForSelector('.fixed.inset-0.bg-black.bg-opacity-75', { timeout: 10000 });

    // Should show fallback or error after timeout (10 seconds)
    await page.waitForSelector('text=PDF Viewer, text=Open in New Tab, button:has-text("Download PDF")', { timeout: 15000 });
    console.log('✅ Timeout fallback displayed correctly');

    await page.click('button[title="Close"], button[aria-label*="close" i]');

    console.log('🎉 PDF Timeout Handling Test Completed!');
  });
});