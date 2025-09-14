/**
 * Debug Role Listing Bug
 * 
 * This script will help identify why created roles are not appearing in the list
 */

async function debugRoleListingBug() {
  console.log('🔍 Debugging Role Listing Bug...');
  
  const baseUrl = 'http://localhost:8002';
  
  try {
    // Step 1: Check direct database query
    console.log('\n1. Checking roles directly from RBAC health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/v1/rbac/health`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`   Total roles in database: ${healthData.roles}`);
      console.log(`   Total permissions: ${healthData.permissions}`);
    } else {
      console.log('   ❌ Could not check RBAC health');
    }
    
    // Step 2: Test role listing with different parameters
    console.log('\n2. Testing role listing endpoint variations...');
    
    const listingTests = [
      { name: 'Default listing', url: '/api/v1/rbac/roles' },
      { name: 'With stats', url: '/api/v1/rbac/roles?include_stats=true' },
      { name: 'Show all (including inactive)', url: '/api/v1/rbac/roles?active_only=false' },
      { name: 'Large page size', url: '/api/v1/rbac/roles?size=50' },
      { name: 'Different page', url: '/api/v1/rbac/roles?page=1&size=10' }
    ];
    
    for (const test of listingTests) {
      try {
        const response = await fetch(`${baseUrl}${test.url}`);
        console.log(`   ${test.name}: ${response.status} ${response.statusText}`);
        
        if (response.status === 403) {
          console.log('     - Requires authentication (as expected)');
        } else if (response.ok) {
          const data = await response.json();
          console.log(`     - Found ${data.roles?.length || 0} roles`);
          if (data.roles && data.roles.length > 0) {
            console.log(`     - Sample role: ${data.roles[0].name}`);
          }
        } else {
          const errorText = await response.text();
          console.log(`     - Error: ${errorText.substring(0, 100)}`);
        }
      } catch (error) {
        console.log(`     - Request failed: ${error.message}`);
      }
    }
    
    // Step 3: Test role creation without auth (should fail)
    console.log('\n3. Testing role creation behavior...');
    
    const testRoleData = {
      name: 'debug_test_role_' + Date.now(),
      display_name: 'Debug Test Role',
      description: 'Role created for debugging',
      hierarchy_level: 2
    };
    
    try {
      const createResponse = await fetch(`${baseUrl}/api/v1/rbac/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testRoleData)
      });
      
      console.log(`   Create role response: ${createResponse.status} ${createResponse.statusText}`);
      
      if (createResponse.status === 403) {
        console.log('   ✅ Role creation properly requires authentication');
      } else if (createResponse.ok) {
        const newRole = await createResponse.json();
        console.log(`   ⚠️  Role created without auth: ${newRole.name}`);
        
        // Test if it appears in listing immediately
        const listResponse = await fetch(`${baseUrl}/api/v1/rbac/roles`);
        if (listResponse.ok) {
          const listData = await listResponse.json();
          const foundRole = listData.roles?.find(r => r.name === newRole.name);
          console.log(`   - New role appears in list: ${foundRole ? 'YES' : 'NO'}`);
        }
      } else {
        const errorText = await createResponse.text();
        console.log(`   ❌ Create failed: ${errorText.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`   ❌ Create request failed: ${error.message}`);
    }
    
    // Step 4: Check database directly
    console.log('\n4. Testing database direct access...');
    
    try {
      // Try to get some info about the database state
      const dbHealthResponse = await fetch(`${baseUrl}/health/db`);
      if (dbHealthResponse.ok) {
        const dbHealth = await dbHealthResponse.json();
        console.log(`   Database status: ${dbHealth.status}`);
      }
    } catch (error) {
      console.log(`   Database check failed: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('DEBUGGING RECOMMENDATIONS:');
    console.log('='.repeat(60));
    
    console.log('\n🔍 POSSIBLE CAUSES:');
    console.log('1. Role listing query has filters that exclude new roles');
    console.log('2. Pagination settings are hiding new roles');
    console.log('3. Database transaction issues (roles not committed)');
    console.log('4. Role creation success but silent failure in database');
    console.log('5. Frontend caching issues not showing updated list');
    console.log('6. Permission/hierarchy filtering excluding new roles');
    
    console.log('\n🛠️  DEBUGGING STEPS:');
    console.log('1. Check backend logs when creating and listing roles');
    console.log('2. Verify database transaction commits properly');
    console.log('3. Test with different user permission levels');
    console.log('4. Check if roles are created with is_active=false');
    console.log('5. Verify role hierarchy_level settings');
    console.log('6. Check for SQL query issues in role listing');
    
    console.log('\n📋 NEXT ACTIONS:');
    console.log('1. Enable debug logging in backend RBAC endpoints');
    console.log('2. Check database directly for newly created roles');
    console.log('3. Test role creation with proper authentication');
    console.log('4. Verify frontend role listing component logic');
    
  } catch (error) {
    console.log(`❌ Debug script error: ${error.message}`);
  }
}

// Run the debug script
debugRoleListingBug().catch(console.error);