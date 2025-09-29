-- Fix encryption flags: only mark as encrypted if has encryption metadata
UPDATE documents 
SET is_encrypted = 0 
WHERE encrypted_dek IS NULL 
  AND encryption_key_id IS NULL 
  AND is_encrypted = 1;

-- Verify fix
SELECT COUNT(*) as fixed_documents 
FROM documents 
WHERE is_encrypted = 0 AND encrypted_dek IS NULL;