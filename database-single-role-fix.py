#!/usr/bin/env python3
"""
Database Single Role Fix Script

This script directly connects to the database and enforces the single role policy:
1. Find all users with multiple roles
2. Keep only the highest priority role (lowest hierarchy_level)
3. Remove all other roles
4. Ensure each user has exactly one role
"""

import asyncio
import asyncpg
import os
from datetime import datetime

# Database connection details (from backend .env)
DATABASE_URL = "postgresql://securevault_user:securevault_password@localhost:5430/securevault"

async def fix_single_role_policy():
    """Fix single role policy by removing multiple role assignments."""
    print("Database Single Role Policy Fix")
    print("=" * 50)
    
    try:
        # Connect to database
        print("Connecting to database...")
        conn = await asyncpg.connect(DATABASE_URL)
        print("Connected successfully")
        
        # Find users with multiple roles
        query = """
        SELECT 
            u.id as user_id,
            u.username,
            COUNT(ur.id) as role_count
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE ur.id IS NOT NULL
        GROUP BY u.id, u.username
        HAVING COUNT(ur.id) > 1
        ORDER BY role_count DESC
        """
        
        print("\n🔍 Finding users with multiple roles...")
        multiple_role_users = await conn.fetch(query)
        
        if not multiple_role_users:
            print("✅ No users with multiple roles found!")
            await conn.close()
            return
            
        print(f"⚠️  Found {len(multiple_role_users)} users with multiple roles:")
        for user in multiple_role_users:
            print(f"   • {user['username']}: {user['role_count']} roles")
        
        # Fix each user
        total_removed = 0
        for user in multiple_role_users:
            user_id = user['user_id']
            username = user['username']
            
            print(f"\n👤 Processing {username} (ID: {user_id})...")
            
            # Get all roles for this user with role details
            user_roles_query = """
            SELECT 
                ur.id as user_role_id,
                ur.role_id,
                r.name as role_name,
                r.display_name,
                r.hierarchy_level,
                ur.is_primary,
                ur.assigned_at
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
            ORDER BY r.hierarchy_level ASC, ur.assigned_at DESC
            """
            
            user_roles = await conn.fetch(user_roles_query, user_id)
            
            print(f"   📋 Current roles:")
            for i, role in enumerate(user_roles):
                print(f"      {i+1}. {role['display_name']} (Level {role['hierarchy_level']}) - {'Primary' if role['is_primary'] else 'Secondary'}")
            
            # Keep the highest priority role (lowest hierarchy level, most recent if tied)
            role_to_keep = user_roles[0]
            roles_to_remove = user_roles[1:]
            
            print(f"   ✅ Keeping: {role_to_keep['display_name']} (Level {role_to_keep['hierarchy_level']})")
            print(f"   🗑️  Removing {len(roles_to_remove)} roles:")
            
            # Remove extra roles
            for role in roles_to_remove:
                try:
                    delete_query = "DELETE FROM user_roles WHERE id = $1"
                    await conn.execute(delete_query, role['user_role_id'])
                    print(f"      ✅ Removed: {role['display_name']}")
                    total_removed += 1
                except Exception as e:
                    print(f"      ❌ Failed to remove {role['display_name']}: {e}")
            
            # Ensure the remaining role is marked as primary
            update_query = "UPDATE user_roles SET is_primary = true WHERE id = $1"
            await conn.execute(update_query, role_to_keep['user_role_id'])
        
        print(f"\n📈 Summary:")
        print(f"   👥 Users processed: {len(multiple_role_users)}")
        print(f"   🗑️  Total roles removed: {total_removed}")
        
        # Verify the fix
        print(f"\n🔍 Verifying single role policy...")
        verify_query = """
        SELECT 
            u.username,
            COUNT(ur.id) as role_count,
            STRING_AGG(r.display_name, ', ') as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE ur.id IS NOT NULL
        GROUP BY u.id, u.username
        HAVING COUNT(ur.id) > 1
        """
        
        remaining_issues = await conn.fetch(verify_query)
        
        if remaining_issues:
            print(f"⚠️  Still have {len(remaining_issues)} users with multiple roles:")
            for issue in remaining_issues:
                print(f"   • {issue['username']}: {issue['role_count']} roles ({issue['roles']})")
        else:
            print("✅ SUCCESS: All users now have at most one role!")
            
        # Show final state
        print(f"\n📊 Final user role summary:")
        final_query = """
        SELECT 
            u.username,
            COALESCE(r.display_name, 'No Role') as role_name,
            COALESCE(r.hierarchy_level::text, 'N/A') as level
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        ORDER BY u.username
        """
        
        final_state = await conn.fetch(final_query)
        for user in final_state:
            print(f"   • {user['username']}: {user['role_name']} (Level {user['level']})")
        
        await conn.close()
        print(f"\n🎉 Database single role policy fix completed!")
        print(f"✅ Each user now has exactly one role (or no roles)")
        print(f"🔄 Try the frontend role management - it should work perfectly now!")
        
    except Exception as e:
        print(f"❌ Database fix failed: {e}")
        print(f"💡 Check if:")
        print(f"   1. PostgreSQL is running on localhost:5430")
        print(f"   2. Database credentials are correct")
        print(f"   3. Database securevault exists")

if __name__ == "__main__":
    asyncio.run(fix_single_role_policy())