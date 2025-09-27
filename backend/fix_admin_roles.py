#!/usr/bin/env python3
"""
Emergency script to restore super_admin roles and audit user permissions
"""

import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import Settings

async def check_and_fix_roles():
    """Check current user roles and restore super_admin if needed"""

    settings = Settings()

    # Convert PostgreSQL URL to async format and use correct credentials
    database_url = settings.DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://')
    # Ensure we're using the correct Docker database credentials
    database_url = database_url.replace('postgres:password', 'securevault_user:securevault_password')

    print(f"Connecting to database: {database_url}")

    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with async_session() as session:
            # Check current users and their roles
            print("\nCurrent users and roles:")
            result = await session.execute(text("""
                SELECT u.id, u.username, u.email, u.role, u.is_active
                FROM users u
                ORDER BY u.id
            """))

            users = result.fetchall()
            for user in users:
                print(f"  User ID: {user.id}, Username: {user.username}, Role: {user.role}, Active: {user.is_active}")

                # If this is the affected user, restore super_admin role
                if user.username == "rahumana" and user.role != "super_admin":
                    print(f"  SECURITY ISSUE: User {user.username} should be super_admin but is {user.role}")
                    print(f"  Restoring super_admin role for user {user.username}...")

                    await session.execute(text("""
                        UPDATE users
                        SET role = 'super_admin'
                        WHERE username = :username
                    """), {"username": user.username})

                    await session.commit()
                    print(f"  Role restored to super_admin for user {user.username}")

            # Verify the fix
            print("\nVerification - Updated user roles:")
            result = await session.execute(text("""
                SELECT u.id, u.username, u.email, u.role, u.is_active
                FROM users u
                ORDER BY u.id
            """))

            users = result.fetchall()
            for user in users:
                print(f"  User ID: {user.id}, Username: {user.username}, Role: {user.role}, Active: {user.is_active}")

    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("This might indicate the database is not accessible or credentials are wrong")
        return False

    finally:
        await engine.dispose()

    return True

if __name__ == "__main__":
    print("Emergency Role Restoration Script")
    print("=" * 50)

    success = asyncio.run(check_and_fix_roles())

    if success:
        print("\nRole audit and restoration completed successfully")
    else:
        print("\nRole restoration failed")
        sys.exit(1)