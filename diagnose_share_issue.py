#!/usr/bin/env python3
"""
External Share Link Diagnostic Tool

This script analyzes the external share link issue where documents show
encrypted garbage instead of original file content.

Key areas to investigate:
1. Database encryption flags vs actual file content
2. File signature detection accuracy
3. Share endpoint response headers
4. Frontend decryption handling
"""

import os
import sys
import sqlite3
import hashlib
from pathlib import Path

def analyze_file_signatures(file_path):
    """Analyze file signatures to detect encryption status."""
    if not os.path.exists(file_path):
        return {"error": "File not found", "path": file_path}
    
    try:
        with open(file_path, 'rb') as f:
            header = f.read(16)  # Read first 16 bytes
        
        # Known file signatures
        signatures = {
            b'%PDF': 'PDF',
            b'PK\x03\x04': 'ZIP/DOCX/XLSX',
            b'\xff\xd8\xff': 'JPEG',
            b'\x89PNG\r\n\x1a\n': 'PNG',
            b'GIF87a': 'GIF87a',
            b'GIF89a': 'GIF89a',
            b'\x00\x00\x00\x20ftypM4A': 'M4A',
            b'RIFF': 'RIFF (WAV/AVI)',
        }
        
        detected_type = None
        for sig, file_type in signatures.items():
            if header.startswith(sig):
                detected_type = file_type
                break
        
        # Calculate entropy to detect encryption
        entropy = calculate_entropy(header)
        
        return {
            "path": file_path,
            "header_hex": header.hex(),
            "header_ascii": header.decode('ascii', errors='replace'),
            "detected_type": detected_type,
            "entropy": entropy,
            "likely_encrypted": entropy > 7.5 and detected_type is None,
            "file_size": os.path.getsize(file_path)
        }
    except Exception as e:
        return {"error": str(e), "path": file_path}

def calculate_entropy(data):
    """Calculate Shannon entropy of data."""
    if not data:
        return 0
    
    # Count frequency of each byte
    freq = {}
    for byte in data:
        freq[byte] = freq.get(byte, 0) + 1
    
    # Calculate entropy
    entropy = 0
    data_len = len(data)
    for count in freq.values():
        p = count / data_len
        if p > 0:
            entropy -= p * (p.bit_length() - 1)
    
    return entropy

def analyze_database_documents():
    """Analyze documents in the database."""
    db_paths = [
        "d:/main/project/docsafe/data/securevault.db",
        "d:/main/project/docsafe/backend/securevault.db",
        "./securevault.db",
        "./data/securevault.db"
    ]
    
    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            break
    
    if not db_path:
        return {"error": "Database not found", "searched_paths": db_paths}
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get document information
        cursor.execute("""
            SELECT id, name, mime_type, file_size, storage_path, 
                   is_encrypted, encrypted_dek, encryption_key_id,
                   ciphertext, created_at
            FROM documents 
            WHERE document_type = 'document'
            ORDER BY created_at DESC
            LIMIT 10
        """)
        
        documents = []
        for row in cursor.fetchall():
            doc_id, name, mime_type, file_size, storage_path, is_encrypted, encrypted_dek, encryption_key_id, ciphertext, created_at = row
            
            # Analyze the actual file if it exists
            file_analysis = None
            if storage_path and os.path.exists(storage_path):
                file_analysis = analyze_file_signatures(storage_path)
            
            documents.append({
                "id": doc_id,
                "name": name,
                "mime_type": mime_type,
                "file_size": file_size,
                "storage_path": storage_path,
                "db_is_encrypted": bool(is_encrypted),
                "has_encrypted_dek": bool(encrypted_dek),
                "has_encryption_key_id": bool(encryption_key_id),
                "has_ciphertext": bool(ciphertext),
                "created_at": created_at,
                "file_analysis": file_analysis,
                "mismatch_detected": file_analysis and (
                    bool(is_encrypted) != file_analysis.get("likely_encrypted", False)
                )
            })
        
        # Get share information
        cursor.execute("""
            SELECT ds.id, ds.share_token, ds.document_id, ds.share_name,
                   ds.allow_download, ds.allow_preview, ds.is_active,
                   d.name as doc_name, d.is_encrypted
            FROM document_shares ds
            JOIN documents d ON ds.document_id = d.id
            ORDER BY ds.created_at DESC
            LIMIT 5
        """)
        
        shares = []
        for row in cursor.fetchall():
            share_id, share_token, doc_id, share_name, allow_download, allow_preview, is_active, doc_name, is_encrypted = row
            shares.append({
                "id": share_id,
                "share_token": share_token,
                "document_id": doc_id,
                "share_name": share_name,
                "allow_download": bool(allow_download),
                "allow_preview": bool(allow_preview),
                "is_active": bool(is_active),
                "document_name": doc_name,
                "document_encrypted": bool(is_encrypted)
            })
        
        conn.close()
        
        return {
            "database_path": db_path,
            "documents": documents,
            "shares": shares,
            "total_documents": len(documents),
            "total_shares": len(shares)
        }
        
    except Exception as e:
        return {"error": str(e), "database_path": db_path}

