#!/usr/bin/env python3
"""
Script to reinitialize RBAC system with new permissions.
"""

import os
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from app.core.config import get_settings
from app.core.rbac_init import initialize_rbac_system

def reinitialize_rbac():
    """Reinitialize RBAC system with new permissions."""
    print("Reinitializing RBAC system...")

    try:
        # Get settings
        settings = get_settings()

        # Use localhost instead of 'db' hostname for local execution
        database_url = settings.DATABASE_URL.replace('db:', 'localhost:')

        # Database connection
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            print("Initializing RBAC system...")
            initialize_rbac_system(db)
            print("[SUCCESS] RBAC system reinitialized successfully!")

        except Exception as e:
            print(f"[ERROR] Failed to reinitialize RBAC: {e}")
            import traceback
            traceback.print_exc()
        finally:
            db.close()

    except Exception as e:
        print(f"[ERROR] Failed to connect to database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reinitialize_rbac()