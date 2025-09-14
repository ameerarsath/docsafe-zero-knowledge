# SecureVault – Security Rules

## 1. Zero-Knowledge Principle
- All sensitive data **must be encrypted on the client device** before leaving it.
- The server must **never have access to plaintext data** or user-derived keys.
- Only ciphertext, non-sensitive metadata, and cryptographic parameters may be stored on the server.

---

## 2. Cryptography Rules
- **Key Derivation**
  - Derive encryption keys from the user’s master password using a memory-hard KDF:
    - Preferred: **Argon2id** (recommended parameters: timeCost ≥ 3, memoryCost ≥ 64MB, parallelism ≥ 4).
    - Fallback: **PBKDF2-HMAC-SHA-256** with ≥ 200,000 iterations.
  - Each user must have a unique random salt.

- **Encryption**
  - Use authenticated encryption only:
    - **AES-256-GCM** or **ChaCha20-Poly1305**.
  - Generate a fresh random nonce/IV for every encryption operation.

- **Integrity**
  - Ciphertext must be verified before decryption. If integrity check fails, data must be rejected.

- **Key Management**
  - Encryption keys must never leave the client device.
  - Keys must be stored only in secure OS-provided storage (e.g., Keychain, Keystore, DPAPI).
  - Keys in memory must be cleared immediately after use.

---

## 3. Data Storage Rules
- Allowed fields on the server for each encrypted object:
  ```json
  {
    "ciphertext": "<base64>",
    "iv": "<base64>",
    "salt": "<base64>",
    "kdf_params": { "type": "argon2id", "iterations": 3, "memory": 65536, "parallelism": 4 },
    "algorithm": "AES-256-GCM",
    "version": 1,
    "metadata": { "createdAt": "...", "updatedAt": "..." }
  }
