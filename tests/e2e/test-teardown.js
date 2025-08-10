/**
 * Global Test Teardown for Playwright
 * 
 * Cleans up test environment after running tests
 */

const fs = require('fs');
const path = require('path');

async function globalTeardown() {
  console.log('🧹 Starting test environment cleanup...');
  
  // Optional: Clean up test fixtures (keep for debugging by default)
  const keepFixtures = process.env.KEEP_TEST_FIXTURES !== 'false';
  
  if (!keepFixtures) {
    const fixturesDir = path.join(__dirname, 'test-fixtures');
    if (fs.existsSync(fixturesDir)) {
      fs.rmSync(fixturesDir, { recursive: true, force: true });
      console.log('🗑️ Removed test-fixtures directory');
    }
  } else {
    console.log('📁 Keeping test-fixtures directory for debugging');
  }
  
  // Generate test summary
  const testResultsPath = path.join(__dirname, 'test-results.json');
  if (fs.existsSync(testResultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
      console.log('📊 Test Results Summary:');
      console.log(`   Total Tests: ${results.stats?.total || 'N/A'}`);
      console.log(`   Passed: ${results.stats?.passed || 'N/A'}`);
      console.log(`   Failed: ${results.stats?.failed || 'N/A'}`);
      console.log(`   Duration: ${results.stats?.duration || 'N/A'}ms`);
    } catch (error) {
      console.log('⚠️ Could not parse test results');
    }
  }
  
  console.log('✅ Test environment cleanup complete');
}

module.exports = globalTeardown;