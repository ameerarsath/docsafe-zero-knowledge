/**
 * Configuration and utilities for Admin User Management E2E Tests
 * 
 * Provides:
 * - Test configuration constants
 * - Common test data generators
 * - Shared helper functions
 * - Test environment setup
 */

// Test Environment Configuration
const TEST_CONFIG = {
  BASE_URL: process.env.FRONTEND_URL || 'http://localhost:3005',
  API_BASE_URL: process.env.BACKEND_URL || 'http://localhost:8002',
  
  // Test user credentials
  ADMIN_CREDENTIALS: {
    username: process.env.TEST_ADMIN_USERNAME || 'rahumana',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestPass123@',
    encryptionPassword: process.env.TEST_ENCRYPTION_PASSWORD || 'JHNpAZ39g!&Y'
  },
  
  // Test timeouts
  TIMEOUTS: {
    DEFAULT: 10000,
    LOADING: 30000,
    NETWORK: 60000,
    DIALOG: 5000,
    MESSAGE: 15000
  },
  
  // Test data limits
  LIMITS: {
    MAX_USERNAME_LENGTH: 150,
    MAX_EMAIL_LENGTH: 254,
    MIN_PASSWORD_LENGTH: 8,
    MAX_BULK_OPERATIONS: 100,
    MAX_SEARCH_RESULTS: 1000
  },
  
  // Viewport configurations for responsive testing
  VIEWPORTS: {
    MOBILE: { width: 375, height: 667 },
    TABLET: { width: 768, height: 1024 },
    DESKTOP: { width: 1280, height: 720 },
    WIDE: { width: 1920, height: 1080 }
  }
};

// Test Data Generators
class TestDataGenerator {
  static generateUniqueId() {
    return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  static generateUsername(prefix = 'testuser') {
    return `${prefix}_${this.generateUniqueId()}`;
  }

  static generateEmail(prefix = 'test') {
    return `${prefix}_${this.generateUniqueId()}@example.com`;
  }

  static generatePassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  static generateUserData(overrides = {}) {
    return {
      username: this.generateUsername(),
      email: this.generateEmail(),
      loginPassword: this.generatePassword(),
      encryptionPassword: this.generatePassword(),
      isActive: true,
      isVerified: false,
      ...overrides
    };
  }

  static generateBulkUserData(count = 5, prefix = 'bulk_test') {
    return Array.from({ length: count }, (_, index) => ({
      username: `${prefix}_${index}_${this.generateUniqueId()}`,
      email: `${prefix}_${index}_${this.generateUniqueId()}@example.com`,
      loginPassword: 'TestPass123!',
      encryptionPassword: 'EncryptPass456!',
      isActive: index % 2 === 0,
      isVerified: index % 3 === 0
    }));
  }

  static generateSearchTerms() {
    return [
      'test',
      '@example.com',
      'admin',
      'user',
      this.generateUniqueId().substring(0, 8)
    ];
  }

  static generateSpecialCharacterUsernames() {
    const baseId = this.generateUniqueId();
    return [
      `user.name_${baseId}`,
      `user-name_${baseId}`,
      `user_name_${baseId}`,
      `user123_${baseId}`,
      `123user_${baseId}`
    ];
  }

  static generateInvalidEmails() {
    const baseId = this.generateUniqueId();
    return [
      `invalid-email_${baseId}`,
      `@example.com_${baseId}`,
      `user@_${baseId}`,
      `user@.com_${baseId}`,
      `user@@example.com_${baseId}`
    ];
  }

  static generateEdgeCasePasswords() {
    return [
      'short',
      'a'.repeat(100),
      '12345678',
      'PASSWORD123!',
      'password123!',
      '!@#$%^&*()',
      'Same123!', // Will be used for both login and encryption
      ''
    ];
  }
}

// Test Utilities
class TestUtilities {
  static async waitForCondition(page, condition, timeout = TEST_CONFIG.TIMEOUTS.DEFAULT) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        if (await condition()) {
          return true;
        }
      } catch (error) {
        // Condition check failed, continue waiting
      }
      await page.waitForTimeout(100);
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static async retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  static async measurePerformance(page, operation) {
    const startTime = Date.now();
    await operation();
    const endTime = Date.now();
    return endTime - startTime;
  }

  static async captureNetworkRequests(page, pattern) {
    const requests = [];
    
    page.on('request', request => {
      if (request.url().includes(pattern)) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          timestamp: Date.now()
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes(pattern)) {
        const request = requests.find(req => req.url === response.url());
        if (request) {
          request.status = response.status();
          request.responseTime = Date.now() - request.timestamp;
        }
      }
    });

    return requests;
  }

  static async simulateSlowNetwork(page, delay = 2000) {
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), delay);
    });
  }

  static async simulateNetworkError(page, pattern = '**/api/**') {
    await page.route(pattern, route => route.abort('failed'));
  }

  static async restoreNetwork(page, pattern = '**/api/**') {
    await page.unroute(pattern);
  }

  static formatTestReport(testName, results) {
    return {
      testName,
      timestamp: new Date().toISOString(),
      duration: results.duration,
      status: results.status,
      errors: results.errors || [],
      metrics: results.metrics || {},
      screenshots: results.screenshots || []
    };
  }

  static async takeScreenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    await page.screenshot({ 
      path: `tests/screenshots/${filename}`,
      fullPage: true 
    });
    return filename;
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateUsername(username) {
    // Username should be alphanumeric with underscores, periods, and hyphens
    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    return usernameRegex.test(username) && username.length > 0 && username.length <= TEST_CONFIG.LIMITS.MAX_USERNAME_LENGTH;
  }

  static validatePassword(password) {
    return password && password.length >= TEST_CONFIG.LIMITS.MIN_PASSWORD_LENGTH;
  }
}

