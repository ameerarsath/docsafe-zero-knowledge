"""
Flask Backend Encryption Fix for SecureVault
Minimal fix to ensure proper Base64 encoding and AES-GCM format compatibility with React frontend
"""

import base64
import secrets
import json
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend


def derive_key_pbkdf2(password: str, salt: bytes, iterations: int = 500000) -> bytes:
    """Derive key using PBKDF2-SHA256 - FIXED VERSION"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 256 bits for AES-256
        salt=salt,
        iterations=iterations,
        backend=default_backend()
    )
    return kdf.derive(password.encode('utf-8'))


def encrypt_aes_gcm_fixed(plaintext: bytes, key: bytes) -> dict:
    """
    Encrypt data using AES-256-GCM - FIXED VERSION
    Returns properly formatted data for React WebCrypto compatibility
    """
    # Generate random 12-byte IV for AES-GCM
    iv = secrets.token_bytes(12)
    
    # Encrypt using AES-GCM
    aesgcm = AESGCM(key)
    ciphertext_with_tag = aesgcm.encrypt(iv, plaintext, None)
    
    # CRITICAL FIX: Split ciphertext and auth tag
    # AES-GCM returns: ciphertext + 16-byte auth tag
    ciphertext = ciphertext_with_tag[:-16]
    auth_tag = ciphertext_with_tag[-16:]
    
    # Return Base64 encoded components
    return {
        'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
        'iv': base64.b64encode(iv).decode('utf-8'),
        'auth_tag': base64.b64encode(auth_tag).decode('utf-8'),
        'algorithm': 'AES-256-GCM'
    }


def decrypt_aes_gcm_fixed(ciphertext_b64: str, iv_b64: str, auth_tag_b64: str, key: bytes) -> bytes:
    """
    Decrypt data using AES-256-GCM - FIXED VERSION
    Compatible with React WebCrypto format
    """
    try:
        # Decode Base64 components
        ciphertext = base64.b64decode(ciphertext_b64)
        iv = base64.b64decode(iv_b64)
        auth_tag = base64.b64decode(auth_tag_b64)
        
        # Validate sizes
        if len(iv) != 12:
            raise ValueError(f"IV must be 12 bytes, got {len(iv)}")
        if len(auth_tag) != 16:
            raise ValueError(f"Auth tag must be 16 bytes, got {len(auth_tag)}")
        
        # CRITICAL FIX: Combine ciphertext + auth tag for AES-GCM
        combined_data = ciphertext + auth_tag
        
        # Decrypt
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(iv, combined_data, None)
        
        return plaintext
        
    except Exception as e:
        raise ValueError(f"Decryption failed: {str(e)}")


def create_validation_payload_fixed(username: str, master_key: bytes) -> dict:
    """Create validation payload for key verification - FIXED VERSION"""
    validation_string = f"validation:{username}"
    encrypted = encrypt_aes_gcm_fixed(validation_string.encode('utf-8'), master_key)
    
    return {
        'ciphertext': encrypted['ciphertext'],
        'iv': encrypted['iv'],
        'authTag': encrypted['auth_tag']  # Note: 'authTag' not 'auth_tag' for frontend compatibility
    }


def flask_login_endpoint_fixed(username: str, password: str, encryption_password: str) -> dict:
    """
    Fixed Flask login endpoint that returns properly formatted encryption data
    """
    try:
        # Generate salt for encryption key derivation
        salt = secrets.token_bytes(32)
        salt_b64 = base64.b64encode(salt).decode('utf-8')
        
        # Derive master key from encryption password
        master_key = derive_key_pbkdf2(encryption_password, salt, 500000)
        
        # Create validation payload
        validation_payload = create_validation_payload_fixed(username, master_key)
        
        # Return login response with encryption parameters
        return {
            'access_token': 'dummy_jwt_token',  # Replace with actual JWT
            'refresh_token': 'dummy_refresh_token',
            'token_type': 'bearer',
            'expires_in': 3600,
            'user_id': 1,
            'username': username,
            'role': 'user',
            'must_change_password': False,
            'mfa_required': False,
            # FIXED: Zero-Knowledge encryption parameters
            'encryption_salt': salt_b64,
            'key_verification_payload': json.dumps(validation_payload),
            'encryption_method': 'PBKDF2-SHA256',
            'key_derivation_iterations': 500000
        }
        
    except Exception as e:
        raise Exception(f"Login failed: {str(e)}")


def flask_document_encrypt_fixed(document_data: bytes, master_key: bytes) -> dict:
    """
    Fixed Flask document encryption that returns properly formatted data
    """
    try:
        # Generate DEK (Document Encryption Key)
        dek = secrets.token_bytes(32)
        
        # Encrypt document with DEK
        encrypted_doc = encrypt_aes_gcm_fixed(document_data, dek)
        
        # Encrypt DEK with master key
        encrypted_dek = encrypt_aes_gcm_fixed(dek, master_key)
        
        return {
            'document': {
                'ciphertext': encrypted_doc['ciphertext'],
                'iv': encrypted_doc['iv'],
                'auth_tag': encrypted_doc['auth_tag']
            },
            'encrypted_dek': {
                'ciphertext': encrypted_dek['ciphertext'],
                'iv': encrypted_dek['iv'],
                'auth_tag': encrypted_dek['auth_tag']
            },
            'algorithm': 'AES-256-GCM'
        }
        
    except Exception as e:
        raise Exception(f"Document encryption failed: {str(e)}")


# Test the fixes
if __name__ == "__main__":
    print("Testing Flask Backend Crypto Fixes...")
    
    # Test parameters
    username = "rahumana"
    password = "TestPass123@"
    encryption_password = "JHNpAZ39g!&Y"
    
    try:
        # Test login endpoint
        print("1. Testing login endpoint...")
        login_response = flask_login_endpoint_fixed(username, password, encryption_password)
        print(f"SUCCESS: Login successful: {login_response['username']}")
        
        # Test key derivation
        print("2. Testing key derivation...")
        salt = base64.b64decode(login_response['encryption_salt'])
        derived_key = derive_key_pbkdf2(encryption_password, salt, 500000)
        print(f"SUCCESS: Key derived: {len(derived_key)} bytes")
        
        # Test validation payload
        print("3. Testing validation payload...")
        validation_payload = json.loads(login_response['key_verification_payload'])
        decrypted = decrypt_aes_gcm_fixed(
            validation_payload['ciphertext'],
            validation_payload['iv'],
            validation_payload['authTag'],
            derived_key
        )
        expected = f"validation:{username}"
        assert decrypted.decode('utf-8') == expected
        print(f"SUCCESS: Validation payload verified: {decrypted.decode('utf-8')}")
        
        # Test document encryption
        print("4. Testing document encryption...")
        test_doc = b"This is a test document content"
        encrypted_doc = flask_document_encrypt_fixed(test_doc, derived_key)
        print(f"SUCCESS: Document encrypted: {len(encrypted_doc['document']['ciphertext'])} chars")
        
        print("\nAll Flask backend crypto fixes working correctly!")
        
    except Exception as e:
        print(f"ERROR: Test failed: {str(e)}")
        import traceback
        traceback.print_exc()