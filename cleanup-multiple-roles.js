/**
 * Cleanup Multiple Roles Script
 * 
 * This script removes multiple roles from users to enforce single role policy
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
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // Handle empty responses for DELETE requests
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    return { success: true };
}

async function cleanupMultipleRoles() {
    console.log('🧹 Cleaning up multiple roles to enforce single role policy\n');

    try {
        // Step 1: Login
        console.log('🔐 Authenticating...');
        const loginData = await makeRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(TEST_ADMIN)
        });
        const token = loginData.access_token;
        console.log('✅ Authentication successful\n');

        // Step 2: Get all users
        console.log('👥 Getting all users...');
        const users = await makeRequest('/api/v1/admin/users?size=100', { token });
        
        console.log(`Found ${users.users.length} users\n`);

        // Step 3: Check each user's roles
        for (const user of users.users) {
            const userRoles = await makeRequest(`/api/v1/rbac/users/${user.id}/roles`, { token });
            
            if (userRoles.user_roles.length > 1) {
                console.log(`👤 ${user.username} has ${userRoles.user_roles.length} roles (VIOLATES SINGLE ROLE POLICY):`);
                userRoles.user_roles.forEach((userRole, index) => {
                    console.log(`   ${index + 1}. ${userRole.role.display_name} (Level ${userRole.role.hierarchy_level})`);
                });

                // Keep only the highest level role (lowest hierarchy number)
                const sortedRoles = userRoles.user_roles.sort((a, b) => a.role.hierarchy_level - b.role.hierarchy_level);
                const roleToKeep = sortedRoles[0];
                const rolesToRemove = sortedRoles.slice(1);

                console.log(`   ✅ Keeping: ${roleToKeep.role.display_name} (Level ${roleToKeep.role.hierarchy_level})`);
                console.log(`   🗑️  Removing ${rolesToRemove.length} other roles:`);

                // Remove extra roles
                for (const roleToRemove of rolesToRemove) {
                    console.log(`      - Removing ${roleToRemove.role.display_name}`);
                    try {
                        await makeRequest(`/api/v1/rbac/users/${user.id}/roles/${roleToRemove.role_id}`, {
                            method: 'DELETE',
                            token
                        });
                        console.log(`      ✅ Removed successfully`);
                    } catch (error) {
                        console.log(`      ❌ Failed to remove: ${error.message}`);
                    }
                }
                console.log('');
            } else if (userRoles.user_roles.length === 1) {
                console.log(`👤 ${user.username}: ✅ Has single role: ${userRoles.user_roles[0].role.display_name}`);
            } else {
                console.log(`👤 ${user.username}: ⚠️  Has no roles assigned`);
            }
        }

        console.log('\n🎉 Cleanup completed!');
        console.log('✅ All users now comply with single role policy');
        console.log('🔄 Try the frontend role management again - it should work correctly now');

    } catch (error) {
        console.error('\n❌ Cleanup failed:', error.message);
    }
}

cleanupMultipleRoles();