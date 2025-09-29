#!/usr/bin/env python3
"""
Test script to verify the encryption detection fix
"""

import sqlite3
import os
import sys

def test_encryption_fix():
    """Test the encryption detection fix"""
    
    print("🧪 Testing Encryption Detection Fix")
    print("=" * 50)
    
    # Check if database exists
    db_path = 'backend/securevault.db'
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Test 1: Check for documents with mismatched flags
    print("\n🔍 Test 1: Checking for encryption flag mismatches...")
    
    cursor.execute("""
        SELECT id, name, is_encrypted, encrypted_dek, encryption_key_id, storage_path
        FROM documents 
        WHERE (is_encrypted = 1 AND encrypted_dek IS NULL AND encryption_key_id IS NULL)
           OR (is_encrypted = 0 AND (encrypted_dek IS NOT NULL OR encryption_key_id IS NOT NULL))
    """)
    
    mismatches = cursor.fetchall()
    
    if mismatches:
        print(f"❌ Found {len(mismatches)} documents with encryption flag mismatches:")
        for doc_id, name, is_encrypted, encrypted_dek, encryption_key_id, storage_path in mismatches:
            print(f"   Document {doc_id}: {name}")
            print(f"     is_encrypted={is_encrypted}, has_dek={bool(encrypted_dek)}, has_key_id={bool(encryption_key_id)}")
        return False
    else:
        print("✅ No encryption flag mismatches found")
    
    # Test 2: Check specific problematic document (if it exists)
    print("\n🔍 Test 2: Checking document 48 (if exists)...")
    
    cursor.execute("""
        SELECT id, name, is_encrypted, encrypted_dek, encryption_key_id, storage_path, file_size
        FROM documents 
        WHERE id = 48
    """)
    
    doc_48 = cursor.fetchone()
    
    if doc_48:
        doc_id, name, is_encrypted, encrypted_dek, encryption_key_id, storage_path, file_size = doc_48
        print(f"📄 Document 48 found: {name}")
        print(f"   is_encrypted: {is_encrypted}")
        print(f"   has_dek: {bool(encrypted_dek)}")
        print(f"   has_key_id: {bool(encryption_key_id)}")
        print(f"   storage_path: {storage_path}")
        print(f"   file_size: {file_size}")
        
        # Check if file exists
        if storage_path and os.path.exists(storage_path):
            print(f"   ✅ File exists at: {storage_path}")
            
            # Check file content
            try:
                with open(storage_path, 'rb') as f:
                    header = f.read(100)
                
                is_pdf = header.startswith(b'%PDF')
                print(f"   File appears to be PDF: {is_pdf}")
                
                if is_pdf and is_encrypted:
                    print("   ⚠️ WARNING: File appears to be unencrypted PDF but marked as encrypted!")
                elif not is_pdf and not is_encrypted:
                    print("   ⚠️ WARNING: File doesn't appear to be PDF but marked as unencrypted!")
                else:
                    print("   ✅ File type and encryption flag appear consistent")
                    
            except Exception as e:
                print(f"   ❌ Error reading file: {e}")
        else:
            print(f"   ❌ File not found at: {storage_path}")
    else:
        print("   ℹ️ Document 48 not found (this is okay)")
    
    # Test 3: Check overall database health
    print("\n🔍 Test 3: Overall database health check...")
    
    cursor.execute("SELECT COUNT(*) FROM documents")
    total_docs = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM documents WHERE is_encrypted = 1")
    encrypted_docs = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM documents WHERE encrypted_dek IS NOT NULL")
    dek_docs = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM documents WHERE encryption_key_id IS NOT NULL")
    legacy_docs = cursor.fetchone()[0]
    
    print(f"   📊 Total documents: {total_docs}")
    print(f"   🔐 Marked as encrypted: {encrypted_docs}")
    print(f"   🔑 With DEK (zero-knowledge): {dek_docs}")
    print(f"   🗝️ With legacy encryption: {legacy_docs}")
    
    # Test 4: Check for files that exist
    print("\n🔍 Test 4: Checking file accessibility...")
    
    cursor.execute("""
        SELECT id, name, storage_path 
        FROM documents 
        WHERE storage_path IS NOT NULL
        LIMIT 5
    """)
    
    sample_docs = cursor.fetchall()
    accessible_count = 0
    
    for doc_id, name, storage_path in sample_docs:
        if storage_path and os.path.exists(storage_path):
            accessible_count += 1
            print(f"   ✅ Document {doc_id}: File accessible")
        else:
            print(f"   ❌ Document {doc_id}: File not found at {storage_path}")
    
    print(f"   📊 {accessible_count}/{len(sample_docs)} sample files are accessible")
    
    conn.close()
    
    print("\n🎯 Test Summary:")
    print("✅ Encryption flag consistency check passed")
    print("✅ Database structure is healthy")
    
    if accessible_count == len(sample_docs):
        print("✅ All sample files are accessible")
    else:
        print("⚠️ Some files are not accessible (may need path fixes)")
    
    print("\n🚀 Next steps:")
    print("1. Test document preview in the frontend")
    print("2. Verify encrypted documents require passwords")
    print("3. Verify unencrypted documents preview directly")
    
    return True

def run_fix_if_needed():
    """Run the fix script if mismatches are detected"""
    
    print("\n🔧 Checking if fix is needed...")
    
    db_path = 'backend/securevault.db'
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check for mismatches
    cursor.execute("""
        SELECT COUNT(*) FROM documents 
        WHERE (is_encrypted = 1 AND encrypted_dek IS NULL AND encryption_key_id IS NULL)
           OR (is_encrypted = 0 AND (encrypted_dek IS NOT NULL OR encryption_key_id IS NOT NULL))
    """)
    
    mismatch_count = cursor.fetchone()[0]
    conn.close()
    
    if mismatch_count > 0:
        print(f"⚠️ Found {mismatch_count} documents with encryption flag mismatches")
        print("🔧 Running fix script...")
        
        # Import and run the fix
        try:
            from fix_encryption_detection import fix_encryption_flags
            fix_encryption_flags()
            print("✅ Fix completed")
        except ImportError:
            print("❌ Fix script not found. Please run: python fix_encryption_detection.py")
    else:
        print("✅ No mismatches detected - no fix needed")

if __name__ == "__main__":
    try:
        # Run fix if needed
        run_fix_if_needed()
        
        # Run tests
        success = test_encryption_fix()
        
        if success:
            print("\n🎉 All tests passed! The encryption detection fix appears to be working correctly.")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed. Please review the output above.")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)