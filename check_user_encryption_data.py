#!/usr/bin/env python3
"""
Check user encryption data for debugging
"""

import psycopg2
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DB_URL = os.getenv("DATABASE_URL", "postgresql://securevault_user:securevault_password@localhost:5430/securevault")

def check_user_encryption_data():
    """Check user encryption data for potential issues."""

    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()

        print("=== USER ENCRYPTION DATA ANALYSIS ===\n")

        # Check all users' encryption fields
        cursor.execute("""
            SELECT id, username,
                   encryption_salt,
                   key_verification_payload,
                   encryption_method,
                   key_derivation_iterations,
                   created_at
            FROM users
            ORDER BY created_at
        """)

        users = cursor.fetchall()

        print(f"Found {len(users)} users\n")

        for user in users:
            user_id, username, salt, payload, method, iterations, created_at = user

            print(f"=== USER: {username} (ID: {user_id}) ===")
            print(f"Created: {created_at}")
            print(f"Encryption Method: {method}")
            print(f"Key Derivation Iterations: {iterations}")

            # Check salt
            if salt:
                print(f"[OK] Salt Present: {salt[:20]}..." if len(salt) > 20 else f"[OK] Salt Present: {salt}")
                try:
                    import base64
                    salt_bytes = base64.b64decode(salt)
                    print(f"   Salt Length: {len(salt_bytes)} bytes")
                except Exception as e:
                    print(f"   [ERROR] Invalid Base64 Salt: {e}")
            else:
                print(f"[ERROR] Salt Missing: NULL")

            # Check verification payload
            if payload:
                print(f"[OK] Verification Payload Present: {len(payload)} chars")
                try:
                    parsed = json.loads(payload)
                    print(f"   [OK] Valid JSON")
                    print(f"   Ciphertext: {parsed.get('ciphertext', 'MISSING')}")
                    print(f"   IV: {parsed.get('iv', 'MISSING')}")
                    print(f"   Auth Tag: {parsed.get('authTag', 'MISSING')}")
                    print(f"   Full JSON: {json.dumps(parsed, indent=2)}")

                    # Validate base64 fields
                    for field_name, field_value in [('ciphertext', parsed.get('ciphertext')), ('iv', parsed.get('iv')), ('authTag', parsed.get('authTag'))]:
                        if field_value:
                            try:
                                import base64
                                decoded = base64.b64decode(field_value)
                                print(f"   [OK] {field_name.capitalize()} Valid Base64 ({len(decoded)} bytes)")
                            except Exception as e:
                                print(f"   [ERROR] {field_name.capitalize()} Invalid Base64: {e}")
                        else:
                            print(f"   [ERROR] {field_name.capitalize()} Missing")

                except json.JSONDecodeError as e:
                    print(f"   [ERROR] Invalid JSON: {e}")
                    print(f"   Raw payload: {payload[:100]}...")
            else:
                print(f"[ERROR] Verification Payload Missing: NULL")

            print()

        print("=== SUMMARY ANALYSIS ===\n")

        # Count issues
        cursor.execute("""
            SELECT
                COUNT(*) as total_users,
                COUNT(encryption_salt) as users_with_salt,
                COUNT(key_verification_payload) as users_with_payload,
                COUNT(CASE WHEN key_verification_payload IS NOT NULL AND key_verification_payload != '' THEN 1 END) as users_with_valid_payload
            FROM users
        """)

        stats = cursor.fetchone()
        total_users, with_salt, with_payload, with_valid_payload = stats

        print(f"Total Users: {total_users}")
        print(f"Users with Salt: {with_salt}")
        print(f"Users with Payload: {with_payload}")
        print(f"Users with Valid Payload: {with_valid_payload}")

        if with_salt < total_users:
            print(f"[ERROR] {total_users - with_salt} users missing encryption salt")

        if with_valid_payload < total_users:
            print(f"[ERROR] {total_users - with_valid_payload} users missing or have invalid verification payload")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"[ERROR] {e}")
        return False

    return True

if __name__ == "__main__":
    check_user_encryption_data()