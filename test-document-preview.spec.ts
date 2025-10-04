import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Test credentials
const TEST_USER = 'rahumana';
const TEST_PASSWORD = 'TestPass123@';
const ENCRYPTION_PASSWORD = 'JHNpAZ39g!&Y';

// Console error tracking
let consoleErrors: string[] = [];
let consoleWarnings: string[] = [];
let apiErrors: any[] = [];

test.describe('Document Preview System Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Reset error tracking
    consoleErrors = [];
    consoleWarnings = [];
    apiErrors = [];

    // Capture console errors
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        consoleErrors.push(text);
        console.log('❌ BROWSER ERROR:', text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
        console.log('⚠️ BROWSER WARNING:', text);
      } else if (text.includes('ERROR') || text.includes('Failed') || text.includes('404')) {
        console.log('🔍 BROWSER LOG:', text);
      }
    });

    // Capture network errors
    page.on('response', response => {
      if (!response.ok() && response.url().includes('/api/')) {
        const error = {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        };
        apiErrors.push(error);
        console.log('🌐 API ERROR:', error);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
      console.log('💥 PAGE ERROR:', error.message);
    });
  });

  test('Login and navigate to dashboard', async ({ page }) => {
    console.log('\n🧪 TEST: Login and navigate to dashboard');

    await page.goto('http://localhost:3005');

    // Wait for login page
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });

    // Fill login form
    await page.fill('input[type="text"]', TEST_USER);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    // Click login
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    console.log('✅ Successfully logged in');

    // Take screenshot
    await page.screenshot({ path: 'test-results/01-dashboard.png', fullPage: true });
  });

  test('Upload and preview PNG image', async ({ page }) => {
    console.log('\n🧪 TEST: Upload and preview PNG image');

    // Login first
    await loginHelper(page);

    // Create test PNG file
    const testFile = await createTestImage('test-image.png');

    // Upload file
    await uploadFile(page, testFile);

    // Wait for upload to complete
    await page.waitForTimeout(2000);

    // Find and click the uploaded file
    const fileElement = await page.locator(`text=test-image.png`).first();
    await fileElement.click();

    // Wait for preview to appear
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/02-png-preview.png', fullPage: true });

    // Check for errors
    console.log('📊 Console Errors:', consoleErrors.length);
    console.log('📊 API Errors:', apiErrors.length);

    if (consoleErrors.length > 0) {
      console.log('❌ ERRORS FOUND:', consoleErrors);
    }
    if (apiErrors.length > 0) {
      console.log('❌ API ERRORS FOUND:', apiErrors);
    }
  });

  test('Upload and preview JSON file', async ({ page }) => {
    console.log('\n🧪 TEST: Upload and preview JSON file');

    await loginHelper(page);

    // Create test JSON file
    const testFile = await createTestJSON('test-data.json');

    await uploadFile(page, testFile);
    await page.waitForTimeout(2000);

    const fileElement = await page.locator(`text=test-data.json`).first();
    await fileElement.click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/03-json-preview.png', fullPage: true });

    console.log('📊 Console Errors:', consoleErrors.length);
    console.log('📊 API Errors:', apiErrors.length);

    if (consoleErrors.length > 0) {
      console.log('❌ ERRORS FOUND:', consoleErrors);
    }
  });

  test('Upload and preview XLSX file', async ({ page }) => {
    console.log('\n🧪 TEST: Upload and preview XLSX file');

    await loginHelper(page);

    // For XLSX, we'll need to use an actual file or skip
    console.log('⚠️ XLSX test requires actual Excel file - checking error behavior');

    // Try to click on existing XLSX if any
    const xlsxFile = await page.locator('text=/\\.xlsx/i').first();
    const count = await xlsxFile.count();

    if (count > 0) {
      await xlsxFile.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/04-xlsx-preview.png', fullPage: true });

      console.log('📊 Console Errors:', consoleErrors.length);
      console.log('📊 API Errors:', apiErrors.length);

      if (consoleErrors.length > 0) {
        console.log('❌ ERRORS FOUND:', consoleErrors);
      }
      if (apiErrors.length > 0) {
        console.log('❌ API ERRORS:', apiErrors);
      }
    } else {
      console.log('⏭️ No XLSX file found to test');
    }
  });

  test('Create external share and test link', async ({ page }) => {
    console.log('\n🧪 TEST: Create external share and test link');

    await loginHelper(page);

    // Find first document
    const firstDoc = await page.locator('[data-testid="document-item"]').first();
    const docName = await firstDoc.textContent();

    console.log('📄 Testing share for document:', docName);

    // Right-click or find share button
    // This depends on your UI implementation
    const shareButton = await page.locator('button:has-text("Share")').first();
    if (await shareButton.isVisible()) {
      await shareButton.click();

      // Wait for share dialog
      await page.waitForTimeout(1000);

      // Select external share
      const externalOption = await page.locator('text=External').first();
      if (await externalOption.isVisible()) {
        await externalOption.click();
      }

      // Enter encryption password if prompted
      page.on('dialog', async dialog => {
        console.log('🔐 Password dialog:', dialog.message());
        await dialog.accept(ENCRYPTION_PASSWORD);
      });

      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/05-share-dialog.png', fullPage: true });

      console.log('📊 Console Errors:', consoleErrors.length);
      console.log('📊 API Errors:', apiErrors.length);

      if (consoleErrors.length > 0) {
        console.log('❌ ERRORS FOUND:', consoleErrors);
      }
      if (apiErrors.length > 0) {
        console.log('❌ API ERRORS:', apiErrors);
      }
    }
  });

  test('Capture all console output during document preview', async ({ page }) => {
    console.log('\n🧪 TEST: Capture all console output');

    const allLogs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      allLogs.push(`[${msg.type()}] ${text}`);
      console.log(`[${msg.type()}] ${text}`);
    });

    await loginHelper(page);

    // Try to preview first document
    const firstDoc = await page.locator('[data-testid="document-item"]').first();
    await firstDoc.click();

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/06-full-console-capture.png', fullPage: true });

    // Write all logs to file
    fs.writeFileSync('test-results/console-logs.txt', allLogs.join('\n'));
    console.log('📝 All console logs saved to test-results/console-logs.txt');

    // Write errors to separate file
    fs.writeFileSync('test-results/errors.json', JSON.stringify({
      consoleErrors,
      consoleWarnings,
      apiErrors
    }, null, 2));
    console.log('📝 Errors saved to test-results/errors.json');
  });
});

// Helper Functions

async function loginHelper(page: Page) {
  await page.goto('http://localhost:3005');
  await page.waitForSelector('input[type="text"]', { timeout: 5000 });
  await page.fill('input[type="text"]', TEST_USER);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

async function uploadFile(page: Page, filePath: string) {
  const uploadButton = await page.locator('button:has-text("Upload")').first();
  await uploadButton.click();

  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);

  // Submit upload if needed
  const submitButton = await page.locator('button:has-text("Upload")').last();
  if (await submitButton.isVisible()) {
    await submitButton.click();
  }
}

async function createTestImage(filename: string): Promise<string> {
  const testDir = path.join(process.cwd(), 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const filePath = path.join(testDir, filename);

  // Create simple 1x1 PNG
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimension
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
    0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  fs.writeFileSync(filePath, pngData);
  return filePath;
}

async function createTestJSON(filename: string): Promise<string> {
  const testDir = path.join(process.cwd(), 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const filePath = path.join(testDir, filename);
  const jsonData = {
    test: true,
    message: 'This is a test JSON file',
    timestamp: new Date().toISOString(),
    data: [1, 2, 3, 4, 5]
  };

  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
  return filePath;
}
