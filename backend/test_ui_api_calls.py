#!/usr/bin/env python3
"""
Test the actual API calls that the UI makes to identify the preview error
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio
import httpx
import json

async def test_ui_api_calls():
    """Test the exact API calls the UI makes"""
    
    base_url = "http://localhost:8002"
    
    # Test data from previous successful test
    username = "admin"
    password = "admin123"
    document_id = 8  # Network Topologies.docx
    doc_password = "Ameer"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            print("=== TESTING UI API CALLS ===")
            print(f"Document ID: {document_id}")
            print()
            
            # Step 1: Login to get token
            print("=== STEP 1: Login ===")
            try:
                login_data = {
                    "username": username,
                    "password": password
                }
                login_response = await client.post(
                    f"{base_url}/api/auth/login",
                    data=login_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if login_response.status_code == 200:
                    token_data = login_response.json()
                    access_token = token_data["access_token"]
                    print("[OK] Login successful")
                else:
                    print(f"[ERROR] Login failed: {login_response.status_code}")
                    print(f"Response: {login_response.text}")
                    return
                    
            except Exception as e:
                print(f"[ERROR] Login error: {e}")
                return
            
            # Headers with authentication
            auth_headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            print()
            
            # Step 2: Test exact UI API call - Initial preview
            print("=== STEP 2: UI Initial Preview Call ===")
            try:
                # This is exactly what the UI calls: /api/v1/documents/{id}/preview
                ui_preview_url = f"{base_url}/api/v1/documents/{document_id}/preview"
                print(f"URL: {ui_preview_url}")
                
                preview_response = await client.get(
                    ui_preview_url,
                    headers={"Authorization": f"Bearer {access_token}"}  # Only auth header like UI
                )
                
                print(f"Status Code: {preview_response.status_code}")
                
                if preview_response.status_code == 200:
                    preview_data = preview_response.json()
                    print("[OK] Initial preview successful")
                    print(f"Preview type: {preview_data.get('type')}")
                    print(f"Requires password: {preview_data.get('requires_password')}")
                    print(f"Full response: {json.dumps(preview_data, indent=2)}")
                else:
                    print(f"[ERROR] Initial preview failed")
                    print(f"Status: {preview_response.status_code}")
                    print(f"Headers: {dict(preview_response.headers)}")
                    print(f"Response: {preview_response.text}")
                    return
                    
            except Exception as e:
                print(f"[ERROR] Initial preview error: {e}")
                return
            
            print()
            
            # Step 3: Test encrypted preview call (like UI would make)
            print("=== STEP 3: UI Encrypted Preview Call ===")
            try:
                # This is exactly what the UI calls: POST /api/v1/documents/{id}/preview/encrypted
                ui_encrypted_url = f"{base_url}/api/v1/documents/{document_id}/preview/encrypted"
                print(f"URL: {ui_encrypted_url}")
                
                encrypted_payload = {"password": doc_password}
                print(f"Payload: {encrypted_payload}")
                
                encrypted_response = await client.post(
                    ui_encrypted_url,
                    json=encrypted_payload,  # Send as JSON like the UI
                    headers=auth_headers
                )
                
                print(f"Status Code: {encrypted_response.status_code}")
                
                if encrypted_response.status_code == 200:
                    encrypted_data = encrypted_response.json()
                    print("[OK] Encrypted preview successful")
                    print(f"Preview type: {encrypted_data.get('type')}")
                    print(f"Content length: {len(str(encrypted_data.get('preview', '')))}")
                    print(f"Full response keys: {list(encrypted_data.keys())}")
                else:
                    print(f"[ERROR] Encrypted preview failed")
                    print(f"Status: {encrypted_response.status_code}")
                    print(f"Headers: {dict(encrypted_response.headers)}")
                    print(f"Response: {encrypted_response.text}")
                    
            except Exception as e:
                print(f"[ERROR] Encrypted preview error: {e}")
                import traceback
                traceback.print_exc()
                
        except Exception as e:
            print(f"[ERROR] General test error: {e}")
            import traceback
            traceback.print_exc()
    
    print()
    print("=== UI API TEST COMPLETED ===")

if __name__ == "__main__":
    asyncio.run(test_ui_api_calls())