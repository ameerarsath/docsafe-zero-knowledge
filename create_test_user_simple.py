#!/usr/bin/env python3
"""
Create a test user with known credentials
"""
import requests
import json

BASE_URL = "http://localhost:8002"

def create_test_user():
    """Create a new test user via registration endpoint"""

    user_data = {
        "username": "sharetest",
        "email": "sharetest@example.com",
        "password": "sharetest123",
        "encryption_password": "encryption123"
    }

    try:
        print("Creating test user via registration...")
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=user_data
        )

        print(f"Registration status: {response.status_code}")

        if response.status_code == 201:
            result = response.json()
            print("SUCCESS: Test user created!")
            print(f"User: {result.get('username', 'sharetest')}")

            # Now try to login with the new user
            print("\nTesting login with new user...")
            login_data = {
                "username": "sharetest",
                "password": "sharetest123"
            }

            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json=login_data
            )

            print(f"Login status: {login_response.status_code}")

            if login_response.status_code == 200:
                token_data = login_response.json()
                token = token_data.get("access_token")
                print(f"SUCCESS: Got auth token: {token[:50]}...")
                return token
            else:
                print(f"LOGIN FAILED: {login_response.text}")

        else:
            print(f"REGISTRATION FAILED: {response.text}")

    except Exception as e:
        print(f"Error: {e}")

    return None

if __name__ == "__main__":
    create_test_user()