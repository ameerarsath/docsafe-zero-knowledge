# SecureVault Encryption Preview Fix - Complete Solution

## Problem Summary
Frontend shows encrypted gibberish instead of actual PDF content due to:
1. Database `is_encrypted` flag mismatch with actual file content
2. Encoding errors when processing ciphertext as string vs binary
3. Incorrect detection of plain vs encrypted files
4. Double-encryption scenarios

## Root Cause Analysis

### 1. Database Flag Mismatch
```sql
-- Problem: Document marked as encrypted but file is plain
SELECT id, name, is_encrypted, encrypted_dek, encryption_iv 
FROM documents 
WHERE is_encrypted = 1 AND encrypted_dek IS NULL;
```

### 2. Encoding Issues
- Ciphertext stored as TEXT causes UTF-8 encoding corruption
- Base64 decoding fails on non-base64 data
- Auth tag extraction assumes wrong data format

### 3. Detection Logic Flaws
```typescript
// Current problematic logic
const isEncrypted = document.is_encrypted; // Wrong - trusts DB flag
// Should be:
const isEncrypted = document.encrypted_dek || document.encryption_iv;
```

## Complete Solution

### 1. Database Migration Script

```python
# fix_encryption_mismatch.py
import sqlite3
import os
import base64
from pathlib import Path

def detect_file_encryption_status(file_path):
    """Detect if file is actually encrypted by analyzing content"""
    try:
        with open(file_path, 'rb') as f:
            header = f.read(1024)
        
        # Check for common file signatures
        pdf_signature = header.startswith(b'%PDF')
        office_signatures = [
            b'PK\x03\x04',  # ZIP-based (DOCX, XLSX, etc.)
            b'\xd0\xcf\x11\xe0',  # OLE2 (DOC, XLS, etc.)
        ]
        
        is_known_format = pdf_signature or any(header.startswith(sig) for sig in office_signatures)
        
        if is_known_format:
            return False  # File is unencrypted
        
        # Check if content looks like base64 ciphertext
        try:
            # Try to decode as base64
            decoded = base64.b64decode(header[:100])
            # If successful and no clear patterns, likely encrypted
            return True
        except:
            pass
        
        # Check entropy (encrypted data has high entropy)
        entropy = calculate_entropy(header)
        return entropy > 7.5  # High entropy suggests encryption
        
    except Exception as e:
        print(f"Error analyzing {file_path}: {e}")
        return None

def calculate_entropy(data):
    """Calculate Shannon entropy of data"""
    import math
    from collections import Counter
    
    if not data:
        return 0
    
    counts = Counter(data)
    length = len(data)
    entropy = -sum((count/length) * math.log2(count/length) for count in counts.values())
    return entropy

def fix_encryption_flags():
    """Fix is_encrypted flags based on actual file content"""
    
    conn = sqlite3.connect('backend/securevault.db')
    cursor = conn.cursor()
    
    # Get all documents with potential encryption issues
    cursor.execute("""
        SELECT id, name, storage_path, is_encrypted, encrypted_dek, encryption_iv
        FROM documents 
        WHERE is_encrypted = 1
    """)
    
    documents = cursor.fetchall()
    fixed_count = 0
    
    for doc_id, name, storage_path, is_encrypted, encrypted_dek, encryption_iv in documents:
        print(f"Analyzing document {doc_id}: {name}")
        
        # Build full file path
        if storage_path and os.path.exists(storage_path):
            file_path = storage_path
        else:
            # Try common paths
            possible_paths = [
                f"backend/uploads/{name}",
                f"backend/encrypted-files/{doc_id}",
                f"data/files/{doc_id}/{name}"
            ]
            file_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    file_path = path
                    break
        
        if not file_path:
            print(f"  ❌ File not found for document {doc_id}")
            continue
        
        # Detect actual encryption status
        actual_encrypted = detect_file_encryption_status(file_path)
        
        if actual_encrypted is None:
            print(f"  ⚠️ Could not determine encryption status for {doc_id}")
            continue
        
        # Check for mismatch
        has_encryption_metadata = bool(encrypted_dek or encryption_iv)
        
        if is_encrypted and not actual_encrypted and not has_encryption_metadata:
            # File marked as encrypted but is actually plain and has no encryption metadata
            print(f"  🔧 Fixing document {doc_id}: marked encrypted but file is plain")
            cursor.execute("""
                UPDATE documents 
                SET is_encrypted = 0 
                WHERE id = ?
            """, (doc_id,))
            fixed_count += 1
            
        elif not is_encrypted and actual_encrypted and has_encryption_metadata:
            # File is encrypted but not marked as such
            print(f"  🔧 Fixing document {doc_id}: file is encrypted but not marked")
            cursor.execute("""
                UPDATE documents 
                SET is_encrypted = 1 
                WHERE id = ?
            """, (doc_id,))
            fixed_count += 1
        
        else:
            print(f"  ✅ Document {doc_id} encryption status is correct")
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Fixed {fixed_count} documents with encryption flag mismatches")

if __name__ == "__main__":
    fix_encryption_flags()
```

