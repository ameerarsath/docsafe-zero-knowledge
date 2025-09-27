#!/usr/bin/env python3
"""Test security API endpoints"""

import requests
import json

# Test credentials
BASE_URL = "http://localhost:8002"
USERNAME = "rahumana"
PASSWORD = "TestPass123@"

def test_security_endpoints():
    """Test security dashboard and metrics endpoints"""
    
    # Login first
    login_data = {
        "username": USERNAME,
        "password": PASSWORD
    }
    
    print("[LOGIN] Logging in...")
    login_response = requests.post(f"{BASE_URL}/api/auth/login", data=login_data)
    
    if login_response.status_code != 200:
        print(f"[ERROR] Login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    token = login_response.json().get("access_token")
    if not token:
        print("[ERROR] No access token received")
        return
    
    print("[SUCCESS] Login successful")
    
    # Set up headers
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test security dashboard endpoint
    print("\n[TEST] Testing security dashboard...")
    dashboard_response = requests.get(f"{BASE_URL}/api/v1/security/dashboard?hours=24", headers=headers)
    
    print(f"Dashboard Status: {dashboard_response.status_code}")
    if dashboard_response.status_code == 200:
        print("[SUCCESS] Security dashboard working!")
        dashboard_data = dashboard_response.json()
        print(f"   - Active threats: {dashboard_data.get('active_threats', 'N/A')}")
        print(f"   - Blocked IPs: {dashboard_data.get('blocked_ips', 'N/A')}")
        print(f"   - Active sessions: {dashboard_data.get('active_sessions', 'N/A')}")
    else:
        print(f"[ERROR] Security dashboard failed: {dashboard_response.text}")
    
    # Test security metrics endpoint
    print("\n[TEST] Testing security metrics...")
    metrics_response = requests.get(f"{BASE_URL}/api/v1/security/metrics?days=7", headers=headers)
    
    print(f"Metrics Status: {metrics_response.status_code}")
    if metrics_response.status_code == 200:
        print("[SUCCESS] Security metrics working!")
        metrics_data = metrics_response.json()
        print(f"   - Total events: {metrics_data.get('total_events', 'N/A')}")
        print(f"   - Resolution rate: {metrics_data.get('resolution_rate', 'N/A')}")
    else:
        print(f"[ERROR] Security metrics failed: {metrics_response.text}")

if __name__ == "__main__":
    test_security_endpoints()