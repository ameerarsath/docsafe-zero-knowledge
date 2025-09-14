/**
 * Advanced End-to-End Tests for Admin User Management Interface
 * 
 * Advanced scenarios including:
 * - Performance testing with large datasets
 * - Edge cases and boundary conditions  
 * - Complex user interaction flows
 * - Role-based access control scenarios
 * - Data integrity and consistency tests
 * - Cross-browser compatibility scenarios
 * - Accessibility testing
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3005';
const ADMIN_CREDENTIALS = {
  username: 'rahumana',
  password: 'TestPass123@'
};

// Import helper from main test file
const { UserManagementTestHelpers } = require('./admin-user-management.spec.js');

test.describe('Admin User Management - Advanced Scenarios', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new UserManagementTestHelpers(page);
    await helpers.loginAsAdmin();
    await helpers.navigateToUserManagement();
    await helpers.waitForLoadingToComplete();
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle rapid user creation', async ({ page }) => {
      const userPromises = [];
      const userCount = 5;
      
      for (let i = 0; i < userCount; i++) {
        const userData = {
          username: `perf_test_${Date.now()}_${i}`,
          email: `perf_test_${Date.now()}_${i}@example.com`,
          loginPassword: 'TestPass123!',
          encryptionPassword: 'EncryptPass456!'
        };

        // Create users rapidly
        await helpers.openCreateUserModal();
        await helpers.fillCreateUserForm(userData);
        await helpers.submitCreateUserForm();
        
        // Don't wait for completion, continue to next
        userPromises.push(userData.username);
      }

      // Wait for all operations to complete
      await page.waitForTimeout(5000);

      // Verify all users were created
      for (const username of userPromises) {
        await helpers.searchUsers(username);
        const user = await helpers.getUserFromTable(username);
        expect(user).toBeTruthy();
        await helpers.cleanupTestUser(username);
      }
    });

    test('should handle pagination with large datasets', async ({ page }) => {
      // Test pagination behavior
      await helpers.setPageSize(10);
      
      // Navigate through multiple pages quickly
      for (let i = 0; i < 3; i++) {
        const nextButton = page.locator('button:has-text("Next")');
        if (await nextButton.isEnabled()) {
          await helpers.goToNextPage();
          await helpers.waitForLoadingToComplete();
          
          // Verify page loaded correctly
          const pageInfo = await helpers.getCurrentPageInfo();
          expect(pageInfo).toBeTruthy();
        }
      }

      // Navigate back
      for (let i = 0; i < 3; i++) {
        const prevButton = page.locator('button:has-text("Previous")');
        if (await prevButton.isEnabled()) {
          await helpers.goToPreviousPage();
          await helpers.waitForLoadingToComplete();
        }
      }
    });

    test('should handle rapid search queries', async ({ page }) => {
      const searchTerms = ['test', 'admin', 'user', '@', '.com'];
      
      for (const term of searchTerms) {
        await helpers.searchUsers(term);
        await page.waitForTimeout(100); // Rapid fire searches
        
        // Verify search completed
        const searchInput = page.locator('input[placeholder*="Search users"]');
        expect(await searchInput.inputValue()).toBe(term);
      }
      
      // Clear search
      await helpers.searchUsers('');
    });
  });

  test.describe('Edge Cases and Boundary Conditions', () => {
    test('should handle extremely long usernames', async ({ page }) => {
      const longUsername = 'a'.repeat(100); // Very long username
      const userData = {
        username: longUsername,
        email: `long_${Date.now()}@example.com`,
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();

      // Should either succeed or show appropriate validation error
      try {
        await helpers.waitForSuccessMessage();
        await helpers.cleanupTestUser(longUsername);
      } catch {
        await helpers.waitForErrorMessage();
        const errorMessage = await helpers.getErrorMessage();
        expect(errorMessage).toBeTruthy();
      }

      await helpers.closeCreateUserModal();
    });

    test('should handle special characters in usernames', async ({ page }) => {
      const specialUsernames = [
        'user@domain',
        'user.name',
        'user-name',
        'user_name',
        'user123'
      ];

      for (const username of specialUsernames) {
        const userData = {
          username: `special_${username}_${Date.now()}`,
          email: `special_${Date.now()}@example.com`,
          loginPassword: 'TestPass123!',
          encryptionPassword: 'EncryptPass456!'
        };

        await helpers.openCreateUserModal();
        await helpers.fillCreateUserForm(userData);
        await helpers.submitCreateUserForm();

        try {
          await helpers.waitForSuccessMessage();
          await helpers.cleanupTestUser(userData.username);
        } catch {
          // Some special characters may not be allowed
          await helpers.waitForErrorMessage();
        }
        
        // Close any open modals
        if (await page.locator('form h3:has-text("Create New User")').isVisible()) {
          await helpers.closeCreateUserModal();
        }
      }
    });

    test('should handle empty search results gracefully', async ({ page }) => {
      const nonExistentSearch = `nonexistent_${Date.now()}_${Math.random()}`;
      await helpers.searchUsers(nonExistentSearch);
      
      // Should show empty state or no results message
      const tableRows = page.locator('tbody tr');
      const rowCount = await tableRows.count();
      
      if (rowCount === 0) {
        // Verify table is empty but interface is still functional
        await expect(page.locator('thead')).toBeVisible();
        await expect(page.locator('input[placeholder*="Search users"]')).toBeVisible();
      }
      
      // Clear search
      await helpers.searchUsers('');
    });

    test('should handle maximum page size selection', async ({ page }) => {
      await helpers.setPageSize(100);
      await helpers.waitForLoadingToComplete();
      
      // Verify page loads with maximum page size
      const pageInfo = await helpers.getCurrentPageInfo();
      if (pageInfo && pageInfo.includes('of')) {
        expect(pageInfo).toMatch(/\d+\s*-\s*\d+\s*of\s*\d+/);
      }
      
      // Reset to reasonable size
      await helpers.setPageSize(20);
    });
  });

  test.describe('Complex User Interaction Flows', () => {
    test('should handle create -> edit -> delete user workflow', async ({ page }) => {
      const userData = {
        username: `workflow_${Date.now()}`,
        email: `workflow_${Date.now()}@example.com`,
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!',
        isActive: true,
        isVerified: false
      };

      // Create user
      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Edit user
      await helpers.searchUsers(userData.username);
      await helpers.editUser(userData.username);
      
      const newEmail = `edited_${Date.now()}@example.com`;
      await page.fill('input[name="email"]', newEmail);
      await page.click('input[name="is_verified"]'); // Toggle verified
      await page.click('button[type="submit"]:has-text("Update User")');
      await helpers.waitForSuccessMessage();

      // View activity
      await helpers.searchUsers(userData.username);
      await helpers.viewUserActivity(userData.username);
      await expect(page.locator('h3:has-text("User Activity")')).toBeVisible();
      await page.click('button:has-text("×")'); // Close activity modal

      // Delete user
      page.once('dialog', async dialog => {
        await dialog.accept();
      });
      await helpers.deleteUser(userData.username);
      await helpers.waitForSuccessMessage();

      // Verify user is gone
      await helpers.searchUsers(userData.username);
      const deletedUser = await helpers.getUserFromTable(userData.username);
      expect(deletedUser).toBeNull();
    });

    test('should handle multiple modal interactions', async ({ page }) => {
      const userData1 = {
        username: `modal_test_1_${Date.now()}`,
        email: `modal1_${Date.now()}@example.com`,
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      // Open create modal
      await helpers.openCreateUserModal();
      
      // Cancel and reopen
      await helpers.closeCreateUserModal();
      await helpers.openCreateUserModal();
      
      // Fill and submit
      await helpers.fillCreateUserForm(userData1);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Immediately open edit modal
      await helpers.searchUsers(userData1.username);
      await helpers.editUser(userData1.username);
      
      // Cancel edit
      await page.click('button:has-text("Cancel")');
      
      // Open activity modal
      await helpers.viewUserActivity(userData1.username);
      await expect(page.locator('h3:has-text("User Activity")')).toBeVisible();
      await page.click('button:has-text("×")');

      // Cleanup
      await helpers.cleanupTestUser(userData1.username);
    });

    test('should handle bulk operations with mixed results', async ({ page }) => {
      // Create test users with different states
      const testUsers = [];
      for (let i = 0; i < 3; i++) {
        const userData = {
          username: `bulk_mixed_${i}_${Date.now()}`,
          email: `bulk_mixed_${i}_${Date.now()}@example.com`,
          loginPassword: 'TestPass123!',
          encryptionPassword: 'EncryptPass456!',
          isActive: i === 0 // First user active, others inactive
        };

        await helpers.openCreateUserModal();
        await helpers.fillCreateUserForm(userData);
        await helpers.submitCreateUserForm();
        await helpers.waitForSuccessMessage();
        await helpers.dismissSuccessMessage();
        
        testUsers.push(userData.username);
      }

      // Search for bulk test users
      await helpers.searchUsers('bulk_mixed');
      
      // Select all users
      await helpers.selectAllUsers();
      
      // Perform bulk activate (some already active, some inactive)
      page.once('dialog', async dialog => {
        await dialog.accept();
      });
      await helpers.performBulkOperation('activate');
      
      // Should show success or partial success message
      try {
        await helpers.waitForSuccessMessage();
        const successMessage = await helpers.getSuccessMessage();
        expect(successMessage).toContain('Successfully');
      } catch {
        // May show partial success as error
        await helpers.waitForErrorMessage();
        const errorMessage = await helpers.getErrorMessage();
        expect(errorMessage).toContain('partially');
      }

      // Cleanup
      for (const username of testUsers) {
        await helpers.cleanupTestUser(username);
      }
    });
  });

  test.describe('Data Integrity and Consistency', () => {
    test('should maintain data consistency across operations', async ({ page }) => {
      const userData = {
        username: `consistency_${Date.now()}`,
        email: `consistency_${Date.now()}@example.com`,
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!',
        isActive: true,
        isVerified: true
      };

      // Create user
      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Verify user data consistency
      await helpers.searchUsers(userData.username);
      const createdUser = await helpers.getUserFromTable(userData.username);
      expect(createdUser.username).toBe(userData.username);
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.status).toBe('Active');

      // Refresh and verify data persists
      await helpers.refreshUserList();
      await helpers.searchUsers(userData.username);
      const persistedUser = await helpers.getUserFromTable(userData.username);
      expect(persistedUser).toEqual(createdUser);

      // Edit and verify changes persist
      await helpers.editUser(userData.username);
      const newEmail = `edited_consistency_${Date.now()}@example.com`;
      await page.fill('input[name="email"]', newEmail);
      await page.click('button[type="submit"]:has-text("Update User")');
      await helpers.waitForSuccessMessage();

      // Verify edit persisted
      await helpers.refreshUserList();
      await helpers.searchUsers(userData.username);
      const editedUser = await helpers.getUserFromTable(userData.username);
      expect(editedUser.email).toBe(newEmail);

      // Cleanup
      await helpers.cleanupTestUser(userData.username);
    });

    test('should handle concurrent user modifications', async ({ page }) => {
      const userData = {
        username: `concurrent_${Date.now()}`,
        email: `concurrent_${Date.now()}@example.com`,
        loginPassword: 'TestPass123!',
        encryptionPassword: 'EncryptPass456!'
      };

      // Create user
      await helpers.openCreateUserModal();
      await helpers.fillCreateUserForm(userData);
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Simulate rapid state changes
      await helpers.searchUsers(userData.username);
      
      // Select for bulk operation
      await helpers.selectUser(userData.username);
      
      // Quickly perform bulk deactivate then activate
      page.once('dialog', async dialog => await dialog.accept());
      await helpers.performBulkOperation('deactivate');
      
      await page.waitForTimeout(1000);
      
      page.once('dialog', async dialog => await dialog.accept());
      await helpers.performBulkOperation('activate');

      // Verify final state
      await helpers.refreshUserList();
      await helpers.searchUsers(userData.username);
      const finalUser = await helpers.getUserFromTable(userData.username);
      expect(finalUser).toBeTruthy();

      // Cleanup
      await helpers.cleanupTestUser(userData.username);
    });
  });

  test.describe('Error Recovery and Resilience', () => {
    test('should recover from API timeouts', async ({ page }) => {
      // Simulate slow API response
      await page.route('**/api/v1/admin/users', route => {
        setTimeout(() => route.continue(), 2000);
      });

      await helpers.refreshUserList();
      
      // Should eventually load or show appropriate error
      await page.waitForTimeout(5000);
      
      // Either success or timeout error should be handled
      const isLoading = await page.locator('.animate-spin').isVisible();
      if (!isLoading) {
        // Loading completed, check for content or error
        const hasContent = await page.locator('tbody tr').count() > 0;
        const hasError = await page.locator('.bg-red-50').isVisible();
        expect(hasContent || hasError).toBe(true);
      }

      // Restore normal routing
      await page.unroute('**/api/v1/admin/users');
    });

    test('should handle form validation errors gracefully', async ({ page }) => {
      await helpers.openCreateUserModal();
      
      // Submit with minimal data to trigger multiple validation errors
      await page.fill('input[type="text"]:first', 'u'); // Very short username
      await page.fill('input[type="email"]', 'invalid-email'); // Invalid email
      await helpers.submitCreateUserForm();

      // Should handle multiple validation errors
      await helpers.waitForErrorMessage();
      
      // Form should remain open and functional
      await expect(page.locator('form h3:has-text("Create New User")')).toBeVisible();
      
      // Should be able to correct errors
      await page.fill('input[type="text"]:first', `corrected_${Date.now()}`);
      await page.fill('input[type="email"]', `corrected_${Date.now()}@example.com`);
      await page.fill('input[type="password"]:first', 'TestPass123!');
      await page.fill('input[type="password"]:nth-of-type(2)', 'EncryptPass456!');
      
      await helpers.submitCreateUserForm();
      await helpers.waitForSuccessMessage();

      // Cleanup
      const correctedUsername = await page.locator('input[type="text"]:first').inputValue();
      await helpers.cleanupTestUser(correctedUsername);
    });

    test('should handle network reconnection', async ({ page }) => {
      // Block all API requests
      await page.route('**/api/**', route => route.abort());
      
      // Attempt operation that should fail
      await helpers.refreshUserList();
      
      await page.waitForTimeout(2000);
      
      // Restore network
      await page.unroute('**/api/**');
      
      // Retry operation - should now succeed
      await helpers.refreshUserList();
      await helpers.waitForLoadingToComplete();
      
      // Interface should be functional again
      await expect(page.locator('h2:has-text("User Management")')).toBeVisible();
      await expect(page.locator('button:has-text("Create User")')).toBeVisible();
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Test tab navigation through interface
      await page.keyboard.press('Tab'); // Focus search
      await expect(page.locator('input[placeholder*="Search users"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Focus filter
      await page.keyboard.press('Tab'); // Focus page size
      await page.keyboard.press('Tab'); // Focus create button
      await expect(page.locator('button:has-text("Create User")')).toBeFocused();
      
      // Test keyboard activation
      await page.keyboard.press('Enter');
      await expect(page.locator('form h3:has-text("Create New User")')).toBeVisible();
      
      // Test escape to close modal
      await page.keyboard.press('Escape');
      await expect(page.locator('form h3:has-text("Create New User")')).not.toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for important ARIA attributes
      const searchInput = page.locator('input[placeholder*="Search users"]');
      const createButton = page.locator('button:has-text("Create User")');
      const table = page.locator('table');
      
      // Basic accessibility checks
      await expect(searchInput).toBeVisible();
      await expect(createButton).toBeVisible();
      await expect(table).toBeVisible();
      
      // Check for proper button labeling
      const dismissButton = page.locator('button[aria-label="Dismiss error"], button[aria-label="Dismiss success message"]');
      if (await dismissButton.count() > 0) {
        expect(await dismissButton.first().getAttribute('aria-label')).toBeTruthy();
      }
    });

    test('should display loading states with proper feedback', async ({ page }) => {
      await helpers.refreshUserList();
      
      // Should show loading spinner immediately
      await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 1000 });
      
      // Should disable refresh button during loading
      const refreshButton = page.locator('button:has-text("Refresh")');
      expect(await refreshButton.isDisabled()).toBe(true);
      
      // Loading should complete
      await helpers.waitForLoadingToComplete();
      await expect(page.locator('.animate-spin')).not.toBeVisible();
      expect(await refreshButton.isDisabled()).toBe(false);
    });
  });

  test.describe('Browser Compatibility', () => {
    test('should handle modal overlays correctly', async ({ page }) => {
      await helpers.openCreateUserModal();
      
      // Modal should be properly positioned
      const modal = page.locator('div.fixed.inset-0');
      await expect(modal).toBeVisible();
      
      // Background should be darkened
      const overlay = page.locator('.bg-black.bg-opacity-50');
      await expect(overlay).toBeVisible();
      
      // Content should be centered
      const modalContent = page.locator('.bg-white.rounded-lg');
      await expect(modalContent).toBeVisible();
      
      // Should be able to close with background click
      await page.locator('.bg-black.bg-opacity-50').click({ position: { x: 10, y: 10 } });
      await expect(page.locator('form h3:has-text("Create New User")')).not.toBeVisible();
    });

    test('should handle form inputs consistently', async ({ page }) => {
      await helpers.openCreateUserModal();
      
      // Test various input methods
      const usernameInput = page.locator('input[type="text"]:first');
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]:first');
      
      // Type normally
      await usernameInput.fill(`browser_test_${Date.now()}`);
      await emailInput.fill(`browser_test_${Date.now()}@example.com`);
      await passwordInput.fill('TestPass123!');
      
      // Verify values are retained
      expect(await usernameInput.inputValue()).toContain('browser_test_');
      expect(await emailInput.inputValue()).toContain('@example.com');
      expect(await passwordInput.inputValue()).toBe('TestPass123!');
      
      await helpers.closeCreateUserModal();
    });

    test('should handle responsive design breakpoints', async ({ page }) => {
      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1024, height: 768 },  // Tablet
        { width: 375, height: 667 }    // Mobile
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        
        // Core elements should remain functional
        await expect(page.locator('h2:has-text("User Management")')).toBeVisible();
        await expect(page.locator('button:has-text("Create User")')).toBeVisible();
        
        // Table should be accessible (may scroll)
        const table = page.locator('table');
        if (await table.isVisible()) {
          await expect(table).toBeVisible();
        }
      }
      
      // Reset to default
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});

// Export helpers for use in other test files
module.exports = { UserManagementTestHelpers };