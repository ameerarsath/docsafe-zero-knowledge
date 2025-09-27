#!/usr/bin/env python3
"""
Complete Share Workflow Test
Tests the entire document sharing functionality including creation, access, and preview.
"""

import asyncio
import json
import os
import sys
import tempfile
from pathlib import Path

import aiohttp
import aiofiles

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

# Test credentials
TEST_USER = {
    "username": "testuser",
    "password": "testpassword123"
}

# Global variables for test state
auth_token = None
test_document_id = None
test_share_token = None

async def log_message(message: str, level: str = "INFO"):
    """Log a message with formatting"""
    prefix = {
        "INFO": "[INFO]",
        "SUCCESS": "[PASS]",
        "ERROR": "[FAIL]",
        "WARNING": "[WARN]",
        "TEST": "[TEST]"
    }.get(level, "[LOG]")

    print(f"{prefix} {message}")

async def authenticate():
    """Authenticate user and get access token"""
    global auth_token

    await log_message("Authenticating user...", "TEST")

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_USER,
            headers={"Content-Type": "application/json"}
        ) as response:
            if response.status == 200:
                data = await response.json()
                auth_token = data.get("access_token")
                await log_message(f"Authentication successful! Token: {auth_token[:20]}...", "SUCCESS")
                return True
            else:
                error_text = await response.text()
                await log_message(f"Authentication failed: {response.status} - {error_text}", "ERROR")
                return False

async def create_test_document():
    """Create a test document for sharing"""
    global test_document_id

    await log_message("Creating test document...", "TEST")

    # Create a test file
    test_content = b"This is a test document for share workflow testing.\nLine 2\nLine 3"

    async with aiohttp.ClientSession() as session:
        # Create form data
        data = aiohttp.FormData()
        data.add_field('file', test_content, filename='test_share_workflow.txt', content_type='text/plain')
        data.add_field('encryption_password', 'test123')

        headers = {"Authorization": f"Bearer {auth_token}"}

        async with session.post(
            f"{API_BASE}/documents/upload",
            data=data,
            headers=headers
        ) as response:
            if response.status == 201:
                doc_data = await response.json()
                test_document_id = doc_data.get("id")
                await log_message(f"Test document created! ID: {test_document_id}", "SUCCESS")
                return True
            else:
                error_text = await response.text()
                await log_message(f"Document creation failed: {response.status} - {error_text}", "ERROR")
                return False

async def create_document_share():
    """Create a share for the test document"""
    global test_share_token

    await log_message("Creating document share...", "TEST")

    share_payload = {
        "document_id": test_document_id,
        "share_name": "Test Share Workflow",
        "share_type": "internal",
        "permissions": ["view", "download"],
        "expires_at": None,
        "encryption_password": "sharepass123"
    }

    async with aiohttp.ClientSession() as session:
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

        async with session.post(
            f"{API_BASE}/shares/?document_id={test_document_id}",
            json=share_payload,
            headers=headers
        ) as response:
            if response.status == 201:
                share_data = await response.json()
                test_share_token = share_data.get("share_id")
                await log_message(f"Share created successfully! Token: {test_share_token}", "SUCCESS")
                await log_message(f"Share URL: {share_data.get('url')}", "INFO")
                return True
            else:
                error_text = await response.text()
                await log_message(f"Share creation failed: {response.status} - {error_text}", "ERROR")
                return False

async def test_share_access():
    """Test accessing the shared document"""
    await log_message("Testing share access...", "TEST")

    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{API_BASE}/shares/{test_share_token}"
        ) as response:
            if response.status == 200:
                share_info = await response.json()
                await log_message("Share access successful!", "SUCCESS")
                await log_message(f"Share info: {json.dumps(share_info, indent=2)}", "INFO")
                return True
            else:
                error_text = await response.text()
                await log_message(f"Share access failed: {response.status} - {error_text}", "ERROR")
                return False

