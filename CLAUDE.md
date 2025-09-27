# 🔧 SecureVault – Share Document 422 Error Fix

## Objective  
Resolve the **422 Unprocessable Entity** error when creating a document share. Ensure the share API accepts valid payloads, enforces encryption, and preserves existing UI/preview functionality.

---

## Current Issue  
- **Endpoint:** `POST /api/v1/shares/?document_id=47`  
- **Error:** `422 (Unprocessable Entity)` → `"Failed to create document share"`  
- **Cause:** Invalid/missing payload fields (e.g., `expires_at: ""` instead of `null`).  

---

## Root Cause  
- **Frontend**: Sending incomplete/incorrect payload (`expires_at: ""` instead of `null`).  
- **Backend (Pydantic)**: Expects valid `datetime` or `null` for `expires_at`.  
- **Schema Requirements**:  
  - `document_id`  
  - `share_name`  
  - `share_type`  
  - `permissions` (view, download, comment)  
  - `expires_at` (datetime or null)  
  - `encryption_password`  

---

## Expected Behavior  

### ✅ Success Response (`201 Created`)  
```json
{
  "share_id": "sh_12345",
  "url": "https://securevault.local/share/sh_12345",
  "expires_at": "2025-09-30T12:00:00Z",
  "permissions": ["view", "download"],
  "type": "internal"
}
