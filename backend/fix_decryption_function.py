"""
Fix for decrypt_document_for_sharing function to handle proper encryption formats
"""

# Fixed decryption function
def decrypt_document_for_sharing(document, encrypted_data: bytes, password: str) -> bytes:
    """Decrypt document content for external sharing."""
    print(f"\n🔐 DECRYPTING DOCUMENT {document.id} FOR EXTERNAL SHARE")
    print(f"Password length: {len(password) if password else 0}")
    print(f"Encrypted data length: {len(encrypted_data)} bytes")
    print(f"Document is_encrypted: {getattr(document, 'is_encrypted', False)}")
    print(f"Document has salt: {bool(getattr(document, 'salt', None))}")
    print(f"Document has encryption_iv: {bool(getattr(document, 'encryption_iv', None))}")
    print(f"Document has encrypted_dek: {bool(getattr(document, 'encrypted_dek', None))}")
    print(f"Document has ciphertext: {bool(getattr(document, 'ciphertext', None))}")

    # Check if cryptography is available
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.backends import default_backend
        import base64
        CRYPTO_AVAILABLE = True
    except ImportError:
        CRYPTO_AVAILABLE = False

    if not CRYPTO_AVAILABLE:
        raise ValueError("Cryptography library not available for decryption")

    try:
        # Check if we have the modern zero-knowledge encryption format
        if (hasattr(document, 'encrypted_dek') and document.encrypted_dek and
            hasattr(document, 'ciphertext') and document.ciphertext and
            hasattr(document, 'salt') and document.salt):

            print("🔑 Using modern zero-knowledge encryption format")

            # Get salt from document
            salt = base64.b64decode(document.salt)

            # Derive master key from password using higher iterations for security
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=500000,  # Match frontend iterations
                backend=default_backend()
            )
            master_key = kdf.derive(password.encode())
            print("✅ Master key derived successfully")

            # Decrypt the DEK (Document Encryption Key)
            encrypted_dek_data = base64.b64decode(document.encrypted_dek)

            # For AES-GCM, the format is: IV (12 bytes) + ciphertext + auth tag (16 bytes)
            if len(encrypted_dek_data) < 28:  # 12 + 16 minimum
                raise ValueError(f"Invalid encrypted DEK format: {len(encrypted_dek_data)} bytes")

            dek_iv = encrypted_dek_data[:12]  # First 12 bytes are IV for GCM
            dek_ciphertext = encrypted_dek_data[12:-16]  # Middle part is encrypted DEK
            dek_tag = encrypted_dek_data[-16:]  # Last 16 bytes are auth tag

            print(f"📦 DEK decryption - IV: {len(dek_iv)} bytes, Ciphertext: {len(dek_ciphertext)} bytes, Tag: {len(dek_tag)} bytes")

            # Decrypt DEK using AES-GCM
            aesgcm = AESGCM(master_key)
            dek = aesgcm.decrypt(dek_iv, dek_ciphertext + dek_tag, None)
            print("✅ DEK decrypted successfully")

            # Now decrypt the document content using the DEK
            ciphertext_data = base64.b64decode(document.ciphertext)

            if len(ciphertext_data) < 28:  # 12 + 16 minimum
                raise ValueError(f"Invalid document ciphertext format: {len(ciphertext_data)} bytes")

            doc_iv = ciphertext_data[:12]  # First 12 bytes are IV
            doc_ciphertext = ciphertext_data[12:-16]  # Middle part is encrypted content
            doc_tag = ciphertext_data[-16:]  # Last 16 bytes are auth tag

            print(f"📄 Document decryption - IV: {len(doc_iv)} bytes, Ciphertext: {len(doc_ciphertext)} bytes, Tag: {len(doc_tag)} bytes")

            # Decrypt document content using DEK
            doc_aesgcm = AESGCM(dek)
            decrypted_content = doc_aesgcm.decrypt(doc_iv, doc_ciphertext + doc_tag, None)

            print(f"✅ Document decrypted successfully! Size: {len(decrypted_content)} bytes")
            return decrypted_content

        # Check if we have the legacy direct encryption format
        elif (hasattr(document, 'is_encrypted') and document.is_encrypted and
              hasattr(document, 'encryption_iv') and document.encryption_iv and
              hasattr(document, 'encryption_auth_tag') and document.encryption_auth_tag):

            print("🔑 Using legacy direct encryption format")

            # Get encryption metadata
            iv = base64.b64decode(document.encryption_iv)
            auth_tag = base64.b64decode(document.encryption_auth_tag)

            # The encrypted_data should be the ciphertext
            ciphertext = encrypted_data

            # Get salt for key derivation
            salt = base64.b64decode(document.salt) if hasattr(document, 'salt') and document.salt else b'legacy_salt_16bytes'

            # Derive key from password
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,  # Legacy iterations
                backend=default_backend()
            )
            key = kdf.derive(password.encode())

            print(f"🔐 Legacy decryption - IV: {len(iv)} bytes, Ciphertext: {len(ciphertext)} bytes, Tag: {len(auth_tag)} bytes")

            # Decrypt using AES-GCM
            aesgcm = AESGCM(key)
            decrypted_content = aesgcm.decrypt(iv, ciphertext + auth_tag, None)

            print(f"✅ Legacy document decrypted successfully! Size: {len(decrypted_content)} bytes")
            return decrypted_content

        else:
            # Document might be using raw file-based encryption
            print("🔍 Trying raw file-based encryption format")

            if hasattr(document, 'salt') and document.salt:
                salt = base64.b64decode(document.salt)

                # Derive key from password
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=salt,
                    iterations=500000,
                    backend=default_backend()
                )
                key = kdf.derive(password.encode())

                # Try to decrypt the encrypted_data directly
                # Format: IV (12 bytes) + ciphertext + auth tag (16 bytes)
                if len(encrypted_data) < 28:
                    raise ValueError(f"Invalid encrypted data format: {len(encrypted_data)} bytes")

                iv = encrypted_data[:12]
                ciphertext = encrypted_data[12:-16]
                auth_tag = encrypted_data[-16:]

                print(f"🔐 Raw format decryption - IV: {len(iv)} bytes, Ciphertext: {len(ciphertext)} bytes, Tag: {len(auth_tag)} bytes")

                aesgcm = AESGCM(key)
                decrypted_content = aesgcm.decrypt(iv, ciphertext + auth_tag, None)

                print(f"✅ Raw format decrypted successfully! Size: {len(decrypted_content)} bytes")
                return decrypted_content
            else:
                raise ValueError("Document is marked as encrypted but no encryption metadata was found.")

    except Exception as e:
        print(f"❌ DECRYPTION FAILED: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise ValueError(f"Failed to decrypt document: {str(e)}")


# Print the function for copying
print("Fixed decrypt_document_for_sharing function:")
print("=" * 80)
print(decrypt_document_for_sharing.__doc__)
print("=" * 80)
print("Function code ready to be copied into shares.py")