async def test_share_preview():
    """Test the share preview functionality"""
    await log_message("Testing share preview...", "TEST")

    preview_payload = {
        "password": "sharepass123"
    }

    async with aiohttp.ClientSession() as session:
        headers = {"Content-Type": "application/json"}

        async with session.post(
            f"{API_BASE}/shares/{test_share_token}/preview",
            json=preview_payload,
            headers=headers
        ) as response:
            if response.status == 200:
                content_type = response.headers.get('content-type', '')
                await log_message(f"Preview successful! Content-Type: {content_type}", "SUCCESS")

                if content_type.startswith('text/'):
                    preview_content = await response.text()
                    await log_message(f"Preview content (first 100 chars): {preview_content[:100]}", "INFO")
                else:
                    content_length = response.headers.get('content-length', 'unknown')
                    await log_message(f"Preview content length: {content_length} bytes", "INFO")

                return True
            else:
                error_text = await response.text()
                await log_message(f"Preview failed: {response.status} - {error_text}", "ERROR")
                return False

async def test_share_download():
    """Test downloading the shared document"""
    await log_message("Testing share download...", "TEST")

    download_payload = {
        "password": "sharepass123"
    }

    async with aiohttp.ClientSession() as session:
        headers = {"Content-Type": "application/json"}

        async with session.post(
            f"{API_BASE}/shares/{test_share_token}/download",
            json=download_payload,
            headers=headers
        ) as response:
            if response.status == 200:
                content = await response.read()
                content_disposition = response.headers.get('content-disposition', '')
                await log_message(f"Download successful! Content-Disposition: {content_disposition}", "SUCCESS")
                await log_message(f"Downloaded {len(content)} bytes", "INFO")
                return True
            else:
                error_text = await response.text()
                await log_message(f"Download failed: {response.status} - {error_text}", "ERROR")
                return False

async def test_wrong_password():
    """Test share access with wrong password"""
    await log_message("Testing wrong password handling...", "TEST")

    wrong_payload = {
        "password": "wrongpassword"
    }

    async with aiohttp.ClientSession() as session:
        headers = {"Content-Type": "application/json"}

        async with session.post(
            f"{API_BASE}/shares/{test_share_token}/preview",
            json=wrong_payload,
            headers=headers
        ) as response:
            if response.status in [401, 403]:
                await log_message("Wrong password correctly rejected!", "SUCCESS")
                return True
            else:
                error_text = await response.text()
                await log_message(f"Unexpected response for wrong password: {response.status} - {error_text}", "WARNING")
                return False

async def cleanup():
    """Clean up test resources"""
    await log_message("Cleaning up test resources...", "TEST")

    if test_document_id and auth_token:
        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {auth_token}"}

            # Delete the test document
            async with session.delete(
                f"{API_BASE}/documents/{test_document_id}",
                headers=headers
            ) as response:
                if response.status == 200:
                    await log_message("Test document deleted successfully", "SUCCESS")
                else:
                    await log_message(f"Failed to delete test document: {response.status}", "WARNING")

async def run_all_tests():
    """Run all tests in sequence"""
    await log_message("Starting Complete Share Workflow Test", "INFO")
    await log_message("="*50, "INFO")

    tests = [
        ("Authentication", authenticate),
        ("Document Creation", create_test_document),
        ("Share Creation", create_document_share),
        ("Share Access", test_share_access),
        ("Share Preview", test_share_preview),
        ("Share Download", test_share_download),
        ("Wrong Password Test", test_wrong_password),
        ("Cleanup", cleanup)
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        await log_message(f"\n--- {test_name} ---", "TEST")
        try:
            if await test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            await log_message(f"Test {test_name} failed with exception: {str(e)}", "ERROR")
            failed += 1

    await log_message("\n" + "="*50, "INFO")
    await log_message(f"Test Results: {passed} passed, {failed} failed", "INFO")

    if failed == 0:
        await log_message("All tests passed! SUCCESS!", "SUCCESS")
        return True
    else:
        await log_message(f"{failed} tests failed", "ERROR")
        return False

if __name__ == "__main__":
    # Run the test suite
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)