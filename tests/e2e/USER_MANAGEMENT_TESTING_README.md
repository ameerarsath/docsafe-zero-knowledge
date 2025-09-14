# User Management E2E Testing Suite

## Overview

This comprehensive Playwright end-to-end testing suite provides thorough coverage of the Admin User Management functionality in the SecureVault application. The test suite validates all aspects of user management including CRUD operations, validation, bulk operations, search/filtering, pagination, role management, and zero-knowledge security features.

## Test Coverage

### 🎯 Core Functionality Tests
- **User CRUD Operations**: Create, read, update, delete users
- **Field Validation**: Username/email uniqueness, password requirements
- **Search & Filtering**: User search by username/email, status filtering
- **Pagination**: Page navigation, page size selection
- **Bulk Operations**: Select all, bulk activate/deactivate, password reset
- **User Activity**: Activity monitoring and statistics

### 🔒 Security & Authentication Tests  
- **Admin Authentication**: Access control and authorization
- **Zero-Knowledge Encryption**: Encryption password validation
- **Field-Specific Errors**: Unique constraint violations
- **Error Handling**: Network errors, validation failures

### 🚀 Advanced Scenarios
- **Performance Testing**: Rapid operations, large datasets
- **Edge Cases**: Special characters, boundary conditions
- **Error Recovery**: Network failures, API timeouts
- **Concurrency**: Simultaneous operations
- **Data Integrity**: Consistency across operations

### 👥 Role & Permission Tests
- **Role Assignment**: User role management
- **Permission Matrix**: Permission-based access control
- **Role Hierarchy**: Inheritance and override testing  
- **Access Control**: UI visibility based on roles

## Test Files Structure

```
tests/e2e/
├── admin-user-management.spec.js           # Core functionality tests
├── admin-user-management-advanced.spec.js  # Advanced scenarios & edge cases
├── admin-user-roles-permissions.spec.js    # Role & permission testing
├── admin-user-management-config.js         # Configuration & utilities
├── run-user-management-tests.js            # Test runner & reporting
└── USER_MANAGEMENT_TESTING_README.md       # This documentation
```

## Quick Start

### Prerequisites
- Node.js 16+ installed
- Playwright installed (`npm install @playwright/test`)
- Frontend running on `http://localhost:3005`
- Backend running on `http://localhost:8002`
- Admin user credentials configured (default: `rahumana` / `TestPass123@`)

### Running Tests

#### Basic Test Execution
```bash
# Run all user management tests
node tests/e2e/run-user-management-tests.js

# Run with browser visible (headed mode)
node tests/e2e/run-user-management-tests.js --headed

# Run in debug mode
node tests/e2e/run-user-management-tests.js --debug
```

#### Category-Specific Testing
```bash
# Run only core functionality tests
node tests/e2e/run-user-management-tests.js --category basic

# Run advanced scenario tests
node tests/e2e/run-user-management-tests.js --category advanced

# Run role & permission tests
node tests/e2e/run-user-management-tests.js --category permissions
```

#### Direct Playwright Execution
```bash
# Run specific test file
npx playwright test tests/e2e/admin-user-management.spec.js

# Run with specific browser
npx playwright test --project=firefox tests/e2e/admin-user-management.spec.js

# Run single test by name
npx playwright test --grep "should create a new user successfully"
```

## Test Configuration

### Environment Variables
```bash
# Test environment configuration
FRONTEND_URL=http://localhost:3005       # Frontend application URL
BACKEND_URL=http://localhost:8002        # Backend API URL
TEST_ADMIN_USERNAME=rahumana             # Admin username for testing
TEST_ADMIN_PASSWORD=TestPass123@         # Admin password for testing
TEST_ENCRYPTION_PASSWORD=JHNpAZ39g!&Y    # Default encryption password
```