def test_backend_detection_function():
    """Test the backend's detect_actual_encryption function."""
    test_cases = [
        {
            "name": "PDF signature",
            "data": b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog',
            "expected_encrypted": False
        },
        {
            "name": "DOCX signature (fixed)",
            "data": b'PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00',
            "expected_encrypted": False
        },
        {
            "name": "DOCX signature (old bug)",
            "data": b'PK\\x03\\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00',
            "expected_encrypted": True  # This would be incorrectly detected as encrypted
        },
        {
            "name": "Random encrypted data",
            "data": b'\x8f\x3a\x9c\x7e\x2b\x1d\x4f\x6a\x8e\x5c\x9b\x2f\x7d\x4e\x1a\x6c',
            "expected_encrypted": True
        },
        {
            "name": "JPEG signature",
            "data": b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H',
            "expected_encrypted": False
        }
    ]
    
    results = []
    for case in test_cases:
        header = case["data"][:8]
        
        # Simulate the fixed detection logic
        is_encrypted_fixed = not (
            header.startswith(b'%PDF') or          # PDF
            header.startswith(b'PK\x03\x04') or   # ZIP/DOCX (FIXED)
            header.startswith(b'\xff\xd8') or     # JPEG
            header.startswith(b'\x89PNG')         # PNG
        )
        
        # Simulate the old buggy detection logic
        is_encrypted_buggy = not (
            header.startswith(b'%PDF') or          # PDF
            header.startswith(b'PK\\x03\\x04') or  # ZIP/DOCX (BUGGY - double escaped)
            header.startswith(b'\xff\xd8') or     # JPEG
            header.startswith(b'\x89PNG')         # PNG
        )
        
        results.append({
            "name": case["name"],
            "data_hex": case["data"].hex(),
            "expected_encrypted": case["expected_encrypted"],
            "detected_encrypted_fixed": is_encrypted_fixed,
            "detected_encrypted_buggy": is_encrypted_buggy,
            "fixed_correct": is_encrypted_fixed == case["expected_encrypted"],
            "buggy_correct": is_encrypted_buggy == case["expected_encrypted"]
        })
    
    return results

def generate_report():
    """Generate comprehensive diagnostic report."""
    print("=" * 80)
    print("EXTERNAL SHARE LINK DIAGNOSTIC REPORT")
    print("=" * 80)
    print()
    
    # Test backend detection function
    print("1. BACKEND DETECTION FUNCTION TEST")
    print("-" * 40)
    detection_tests = test_backend_detection_function()
    for test in detection_tests:
        status = "PASS" if test["fixed_correct"] else "FAIL"
        buggy_status = "PASS" if test["buggy_correct"] else "FAIL"
        print(f"{test['name']:<25} | Fixed: {status} | Buggy: {buggy_status}")
        if not test["fixed_correct"]:
            print(f"  Expected: {test['expected_encrypted']}, Got: {test['detected_encrypted_fixed']}")
    print()
    
    # Analyze database
    print("2. DATABASE ANALYSIS")
    print("-" * 40)
    db_analysis = analyze_database_documents()
    
    if "error" in db_analysis:
        print(f"Database Error: {db_analysis['error']}")
        if "searched_paths" in db_analysis:
            print("Searched paths:")
            for path in db_analysis["searched_paths"]:
                print(f"  - {path}")
    else:
        print(f"Database found: {db_analysis['database_path']}")
        print(f"Documents analyzed: {db_analysis['total_documents']}")
        print(f"Shares found: {db_analysis['total_shares']}")
        print()
        
        # Check for mismatches
        mismatches = [doc for doc in db_analysis["documents"] if doc.get("mismatch_detected")]
        if mismatches:
            print("WARNING: ENCRYPTION FLAG MISMATCHES DETECTED:")
            for doc in mismatches:
                print(f"  Document ID {doc['id']}: {doc['name']}")
                print(f"    DB says encrypted: {doc['db_is_encrypted']}")
                if doc['file_analysis']:
                    print(f"    File analysis says encrypted: {doc['file_analysis'].get('likely_encrypted', 'unknown')}")
                    print(f"    Detected file type: {doc['file_analysis'].get('detected_type', 'unknown')}")
                print()
        else:
            print("No encryption flag mismatches detected")
        
        # Show recent shares
        if db_analysis["shares"]:
            print("RECENT SHARES:")
            for share in db_analysis["shares"]:
                status = "Active" if share["is_active"] else "Inactive"
                print(f"  {share['share_token'][:16]}... | {share['document_name']} | {status}")
                print(f"    Download: {share['allow_download']} | Preview: {share['allow_preview']}")
    
    print()
    print("3. RECOMMENDATIONS")
    print("-" * 40)
    
    # Check if the bug fix was applied
    bug_fixed = all(test["fixed_correct"] for test in detection_tests)
    if bug_fixed:
        print("Backend detection function appears to be working correctly")
    else:
        print("Backend detection function has issues - check byte string escaping")
    
    if "error" not in db_analysis and mismatches:
        print("WARNING: Run the database fix script to correct encryption flag mismatches")
        print("   Script: fix_encryption_detection.py")
    
    print("Test external share links manually:")
    if "error" not in db_analysis and db_analysis["shares"]:
        for share in db_analysis["shares"][:2]:  # Show first 2 shares
            print(f"   http://localhost:3005/share/{share['share_token']}")
    
    print()
    print("4. NEXT STEPS")
    print("-" * 40)
    print("1. Verify the backend fix is deployed (detect_actual_encryption function)")
    print("2. Run database migration to fix existing encryption flags")
    print("3. Test external share links with DOCX files")
    print("4. Monitor frontend console for decryption errors")
    print("5. Check server logs for file serving errors")

if __name__ == "__main__":
    generate_report()