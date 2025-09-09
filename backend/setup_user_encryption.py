#!/usr/bin/env python3
"""Set up encryption for test user rahumana"""

from app.core.database import get_db, engine
from app.models.user import User
from sqlalchemy.orm import sessionmaker
import base64
import secrets
import json
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend

def derive_key_pbkdf2(password: str, salt: bytes, iterations: int) -> bytes:
    """Derive key using PBKDF2-SHA256."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations,
        backend=default_backend()
    )
    return kdf.derive(password.encode('utf-8'))

def create_validation_payload(username: str, master_key: bytes) -> dict:
    """Create validation payload for key verification matching frontend format."""
    # Create a simple validation string
    validation_string = f"validation_{username}_{secrets.token_hex(16)}"
    
    # Encrypt the validation string with the master key using AES-GCM
    aesgcm = AESGCM(master_key)
    iv = secrets.token_bytes(12)  # 12 bytes for GCM
    ciphertext_with_tag = aesgcm.encrypt(iv, validation_string.encode('utf-8'), None)
    
    # AES-GCM returns ciphertext + auth tag combined
    # Split them: last 16 bytes are auth tag, rest is ciphertext
    ciphertext = ciphertext_with_tag[:-16]
    auth_tag = ciphertext_with_tag[-16:]
    
    return {
        'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
        'iv': base64.b64encode(iv).decode('utf-8'),
        'authTag': base64.b64encode(auth_tag).decode('utf-8')
    }

try:
    # Create session
    Session = sessionmaker(bind=engine)
    db = Session()
    
    # Get test user
    user = db.query(User).filter(User.username == 'rahumana').first()
    if not user:
        print('User rahumana not found')
        exit(1)
    
    # Check if user already has encryption setup
    if user.encryption_salt and user.key_verification_payload:
        print('User already has encryption configured')
        db.close()
        exit(0)
    
    # Use the default encryption password from CLAUDE.md
    encryption_password = "JHNpAZ39g!&Y"
    
    # Generate encryption parameters
    salt = secrets.token_bytes(32)
    salt_base64 = base64.b64encode(salt).decode('utf-8')
    
    # Derive key and create validation payload
    master_key = derive_key_pbkdf2(encryption_password, salt, 500000)
    validation_payload = create_validation_payload(user.username, master_key)
    
    # Update user with encryption parameters
    user.encryption_salt = salt_base64
    user.key_verification_payload = json.dumps(validation_payload)
    user.encryption_method = "PBKDF2-SHA256"
    user.key_derivation_iterations = 500000
    
    db.commit()
    
    print(f'Set up encryption for user: {user.username}')
    print(f'Encryption password: {encryption_password}')
    print(f'Salt: {salt_base64[:20]}...')
    print(f'Validation payload configured')
    
    db.close()
    
except Exception as e:
    print(f'Error setting up encryption: {e}')
    import traceback
    traceback.print_exc()