### Test Data Configuration
```javascript
// Modify test-specific settings in admin-user-management-config.js
const TEST_CONFIG = {
  TIMEOUTS: {
    DEFAULT: 10000,    # Standard operation timeout
    LOADING: 30000,    # Loading/network timeout  
    MESSAGE: 15000     # Success/error message timeout
  },
  LIMITS: {
    MAX_USERNAME_LENGTH: 150,
    MAX_EMAIL_LENGTH: 254,
    MIN_PASSWORD_LENGTH: 8
  }
};
```

## Test Helper Classes

### UserManagementTestHelpers
Comprehensive helper class providing methods for:
- Authentication and navigation
- User creation and management
- Search and filtering operations  
- Bulk operations
- Message handling
- Data cleanup

```javascript
const helpers = new UserManagementTestHelpers(page);
await helpers.loginAsAdmin();
await helpers.navigateToUserManagement();
await helpers.createUser(userData);
```

### TestDataGenerator
Utility class for generating test data:
- Unique usernames and emails
- Valid/invalid passwords
- Bulk user data sets
- Edge case scenarios

```javascript
const userData = TestDataGenerator.generateUserData();
const bulkUsers = TestDataGenerator.generateBulkUserData(5);
```

## Key Test Scenarios

### 1. User CRUD Operations
```javascript
test('should create a new user successfully', async ({ page }) => {
  const userData = TestDataGenerator.generateUserData();
  
  await helpers.openCreateUserModal();
  await helpers.fillCreateUserForm(userData);
  await helpers.submitCreateUserForm();
  
  await helpers.waitForSuccessMessage();
  const successMessage = await helpers.getSuccessMessage();
  expect(successMessage).toContain('created successfully');
  
  // Verify user in table
  await helpers.searchUsers(userData.username);
  const user = await helpers.getUserFromTable(userData.username);
  expect(user.username).toBe(userData.username);
  
  await helpers.cleanupTestUser(userData.username);
});
```

### 2. Field-Specific Validation
```javascript
test('should show field-specific validation errors for duplicate username', async ({ page }) => {
  // Create first user
  await helpers.createUser(userData1);
  
  // Try to create user with same username
  const userData2 = { ...userData1, email: generateUniqueEmail() };
  await helpers.openCreateUserModal();
  await helpers.fillCreateUserForm(userData2);
  await helpers.submitCreateUserForm();
  
  // Check for field-specific error
  const usernameField = page.locator('input[type="text"]:first');
  await expect(usernameField).toHaveClass(/border-red-300/);
  
  const fieldError = page.locator('form p.text-red-600:has-text("username")');
  await expect(fieldError).toBeVisible();
});
```

### 3. Bulk Operations
```javascript
test('should perform bulk activate operation', async ({ page }) => {
  await helpers.selectAllUsers();
  
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('activate');
    await dialog.accept();
  });
  
  await helpers.performBulkOperation('activate');
  await helpers.waitForSuccessMessage();
  
  const successMessage = await helpers.getSuccessMessage();
  expect(successMessage).toContain('Successfully activate');
});
```

### 4. Zero-Knowledge Security
```javascript
test('should validate encryption password is different from login password', async ({ page }) => {
  const userData = {
    username: generateUniqueUsername(),
    email: generateUniqueEmail(),
    loginPassword: 'SamePassword123!',
    encryptionPassword: 'SamePassword123!' // Same as login
  };

  await helpers.createUser(userData);
  
  await helpers.waitForErrorMessage();
  const errorMessage = await helpers.getErrorMessage();
  expect(errorMessage).toContain('different');
  expect(errorMessage).toContain('security');
});
```

## Test Reporting

### Automated Reports
The test runner generates comprehensive reports:
- **JSON Report**: `tests/results/user-management/test-summary.json`
- **HTML Report**: `tests/results/user-management/test-report.html`  
- **Screenshots**: `tests/screenshots/user-management/`

### Report Contents
- Test execution summary (passed/failed/duration)
- Detailed results per test file
- Error outputs and stack traces
- Performance metrics
- Screenshot captures on failures