### 2. Enhanced Frontend Detection

```typescript
// frontend/src/utils/encryptionDetection.ts
export interface EncryptionDetectionResult {
  isEncrypted: boolean;
  encryptionType: 'zero-knowledge' | 'legacy' | 'none';
  confidence: number;
  reason: string;
}

export async function detectEncryptionStatus(
  document: Document,
  fileData?: ArrayBuffer
): Promise<EncryptionDetectionResult> {
  
  // Method 1: Check for zero-knowledge encryption metadata
  if (document.encrypted_dek && document.encryption_iv) {
    return {
      isEncrypted: true,
      encryptionType: 'zero-knowledge',
      confidence: 1.0,
      reason: 'Has DEK and IV metadata'
    };
  }
  
  // Method 2: Check for legacy encryption metadata
  if (document.encryption_key_id && document.encryption_iv && document.encryption_auth_tag) {
    return {
      isEncrypted: true,
      encryptionType: 'legacy',
      confidence: 0.9,
      reason: 'Has legacy encryption metadata'
    };
  }
  
  // Method 3: Analyze file content if available
  if (fileData) {
    const contentAnalysis = analyzeFileContent(fileData, document.mime_type);
    if (contentAnalysis.isKnownFormat) {
      return {
        isEncrypted: false,
        encryptionType: 'none',
        confidence: 0.95,
        reason: `Detected ${contentAnalysis.format} file signature`
      };
    }
  }
  
  // Method 4: Fallback to database flag with low confidence
  return {
    isEncrypted: document.is_encrypted || false,
    encryptionType: 'none',
    confidence: 0.3,
    reason: 'Based on database flag (unreliable)'
  };
}

function analyzeFileContent(data: ArrayBuffer, mimeType?: string): {
  isKnownFormat: boolean;
  format?: string;
  entropy: number;
} {
  const header = new Uint8Array(data.slice(0, 1024));
  
  // Check for file signatures
  const signatures = {
    pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
    zip: [0x50, 0x4B, 0x03, 0x04], // ZIP (DOCX, XLSX, etc.)
    ole2: [0xD0, 0xCF, 0x11, 0xE0], // OLE2 (DOC, XLS, etc.)
    jpeg: [0xFF, 0xD8, 0xFF],
    png: [0x89, 0x50, 0x4E, 0x47],
  };
  
  for (const [format, signature] of Object.entries(signatures)) {
    if (header.length >= signature.length && 
        signature.every((byte, i) => header[i] === byte)) {
      return { isKnownFormat: true, format, entropy: 0 };
    }
  }
  
  // Calculate entropy for encrypted data detection
  const entropy = calculateEntropy(header);
  
  return { 
    isKnownFormat: false, 
    entropy,
  };
}

function calculateEntropy(data: Uint8Array): number {
  const counts = new Array(256).fill(0);
  for (const byte of data) {
    counts[byte]++;
  }
  
  const length = data.length;
  let entropy = 0;
  
  for (const count of counts) {
    if (count > 0) {
      const p = count / length;
      entropy -= p * Math.log2(p);
    }
  }
  
  return entropy;
}
```

### 3. Safe Preview Service

