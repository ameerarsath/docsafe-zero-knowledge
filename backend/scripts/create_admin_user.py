#!/usr/bin/env python3
"""
Create admin user for SecureVault.

This script creates a default admin user for testing purposes.
"""

import sys
import os

# Add the backend directory to the Python path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
sys.path.insert(0, backend_dir)

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, create_tables
from app.models.user import User

def create_admin_user():
    """Create a default admin user."""
    # Create tables if they don't exist
    create_tables()
    
    # Create database session
    db: Session = SessionLocal()
    
    try:
        # Check if admin user already exists
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if existing_admin:
            print("[OK] Admin user already exists")
            print(f"   Username: {existing_admin.username}")
            print(f"   Email: {existing_admin.email}")
            print(f"   Role: {existing_admin.role}")
            return existing_admin
        
        # Create admin user
        admin_user = User(
            username="admin",
            email="admin@example.com",
            password="TestPass123@",  # Strong password for testing
            role="admin",
            is_active=True,
            is_verified=True,
            must_change_password=False  # For testing purposes
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("[SUCCESS] Admin user created successfully!")
        print(f"   Username: {admin_user.username}")
        print(f"   Email: {admin_user.email}")
        print(f"   Role: {admin_user.role}")
        print(f"   ID: {admin_user.id}")
        print("   Password: TestPass123@")
        
        return admin_user
        
    except Exception as e:
        print(f"[ERROR] Error creating admin user: {e}")
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()