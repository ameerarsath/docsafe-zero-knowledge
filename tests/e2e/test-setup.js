/**
 * Global Test Setup for Playwright
 * 
 * Prepares the test environment before running tests
 */

const fs = require('fs');
const path = require('path');

async function globalSetup() {
  console.log('🔧 Setting up test environment...');
  
  // Create test fixtures directory
  const fixturesDir = path.join(__dirname, 'test-fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
    console.log('📁 Created test-fixtures directory');
  }
  
  // Create test document file
  const testDocPath = path.join(fixturesDir, 'test-document.txt');
  const testDocContent = `This is a test document for upload and preview testing.
Created at: ${new Date().toISOString()}
File size: Small test file for validation
Content: Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;
  
  fs.writeFileSync(testDocPath, testDocContent);
  console.log('📄 Created test-document.txt');
  
  // Create test image file (1x1 PNG)
  const testImagePath = path.join(fixturesDir, 'test-image.png');
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(testImagePath, pngBuffer);
  console.log('🖼️ Created test-image.png');
  
  // Create larger test file for batch testing
  const testLargeDocPath = path.join(fixturesDir, 'test-large-document.txt');
  const largeContent = 'Large test file content.\n'.repeat(1000); // ~25KB file
  fs.writeFileSync(testLargeDocPath, largeContent);
  console.log('📄 Created test-large-document.txt');
  
  // Create PDF-like test file
  const testPdfPath = path.join(fixturesDir, 'test-document.pdf');
  const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n196\n%%EOF';
  fs.writeFileSync(testPdfPath, pdfContent);
  console.log('📄 Created test-document.pdf');
  
  console.log('✅ Test environment setup complete');
  
  // Wait for services to be ready
  console.log('⏳ Waiting for services to start...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  return async () => {
    console.log('🧹 Test environment cleanup...');
  };
}

module.exports = globalSetup;