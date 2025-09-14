#!/usr/bin/env python3
"""
Script to clean up duplicate role assignments using Docker exec.
This connects directly to the PostgreSQL container.
"""

import subprocess
import json

def run_sql_query(query, return_results=True):
    """Execute SQL query in the PostgreSQL Docker container."""
    cmd = [
        "docker", "exec", "-i", "securevault_db",
        "psql", "-U", "securevault_user", "-d", "securevault",
        "-t", "-A", "-F", "|"
    ]

    if return_results:
        cmd.append("-c")
        cmd.append(query)
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error executing query: {result.stderr}")
            return None
        return result.stdout.strip()
    else:
        # For queries that modify data
        cmd.extend(["-c", query])
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error executing query: {result.stderr}")
            return False
        return True

def main():
    """Clean up duplicate role assignments."""
    print("Starting duplicate role cleanup using Docker...")

    try:
        # Find users with multiple role assignments
        query = """
            SELECT user_id, COUNT(*) as role_count
            FROM user_roles
            GROUP BY user_id
            HAVING COUNT(*) > 1
            ORDER BY user_id;
        """

        result = run_sql_query(query)
        if result is None:
            return

        duplicate_users = []
        for line in result.split('\n'):
            if line.strip():
                parts = line.split('|')
                if len(parts) == 2:
                    user_id = int(parts[0])
                    role_count = int(parts[1])
                    duplicate_users.append((user_id, role_count))

        print(f"Found {len(duplicate_users)} users with multiple role assignments:")

        if not duplicate_users:
            print("✓ No duplicate role assignments found!")
            return

        total_cleaned = 0

        for user_id, role_count in duplicate_users:
            print(f"\nUser ID {user_id} has {role_count} role assignments")

            # Get all role assignments for this user, ordered by assigned_at DESC
            detail_query = f"""
                SELECT user_id, role_id, assigned_at
                FROM user_roles
                WHERE user_id = {user_id}
                ORDER BY assigned_at DESC;
            """

            role_details = run_sql_query(detail_query)
            if role_details is None:
                continue

            roles = []
            for line in role_details.split('\n'):
                if line.strip():
                    parts = line.split('|')
                    if len(parts) == 3:
                        roles.append({
                            'user_id': int(parts[0]),
                            'role_id': int(parts[1]),
                            'assigned_at': parts[2]
                        })

            if len(roles) > 1:
                # Keep the most recent assignment (first in desc order)
                keep_role = roles[0]
                remove_roles = roles[1:]

                print(f"  Keeping: Role ID {keep_role['role_id']} (assigned at {keep_role['assigned_at']})")
                print(f"  Removing {len(remove_roles)} older assignments:")

                for role in remove_roles:
                    print(f"    - Role ID {role['role_id']} (assigned at {role['assigned_at']})")

                    delete_query = f"DELETE FROM user_roles WHERE user_id = {role['user_id']} AND role_id = {role['role_id']};"
                    if run_sql_query(delete_query, return_results=False):
                        total_cleaned += 1
                    else:
                        print(f"    Failed to delete role assignment for user {role['user_id']}, role {role['role_id']}")

        print(f"\nCleanup completed successfully!")
        print(f"Total duplicate assignments removed: {total_cleaned}")

        # Verify cleanup
        verify_query = """
            SELECT user_id, COUNT(*) as role_count
            FROM user_roles
            GROUP BY user_id
            HAVING COUNT(*) > 1;
        """

        remaining = run_sql_query(verify_query)
        if remaining and remaining.strip():
            remaining_count = len([line for line in remaining.split('\n') if line.strip()])
            print(f"WARNING: {remaining_count} users still have multiple roles!")
        else:
            print("✓ All users now have exactly one role assignment.")

    except Exception as e:
        print(f"Error during cleanup: {e}")
        raise

if __name__ == "__main__":
    main()