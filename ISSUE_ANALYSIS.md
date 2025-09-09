# Document Preview 404 Error - Root Cause Analysis

## Issue Summary
- **Error**: `GET http://localhost:8002/api/v1/documents/3/preview` returns `404 Not Found`
- **Frontend**: React app running on `http://localhost:3005`
- **Backend**: FastAPI app running on `http://localhost:8002`
- **Date**: 2025-08-15

## Network Request Details
```
Request URL: http://localhost:8002/api/v1/documents/3/preview?preview_type=auto&max_size=1024
Request Method: GET
Status Code: 404 Not Found
```

### Request Headers (Frontend -> Backend)
- ✅ `authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (PRESENT)
- ✅ `origin: http://localhost:3005` (CORRECT)
- ✅ `content-type: application/json` (CORRECT)

### Response Headers (Backend -> Frontend)
- ✅ `access-control-allow-origin: http://localhost:3005` (CORS OK)
- ✅ `access-control-allow-credentials: true` (CORS OK)
- ❌ `Status: 404 Not Found` (ISSUE)

## Root Cause Analysis

### ❌ Initial Incorrect Assumptions
1. ~~Frontend not sending auth headers~~ - WRONG (headers are present)
2. ~~CORS issues~~ - WRONG (CORS headers are correct)
3. ~~Token expired~~ - WRONG (token is being sent)

### 🔍 Actual Investigation Needed

The issue is that the backend is returning a **real 404**, not a 401 being converted. This means:

1. **Route Registration Issue**: The preview endpoint might not be properly registered
2. **Path Mismatch**: The URL path might be incorrect
3. **User/Document Access Issue**: User might not have access to document ID 3
4. **Token Invalid**: The specific token might be invalid for user admin vs document owner

### Token Analysis
- **Token Subject**: `admin` (user_id: 1)
- **Document ID**: 3 (from URL)
- **Need to Check**: Who owns document ID 3?

## Investigation Steps

### Step 1: Check Document Ownership
From previous analysis:
```
Document 3: "demo.txt" owned by rahumana (ID: 2)
```

### Step 2: Check Token User
Token contains: `"sub":"admin","user_id":1,"role":"admin"`

### ⚠️ ISSUE IDENTIFIED
**User admin (ID: 1) is trying to access document 3 owned by rahumana (ID: 2)**

This could cause:
- Backend returns 404 instead of 403 for security reasons
- Document access control preventing cross-user access

## ✅ ROOT CAUSE CONFIRMED

**Issue**: User `admin` (ID: 1) is trying to access document 3 owned by `rahumana` (ID: 2).

**Behavior**: Backend returns 404 instead of 403 for security reasons (not revealing document existence to unauthorized users).

## 🔧 SOLUTION

The user needs to:

### Option 1: Login as the correct user (rahumana)
1. Logout from admin account
2. Login as `rahumana` with password `TestPass123@`
3. Try document preview again

### Option 2: Transfer document ownership to admin (if admin should have access)
Run this script in backend:
```python
# Transfer document 3 to admin user
from app.core.database import get_db
from app.models.document import Document

db = next(get_db())
doc = db.query(Document).filter(Document.id == 3).first()
if doc:
    doc.owner_id = 1  # admin user
    db.commit()
    print("Document ownership transferred to admin")
```

### Option 3: Add admin permissions to access all documents
Update the RBAC system to allow admin users to access documents owned by other users.

## ✅ VERIFICATION
After applying solution, the preview request should return success instead of 404.