/**
 * Global Playwright Test Teardown
 * Runs after all tests complete
 */

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');

  // Add any global cleanup here
  // For example: cleaning up test data, stopping services, etc.

  console.log('✅ Test environment cleanup complete');
};