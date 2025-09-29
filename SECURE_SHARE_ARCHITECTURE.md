# Secure Share Architecture for Zero-Knowledge System

## Problem Analysis
- **Database Flag Mismatch**: `is_encrypted` flags don't match actual file content
- **Inconsistent Preview Pipeline**: Internal vs external shares use different processing
- **Security Gap**: Raw encrypted data exposed in share links

## Long-term Solution Architecture

### 1. Unified Preview Pipeline
```typescript
interface PreviewRequest {
  documentId: string;
  shareToken?: string;
  encryptionKey?: string;
  permissions: string[];
}

class UnifiedPreviewService {
  async generatePreview(request: PreviewRequest): Promise<PreviewResult> {
    // Same pipeline for internal and external previews
    const document = await this.getDocument(request);
    const decryptedContent = await this.decryptIfNeeded(document, request.encryptionKey);
    return await this.processWithPlugins(decryptedContent, document.mimeType);
  }
}
```

### 2. Database Consistency Layer
```sql
-- Add computed column for actual encryption status
ALTER TABLE documents ADD COLUMN actual_encryption_status VARCHAR(20) 
GENERATED ALWAYS AS (
  CASE 
    WHEN file_signature LIKE '%PDF%' THEN 'unencrypted'
    WHEN file_signature LIKE 'PK%' THEN 'unencrypted'  
    WHEN encrypted_dek IS NOT NULL THEN 'encrypted'
    ELSE 'unknown'
  END
) STORED;

-- Migration script to fix existing flags
UPDATE documents 
SET is_encrypted = (actual_encryption_status = 'encrypted')
WHERE is_encrypted != (actual_encryption_status = 'encrypted');
```

### 3. Share-Specific Preview Service
```python
class SharePreviewService:
    def serve_preview(self, share_token: str, password: str = None):
        share = self.validate_share(share_token, password)
        document = share.document
        
        # Detect actual encryption status
        encryption_status = self.detect_encryption(document.storage_path)
        
        if encryption_status.is_encrypted:
            if share.permissions.allow_preview_only:
                # Generate server-side preview for view-only shares
                return self.generate_server_preview(document, share.encryption_key)
            else:
                # Return encrypted blob with decryption headers
                return self.serve_encrypted_blob(document)
        else:
            # Serve plain file directly
            return self.serve_plain_file(document)
```

### 4. Zero-Knowledge Compliance
- **Server-side Preview**: Only for view-only shares, using share-specific keys
- **Client-side Decryption**: For download-enabled shares
- **Audit Trail**: Log all preview generations and access patterns
- **Key Isolation**: Share keys separate from user master keys

## Implementation Priority
1. **Immediate**: Apply hotfix to detect file signatures
2. **Week 1**: Implement unified preview pipeline  
3. **Week 2**: Database consistency migration
4. **Week 3**: Enhanced share preview service
5. **Week 4**: Security audit and testing

## Best Practices
- Always validate file signatures before serving
- Use separate encryption keys for shares vs user data
- Implement preview caching with expiration
- Log all share access for security monitoring
- Regular database consistency checks