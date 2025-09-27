# Share Document Verification Commands

## Prerequisites
- Backend running on `http://localhost:8002`
- Valid authentication token (replace `YOUR_AUTH_TOKEN` with actual token)
- Document ID available for testing (replace `48` with actual document ID)

## 1. Create External Share (Successful)

### Request:
```bash
curl -X POST "http://localhost:8002/api/v1/shares/?document_id=48" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "share_name": "Test External Share",
    "share_type": "external",
    "allow_preview": true,
    "allow_download": false,
    "require_password": false,
    "expires_at": "2025-01-26T23:59:59Z"
  }'
```

### Expected Response (201 Created):
```json
{
  "share": {
    "id": 123,
    "shareToken": "abc123def456...",
    "documentId": 48,
    "shareName": "Test External Share",
    "shareType": "external",
    "permissions": ["read"],
    "expiresAt": "2025-01-26T23:59:59Z",
    "createdAt": "2025-01-25T10:30:00Z",
    "accessCount": 0,
    "isActive": true,
    "createdBy": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    }
  },
  "shareUrl": "http://localhost:3000/share/abc123def456..."
}
```

## 2. Create Internal Share with Download Permission

### Request:
```bash
curl -X POST "http://localhost:8002/api/v1/shares/?document_id=48" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "share_name": "Internal Team Share",
    "share_type": "internal",
    "allow_preview": true,
    "allow_download": true,
    "require_password": false
  }'
```

### Expected Response (201 Created):
```json
{
  "share": {
    "id": 124,
    "shareToken": "xyz789uvw012...",
    "documentId": 48,
    "shareName": "Internal Team Share",
    "shareType": "internal",
    "permissions": ["read", "download"],
    "expiresAt": null,
    "createdAt": "2025-01-25T10:35:00Z",
    "accessCount": 0,
    "isActive": true,
    "createdBy": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    }
  },
  "shareUrl": "http://localhost:3000/share/xyz789uvw012..."
}
```

## 3. Validation Error - Missing Share Name (422)

### Request:
```bash
curl -X POST "http://localhost:8002/api/v1/shares/?document_id=48" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "share_type": "external",
    "allow_preview": true,
    "allow_download": false
  }'
```

### Expected Response (422 Unprocessable Entity):
```json
{
  "detail": {
    "error": "Validation failed",
    "fields": {
      "share_name": "Share name is required and cannot be empty"
    }
  }
}
```

## 4. Validation Error - Empty Share Name (422)

### Request:
```bash
curl -X POST "http://localhost:8002/api/v1/shares/?document_id=48" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "share_name": "",
    "share_type": "external",
    "allow_preview": true,
    "allow_download": false
  }'
```

### Expected Response (422 Unprocessable Entity):
```json
{
  "detail": {
    "error": "Validation failed",
    "fields": {
      "share_name": "Share name is required and cannot be empty"
    }
  }
}
```

## 5. Document Not Found (404)

### Request:
```bash
curl -X POST "http://localhost:8002/api/v1/shares/?document_id=999999" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "share_name": "Test Share",
    "share_type": "external",
    "allow_preview": true,
    "allow_download": false
  }'
```

### Expected Response (404 Not Found):
```json
{
  "detail": {
    "error": "Document not found",
    "message": "Document with ID 999999 not found"
  }
}
```

## 6. Unauthorized Request (401)

### Request:
```bash
curl -X POST "http://localhost:8002/api/v1/shares/?document_id=48" \
  -H "Content-Type: application/json" \
  -d '{
    "share_name": "Test Share",
    "share_type": "external",
    "allow_preview": true,
    "allow_download": false
  }'
```

### Expected Response (401 Unauthorized):
```json
{
  "detail": "Not authenticated"
}
```

## 7. Access Share Details

### Request:
```bash
curl -X GET "http://localhost:8002/api/v1/shares/abc123def456..." \
  -H "Content-Type: application/json"
```

### Expected Response (200 OK):
```json
{
  "id": 123,
  "shareToken": "abc123def456...",
  "documentId": 48,
  "shareName": "Test External Share",
  "shareType": "external",
  "permissions": ["read"],
  "expiresAt": "2025-01-26T23:59:59Z",
  "createdAt": "2025-01-25T10:30:00Z",
  "accessCount": 0,
  "isActive": true,
  "createdBy": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

## 8. Access Shared Document (External)

### Request:
```bash
curl -X POST "http://localhost:8002/api/v1/shares/abc123def456.../access" \
  -H "Content-Type: application/json" \
  -d '{
    "password": null
  }'
```

### Expected Response (200 OK):
```json
{
  "document": {
    "id": 48,
    "name": "Sample Document.pdf",
    "file_size": 1024000,
    "mime_type": "application/pdf",
    "created_at": "2025-01-20T15:30:00Z",
    "description": "Sample document for testing"
  },
  "permissions": ["read"],
  "shareInfo": {
    "shareName": "Test External Share",
    "shareType": "external",
    "expiresAt": "2025-01-26T23:59:59Z",
    "accessCount": 1
  }
}
```

## 9. Download Attempt on View-Only Share (403)

### Request:
```bash
curl -X POST "http://localhost:8002/api/v1/shares/abc123def456.../download" \
  -H "Content-Type: application/json" \
  -d '{
    "password": null
  }'
```

### Expected Response (403 Forbidden):
```json
{
  "detail": "Download not allowed for this share"
}
```

## 10. Access Internal Share Without Authentication (401)

### Request:
```bash
curl -X POST "http://localhost:8002/api/v1/shares/xyz789uvw012.../access" \
  -H "Content-Type: application/json" \
  -d '{
    "password": null
  }'
```

### Expected Response (401 Unauthorized):
```json
{
  "detail": "Authentication required for internal shares"
}
```

## 11. Expired Share Access (410)

### Request:
```bash
curl -X POST "http://localhost:8002/api/v1/shares/expired_share_token/access" \
  -H "Content-Type: application/json" \
  -d '{
    "password": null
  }'
```

### Expected Response (410 Gone):
```json
{
  "detail": "This share has expired"
}
```

## 12. List Document Shares

### Request:
```bash
curl -X GET "http://localhost:8002/api/v1/shares/document/48" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### Expected Response (200 OK):
```json
{
  "shares": [
    {
      "id": 123,
      "shareToken": "abc123def456...",
      "documentId": 48,
      "shareName": "Test External Share",
      "shareType": "external",
      "permissions": ["read"],
      "expiresAt": "2025-01-26T23:59:59Z",
      "createdAt": "2025-01-25T10:30:00Z",
      "accessCount": 1,
      "isActive": true,
      "createdBy": {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com"
      }
    }
  ],
  "total": 1
}
```

## Test Sequence

1. **Create External Share**: Should return 201 with share details
2. **Create Internal Share**: Should return 201 with share details
3. **Test Validation**: Missing name should return 422 with field errors
4. **Test Access**: External share should allow unauthenticated access
5. **Test Permissions**: View-only share should block download (403)
6. **Test Authentication**: Internal share should require auth (401)

## Notes

- Replace `YOUR_AUTH_TOKEN` with a valid JWT token from your auth system
- Replace `48` with an actual document ID that exists in your database
- Share tokens in responses will be actual 32-character URL-safe strings
- All datetime values should be in ISO 8601 format
- Error responses include structured error information for client handling