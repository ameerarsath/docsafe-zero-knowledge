/**
 * Playwright Configuration for AI DocSafe E2E Testing
 * 
 * Configured for testing the zero-knowledge upload and preview flow
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './',
  testMatch: '**/*.spec.js',
  
  // Global test settings
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for expect assertions
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['line']
  ],
  
  // Global test setup
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3007',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Additional context options for testing
    permissions: ['clipboard-read', 'clipboard-write'],
    
    // Slow down operations for better debugging
    actionTimeout: 10000,
    navigationTimeout: 30000
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    }
  ],
  
  // Run your local dev server before starting the tests
  // webServer: [
  //   {
  //     command: 'cd frontend && npm run dev',
  //     port: 3005,
  //     timeout: 120000,
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8002',
  //     port: 8002,
  //     timeout: 120000,
  //     reuseExistingServer: !process.env.CI,
  //   }
  // ],
  
  // Global setup and teardown
  globalSetup: require.resolve('./test-setup.js'),
  globalTeardown: require.resolve('./test-teardown.js'),
});