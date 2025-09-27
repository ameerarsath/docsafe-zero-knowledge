#!/usr/bin/env node

/**
 * DOCX Preview Fix Verification Script
 *
 * This script verifies that the DOCX preview fix has been properly implemented
 * by checking for the presence of required files and dependencies.
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function checkFile(filePath, required = true) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    log(`✅ ${filePath}`, COLORS.green);
    return true;
  } else {
    log(`${required ? '❌' : '⚠️'} ${filePath} ${required ? '(REQUIRED)' : '(Optional)'}`, required ? COLORS.red : COLORS.yellow);
    return false;
  }
}

function checkFileContent(filePath, searchString, description) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    log(`❌ ${description}: File ${filePath} not found`, COLORS.red);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const found = content.includes(searchString);

  if (found) {
    log(`✅ ${description}`, COLORS.green);
    return true;
  } else {
    log(`❌ ${description}: "${searchString}" not found in ${filePath}`, COLORS.red);
    return false;
  }
}

function checkPackageJson() {
  const packagePath = path.join(__dirname, 'frontend/package.json');

  if (!fs.existsSync(packagePath)) {
    log('❌ frontend/package.json not found', COLORS.red);
    return false;
  }

  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const dependencies = { ...packageContent.dependencies, ...packageContent.devDependencies };

  const requiredDeps = ['mammoth', 'docx-preview', 'jszip'];
  let allFound = true;

  log('\n📦 Checking Dependencies:', COLORS.blue);

  for (const dep of requiredDeps) {
    if (dependencies[dep]) {
      log(`✅ ${dep}: ${dependencies[dep]}`, COLORS.green);
    } else {
      log(`❌ ${dep}: Not found`, COLORS.red);
      allFound = false;
    }
  }

  return allFound;
}

function main() {
  log(`${COLORS.bold}🔧 DOCX Preview Fix Verification${COLORS.reset}\n`);

  let totalChecks = 0;
  let passedChecks = 0;

  // Check for new files
  log('📁 Checking New Files:', COLORS.blue);
  const newFiles = [
    'frontend/src/services/documentPreview/plugins/robustDocxPlugin.ts',
    'frontend/src/styles/docx-preview.css',
    'test-docx-fix.html',
    'DOCX_PREVIEW_FIX_SUMMARY.md'
  ];

  for (const file of newFiles) {
    totalChecks++;
    if (checkFile(file)) passedChecks++;
  }

  // Check modified files
  log('\n📝 Checking File Modifications:', COLORS.blue);

  totalChecks++;
  if (checkFileContent(
    'frontend/src/services/documentPreview/index.ts',
    'RobustDocxPlugin',
    'RobustDocxPlugin import'
  )) passedChecks++;

  totalChecks++;
  if (checkFileContent(
    'frontend/src/services/documentPreview/index.ts',
    'new RobustDocxPlugin()',
    'RobustDocxPlugin registration'
  )) passedChecks++;

  totalChecks++;
  if (checkFileContent(
    'frontend/src/components/documents/DocumentPreview.tsx',
    'docx-preview.css',
    'DOCX CSS import'
  )) passedChecks++;

  // Check dependencies
  totalChecks++;
  if (checkPackageJson()) passedChecks++;

  // Final results
  log(`\n📊 Verification Results:`, COLORS.blue);

  const percentage = Math.round((passedChecks / totalChecks) * 100);
  const statusColor = percentage === 100 ? COLORS.green : percentage >= 80 ? COLORS.yellow : COLORS.red;
  const statusIcon = percentage === 100 ? '🟢' : percentage >= 80 ? '🟡' : '🔴';

  log(`${statusIcon} ${passedChecks}/${totalChecks} checks passed (${percentage}%)`, statusColor);

  if (percentage === 100) {
    log(`\n🎉 All checks passed! DOCX preview fix is properly installed.`, COLORS.green);
    log(`\nNext steps:`, COLORS.blue);
    log(`1. Start your development server: cd frontend && npm run dev`);
    log(`2. Upload a .docx file to test the preview`);
    log(`3. Open test-docx-fix.html in browser for additional testing`);
  } else {
    log(`\n⚠️ Some checks failed. Please review the issues above.`, COLORS.yellow);

    if (passedChecks >= totalChecks * 0.8) {
      log(`The fix may still work, but some components are missing.`, COLORS.yellow);
    } else {
      log(`Significant issues detected. Please review the implementation.`, COLORS.red);
    }
  }

  return percentage === 100;
}

// Run verification
if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main, checkFile, checkFileContent, checkPackageJson };