```typescript
// frontend/src/services/safePreviewService.ts
import { Document } from './api/documents';
import { detectEncryptionStatus } from '../utils/encryptionDetection';
import { documentEncryptionService } from './documentEncryption';

export class SafePreviewService {
  
  async generateSafePreview(document: Document): Promise<{
    success: boolean;
    previewData?: any;
    error?: string;
    requiresPassword?: boolean;
  }> {
    
    try {
      // Step 1: Download file data
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/documents/${document.id}/download`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAccessToken()}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const fileData = await response.arrayBuffer();
      
      // Step 2: Detect actual encryption status
      const encryptionStatus = await detectEncryptionStatus(document, fileData);
      
      console.log('🔍 Encryption detection result:', encryptionStatus);
      
      // Step 3: Handle based on detection result
      if (!encryptionStatus.isEncrypted) {
        // File is unencrypted - preview directly
        return await this.previewUnencryptedFile(fileData, document);
      }
      
      // Step 4: File is encrypted - check if we can decrypt
      if (!documentEncryptionService.hasMasterKey()) {
        return {
          success: false,
          requiresPassword: true,
          error: 'Master key required for encrypted document'
        };
      }
      
      // Step 5: Attempt decryption and preview
      return await this.previewEncryptedFile(fileData, document, encryptionStatus);
      
    } catch (error) {
      console.error('Safe preview failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private async previewUnencryptedFile(
    fileData: ArrayBuffer, 
    document: Document
  ): Promise<{ success: boolean; previewData?: any; error?: string }> {
    
    try {
      // Use appropriate preview plugin based on file type
      const { getDocumentPreview } = await import('./documentPreview');
      
      const blob = new Blob([fileData], { type: document.mime_type || 'application/octet-stream' });
      const previewResult = await getDocumentPreview(
        blob,
        document.name,
        document.mime_type || 'application/octet-stream'
      );
      
      return {
        success: true,
        previewData: previewResult
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Preview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  private async previewEncryptedFile(
    fileData: ArrayBuffer,
    document: Document,
    encryptionStatus: any
  ): Promise<{ success: boolean; previewData?: any; error?: string }> {
    
    try {
      // Decrypt the file
      const decryptionResult = await documentEncryptionService.decryptDocument(
        document,
        fileData
      );
      
      // Preview the decrypted content
      const { getDocumentPreview } = await import('./documentPreview');
      
      const blob = new Blob([decryptionResult.decryptedData], { 
        type: decryptionResult.mimeType 
      });
      
      const previewResult = await getDocumentPreview(
        blob,
        decryptionResult.originalFilename,
        decryptionResult.mimeType
      );
      
      return {
        success: true,
        previewData: previewResult
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Decryption failed: ${error instanceof Error ? error.message : 'Wrong password or corrupted data'}`
      };
    }
  }
  
  private getAccessToken(): string | null {
    const rememberMe = localStorage.getItem('remember_me') === 'true';
    return rememberMe 
      ? localStorage.getItem('access_token')
      : sessionStorage.getItem('access_token');
  }
}

export const safePreviewService = new SafePreviewService();
```

### 4. Enhanced Document Preview Component

```typescript
// frontend/src/components/documents/SafeDocumentPreview.tsx
import React, { useState, useEffect } from 'react';
import { Document } from '../../services/api/documents';
import { safePreviewService } from '../../services/safePreviewService';
import { documentEncryptionService } from '../../services/documentEncryption';

interface SafeDocumentPreviewProps {
  document: Document;
  onError?: (error: string) => void;
}

export const SafeDocumentPreview: React.FC<SafeDocumentPreviewProps> = ({
  document,
  onError
}) => {
  const [previewState, setPreviewState] = useState<{
    loading: boolean;
    previewData?: any;
    error?: string;
    requiresPassword?: boolean;
  }>({ loading: true });
  
  const [password, setPassword] = useState('');
  
  useEffect(() => {
    loadPreview();
  }, [document.id]);
  
  const loadPreview = async () => {
    setPreviewState({ loading: true });
    
    try {
      const result = await safePreviewService.generateSafePreview(document);
      
      if (result.success) {
        setPreviewState({
          loading: false,
          previewData: result.previewData
        });
      } else if (result.requiresPassword) {
        setPreviewState({
          loading: false,
          requiresPassword: true,
          error: result.error
        });
      } else {
        setPreviewState({
          loading: false,
          error: result.error
        });
        onError?.(result.error || 'Preview failed');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPreviewState({
        loading: false,
        error: errorMessage
      });
      onError?.(errorMessage);
    }
  };
  
  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      alert('Please enter a password');
      return;
    }
    
    try {
      // Set master key from password
      const { deriveKey, base64ToUint8Array } = await import('../../utils/encryption');
      
      // Use document's salt or generate one
      const salt = document.encryption_key_id 
        ? base64ToUint8Array(document.encryption_key_id)
        : new Uint8Array(32); // Fallback salt
      
      const masterKey = await deriveKey({
        password,
        salt,
        iterations: 100000
      });
      
      await documentEncryptionService.setMasterKey(masterKey);
      
      // Retry preview
      await loadPreview();
      
    } catch (error) {
      setPreviewState(prev => ({
        ...prev,
        error: 'Invalid password or decryption failed'
      }));
    }
  };
  
  if (previewState.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading preview...</span>
      </div>
    );
  }
  
  if (previewState.requiresPassword) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-800 mb-4">
          🔐 Encrypted Document
        </h3>
        <p className="text-yellow-700 mb-4">
          This document is encrypted. Please enter your password to view the preview.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
          />
          <button
            onClick={handlePasswordSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Decrypt & Preview
          </button>
        </div>
        {previewState.error && (
          <p className="text-red-600 text-sm mt-2">{previewState.error}</p>
        )}
      </div>
    );
  }
  
  if (previewState.error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-medium text-red-800 mb-2">
          ❌ Preview Error
        </h3>
        <p className="text-red-700">{previewState.error}</p>
        <button
          onClick={loadPreview}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (previewState.previewData) {
    return (
      <div className="document-preview">
        {/* Render preview based on type */}
        {previewState.previewData.type === 'pdf' && (
          <iframe
            src={previewState.previewData.url}
            className="w-full h-96 border rounded"
            title={`Preview of ${document.name}`}
          />
        )}
        {previewState.previewData.type === 'image' && (
          <img
            src={previewState.previewData.url}
            alt={document.name}
            className="max-w-full h-auto rounded"
          />
        )}
        {previewState.previewData.type === 'text' && (
          <pre className="whitespace-pre-wrap p-4 bg-gray-50 rounded border max-h-96 overflow-auto">
            {previewState.previewData.content}
          </pre>
        )}
      </div>
    );
  }
  
  return null;
};
```

### 5. Backend Validation Endpoint

```python
# backend/app/api/v1/encryption_validation.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
import os
import base64

from ...core.database import get_db
from ...core.security import get_current_user
from ...models.user import User
from ...models.document import Document

router = APIRouter(prefix="/encryption", tags=["encryption-validation"])

@router.get("/validate/{document_id}")
async def validate_document_encryption(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Validate document encryption status and detect mismatches"""
    
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check database flags
    db_encrypted = document.is_encrypted
    has_dek = bool(document.encrypted_dek)
    has_legacy = bool(document.encryption_key_id and document.encryption_iv)
    
    # Analyze file content if accessible
    file_analysis = None
    if document.storage_path and os.path.exists(document.storage_path):
        try:
            with open(document.storage_path, 'rb') as f:
                header = f.read(1024)
            
            # Check for file signatures
            is_pdf = header.startswith(b'%PDF')
            is_office = header.startswith(b'PK\x03\x04') or header.startswith(b'\xd0\xcf\x11\xe0')
            
            # Try base64 decode
            is_base64 = False
            try:
                base64.b64decode(header[:100])
                is_base64 = True
            except:
                pass
            
            file_analysis = {
                "file_exists": True,
                "file_size": len(header),
                "appears_pdf": is_pdf,
                "appears_office": is_office,
                "appears_base64": is_base64,
                "likely_encrypted": not (is_pdf or is_office) and is_base64
            }
            
        except Exception as e:
            file_analysis = {"error": str(e)}
    
    # Determine recommendations
    recommendations = []
    
    if db_encrypted and not (has_dek or has_legacy):
        recommendations.append("Document marked as encrypted but missing encryption metadata")
    
    if file_analysis and file_analysis.get("appears_pdf") and db_encrypted:
        recommendations.append("File appears to be unencrypted PDF but marked as encrypted")
    
    if not db_encrypted and (has_dek or has_legacy):
        recommendations.append("Document has encryption metadata but not marked as encrypted")
    
    return {
        "document_id": document_id,
        "database_status": {
            "is_encrypted": db_encrypted,
            "has_dek": has_dek,
            "has_legacy_encryption": has_legacy
        },
        "file_analysis": file_analysis,
        "recommendations": recommendations,
        "status": "mismatch_detected" if recommendations else "consistent"
    }
```

## Implementation Steps

### 1. Run Database Fix
```bash
cd backend
python fix_encryption_mismatch.py
```

### 2. Update Frontend Components
Replace existing preview components with the safe versions above.

### 3. Test with Known Documents
```bash
# Test the problematic document
curl -X GET "http://localhost:8002/api/v1/encryption/validate/48" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Verify Fix
```typescript
// Test in browser console
const testDoc = { id: 48, name: 'test.pdf', is_encrypted: true };
const result = await safePreviewService.generateSafePreview(testDoc);
console.log('Preview result:', result);
```

## Best Practices Going Forward

### 1. Always Validate Encryption Status
```typescript
// Don't trust database flags alone
const isActuallyEncrypted = await detectEncryptionStatus(document, fileData);
```

### 2. Handle Binary Data Properly
```typescript
// Store ciphertext as BLOB, not TEXT
// Use proper base64 encoding/decoding
const ciphertext = new Uint8Array(base64ToArrayBuffer(base64String));
```

### 3. Implement Graceful Fallbacks
```typescript
// Always provide fallback preview options
if (decryptionFails) {
  return generateMetadataPreview(document);
}
```

### 4. Add Comprehensive Logging
```typescript
console.log('🔍 Encryption Detection:', {
  documentId: document.id,
  dbFlag: document.is_encrypted,
  hasDEK: !!document.encrypted_dek,
  fileSignature: fileHeader.slice(0, 8),
  decision: 'encrypted' | 'plain'
});
```

This solution addresses all the root causes and provides a robust, secure preview system that correctly handles both encrypted and unencrypted documents while maintaining zero-knowledge principles.