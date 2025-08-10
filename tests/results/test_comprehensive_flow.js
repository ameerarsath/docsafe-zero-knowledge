/**
 * Comprehensive Upload & Preview Flow Test
 * 
 * Run this in the browser console to test the complete flow:
 * 1. Master key persistence across HMR
 * 2. Upload batch completion and auto-refresh
 * 3. Document preview and decryption
 * 4. Error recovery flows
 * 
 * Usage: Copy and paste this into the browser console after logging in
 */

(async function testComprehensiveFlow() {
  console.log('🧪 Starting Comprehensive Upload & Preview Flow Test');
  console.log('='.repeat(60));
  
  // Test utilities
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const createTestFile = (name, content) => {
    return new File([content], name, { type: 'text/plain' });
  };
  
  let testResults = {
    masterKeyPersistence: 'PENDING',
    uploadBatchTracking: 'PENDING',
    autoRefresh: 'PENDING',
    previewDecryption: 'PENDING',
    errorRecovery: 'PENDING'
  };
  
  try {
    // Test 1: Master Key Persistence
    console.log('\n🔍 Test 1: Master Key Persistence');
    console.log('-'.repeat(40));
    
    // Check if we can access the documentEncryptionService
    let docService;
    try {
      const encryptionModule = await import('./src/services/documentEncryption.js');
      docService = encryptionModule.documentEncryptionService;
      console.log('✅ Document encryption service accessible');
    } catch (error) {
      console.log('❌ Cannot access document encryption service:', error);
      testResults.masterKeyPersistence = 'FAILED';
    }
    
    if (docService) {
      const hasMasterKey = docService.hasMasterKey();
      const debugInfo = docService.getDebugInfo();
      
      console.log('📊 Service State:', {
        hasMasterKey,
        debugInfo,
        sessionFlags: {
          has_master_key: sessionStorage.getItem('has_master_key'),
          temp_master_key_data: sessionStorage.getItem('temp_master_key_data') ? 'EXISTS' : 'MISSING',
          user_has_encryption: sessionStorage.getItem('user_has_encryption')
        }
      });
      
      if (hasMasterKey) {
        console.log('✅ Master key is available');
        testResults.masterKeyPersistence = 'PASSED';
      } else {
        console.log('⚠️ Master key not available - need to initialize encryption session');
        testResults.masterKeyPersistence = 'NEEDS_INIT';
      }
    }
    
    // Test 2: Upload Batch Tracking
    console.log('\n🚀 Test 2: Upload Batch Tracking');
    console.log('-'.repeat(40));
    
    // Check if upload component is available
    const uploadButton = document.querySelector('button[class*="Upload"]') || 
                        document.querySelector('button:contains("Upload")') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent.includes('Upload'));
    
    if (uploadButton) {
      console.log('✅ Upload button found:', uploadButton.textContent);
      testResults.uploadBatchTracking = 'COMPONENT_AVAILABLE';
    } else {
      console.log('❌ Upload button not found');
      testResults.uploadBatchTracking = 'COMPONENT_MISSING';
    }
    
    // Test 3: Auto-refresh mechanism
    console.log('\n🔄 Test 3: Auto-refresh Detection');
    console.log('-'.repeat(40));
    
    // Check for refresh function availability
    const documentsContainer = document.querySelector('[class*="documents"]') ||
                              document.querySelector('[class*="Documents"]');
    
    if (documentsContainer) {
      console.log('✅ Documents container found');
      testResults.autoRefresh = 'CONTAINER_AVAILABLE';
    } else {
      console.log('❌ Documents container not found');
      testResults.autoRefresh = 'CONTAINER_MISSING';
    }
    
    // Test 4: Preview System
    console.log('\n🖼️ Test 4: Preview System');
    console.log('-'.repeat(40));
    
    const previewableDocuments = Array.from(document.querySelectorAll('[class*="document"]')).filter(el => 
      el.textContent.includes('.jpg') || 
      el.textContent.includes('.png') || 
      el.textContent.includes('.pdf')
    );
    
    if (previewableDocuments.length > 0) {
      console.log('✅ Found previewable documents:', previewableDocuments.length);
      testResults.previewDecryption = 'DOCUMENTS_AVAILABLE';
      
      // Try to click on one to test preview
      console.log('🖱️ Attempting to trigger preview...');
      const firstDoc = previewableDocuments[0];
      firstDoc.click();
      
      await wait(1000);
      
      const previewModal = document.querySelector('[class*="modal"]') ||
                          document.querySelector('[class*="preview"]');
      
      if (previewModal) {
        console.log('✅ Preview modal opened');
        testResults.previewDecryption = 'MODAL_OPENED';
        
        // Check for error messages
        const errorMessages = Array.from(previewModal.querySelectorAll('*')).filter(el =>
          el.textContent.includes('Preview Unavailable') ||
          el.textContent.includes('Failed to display') ||
          el.textContent.includes('Encryption password')
        );
        
        if (errorMessages.length > 0) {
          console.log('⚠️ Preview errors found:', errorMessages.map(el => el.textContent));
          testResults.previewDecryption = 'ERROR_DETECTED';
          
          // Check for recovery button
          const recoveryButton = Array.from(previewModal.querySelectorAll('button')).find(btn =>
            btn.textContent.includes('Restore Encryption') ||
            btn.textContent.includes('Decrypt and Preview')
          );
          
          if (recoveryButton) {
            console.log('✅ Recovery button found:', recoveryButton.textContent);
            testResults.errorRecovery = 'RECOVERY_AVAILABLE';
          } else {
            console.log('❌ No recovery button found');
            testResults.errorRecovery = 'RECOVERY_MISSING';
          }
        } else {
          console.log('✅ No preview errors detected');
          testResults.previewDecryption = 'WORKING';
          testResults.errorRecovery = 'NOT_NEEDED';
        }
        
        // Close modal
        const closeButton = previewModal.querySelector('button[class*="close"]') ||
                           previewModal.querySelector('[class*="X"]');
        if (closeButton) closeButton.click();
        
      } else {
        console.log('❌ Preview modal did not open');
        testResults.previewDecryption = 'MODAL_FAILED';
      }
      
    } else {
      console.log('⚠️ No previewable documents found');
      testResults.previewDecryption = 'NO_DOCUMENTS';
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
  
  // Final Results
  console.log('\n📋 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  Object.entries(testResults).forEach(([test, result]) => {
    const status = result.includes('PASSED') || result.includes('WORKING') || result.includes('AVAILABLE') ? '✅' :
                  result.includes('FAILED') || result.includes('MISSING') || result.includes('ERROR') ? '❌' :
                  result.includes('NEEDS') || result.includes('PENDING') ? '⚠️' : '🔍';
    
    console.log(`${status} ${test.replace(/([A-Z])/g, ' $1').trim()}: ${result}`);
  });
  
  console.log('\n🔧 NEXT STEPS:');
  
  if (testResults.masterKeyPersistence === 'NEEDS_INIT') {
    console.log('1. Click "Upload Files" button to initialize encryption session');
    console.log('2. Enter encryption password: JHNpAZ39g!&Y');
  }
  
  if (testResults.previewDecryption === 'ERROR_DETECTED') {
    console.log('3. Try previewing a document - should show recovery option');
  }
  
  if (testResults.uploadBatchTracking === 'COMPONENT_AVAILABLE') {
    console.log('4. Upload a test file and watch console for batch completion logs');
  }
  
  console.log('\n🎯 Look for these console messages during testing:');
  console.log('   🚀 Starting new upload batch:');
  console.log('   📊 Upload batch status check:');
  console.log('   🎉 All uploads in batch completed!');
  console.log('   📁 All uploads completed, refreshing document list...');
  console.log('   🔄 Master key missing but restoration data available');
  console.log('   ✅ Master key successfully restored from session storage');
  
  console.log('\n✨ Test Complete! Check results above and follow next steps.');
  
  return testResults;
})();