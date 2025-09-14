/**
 * Test Runner for Admin User Management E2E Tests
 * 
 * Provides:
 * - Organized test execution
 * - Test reporting and results
 * - Environment setup and teardown
 * - Test data management
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test Configuration
const TEST_CONFIG = {
  testFiles: [
    'admin-user-management.spec.js',
    'admin-user-management-advanced.spec.js', 
    'admin-user-roles-permissions.spec.js'
  ],
  browsers: ['chromium'], // Can be expanded to ['chromium', 'firefox', 'webkit']
  workers: 1, // Run tests sequentially for better stability
  retries: 2,
  timeout: 60000,
  outputDir: path.join(__dirname, '..', 'results', 'user-management'),
  screenshotDir: path.join(__dirname, '..', 'screenshots', 'user-management')
};

// Ensure output directories exist
function ensureDirectories() {
  const dirs = [TEST_CONFIG.outputDir, TEST_CONFIG.screenshotDir];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Run specific test suite
async function runTestSuite(testFile, options = {}) {
  return new Promise((resolve, reject) => {
    const testPath = path.join(__dirname, testFile);
    
    const playwrightArgs = [
      `--config=${path.join(__dirname, '..', 'playwright.config.js')}`,
      `--project=${options.browser || 'chromium'}`,
      `--workers=${options.workers || TEST_CONFIG.workers}`,
      `--retries=${options.retries || TEST_CONFIG.retries}`,
      `--timeout=${options.timeout || TEST_CONFIG.timeout}`,
      testPath
    ];

    if (options.headed) {
      playwrightArgs.push('--headed');
    }

    if (options.debug) {
      playwrightArgs.push('--debug');
    }

    if (options.reporter) {
      playwrightArgs.push(`--reporter=${options.reporter}`);
    }

    const command = `npx playwright test ${playwrightArgs.join(' ')}`;
    
    console.log(`\n🔄 Running: ${testFile}`);
    console.log(`Command: ${command}\n`);

    const process = exec(command, { 
      cwd: path.join(__dirname, '..', '..'),
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      const message = data.toString();
      console.log(message);
      output += message;
    });

    process.stderr.on('data', (data) => {
      const message = data.toString();
      console.error(message);
      errorOutput += message;
    });

    process.on('close', (code) => {
      const result = {
        testFile,
        exitCode: code,
        output,
        errorOutput,
        success: code === 0,
        timestamp: new Date().toISOString()
      };

      if (code === 0) {
        console.log(`✅ ${testFile} completed successfully`);
      } else {
        console.log(`❌ ${testFile} failed with exit code ${code}`);
      }

      resolve(result);
    });

    process.on('error', (error) => {
      console.error(`❌ Failed to run ${testFile}:`, error);
      reject(error);
    });
  });
}

// Run all test suites
async function runAllTests(options = {}) {
  console.log('🚀 Starting Admin User Management E2E Tests');
  console.log(`📊 Test files: ${TEST_CONFIG.testFiles.length}`);
  console.log(`🌐 Browsers: ${options.browsers || TEST_CONFIG.browsers}`);
  console.log(`👥 Workers: ${options.workers || TEST_CONFIG.workers}`);
  console.log(`🔄 Retries: ${options.retries || TEST_CONFIG.retries}\n`);

  ensureDirectories();

  const results = [];
  const startTime = Date.now();

  for (const testFile of TEST_CONFIG.testFiles) {
    try {
      const result = await runTestSuite(testFile, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to run ${testFile}:`, error);
      results.push({
        testFile,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Generate summary report
  const summary = {
    totalTests: results.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    duration,
    timestamp: new Date().toISOString(),
    results
  };

  console.log('\n📋 Test Summary:');
  console.log(`Total: ${summary.totalTests}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);

  // Save detailed report
  const reportPath = path.join(TEST_CONFIG.outputDir, 'test-summary.json');
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);

  return summary;
}

// Run specific test categories
async function runTestCategory(category, options = {}) {
  const categoryTests = {
    basic: ['admin-user-management.spec.js'],
    advanced: ['admin-user-management-advanced.spec.js'],
    permissions: ['admin-user-roles-permissions.spec.js'],
    all: TEST_CONFIG.testFiles
  };

  const testFiles = categoryTests[category] || categoryTests.all;
  
  console.log(`🎯 Running ${category} tests: ${testFiles.join(', ')}`);

  const results = [];
  
  for (const testFile of testFiles) {
    try {
      const result = await runTestSuite(testFile, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to run ${testFile}:`, error);
      results.push({
        testFile,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

// Generate HTML report
function generateHTMLReport(summary) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Management E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .metric { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .metric.passed { border-color: #4CAF50; }
        .metric.failed { border-color: #f44336; }
        .results { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .test-result.passed { background: #e8f5e8; border-left: 4px solid #4CAF50; }
        .test-result.failed { background: #ffeaea; border-left: 4px solid #f44336; }
        .timestamp { color: #666; font-size: 0.9em; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>User Management E2E Test Report</h1>
        <p class="timestamp">Generated: ${summary.timestamp}</p>
        <p>Duration: ${Math.round(summary.duration / 1000)}s</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.totalTests}</div>
        </div>
        <div class="metric passed">
            <h3>Passed</h3>
            <div style="font-size: 2em; font-weight: bold; color: #4CAF50;">${summary.passed}</div>
        </div>
        <div class="metric failed">
            <h3>Failed</h3>
            <div style="font-size: 2em; font-weight: bold; color: #f44336;">${summary.failed}</div>
        </div>
    </div>

    <div class="results">
        <h2>Test Results</h2>
        ${summary.results.map(result => `
            <div class="test-result ${result.success ? 'passed' : 'failed'}">
                <h3>${result.testFile}</h3>
                <p><strong>Status:</strong> ${result.success ? '✅ Passed' : '❌ Failed'}</p>
                <p><strong>Exit Code:</strong> ${result.exitCode || 'N/A'}</p>
                <p class="timestamp"><strong>Timestamp:</strong> ${result.timestamp}</p>
                ${result.errorOutput ? `
                    <details>
                        <summary>Error Output</summary>
                        <pre>${result.errorOutput}</pre>
                    </details>
                ` : ''}
                ${result.output ? `
                    <details>
                        <summary>Full Output</summary>
                        <pre>${result.output}</pre>
                    </details>
                ` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;

  const reportPath = path.join(TEST_CONFIG.outputDir, 'test-report.html');
  fs.writeFileSync(reportPath, html);
  console.log(`📊 HTML report generated: ${reportPath}`);
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    headed: args.includes('--headed'),
    debug: args.includes('--debug'),
    workers: args.includes('--workers') ? parseInt(args[args.indexOf('--workers') + 1]) : undefined,
    retries: args.includes('--retries') ? parseInt(args[args.indexOf('--retries') + 1]) : undefined,
    browser: args.includes('--browser') ? args[args.indexOf('--browser') + 1] : undefined,
    category: args.includes('--category') ? args[args.indexOf('--category') + 1] : 'all'
  };

  try {
    let results;
    
    if (options.category && options.category !== 'all') {
      results = await runTestCategory(options.category, options);
      
      // Create summary for category results
      const summary = {
        totalTests: results.length,
        passed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        duration: results.reduce((sum, r) => sum + (r.duration || 0), 0),
        timestamp: new Date().toISOString(),
        results
      };
      
      generateHTMLReport(summary);
    } else {
      const summary = await runAllTests(options);
      generateHTMLReport(summary);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Usage examples in comments
/*
Usage:
  node run-user-management-tests.js                           # Run all tests
  node run-user-management-tests.js --headed                  # Run with browser visible  
  node run-user-management-tests.js --debug                   # Run in debug mode
  node run-user-management-tests.js --category basic          # Run only basic tests
  node run-user-management-tests.js --category advanced       # Run only advanced tests
  node run-user-management-tests.js --category permissions    # Run only permission tests
  node run-user-management-tests.js --browser firefox         # Run with specific browser
  node run-user-management-tests.js --workers 2               # Use 2 workers
  node run-user-management-tests.js --retries 1               # Retry failed tests once
*/

if (require.main === module) {
  main();
}

module.exports = {
  runAllTests,
  runTestSuite,
  runTestCategory,
  generateHTMLReport,
  TEST_CONFIG
};