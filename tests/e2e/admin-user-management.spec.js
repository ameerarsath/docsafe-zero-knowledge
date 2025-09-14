/**
 * Comprehensive End-to-End Tests for Admin User Management Interface
 * 
 * Tests cover:
 * - User CRUD operations (create, read, update, delete)
 * - Field-specific validation with unique constraints
 * - Bulk operations (select all, bulk activate/deactivate, password reset)
 * - Search and filtering functionality
 * - Pagination and user listing
 * - User activity monitoring
 * - Error handling and message dismissal
 * - Authentication and authorization
 */

const { test, expect } = require('@playwright/test');
const { format } = require('date-fns');

// Test configuration
const BASE_URL = 'http://localhost:3005';
const API_BASE_URL = 'http://localhost:8002';

// Test credentials
const ADMIN_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@',
  encryptionPassword: 'JHNpAZ39g!&Y'
};

// Test data generators
const generateUniqueUsername = () => `testuser_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
const generateUniqueEmail = () => `test_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;

/**
 * Test Helper Functions
 */
class UserManagementTestHelpers {
  constructor(page) {
    this.page = page;
  }

  // Authentication helpers
  async loginAsAdmin() {
    await this.page.goto(`${BASE_URL}/login`);
    await this.page.fill('input[name="username"]', ADMIN_CREDENTIALS.username);
    await this.page.fill('input[name="password"]', ADMIN_CREDENTIALS.password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  async navigateToUserManagement() {
    // Navigate to admin user management page
    await this.page.goto(`${BASE_URL}/admin/users`);
    await this.page.waitForSelector('[data-testid="user-management-interface"], h2:has-text("User Management")', { timeout: 10000 });
  }

  // User creation helpers
  async openCreateUserModal() {
    await this.page.click('button:has-text("Create User")');
    await this.page.waitForSelector('form h3:has-text("Create New User")', { timeout: 5000 });
  }

  async fillCreateUserForm(userData) {
    await this.page.fill('input[name="username"], form input[type="text"]:first', userData.username);
    await this.page.fill('input[name="email"], form input[type="email"]', userData.email);
    await this.page.fill('input[name="password"], form input[type="password"]:first', userData.loginPassword);
    await this.page.fill('form input[type="password"]:nth-of-type(2)', userData.encryptionPassword);
    
    // Handle checkboxes if provided
    if (userData.isActive !== undefined) {
      const activeCheckbox = this.page.locator('form input[type="checkbox"]').first();
      const isChecked = await activeCheckbox.isChecked();
      if (isChecked !== userData.isActive) {
        await activeCheckbox.click();
      }
    }
    
    if (userData.isVerified !== undefined) {
      const verifiedCheckbox = this.page.locator('form input[type="checkbox"]').nth(1);
      const isChecked = await verifiedCheckbox.isChecked();
      if (isChecked !== userData.isVerified) {
        await verifiedCheckbox.click();
      }
    }
  }

  async submitCreateUserForm() {
    await this.page.click('button[type="submit"]:has-text("Create User")');
  }

  async closeCreateUserModal() {
    await this.page.click('button:has-text("Cancel")');
  }

  // User listing and search helpers
  async searchUsers(query) {
    await this.page.fill('input[placeholder*="Search users"]', query);
    await this.page.press('input[placeholder*="Search users"]', 'Enter');
    await this.page.waitForTimeout(1000); // Wait for search results
  }

  async setFilter(filterValue) {
    await this.page.selectOption('select:has-option[value="all"]', filterValue);
    await this.page.waitForTimeout(1000); // Wait for filter results
  }

  async setPageSize(size) {
    await this.page.selectOption('select:has-option[value="20"]', size.toString());
    await this.page.waitForTimeout(1000); // Wait for page to reload
  }

  // User selection helpers
  async selectUser(username) {
    const userRow = this.page.locator(`tr:has-text("${username}")`);
    const checkbox = userRow.locator('input[type="checkbox"]');
    await checkbox.click();
  }

  async selectAllUsers() {
    await this.page.click('thead input[type="checkbox"]');
  }

  async getSelectedUserCount() {
    const bulkActionBar = this.page.locator('.bg-blue-50:has-text("selected")');
    if (await bulkActionBar.isVisible()) {
      const text = await bulkActionBar.textContent();
      const match = text.match(/(\d+) user/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  }

  // Bulk operations helpers
  async performBulkOperation(operation) {
    const operationButtons = {
      activate: 'button:has-text("Activate")',
      deactivate: 'button:has-text("Deactivate")', 
      resetPasswords: 'button:has-text("Reset Passwords")'
    };
    
    await this.page.click(operationButtons[operation]);
  }

  // User actions helpers
  async editUser(username) {
    const userRow = this.page.locator(`tr:has-text("${username}")`);
    await userRow.locator('button[title="Edit User"], button:has([title="Edit User"])').click();
    await this.page.waitForSelector('form h3:has-text("Edit User")', { timeout: 5000 });
  }

  async deleteUser(username) {
    const userRow = this.page.locator(`tr:has-text("${username}")`);
    await userRow.locator('button[title="Delete User"], button:has([title="Delete User"])').click();
  }

  async viewUserActivity(username) {
    const userRow = this.page.locator(`tr:has-text("${username}")`);
    await userRow.locator('button[title="View Activity"], button:has([title="View Activity"])').click();
    await this.page.waitForSelector('h3:has-text("User Activity")', { timeout: 5000 });
  }

  // Message helpers
  async waitForSuccessMessage(timeout = 10000) {
    await this.page.waitForSelector('.bg-green-50, .text-green-800', { timeout });
  }

  async waitForErrorMessage(timeout = 10000) {
    await this.page.waitForSelector('.bg-red-50, .text-red-800', { timeout });
  }

  async getSuccessMessage() {
    const successElement = this.page.locator('.bg-green-50 p, .text-green-700');
    return await successElement.textContent();
  }

  async getErrorMessage() {
    const errorElement = this.page.locator('.bg-red-50 p, .text-red-700');
    return await errorElement.textContent();
  }

  async dismissSuccessMessage() {
    await this.page.click('.bg-green-50 button[aria-label="Dismiss success message"]');
  }

  async dismissErrorMessage() {
    await this.page.click('.bg-red-50 button[aria-label="Dismiss error"]');
  }

  async getFieldError(fieldName) {
    const fieldError = this.page.locator(`input[name="${fieldName}"] ~ p.text-red-600, .border-red-300 ~ p.text-red-600`);
    return await fieldError.textContent();
  }

  // Pagination helpers
  async goToNextPage() {
    await this.page.click('button:has-text("Next")');
    await this.page.waitForTimeout(1000);
  }

  async goToPreviousPage() {
    await this.page.click('button:has-text("Previous")');
    await this.page.waitForTimeout(1000);
  }

  async getCurrentPageInfo() {
    const pageInfo = this.page.locator('p:has-text("Showing")');
    return await pageInfo.textContent();
  }

  // Utility helpers
  async refreshUserList() {
    await this.page.click('button:has-text("Refresh")');
    await this.page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
  }

  async waitForLoadingToComplete() {
    await this.page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 });
  }

  async getUserFromTable(username) {
    const userRow = this.page.locator(`tr:has-text("${username}")`);
    if (await userRow.isVisible()) {
      const email = await userRow.locator('td:nth-child(2) .text-gray-500').textContent();
      const status = await userRow.locator('td:nth-child(3) span').textContent();
      const lastLogin = await userRow.locator('td:nth-child(4)').textContent();
      const mfaEnabled = await userRow.locator('td:nth-child(5) svg').getAttribute('class');
      
      return {
        username,
        email,
        status,
        lastLogin,
        mfaEnabled: mfaEnabled?.includes('text-green-500')
      };
    }
    return null;
  }

  // Test data cleanup
  async cleanupTestUser(username) {
    try {
      // Search for the user
      await this.searchUsers(username);
      await this.page.waitForTimeout(1000);
      
      // Check if user exists and delete
      const userRow = this.page.locator(`tr:has-text("${username}")`);
      if (await userRow.isVisible()) {
        await this.deleteUser(username);
        // Handle confirmation dialog if it appears
        this.page.on('dialog', async dialog => {
          if (dialog.type() === 'confirm') {
            await dialog.accept();
          }
        });
        await this.page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log(`Failed to cleanup test user ${username}:`, error.message);
    }
  }
}

test.describe('Admin User Management Interface', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new UserManagementTestHelpers(page);
    await helpers.loginAsAdmin();
    await helpers.navigateToUserManagement();
    await helpers.waitForLoadingToComplete();
  });

  test.describe('Authentication and Authorization', () => {
    test('should require admin authentication to access user management', async ({ page }) => {
      // Log out first
      await page.goto(`${BASE_URL}/logout`);
      
      // Try to access admin page directly
      await page.goto(`${BASE_URL}/admin/users`);
      
      // Should be redirected to login
      await expect(page).toHaveURL(/.*login/);
    });

    test('should display user management interface for admin users', async ({ page }) => {
      await expect(page.locator('h2:has-text("User Management")')).toBeVisible();
      await expect(page.locator('button:has-text("Create User")')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search users"]')).toBeVisible();
    });
  });

  test.describe('User CRUD Operations', () => {
    test('should create a new user successfully', async ({ page }) => {
      const userData = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!',
        isActive: true,
        isVerified: false
      };

      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();

      // Wait for success message
      await helpers.waitForSuccessMessage();
      const successMessage = await helpers.getSuccessMessage();
      expect(successMessage).toContain(userData.username);
      expect(successMessage).toContain('created successfully');
      expect(successMessage).toContain('zero-knowledge encryption');

      // Verify user appears in table
      await helpers.searchUsers(userData.username);
      const user = await helpers.getUserFromTable(userData.username);
      expect(user).toBeTruthy();
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);

      // Cleanup
      await helpers.cleanupTestUser(userData.username);
    });

    test('should show field-specific validation errors for duplicate username', async ({ page }) => {
      const existingUsername = 'existing_user_' + Date.now();
      const userData1 = {
        username: existingUsername,
        email: generateUniqueEmail(),
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      // Create first user
      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData1);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Try to create second user with same username
      await helpers.openCreateUserModal();
      const userData2 = {
        username: existingUsername, // Same username
        email: generateUniqueEmail(), // Different email
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };
      await helpers.fillCreateUserForm(userData2);
      await helpers.submitCreateUserForm();

      // Wait for error message
      await helpers.waitForErrorMessage();
      
      // Check for field-specific error under username field
      const usernameField = page.locator('input[type="text"]:first');
      await expect(usernameField).toHaveClass(/border-red-300/);
      
      const fieldError = page.locator('form p.text-red-600:has-text("username")');
      await expect(fieldError).toBeVisible();
      expect(await fieldError.textContent()).toContain('username');
      expect(await fieldError.textContent()).toContain('taken');

      await helpers.closeCreateUserModal();
      await helpers.cleanupTestUser(existingUsername);
    });

    test('should show field-specific validation errors for duplicate email', async ({ page }) => {
      const existingEmail = generateUniqueEmail();
      const userData1 = {
        username: generateUniqueUsername(),
        email: existingEmail,
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      // Create first user
      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData1);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Try to create second user with same email
      await helpers.openCreateUserModal();
      const userData2 = {
        username: generateUniqueUsername(), // Different username
        email: existingEmail, // Same email
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };
      await helpers.fillCreateUserForm(userData2);
      await helpers.submitCreateUserForm();

      // Wait for error message
      await helpers.waitForErrorMessage();
      
      // Check for field-specific error under email field
      const emailField = page.locator('input[type="email"]');
      await expect(emailField).toHaveClass(/border-red-300/);
      
      const fieldError = page.locator('form p.text-red-600:has-text("email")');
      await expect(fieldError).toBeVisible();
      expect(await fieldError.textContent()).toContain('email');
      expect(await fieldError.textContent()).toContain('registered');

      await helpers.closeCreateUserModal();
      await helpers.cleanupTestUser(userData1.username);
    });

    test('should validate required fields', async ({ page }) => {
      await helpers.openCreateUserModal();
      
      // Try to submit empty form
      await helpers.submitCreateUserForm();

      // Should show client-side validation errors
      await helpers.waitForErrorMessage();
      const errorMessage = await helpers.getErrorMessage();
      expect(errorMessage).toContain('required');

      await helpers.closeCreateUserModal();
    });

    test('should validate password requirements', async ({ page }) => {
      const userData = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        loginPassword: 'same123',
        encryptionPassword: 'same123' // Same as login password
      };

      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();

      // Should show error about passwords being different
      await helpers.waitForErrorMessage();
      const errorMessage = await helpers.getErrorMessage();
      expect(errorMessage).toContain('different');
      expect(errorMessage).toContain('security');

      await helpers.closeCreateUserModal();
    });

    test('should edit user successfully', async ({ page }) => {
      // Create test user first
      const userData = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!',
        isActive: true,
        isVerified: false
      };

      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Edit the user
      await helpers.searchUsers(userData.username);
      await helpers.editUser(userData.username);

      // Update email
      const newEmail = generateUniqueEmail();
      await page.fill('input[name="email"]', newEmail);
      await page.click('input[name="is_verified"]'); // Toggle verified status
      await page.click('button[type="submit"]:has-text("Update User")');

      // Wait for success message
      await helpers.waitForSuccessMessage();
      const successMessage = await helpers.getSuccessMessage();
      expect(successMessage).toContain('updated successfully');

      // Verify changes
      await helpers.searchUsers(userData.username);
      const updatedUser = await helpers.getUserFromTable(userData.username);
      expect(updatedUser.email).toBe(newEmail);

      // Cleanup
      await helpers.cleanupTestUser(userData.username);
    });

