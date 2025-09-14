# SecureVault – Cryptography Policy

## 1. Purpose
This document defines the cryptographic algorithms, parameters, and versioning rules used in SecureVault.  
It ensures that all encryption is modern, consistent, and upgradeable without breaking zero-knowledge principles.

---

## 2. Key Derivation
- **Primary KDF:** Argon2id
  - Parameters (v1.0 baseline):
    - timeCost: 3
    - memoryCost: 64 MB (65536 KiB)
    - parallelism: 4
    - outputLength: 256 bits
- **Fallback KDF (if Argon2id unavailable):** PBKDF2-HMAC-SHA-256
  - Parameters:
    - iterations: ≥ 200,000
    - salt: 128 bits (random, per user)
    - outputLength: 256 bits

- **Salts**
  - Must be generated randomly using a CSPRNG.
  - Stored on server alongside ciphertext.

- **Key Usage**
  - Master key derived from password is used only for further key derivation (via HKDF).
  - Never used directly for encryption.

---

## 3. Encryption
- **Approved Ciphers:**
  - AES-256-GCM (preferred, widely supported).
  - ChaCha20-Poly1305 (for mobile and low-power devices).

- **Parameters:**
  - AES-GCM IV/nonce size: 96 bits (random per operation).
  - ChaCha20 nonce size: 96 bits (random per operation).
  - Keys: 256 bits.
  - Tag length: 128 bits.

- **Data Encryption Flow:**
  1. Generate random IV/nonce.
  2. Encrypt plaintext with AEAD cipher (AES-256-GCM or ChaCha20-Poly1305).
  3. Store `{ ciphertext, iv, alg, version }`.

---

## 4. Integrity & Authentication
- All encryption must provide confidentiality **and** integrity.
- AEAD modes (AES-GCM, ChaCha20-Poly1305) are mandatory.
- If data is tampered, decryption must fail with an error.

---

## 5. Versioning & Migration
- Each encrypted object must include:
  ```json
  {
    "version": 1,
    "algorithm": "AES-256-GCM",
    "kdf": "argon2id",
    "kdf_params": { "time": 3, "memory": 65536, "parallelism": 4 }
  }
