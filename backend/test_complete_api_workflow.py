#!/usr/bin/env python3
"""
Test complete API workflow for Network Topologies.docx with authentication
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio
import httpx
import json
from app.core.database import get_db
from app.models.document import Document
from app.models.user import User

async def test_complete_api_workflow():
    """Test complete API workflow with authentication"""
    
    base_url = "http://localhost:8002"
    
    # Test data
    username = "admin"
    password = "admin123"  # Default admin password
    document_id = 8
    doc_password = "Ameer"
    
    async with httpx.AsyncClient() as client:
        try:
            print("=== COMPLETE API WORKFLOW TEST ===")
            print(f"Testing document ID {document_id} with password '{doc_password}'")
            print()
            
            # Step 1: Login and get access token
            print("=== STEP 1: Authentication ===")
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
                    print(f"SUCCESS: Login successful!")
                    print(f"Token type: {token_data.get('token_type', 'bearer')}")
                else:
                    print(f"ERROR: Login failed: {login_response.status_code}")
                    print(f"Response: {login_response.text}")
                    return
                    
            except Exception as e:
                print(f"ERROR: Login error: {e}")
                return
            
            # Headers with authentication
            auth_headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            print()
            
            # Step 2: Initial preview request (should detect encryption)
            print("=== STEP 2: Initial Preview (Should Detect Encryption) ===")
            try:
                preview_response = await client.get(
                    f"{base_url}/api/v1/documents/{document_id}/preview",
                    headers=auth_headers
                )
                
                if preview_response.status_code == 200:
                    preview_data = preview_response.json()
                    print(f"SUCCESS: Initial preview successful!")
                    print(f"Preview type: {preview_data.get('type')}")
                    print(f"Requires password: {preview_data.get('requires_password')}")
                    print(f"Encryption type: {preview_data.get('encryption_type')}")
                    print(f"Message: {preview_data.get('message')}")
                    
                    # Verify it detected encryption
                    if preview_data.get('type') == 'encrypted' and preview_data.get('requires_password'):
                        print("SUCCESS: Encryption detection working correctly!")
                    else:
                        print("ERROR: Encryption detection failed!")
                        return
                        
                else:
                    print(f"ERROR: Initial preview failed: {preview_response.status_code}")
                    print(f"Response: {preview_response.text}")
                    return
                    
            except Exception as e:
                print(f"ERROR: Initial preview error: {e}")
                return
            
            print()
            
            # Step 3: Encrypted preview with password
            print("=== STEP 3: Encrypted Preview with Password ===")
            try:
                encrypted_preview_data = {
                    "password": doc_password
                }
                
                encrypted_response = await client.post(
                    f"{base_url}/api/v1/documents/{document_id}/preview/encrypted",
                    json=encrypted_preview_data,
                    headers=auth_headers
                )
                
                if encrypted_response.status_code == 200:
                    encrypted_data = encrypted_response.json()
                    print(f"SUCCESS: Encrypted preview successful!")
                    print(f"Preview type: {encrypted_data.get('type')}")
                    print(f"Document name: {encrypted_data.get('document_name')}")
                    print(f"Preview content length: {len(str(encrypted_data.get('preview', '')))}")
                    
                    # Show preview content snippet
                    preview_content = encrypted_data.get('preview', '')
                    if isinstance(preview_content, str):
                        print(f"Content snippet: {preview_content[:200]}...")
                    else:
                        print(f"Preview data type: {type(preview_content)}")
                        
                    # Verify it's decrypted type
                    if encrypted_data.get('type') == 'decrypted':
                        print("SUCCESS: Decryption and preview generation working correctly!")
                    else:
                        print("ERROR: Decryption failed or wrong response type!")
                        
                else:
                    print(f"ERROR: Encrypted preview failed: {encrypted_response.status_code}")
                    print(f"Response: {encrypted_response.text}")
                    return
                    
            except Exception as e:
                print(f"ERROR: Encrypted preview error: {e}")
                return
            
            print()
            
            # Step 4: Test wrong password
            print("=== STEP 4: Test Wrong Password ===")
            try:
                wrong_password_data = {
                    "password": "wrongpassword123"
                }
                
                wrong_response = await client.post(
                    f"{base_url}/api/v1/documents/{document_id}/preview/encrypted",
                    json=wrong_password_data,
                    headers=auth_headers
                )
                
                if wrong_response.status_code == 401:
                    print("SUCCESS: Wrong password correctly rejected!")
                    print(f"Error message: {wrong_response.json().get('detail', 'No detail')}")
                else:
                    print(f"ERROR: Wrong password handling failed: {wrong_response.status_code}")
                    print(f"Response: {wrong_response.text}")
                    
            except Exception as e:
                print(f"ERROR: Wrong password test error: {e}")
            
            print()
            
            # Step 5: Test supported formats
            print("=== STEP 5: Test Supported Preview Formats ===")
            try:
                formats_response = await client.get(
                    f"{base_url}/api/v1/documents/{document_id}/preview/formats",
                    headers=auth_headers
                )
                
                if formats_response.status_code == 200:
                    formats_data = formats_response.json()
                    print("SUCCESS: Preview formats retrieval successful!")
                    print(f"Supported previews: {formats_data.get('supported_previews', [])}")
                    print(f"Recommended preview: {formats_data.get('recommended_preview')}")
                else:
                    print(f"ERROR: Preview formats failed: {formats_response.status_code}")
                    
            except Exception as e:
                print(f"ERROR: Preview formats error: {e}")
                
        except Exception as e:
            print(f"ERROR: General test error: {e}")
            
    print()
    print("=== API WORKFLOW TEST COMPLETED ===")

if __name__ == "__main__":
    asyncio.run(test_complete_api_workflow())