#!/usr/bin/env python3
"""
Check if encryption tables exist in database
"""

import psycopg2
import os

# Database connection parameters from .env
DATABASE_URL = "postgresql://securevault_user:securevault_password@localhost:5430/securevault"

try:
    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Check what tables exist
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    
    tables = cursor.fetchall()
    print("Existing tables:")
    for table in tables:
        print(f"  - {table[0]}")
    
    # Check specifically for encryption-related tables
    encryption_tables = [
        'user_encryption_keys',
        'master_keys', 
        'key_escrow',
        'encryption_audit_logs'
    ]
    
    print("\nChecking for encryption tables:")
    for table_name in encryption_tables:
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_name = %s 
                AND table_schema = 'public'
            );
        """, (table_name,))
        
        exists = cursor.fetchone()[0]
        status = "EXISTS" if exists else "MISSING"
        print(f"  - {table_name}: {status}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Error checking database: {e}")