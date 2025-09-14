/**
 * Debug API endpoints to reproduce the specific errors
 */

async function debugEndpoints() {
  console.log('=== Debugging RBAC API Endpoints ===\n');
  
  const baseUrl = 'http://localhost:8002';
  const credentials = {
    username: 'rahumana',
    password: 'TestPass123@'
  };
  
  try {
    // Step 1: Login
    console.log('1. Attempting login...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(credentials)
    });
    
    if (!loginResponse.ok) {
      console.log(`❌ Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
      const error = await loginResponse.text();
      console.log('Error:', error);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    console.log('✅ Login successful\n');
    
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Test GET /api/v1/rbac/roles?active_only=true (500 error)
    console.log('2. Testing GET /api/v1/rbac/roles?active_only=true...');
    const rolesResponse = await fetch(`${baseUrl}/api/v1/rbac/roles?active_only=true`, {
      headers: authHeaders
    });
    
    console.log(`Status: ${rolesResponse.status} ${rolesResponse.statusText}`);
    if (!rolesResponse.ok) {
      const error = await rolesResponse.text();
      console.log('❌ Error response:', error);
    } else {
      const data = await rolesResponse.json();
      console.log(`✅ Success: Found ${data.roles?.length || 0} roles`);
    }
    console.log();
    
    // Step 3: Test GET /api/v1/rbac/users/{id}/roles for various user IDs
    const userIds = [1, 2, 4]; // Test existing and non-existing users
    
    for (const userId of userIds) {
      console.log(`3.${userId}. Testing GET /api/v1/rbac/users/${userId}/roles...`);
      const userRolesResponse = await fetch(`${baseUrl}/api/v1/rbac/users/${userId}/roles`, {
        headers: authHeaders
      });
      
      console.log(`Status: ${userRolesResponse.status} ${userRolesResponse.statusText}`);
      if (!userRolesResponse.ok) {
        const error = await userRolesResponse.text();
        console.log(`❌ Error response:`, error);
      } else {
        const data = await userRolesResponse.json();
        console.log(`✅ Success: Found ${data.user_roles?.length || 0} roles for user ${userId}`);
      }
      console.log();
    }
    
    // Step 4: Test GET /api/v1/rbac/roles (without active_only to see if that works)
    console.log('4. Testing GET /api/v1/rbac/roles (no filters)...');
    const allRolesResponse = await fetch(`${baseUrl}/api/v1/rbac/roles`, {
      headers: authHeaders
    });
    
    console.log(`Status: ${allRolesResponse.status} ${allRolesResponse.statusText}`);
    if (!allRolesResponse.ok) {
      const error = await allRolesResponse.text();
      console.log('❌ Error response:', error);
    } else {
      const data = await allRolesResponse.json();
      console.log(`✅ Success: Found ${data.roles?.length || 0} roles`);
    }
    
  } catch (error) {
    console.log('❌ Script error:', error.message);
  }
}

// Run the debug
debugEndpoints().catch(console.error);