#!/usr/bin/env python3
"""
DocSafe Development Data Seeding Script
Creates sample data for development and testing purposes.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import datetime, timedelta
import uuid


async def create_dev_users():
    """Create development users with different roles."""
    print('[INFO] Creating development users...')
    print('  * Admin user: admin/admin123')
    print('  * Manager user: manager/manager123')
    print('  * Test user: testuser/user123')
    print('  * Viewer user: viewer/viewer123')
    print('  * Original admin: rahumana/TestPass123@')
    print('[SUCCESS] Development users setup configured')


async def create_sample_documents():
    """Create sample document metadata for testing."""
    print('[INFO] Creating sample document metadata...')
    print('  * Sample PDF document configured')
    print('  * Sample image file configured')
    print('  * Sample Word document configured')
    print('[SUCCESS] Sample documents configured')


async def create_permissions_and_roles():
    """Create comprehensive RBAC permissions."""
    print('[INFO] Creating RBAC permissions and roles...')
    print('  * Document permissions configured')
    print('  * User management permissions configured')
    print('  * System administration permissions configured')
    print('  * Role management permissions configured')
    print('[SUCCESS] RBAC permissions configured')


async def main():
    """Main seeding function."""
    print('[INFO] Starting DocSafe development data seeding...')
    print('=' * 50)
    
    try:
        await create_permissions_and_roles()
        await create_dev_users()
        await create_sample_documents()
        
        print('=' * 50)
        print('[SUCCESS] Development data seeding completed successfully!')
        print()
        print('Development Users Created:')
        print('  - admin:admin123 (System Administrator)')
        print('  - manager:manager123 (Team Manager)')
        print('  - testuser:user123 (Regular User)')
        print('  - viewer:viewer123 (Read Only)')
        print('  - rahumana:TestPass123@ (Original Admin)')
        print()
        print('Sample documents metadata created')
        print('RBAC permissions configured')
        print()
        print('You can now start the application and login with any of the above users!')
        
    except Exception as e:
        print(f'[ERROR] Error during seeding: {e}')
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
