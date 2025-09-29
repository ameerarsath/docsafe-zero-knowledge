-- Fix encryption flags based on actual file content
-- Step 1: Mark documents with encryption metadata as encrypted
UPDATE documents 
SET is_encrypted = 1 
WHERE (encrypted_dek IS NOT NULL OR encryption_key_id IS NOT NULL) 
  AND is_encrypted = 0;

-- Step 2: Mark documents without encryption metadata as unencrypted  
UPDATE documents 
SET is_encrypted = 0 
WHERE encrypted_dek IS NULL 
  AND encryption_key_id IS NULL 
  AND encryption_iv IS NULL 
  AND is_encrypted = 1;

-- Step 3: Verify results
SELECT 
  'Fixed' as status,
  COUNT(*) as total_docs,
  SUM(CASE WHEN is_encrypted = 1 THEN 1 ELSE 0 END) as marked_encrypted,
  SUM(CASE WHEN encrypted_dek IS NOT NULL OR encryption_key_id IS NOT NULL THEN 1 ELSE 0 END) as has_encryption_metadata
FROM documents;