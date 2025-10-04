/**
 * External Share Full Flow Test
 *
 * Tests complete external share workflow:
 * 1. Login → Upload file → Share → Create external share → Get link
 * 2. Open share link in incognito
 * 3. Verify preview shows (NO download)
 */

import { test, expect } from '@playwright/test';

test.describe('External Share Full Flow', () => {
  const testFile = {
    name: 'test-document.pdf',
    content: Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Test Document) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000015 00000 n \n0000000068 00000 n \n0000000125 00000 n \n0000000317 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n408\n%%EOF'),
    mimeType: 'application/pdf'
  };

  let shareLink: string;

  test('Step 1: Login and upload file', async ({ page }) => {
    console.log('🔐 Logging in...');

    await page.goto('http://localhost:3010/login');
    await page.fill('input[name="username"]', 'rahumana');
    await page.fill('input[name="password"]', 'TestPass123@');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Login successful');

    console.log('📤 Uploading test file...');

    // Click upload button
    await page.click('button:has-text("Upload")');

    // Wait for file input
    const fileInput = await page.waitForSelector('input[type="file"]');

    // Upload the file
    await fileInput.setInputFiles({
      name: testFile.name,
      mimeType: testFile.mimeType,
      buffer: testFile.content
    });

    // Wait for upload to complete
    await page.waitForSelector(`text=${testFile.name}`, { timeout: 10000 });
    console.log('✅ File uploaded successfully');
  });

  test('Step 2: Create external share and get link', async ({ page }) => {
    console.log('🔗 Creating external share...');

    await page.goto('http://localhost:3010/dashboard');

    // Find and click the test file
    await page.click(`text=${testFile.name}`);

    // Click share button
    await page.click('button:has-text("Share")');

    // Wait for share dialog
    await page.waitForSelector('text=Share Document');

    // Select external share type
    await page.click('button:has-text("External")');

    // Click create share button
    await page.click('button:has-text("Create Share")');

    // Wait for share to be created and get the link
    await page.waitForSelector('[data-testid="share-link"], input[value*="/share/"]', { timeout: 10000 });

    // Get the share link
    const shareLinkElement = await page.locator('input[value*="/share/"]').first();
    shareLink = await shareLinkElement.inputValue();

    console.log('✅ Share created:', shareLink);

    // Store share link for next test
    await page.evaluate((link) => {
      window.localStorage.setItem('testShareLink', link);
    }, shareLink);
  });

  test('Step 3: Open external share link and verify preview', async ({ browser }) => {
    // Get share link from previous test
    const page = await browser.newPage();
    await page.goto('http://localhost:3010/dashboard');

    const storedLink = await page.evaluate(() => {
      return window.localStorage.getItem('testShareLink');
    });

    if (!storedLink) {
      throw new Error('Share link not found from previous test');
    }

    console.log('🔍 Testing external share link:', storedLink);

    // Create incognito context (simulates external user)
    const incognitoContext = await browser.newContext();
    const incognitoPage = await incognitoContext.newPage();

    // Track downloads
    let downloadTriggered = false;
    incognitoPage.on('download', () => {
      downloadTriggered = true;
      console.log('❌ DOWNLOAD TRIGGERED - This is the bug!');
    });

    // Navigate to share link
    await incognitoPage.goto(storedLink);

    // Wait for page to load
    await incognitoPage.waitForLoadState('networkidle');

    // Check if "Show Preview" button exists
    const showPreviewButton = await incognitoPage.locator('button:has-text("Show Preview")').first();

    if (await showPreviewButton.isVisible()) {
      console.log('📋 Clicking "Show Preview" button...');
      await showPreviewButton.click();

      // Wait a bit for preview to load
      await incognitoPage.waitForTimeout(2000);
    }

    // Check if download was triggered
    if (downloadTriggered) {
      console.error('❌ BUG FOUND: File downloaded instead of showing preview!');

      // Get network requests
      const requests = [];
      incognitoPage.on('request', req => requests.push(req.url()));

      // Get response headers
      const previewResponse = await incognitoPage.waitForResponse(
        response => response.url().includes('/preview'),
        { timeout: 5000 }
      ).catch(() => null);

      if (previewResponse) {
        const headers = previewResponse.headers();
        console.log('📋 Preview Response Headers:', {
          'content-disposition': headers['content-disposition'],
          'content-type': headers['content-type'],
          'x-document-name': headers['x-document-name']
        });
      }

      throw new Error('File downloaded instead of showing preview');
    }

    // Check if preview is visible (iframe, img, or other preview element)
    const previewElements = [
      'iframe',
      'img[src*="blob:"]',
      'video',
      'audio',
      '.preview-container',
      '[data-testid="preview"]'
    ];

    let previewFound = false;
    for (const selector of previewElements) {
      const element = await incognitoPage.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        console.log(`✅ Preview found: ${selector}`);
        previewFound = true;
        break;
      }
    }

    if (!previewFound) {
      // Take screenshot for debugging
      await incognitoPage.screenshot({ path: 'external-share-preview-debug.png' });
      console.error('❌ BUG FOUND: No preview element visible!');
      throw new Error('Preview not displaying');
    }

    console.log('✅ External share preview working correctly!');

    await incognitoContext.close();
  });

  test('Step 4: Test different file types', async ({ browser }) => {
    const testFiles = [
      {
        name: 'test-image.png',
        content: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
        mimeType: 'image/png'
      },
      {
        name: 'test.txt',
        content: Buffer.from('This is a test text file'),
        mimeType: 'text/plain'
      },
      {
        name: 'test.csv',
        content: Buffer.from('Name,Age,Email\nJohn,30,john@example.com\nJane,25,jane@example.com'),
        mimeType: 'text/csv'
      }
    ];

    for (const file of testFiles) {
      console.log(`\n🧪 Testing file type: ${file.name}`);

      // Login and upload
      const page = await browser.newPage();
      await page.goto('http://localhost:3010/login');
      await page.fill('input[name="username"]', 'rahumana');
      await page.fill('input[name="password"]', 'TestPass123@');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Upload file
      await page.click('button:has-text("Upload")');
      const fileInput = await page.waitForSelector('input[type="file"]');
      await fileInput.setInputFiles({
        name: file.name,
        mimeType: file.mimeType,
        buffer: file.content
      });
      await page.waitForSelector(`text=${file.name}`);

      // Create share (simplified - click file then share)
      await page.click(`text=${file.name}`);
      await page.click('button:has-text("Share")');
      await page.waitForSelector('text=Share Document');
      await page.click('button:has-text("External")');
      await page.click('button:has-text("Create Share")');

      // Get share link
      await page.waitForSelector('input[value*="/share/"]');
      const link = await page.locator('input[value*="/share/"]').first().inputValue();

      // Test in incognito
      const incognitoContext = await browser.newContext();
      const incognitoPage = await incognitoContext.newPage();

      let downloadTriggered = false;
      incognitoPage.on('download', () => {
        downloadTriggered = true;
      });

      await incognitoPage.goto(link);
      await incognitoPage.waitForLoadState('networkidle');

      const showPreview = await incognitoPage.locator('button:has-text("Show Preview")').first();
      if (await showPreview.isVisible()) {
        await showPreview.click();
        await incognitoPage.waitForTimeout(1000);
      }

      if (downloadTriggered) {
        console.error(`❌ ${file.name}: Downloaded instead of preview`);
      } else {
        console.log(`✅ ${file.name}: Preview working`);
      }

      await incognitoContext.close();
      await page.close();
    }
  });
});