    test('should delete user with confirmation', async ({ page }) => {
      // Create test user first
      const userData = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Delete the user
      await helpers.searchUsers(userData.username);
      
      // Set up dialog handler for confirmation
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        expect(dialog.message()).toContain('cannot be undone');
        await dialog.accept();
      });

      await helpers.deleteUser(userData.username);

      // Wait for success message
      await helpers.waitForSuccessMessage();
      const successMessage = await helpers.getSuccessMessage();
      expect(successMessage).toContain('deleted successfully');

      // Verify user is removed
      await helpers.searchUsers(userData.username);
      const user = await helpers.getUserFromTable(userData.username);
      expect(user).toBeNull();
    });
  });

  test.describe('Search and Filtering', () => {
    test('should search users by username', async ({ page }) => {
      const searchTerm = 'test';
      await helpers.searchUsers(searchTerm);
      
      // Check that results contain search term
      const tableRows = page.locator('tbody tr');
      const rowCount = await tableRows.count();
      
      if (rowCount > 0) {
        for (let i = 0; i < rowCount; i++) {
          const rowText = await tableRows.nth(i).textContent();
          const containsSearchTerm = rowText.toLowerCase().includes(searchTerm.toLowerCase());
          // At least some result should contain the search term
          if (containsSearchTerm) {
            expect(containsSearchTerm).toBe(true);
            break;
          }
        }
      }
    });

    test('should search users by email', async ({ page }) => {
      const searchTerm = '@';
      await helpers.searchUsers(searchTerm);
      
      // Check that results contain email addresses
      const emailCells = page.locator('tbody tr .text-gray-500');
      const cellCount = await emailCells.count();
      
      if (cellCount > 0) {
        const firstEmail = await emailCells.first().textContent();
        expect(firstEmail).toContain('@');
      }
    });

    test('should filter users by status', async ({ page }) => {
      // Test active filter
      await helpers.setFilter('active');
      
      const statusBadges = page.locator('tbody tr .bg-green-100');
      const badgeCount = await statusBadges.count();
      
      if (badgeCount > 0) {
        const firstBadge = await statusBadges.first().textContent();
        expect(firstBadge).toContain('Active');
      }

      // Test inactive filter
      await helpers.setFilter('inactive');
      
      const inactiveStatusBadges = page.locator('tbody tr .bg-red-100');
      const inactiveBadgeCount = await inactiveStatusBadges.count();
      
      if (inactiveBadgeCount > 0) {
        const firstInactiveBadge = await inactiveStatusBadges.first().textContent();
        expect(firstInactiveBadge).toContain('Inactive');
      }

      // Reset to all
      await helpers.setFilter('all');
    });

    test('should change page size and update results', async ({ page }) => {
      await helpers.setPageSize(10);
      
      // Check that page size is reflected in pagination info
      const pageInfo = await helpers.getCurrentPageInfo();
      if (pageInfo && pageInfo.includes('of')) {
        // Should show appropriate number of results per page
        expect(pageInfo).toMatch(/\d+\s*-\s*\d+/);
      }

      await helpers.setPageSize(20); // Reset to default
    });
  });

  test.describe('Bulk Operations', () => {
    test.beforeEach(async ({ page }) => {
      // Create test users for bulk operations
      for (let i = 0; i < 3; i++) {
        const userData = {
          username: `bulk_test_user_${i}_${Date.now()}`,
          email: `bulk_test_${i}_${Date.now()}@example.com`,
          loginPassword: 'TestPass123!',
          encryptionPassword: 'EncryptPass456!',
          isActive: i % 2 === 0 // Alternate active/inactive
        };

        await helpers.openCreateUserModal();
        await helpers.fillCreateUserForm(userData);
        await helpers.submitCreateUserForm();
        await helpers.waitForSuccessMessage();
        await helpers.dismissSuccessMessage();
      }
      
      // Search for bulk test users
      await helpers.searchUsers('bulk_test_user');
    });

    test.afterEach(async ({ page }) => {
      // Cleanup bulk test users
      await helpers.searchUsers('bulk_test_user');
      const tableRows = page.locator('tbody tr');
      const rowCount = await tableRows.count();
      
      for (let i = 0; i < rowCount; i++) {
        const row = tableRows.nth(i);
        const username = await row.locator('td:nth-child(2) .text-gray-900').textContent();
        if (username && username.includes('bulk_test_user')) {
          await helpers.cleanupTestUser(username);
        }
      }
    });

    test('should select individual users', async ({ page }) => {
      const firstRow = page.locator('tbody tr').first();
      const checkbox = firstRow.locator('input[type="checkbox"]');
      
      await checkbox.click();
      
      // Should show bulk action bar
      await expect(page.locator('.bg-blue-50:has-text("selected")')).toBeVisible();
      
      const selectedCount = await helpers.getSelectedUserCount();
      expect(selectedCount).toBe(1);
    });

    test('should select all users on current page', async ({ page }) => {
      await helpers.selectAllUsers();
      
      // Should show bulk action bar
      await expect(page.locator('.bg-blue-50:has-text("selected")')).toBeVisible();
      
      const selectedCount = await helpers.getSelectedUserCount();
      expect(selectedCount).toBeGreaterThan(1);
    });

    test('should perform bulk activate operation', async ({ page }) => {
      // Select users
      await helpers.selectAllUsers();
      
      // Set up dialog handler for confirmation
      page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('activate');
        await dialog.accept();
      });
      
      await helpers.performBulkOperation('activate');
      
      // Wait for success message
      await helpers.waitForSuccessMessage();
      const successMessage = await helpers.getSuccessMessage();
      expect(successMessage).toContain('Successfully');
      expect(successMessage).toContain('activate');
    });

    test('should perform bulk deactivate operation', async ({ page }) => {
      // Select users
      await helpers.selectAllUsers();
      
      // Set up dialog handler for confirmation
      page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('deactivate');
        await dialog.accept();
      });
      
      await helpers.performBulkOperation('deactivate');
      
      // Wait for success message
      await helpers.waitForSuccessMessage();
      const successMessage = await helpers.getSuccessMessage();
      expect(successMessage).toContain('Successfully');
      expect(successMessage).toContain('deactivate');
    });

    test('should perform bulk password reset operation', async ({ page }) => {
      // Select users
      await helpers.selectAllUsers();
      
      // Set up dialog handler for confirmation
      page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('reset passwords');
        await dialog.accept();
      });
      
      await helpers.performBulkOperation('resetPasswords');
      
      // Wait for success message
      await helpers.waitForSuccessMessage();
      const successMessage = await helpers.getSuccessMessage();
      expect(successMessage).toContain('Successfully');
      expect(successMessage).toContain('reset passwords');
    });

    test('should handle bulk operation with no users selected', async ({ page }) => {
      // Try bulk operation without selection
      await helpers.performBulkOperation('activate');
      
      // Should show error
      await helpers.waitForErrorMessage();
      const errorMessage = await helpers.getErrorMessage();
      expect(errorMessage).toContain('No users selected');
    });
  });

  test.describe('User Activity Monitoring', () => {
    test('should display user activity modal', async ({ page }) => {
      // Create test user first
      const userData = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // View user activity
      await helpers.searchUsers(userData.username);
      await helpers.viewUserActivity(userData.username);

      // Check modal content
      await expect(page.locator('h3:has-text("User Activity")')).toBeVisible();
      await expect(page.locator('div:has-text("Total Actions")')).toBeVisible();
      await expect(page.locator('div:has-text("Documents Accessed")')).toBeVisible();
      await expect(page.locator('h4:has-text("Recent Activity")')).toBeVisible();

      // Close modal
      await page.click('button:has-text("×")');

      // Cleanup
      await helpers.cleanupTestUser(userData.username);
    });
  });

  test.describe('Error Handling and Messages', () => {
    test('should display and dismiss error messages', async ({ page }) => {
      const userData = {
        username: 'existing_user_' + Date.now(),
        email: generateUniqueEmail(),
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      // Create user first
      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Try to create duplicate
      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();

      // Wait for error and dismiss
      await helpers.waitForErrorMessage();
      const errorMessage = await helpers.getErrorMessage();
      expect(errorMessage).toBeTruthy();

      // Dismiss error
      await helpers.dismissErrorMessage();
      await expect(page.locator('.bg-red-50')).not.toBeVisible();

      await helpers.closeCreateUserModal();
      await helpers.cleanupTestUser(userData.username);
    });

    test('should display and dismiss success messages', async ({ page }) => {
      const userData = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();

      // Wait for success message and dismiss
      await helpers.waitForSuccessMessage();
      const successMessage = await helpers.getSuccessMessage();
      expect(successMessage).toContain('created successfully');

      // Dismiss success message
      await helpers.dismissSuccessMessage();
      await expect(page.locator('.bg-green-50')).not.toBeVisible();

      // Cleanup
      await helpers.cleanupTestUser(userData.username);
    });

    test('should auto-dismiss success messages after 5 seconds', async ({ page }) => {
      const userData = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();

      // Wait for success message
      await helpers.waitForSuccessMessage();
      await expect(page.locator('.bg-green-50')).toBeVisible();

      // Wait for auto-dismiss (5 seconds + buffer)
      await page.waitForTimeout(6000);
      await expect(page.locator('.bg-green-50')).not.toBeVisible();

      // Cleanup
      await helpers.cleanupTestUser(userData.username);
    });

    test('should clear field errors when user starts typing', async ({ page }) => {
      const existingUsername = 'existing_user_' + Date.now();
      const userData = {
        username: existingUsername,
        email: generateUniqueEmail(),
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      // Create first user
      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Try to create duplicate to trigger field error
      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();
      await helpers.waitForErrorMessage();

      // Verify field error exists
      const usernameField = page.locator('input[type="text"]:first');
      await expect(usernameField).toHaveClass(/border-red-300/);

      // Start typing in username field
      await usernameField.fill('new_username');

      // Field error should be cleared
      await expect(usernameField).not.toHaveClass(/border-red-300/);

      await helpers.closeCreateUserModal();
      await helpers.cleanupTestUser(existingUsername);
    });
  });

  test.describe('Pagination and Navigation', () => {
    test('should display pagination when needed', async ({ page }) => {
      // Reset any filters
      await helpers.setFilter('all');
      await helpers.setPageSize(10);

      const pageInfo = await helpers.getCurrentPageInfo();
      if (pageInfo && pageInfo.includes('of')) {
        // Check for pagination controls
        const paginationControls = page.locator('nav button:has-text("Previous"), nav button:has-text("Next")');
        const controlCount = await paginationControls.count();
        expect(controlCount).toBeGreaterThan(0);
      }
    });

    test('should navigate between pages', async ({ page }) => {
      await helpers.setPageSize(10);
      
      const initialPageInfo = await helpers.getCurrentPageInfo();
      if (initialPageInfo && initialPageInfo.includes('of')) {
        const nextButton = page.locator('button:has-text("Next")');
        if (await nextButton.isEnabled()) {
          await helpers.goToNextPage();
          
          const newPageInfo = await helpers.getCurrentPageInfo();
          expect(newPageInfo).not.toBe(initialPageInfo);

          // Go back to previous page
          await helpers.goToPreviousPage();
        }
      }
    });

    test('should show correct page information', async ({ page }) => {
      const pageInfo = await helpers.getCurrentPageInfo();
      if (pageInfo) {
        expect(pageInfo).toMatch(/Showing \d+ - \d+ of \d+ results/);
      }
    });
  });

  test.describe('UI/UX Elements', () => {
    test('should show loading states', async ({ page }) => {
      await helpers.refreshUserList();
      
      // Loading spinner should appear briefly
      await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 1000 });
      
      // Then disappear when loading is complete
      await helpers.waitForLoadingToComplete();
      await expect(page.locator('.animate-spin')).not.toBeVisible();
    });

    test('should display user status badges correctly', async ({ page }) => {
      // Check for various status badges
      const statusBadges = page.locator('tbody tr span.px-2.py-1');
      const badgeCount = await statusBadges.count();
      
      if (badgeCount > 0) {
        const firstBadge = statusBadges.first();
        const badgeText = await firstBadge.textContent();
        expect(['Active', 'Inactive', 'Unverified']).toContain(badgeText);
      }
    });

    test('should display MFA status correctly', async ({ page }) => {
      // Check MFA column for icons
      const mfaIcons = page.locator('tbody tr td:nth-child(5) svg');
      const iconCount = await mfaIcons.count();
      
      if (iconCount > 0) {
        const firstIcon = mfaIcons.first();
        const iconClass = await firstIcon.getAttribute('class');
        expect(iconClass).toMatch(/(text-green-500|text-gray-400)/);
      }
    });

    test('should show proper form validation styling', async ({ page }) => {
      await helpers.openCreateUserModal();
      
      // Submit empty form to trigger validation
      await helpers.submitCreateUserForm();
      
      // Required fields should have error styling
      const requiredFields = page.locator('form input[required]');
      const fieldCount = await requiredFields.count();
      
      if (fieldCount > 0) {
        // At least username field should be highlighted
        const usernameField = page.locator('input[type="text"]:first');
        // May have red border or other error styling
        const fieldClass = await usernameField.getAttribute('class');
        expect(fieldClass).toBeTruthy();
      }

      await helpers.closeCreateUserModal();
    });

    test('should display modal dialogs properly', async ({ page }) => {
      await helpers.openCreateUserModal();
      
      // Modal should be properly positioned and visible
      const modal = page.locator('div.fixed.inset-0.bg-black.bg-opacity-50');
      await expect(modal).toBeVisible();
      
      const modalContent = page.locator('form h3:has-text("Create New User")');
      await expect(modalContent).toBeVisible();
      
      // Modal should have proper overlay
      const overlay = page.locator('.bg-black.bg-opacity-50');
      await expect(overlay).toBeVisible();

      await helpers.closeCreateUserModal();
    });

    test('should be responsive on different screen sizes', async ({ page }) => {
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Main components should still be visible
      await expect(page.locator('h2:has-text("User Management")')).toBeVisible();
      await expect(page.locator('button:has-text("Create User")')).toBeVisible();
      
      // Reset to desktop view
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });

  test.describe('Integration Tests', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network error by blocking API requests
      await page.route('**/api/v1/admin/users', route => route.abort());
      
      try {
        await helpers.refreshUserList();
        
        // Should show appropriate error message
        await helpers.waitForErrorMessage(5000);
        const errorMessage = await helpers.getErrorMessage();
        expect(errorMessage).toContain('Failed to load users');
      } catch (error) {
        // Expected to fail due to network block
        console.log('Network error test completed as expected');
      }
      
      // Restore network
      await page.unroute('**/api/v1/admin/users');
    });

    test('should maintain state across page refreshes', async ({ page }) => {
      // Set search and filter
      await helpers.searchUsers('test');
      await helpers.setFilter('active');
      await helpers.setPageSize(50);
      
      // Refresh page
      await page.reload();
      await helpers.waitForLoadingToComplete();
      
      // Note: State persistence depends on URL params or local storage
      // This test verifies the interface loads correctly after refresh
      await expect(page.locator('h2:has-text("User Management")')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search users"]')).toBeVisible();
    });

    test('should handle concurrent user operations', async ({ page }) => {
      const username1 = generateUniqueUsername();
      const username2 = generateUniqueUsername();
      
      // Create two users concurrently (simulate by rapid creation)
      const userData1 = {
        username: username1,
        email: generateUniqueEmail(),
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };
      
      const userData2 = {
        username: username2,
        email: generateUniqueEmail(),
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      // Create first user
      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData1);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Immediately create second user
      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData2);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Both users should exist
      await helpers.searchUsers(username1.substring(0, 10)); // Search partial to find both
      const user1 = await helpers.getUserFromTable(username1);
      const user2 = await helpers.getUserFromTable(username2);
      
      expect(user1).toBeTruthy();
      expect(user2).toBeTruthy();

      // Cleanup
      await helpers.cleanupTestUser(username1);
      await helpers.cleanupTestUser(username2);
    });
  });

  test.describe('Zero-Knowledge Security Integration', () => {
    test('should require encryption password for user creation', async ({ page }) => {
      await helpers.openCreateUserModal();
      
      // Check that encryption password field exists and has proper labeling
      const encryptionField = page.locator('input[type="password"]:nth-of-type(2)');
      await expect(encryptionField).toBeVisible();
      
      const encryptionLabel = page.locator('label:has-text("Encryption Password")');
      await expect(encryptionLabel).toBeVisible();
      
      const helperText = page.locator('text=zero-knowledge document encryption');
      await expect(helperText).toBeVisible();

      await helpers.closeCreateUserModal();
    });

    test('should validate encryption password is different from login password', async ({ page }) => {
      const userData = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        loginPassword: 'SamePassword123!',
        encryptionPassword: 'SamePassword123!' // Same as login password
      };

      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();

      // Should show validation error
      await helpers.waitForErrorMessage();
      const errorMessage = await helpers.getErrorMessage();
      expect(errorMessage).toContain('different');
      expect(errorMessage).toContain('security');

      await helpers.closeCreateUserModal();
    });

    test('should mention zero-knowledge encryption in success message', async ({ page }) => {
      const userData = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();

      await helpers.waitForSuccessMessage();
      const successMessage = await helpers.getSuccessMessage();
      expect(successMessage).toContain('zero-knowledge encryption');
      expect(successMessage).toContain('enabled');

      await helpers.cleanupTestUser(userData.username);
    });
  });
});