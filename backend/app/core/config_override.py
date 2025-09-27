"""
Temporary configuration override to use SQLite for testing.

This patches the database settings to work with a local SQLite database.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# SQLite database path
SQLITE_URL = "sqlite:///./backend/securevault.db"

# Create SQLite engine
sqlite_engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},  # Needed for SQLite
    echo=False
)

# Create session factory
SQLiteSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)

def patch_database_for_testing():
    """Patch the database configuration to use SQLite."""
    try:
        # Import and patch the database module
        from app.core import database

        # Replace the engine and session
        database.engine = sqlite_engine
        database.SessionLocal = SQLiteSessionLocal

        print("✅ Database patched to use SQLite for testing")
        return True

    except ImportError as e:
        print(f"❌ Failed to patch database: {e}")
        return False

if __name__ == "__main__":
    success = patch_database_for_testing()
    print(f"Database patch: {'Success' if success else 'Failed'}")