#!/usr/bin/env node
/**
 * Test script to verify document preview and share fixes
 * Run this after starting the backend server
 */

const axios = require('axios');

const API_URL = 'http://localhost:8002';
const TEST_USER = {
  username: 'testuser',
  password: 'Test123!@#',
  email: 'test@example.com'
};

let accessToken = null;
let testDocumentId = null;

// Helper function to login
async function login() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: TEST_USER.username,
      password: TEST_USER.password
    });
    accessToken = response.data.access_token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 1: Document Preview with Encryption Password
async function testDocumentPreview() {
  console.log('\n🧪 Test 1: Document Preview with Encryption');
  
  try {
    // This test assumes you have a document ID 1 that is encrypted
    // In a real test, you'd first upload an encrypted document
    const testDocId = 1; // Replace with actual document ID
    const encryptionPassword = 'userPassword123'; // Replace with actual password
    
    const response = await axios.post(
      `${API_URL}/api/v1/documents/${testDocId}/preview/encrypted?preview_type=auto`,
      { password: encryptionPassword }, // ✅ Fixed: Send as object
      {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Document preview successful:', {
      type: response.data.type,
      hasPreview: !!response.data.preview,
      documentName: response.data.document_name
    });
    return true;
  } catch (error) {
    console.error('❌ Document preview failed:', error.response?.data || error.message);
    return false;
  }
}

// Test 2: Create Document Share
async function testCreateShare() {
  console.log('\n🧪 Test 2: Create Document Share');
  
  try {
    // This test assumes you have a document ID 1 to share
    // In a real test, you'd first upload a document
    const testDocId = 1; // Replace with actual document ID
    
    const shareData = {
      share_name: 'Test Share',
      share_type: 'external',
      allow_download: true,
      allow_preview: true,
      allow_comment: false,
      require_password: false,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    };
    
    const response = await axios.post(
      `${API_URL}/api/v1/shares/?document_id=${testDocId}`,
      shareData, // ✅ Fixed: Send correct format
      {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Share created successfully:', {
      shareToken: response.data.share.shareToken,
      shareName: response.data.share.shareName,
      shareUrl: response.data.shareUrl
    });
    return true;
  } catch (error) {
    console.error('❌ Share creation failed:', error.response?.data || error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting SecureVault Fix Verification Tests\n');
  console.log('API URL:', API_URL);
  console.log('Test User:', TEST_USER.username);
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ Tests aborted: Login failed');
    process.exit(1);
  }
  
  // Run tests
  const results = {
    preview: await testDocumentPreview(),
    share: await testCreateShare()
  };
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`Document Preview: ${results.preview ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Document Share:   ${results.share ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(50));
  
  const allPassed = Object.values(results).every(r => r === true);
  if (allPassed) {
    console.log('\n🎉 All tests PASSED! The fixes are working correctly.');
  } else {
    console.log('\n⚠️ Some tests FAILED. Please review the errors above.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