### Viewing Reports
```bash
# View HTML report in browser
open tests/results/user-management/test-report.html

# View JSON summary
cat tests/results/user-management/test-summary.json | jq
```

## Best Practices

### Test Data Management
- Always use unique test data (timestamps + random)
- Clean up test data after each test
- Use realistic but safe test data
- Avoid hardcoded values that may conflict

### Error Handling
- Test both success and failure scenarios  
- Validate specific error messages
- Test field-specific validation errors
- Handle network failures gracefully

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Keep tests independent and isolated
- Use beforeEach/afterEach for setup/cleanup

### Performance Considerations
- Run tests sequentially to avoid conflicts
- Use retries for flaky network operations
- Implement proper wait conditions
- Clean up test data to prevent accumulation

## Troubleshooting

### Common Issues

#### Test Failures Due to Timing
```javascript
// Bad: Hard delays
await page.waitForTimeout(5000);

// Good: Wait for specific conditions
await helpers.waitForLoadingToComplete();
await helpers.waitForSuccessMessage();
```

#### Test Data Conflicts
```javascript
// Always use unique data
const userData = TestDataGenerator.generateUserData();

// Clean up after tests
await helpers.cleanupTestUser(userData.username);
```

#### Modal/Dialog Issues
```javascript
// Handle confirmation dialogs
page.once('dialog', async dialog => {
  if (dialog.type() === 'confirm') {
    await dialog.accept();
  }
});
```

### Debug Mode
```bash
# Run in debug mode for step-by-step execution
node tests/e2e/run-user-management-tests.js --debug

# Run with browser visible
node tests/e2e/run-user-management-tests.js --headed

# Run single test with debug
npx playwright test --debug --grep "specific test name"
```

### Log Analysis
```bash
# Check backend logs for API errors
cd backend && tail -f logs/app.log

# Check frontend console for JavaScript errors
# Browser DevTools > Console tab during test execution
```

## Extending the Test Suite

### Adding New Test Cases
1. Add test to appropriate spec file
2. Use existing helper methods
3. Follow naming conventions
4. Include proper cleanup
5. Update documentation

### Adding New Helper Methods
1. Add to `UserManagementTestHelpers` class
2. Make methods async and handle errors
3. Include JSDoc comments
4. Test helper methods independently

### Adding New Test Categories
1. Create new spec file following naming convention
2. Update `run-user-management-tests.js` categories
3. Add to README documentation
4. Include in CI/CD pipeline

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run User Management E2E Tests
  run: |
    npm install
    npx playwright install
    node tests/e2e/run-user-management-tests.js --category all
  env:
    FRONTEND_URL: http://localhost:3005
    BACKEND_URL: http://localhost:8002
```

### Jenkins Pipeline
```groovy
stage('User Management E2E Tests') {
    steps {
        sh 'npm install'
        sh 'npx playwright install'
        sh 'node tests/e2e/run-user-management-tests.js'
    }
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'tests/results/user-management',
                reportFiles: 'test-report.html',
                reportName: 'User Management E2E Test Report'
            ])
        }
    }
}
```

## Contributing

### Code Style
- Use async/await for asynchronous operations
- Follow existing naming conventions
- Include comprehensive error handling
- Add JSDoc comments for public methods

### Pull Request Requirements
- All tests must pass
- New tests for new functionality
- Update documentation for changes
- Include test data cleanup

### Review Checklist
- [ ] Tests are independent and isolated
- [ ] Proper error handling implemented
- [ ] Test data is cleaned up
- [ ] Documentation updated
- [ ] CI/CD integration works
- [ ] Performance impact considered

## Support

For issues with the test suite:
1. Check this documentation
2. Review existing test patterns
3. Check GitHub issues
4. Contact the testing team

## Changelog

### v1.0.0 - Initial Release
- Core user management test coverage
- Advanced scenario testing
- Role and permission validation
- Comprehensive test utilities
- Automated reporting system
- Full documentation