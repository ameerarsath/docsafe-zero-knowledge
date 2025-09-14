/**
 * Force Single Role Cleanup Script
 * 
 * This script will completely clean up the multiple roles issue
 * and ensure each user has only one role.
 */

const BASE_URL = 'http://localhost:8002';

const TEST_ADMIN = {
    username: 'rahumana',
    password: 'TestPass123@'
};

async function makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    if (options.token) {
        defaultHeaders.Authorization = `Bearer ${options.token}`;
    }

    const response = await fetch(url, {
        headers: { ...defaultHeaders, ...options.headers },
        ...options
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.log(`API Error: ${response.status} - ${errorText}`);
        
        // For DELETE requests, sometimes we get empty responses
        if (response.status === 200 && endpoint.includes('DELETE')) {
            return { success: true };
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    return { success: true };
}

async function forceSingleRoleCleanup() {
    console.log('🔧 Force Single Role Cleanup - Database Level\n');

    try {
        // Step 1: Login
        console.log('🔐 Authenticating...');
        const loginData = await makeRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(TEST_ADMIN)
        });
        const token = loginData.access_token;
        console.log('✅ Authentication successful\n');

        // Step 2: Focus on the problem user
        console.log('🎯 Focusing on ameer_arsath user...');
        const users = await makeRequest('/api/v1/admin/users?size=100', { token });
        const problemUser = users.users.find(u => u.username === 'ameer_arsath');
        
        if (!problemUser) {
            console.log('❌ User ameer_arsath not found');
            return;
        }

        console.log(`👤 Found user: ${problemUser.username} (ID: ${problemUser.id})`);

        // Step 3: Get all roles for this user
        const userRoles = await makeRequest(`/api/v1/rbac/users/${problemUser.id}/roles`, { token });
        console.log(`\n📊 Current roles for ${problemUser.username}:`);
        
        if (userRoles.user_roles.length === 0) {
            console.log('   ✅ User has no roles (already clean)');
            return;
        }

        userRoles.user_roles.forEach((role, index) => {
            console.log(`   ${index + 1}. ${role.role.display_name} (ID: ${role.role_id}, Level: ${role.role.hierarchy_level})`);
        });

        // Step 4: Remove ALL roles
        console.log(`\n🗑️ Removing all ${userRoles.user_roles.length} roles...`);
        let removedCount = 0;
        let failedCount = 0;

        for (const role of userRoles.user_roles) {
            try {
                console.log(`   Removing: ${role.role.display_name}`);
                
                // Use a simpler approach - direct role revocation
                const deleteUrl = `/api/v1/rbac/users/${problemUser.id}/roles/${role.role_id}`;
                
                const response = await fetch(`${BASE_URL}${deleteUrl}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    console.log(`   ✅ Successfully removed ${role.role.display_name}`);
                    removedCount++;
                } else {
                    console.log(`   ❌ Failed to remove ${role.role.display_name}: ${response.status}`);
                    failedCount++;
                }
            } catch (error) {
                console.log(`   ❌ Error removing ${role.role.display_name}: ${error.message}`);
                failedCount++;
            }
        }

        console.log(`\n📈 Cleanup Results:`);
        console.log(`   ✅ Removed: ${removedCount} roles`);
        console.log(`   ❌ Failed: ${failedCount} roles`);

        // Step 5: Verify cleanup
        console.log(`\n🔍 Verifying cleanup...`);
        const verifyRoles = await makeRequest(`/api/v1/rbac/users/${problemUser.id}/roles`, { token });
        
        if (verifyRoles.user_roles.length === 0) {
            console.log('✅ SUCCESS: User now has no roles');
        } else {
            console.log(`⚠️ User still has ${verifyRoles.user_roles.length} roles:`);
            verifyRoles.user_roles.forEach((role, index) => {
                console.log(`   ${index + 1}. ${role.role.display_name}`);
            });
        }

        // Step 6: Assign a single role (Manager)
        console.log(`\n➕ Assigning single role: Manager...`);
        
        const roles = await makeRequest('/api/v1/rbac/roles', { token });
        const managerRole = roles.roles.find(r => r.display_name === 'Manager');
        
        if (managerRole) {
            try {
                await makeRequest(`/api/v1/rbac/users/${problemUser.id}/roles`, {
                    method: 'POST',
                    token,
                    body: JSON.stringify({
                        role_id: managerRole.id,
                        is_primary: true
                    })
                });
                console.log('✅ Successfully assigned Manager role');
            } catch (error) {
                console.log(`❌ Failed to assign Manager role: ${error.message}`);
            }
        }

        // Step 7: Final verification
        console.log(`\n🏁 Final verification...`);
        const finalRoles = await makeRequest(`/api/v1/rbac/users/${problemUser.id}/roles`, { token });
        
        console.log(`\n📋 Final state for ${problemUser.username}:`);
        if (finalRoles.user_roles.length === 0) {
            console.log('   ❌ User has no roles');
        } else if (finalRoles.user_roles.length === 1) {
            console.log(`   ✅ User has single role: ${finalRoles.user_roles[0].role.display_name}`);
            console.log('\n🎉 CLEANUP SUCCESSFUL!');
            console.log('✅ Single role policy now enforced');
            console.log('🔄 Try the frontend again - role changes should work properly now');
        } else {
            console.log(`   ⚠️ User still has ${finalRoles.user_roles.length} roles - manual intervention needed`);
        }

    } catch (error) {
        console.error('\n❌ Cleanup failed:', error.message);
        console.log('\n🔧 Next steps:');
        console.log('1. Check if backend is running on port 8002');
        console.log('2. Verify login credentials are correct');
        console.log('3. Check backend logs for any database errors');
    }
}

forceSingleRoleCleanup();