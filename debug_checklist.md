# Crypto Debug Checklist

## 1. Verify Base64 Encoding/Decoding
```javascript
// Test Base64 roundtrip
const testData = "Hello World";
const encoded = btoa(testData);
const decoded = atob(encoded);
console.log("Original:", testData);
console.log("Encoded:", encoded);
console.log("Decoded:", decoded);
console.log("Match:", testData === decoded);
```

## 2. Check Key Length
```python
# Backend - ensure 32 bytes for AES-256
key = os.urandom(32)
print(f"Key length: {len(key)} bytes")
```

```javascript
// Frontend - verify key import
const keyBuffer = CryptoUtils.base64ToArrayBuffer(keyBase64);
console.log("Key length:", keyBuffer.byteLength, "bytes");
```

## 3. Verify Nonce/IV Length
```python
# Backend - GCM nonce should be 12 bytes
nonce = os.urandom(12)
print(f"Nonce length: {len(nonce)} bytes")
```

## 4. Test Encryption/Decryption Roundtrip
```python
# Backend test
key = os.urandom(32)
plaintext = "test message"
encrypted = encrypt_data(plaintext, key)
decrypted = decrypt_data(encrypted['ciphertext'], encrypted['nonce'], encrypted['auth_tag'], key)
print(f"Roundtrip success: {plaintext == decrypted}")
```

## 5. Check Network Response
```javascript
// Frontend - log raw response
const response = await fetch('/api/auth/login', {...});
const data = await response.json();
console.log("Response data:", data);
console.log("Ciphertext length:", data.encrypted_data?.ciphertext?.length);
console.log("Nonce length:", data.encrypted_data?.nonce?.length);
console.log("Auth tag length:", data.encrypted_data?.auth_tag?.length);
```

## 6. Validate Base64 Format
```javascript
// Check if Base64 is valid
function isValidBase64(str) {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
}

console.log("Valid ciphertext:", isValidBase64(data.encrypted_data.ciphertext));
console.log("Valid nonce:", isValidBase64(data.encrypted_data.nonce));
console.log("Valid auth_tag:", isValidBase64(data.encrypted_data.auth_tag));
```

## Common Issues & Fixes

1. **Invalid Base64**: Clean input with `str.replace(/[^A-Za-z0-9+/]/g, '')`
2. **Wrong key size**: Use exactly 32 bytes for AES-256
3. **Wrong nonce size**: Use exactly 12 bytes for GCM
4. **Auth tag position**: WebCrypto expects tag appended to ciphertext
5. **Character encoding**: Always use UTF-8 for string conversion