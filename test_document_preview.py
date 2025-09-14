#!/usr/bin/env python3
"""
Simple test script to verify document preview functionality
"""
import requests
import json

def test_document_preview():
    base_url = "http://localhost:8002"
    
    print("Testing Document Preview API...")
    
    # Test 1: Check if API is running
    try:
        response = requests.get(f"{base_url}/health")
        print(f"[OK] API Health Check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"[ERROR] API Health Check Failed: {e}")
        return
    
    # Test 2: Try to list documents (will fail without auth, but we can see the endpoint)
    try:
        response = requests.get(f"{base_url}/api/v1/documents")
        print(f"[DOCS] Documents API: {response.status_code}")
        if response.status_code == 401:
            print("   (Expected - requires authentication)")
    except Exception as e:
        print(f"[ERROR] Documents API Failed: {e}")
    
    # Test 3: Try preview API for document ID 1 (will fail without auth)
    try:
        response = requests.get(f"{base_url}/api/v1/documents/1/preview")
        print(f"[PREVIEW] Preview API: {response.status_code}")
        if response.status_code == 401:
            print("   (Expected - requires authentication)")
        elif response.status_code == 404:
            print("   (Document not found - need to create test document)")
    except Exception as e:
        print(f"[ERROR] Preview API Failed: {e}")
    
    # Test 4: Check what preview endpoints are available
    try:
        response = requests.get(f"{base_url}/docs")
        print(f"[DOCS] API Documentation: {response.status_code}")
        if response.status_code == 200:
            print("   API docs available at http://localhost:8002/docs")
    except Exception as e:
        print(f"[ERROR] API Docs Failed: {e}")

if __name__ == "__main__":
    test_document_preview()