// Common Test Patterns
class TestPatterns {
  static async loginAsAdmin(page) {
    await page.goto(`${TEST_CONFIG.BASE_URL}/login`);
    await page.fill('input[name="username"]', TEST_CONFIG.ADMIN_CREDENTIALS.username);
    await page.fill('input[name="password"]', TEST_CONFIG.ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: TEST_CONFIG.TIMEOUTS.LOADING });
  }

  static async navigateToUserManagement(page) {
    await page.goto(`${TEST_CONFIG.BASE_URL}/admin/users`);
    await page.waitForSelector(
      '[data-testid="user-management-interface"], h2:has-text("User Management")',
      { timeout: TEST_CONFIG.TIMEOUTS.DEFAULT }
    );
  }

  static async createTestUser(page, userData) {
    // Open modal
    await page.click('button:has-text("Create User")');
    await page.waitForSelector('form h3:has-text("Create New User")', { timeout: TEST_CONFIG.TIMEOUTS.DIALOG });
    
    // Fill form
    await page.fill('input[type="text"]:first', userData.username);
    await page.fill('input[type="email"]', userData.email);
    await page.fill('input[type="password"]:first', userData.loginPassword);
    await page.fill('input[type="password"]:nth-of-type(2)', userData.encryptionPassword);
    
    // Handle checkboxes
    if (userData.isActive !== undefined) {
      const activeCheckbox = page.locator('input[type="checkbox"]').first();
      const isChecked = await activeCheckbox.isChecked();
      if (isChecked !== userData.isActive) {
        await activeCheckbox.click();
      }
    }
    
    if (userData.isVerified !== undefined) {
      const verifiedCheckbox = page.locator('input[type="checkbox"]').nth(1);
      const isChecked = await verifiedCheckbox.isChecked();
      if (isChecked !== userData.isVerified) {
        await verifiedCheckbox.click();
      }
    }
    
    // Submit
    await page.click('button[type="submit"]:has-text("Create User")');
  }

  static async cleanupTestUser(page, username) {
    try {
      await page.fill('input[placeholder*="Search users"]', username);
      await page.press('input[placeholder*="Search users"]', 'Enter');
      await page.waitForTimeout(1000);
      
      const userRow = page.locator(`tr:has-text("${username}")`);
      if (await userRow.isVisible()) {
        page.once('dialog', async dialog => {
          if (dialog.type() === 'confirm') {
            await dialog.accept();
          }
        });
        
        await userRow.locator('button[title="Delete User"], button:has([title="Delete User"])').click();
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log(`Failed to cleanup test user ${username}:`, error.message);
    }
  }

  static async waitForMessage(page, type = 'success', timeout = TEST_CONFIG.TIMEOUTS.MESSAGE) {
    const selector = type === 'success' ? '.bg-green-50' : '.bg-red-50';
    await page.waitForSelector(selector, { timeout });
  }

  static async getMessageText(page, type = 'success') {
    const selector = type === 'success' ? '.bg-green-50 p, .text-green-700' : '.bg-red-50 p, .text-red-700';
    return await page.locator(selector).textContent();
  }

  static async dismissMessage(page, type = 'success') {
    const selector = type === 'success' 
      ? '.bg-green-50 button[aria-label="Dismiss success message"]'
      : '.bg-red-50 button[aria-label="Dismiss error"]';
    await page.click(selector);
  }
}

// Test Data Validation
class TestValidation {
  static async validateUserInTable(page, userData) {
    const userRow = page.locator(`tr:has-text("${userData.username}")`);
    
    if (!(await userRow.isVisible())) {
      throw new Error(`User ${userData.username} not found in table`);
    }
    
    const email = await userRow.locator('td:nth-child(2) .text-gray-500').textContent();
    const status = await userRow.locator('td:nth-child(3) span').textContent();
    
    if (email !== userData.email) {
      throw new Error(`Email mismatch: expected ${userData.email}, got ${email}`);
    }
    
    const expectedStatus = userData.isActive ? 'Active' : 'Inactive';
    if (!userData.isActive && !userData.isVerified) {
      // Could be "Inactive" or "Unverified"
    } else if (status !== expectedStatus) {
      console.warn(`Status mismatch: expected ${expectedStatus}, got ${status}`);
    }
    
    return true;
  }

  static async validateFormError(page, fieldName, expectedError) {
    const fieldError = page.locator(`input[name="${fieldName}"] ~ p.text-red-600, .border-red-300 ~ p.text-red-600`);
    if (await fieldError.isVisible()) {
      const errorText = await fieldError.textContent();
      if (errorText.toLowerCase().includes(expectedError.toLowerCase())) {
        return true;
      }
      throw new Error(`Unexpected field error: ${errorText}, expected: ${expectedError}`);
    }
    throw new Error(`No field error found for ${fieldName}`);
  }

  static async validateBulkOperationResult(page, operation, userCount) {
    await TestPatterns.waitForMessage(page, 'success');
    const message = await TestPatterns.getMessageText(page, 'success');
    
    if (!message.toLowerCase().includes(operation.toLowerCase())) {
      throw new Error(`Bulk operation message does not mention ${operation}: ${message}`);
    }
    
    if (!message.includes(userCount.toString())) {
      console.warn(`Bulk operation message may not show correct count: ${message}`);
    }
    
    return true;
  }
}

module.exports = {
  TEST_CONFIG,
  TestDataGenerator,
  TestUtilities,
  TestPatterns,
  TestValidation
};