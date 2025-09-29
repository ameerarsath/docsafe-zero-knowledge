// Production-ready secure share route
const express = require('express');
const mammoth = require('mammoth');
const router = express.Router();

router.get('/share/:shareToken', async (req, res) => {
  try {
    // 1. Validate share token
    const share = await validateShareToken(req.params.shareToken);
    if (!share || share.expired) {
      return res.status(404).render('share-not-found');
    }

    // 2. Get document
    const document = await getDocumentById(share.document_id);
    const fileBuffer = await readDocumentFile(document.storage_path);

    // 3. Smart encryption detection
    const encryptionStatus = detectEncryption(document, fileBuffer);
    
    // 4. Handle based on actual encryption status
    let contentBuffer;
    if (encryptionStatus.isEncrypted) {
      if (!share.encryption_password) {
        return res.status(401).render('password-required', { shareToken: req.params.shareToken });
      }
      contentBuffer = await decryptDocument(fileBuffer, share.encryption_password, document);
    } else {
      contentBuffer = fileBuffer;
    }

    // 5. Render based on file type
    if (document.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const { value: html } = await mammoth.convertToHtml({ buffer: contentBuffer });
      return res.render('document-preview', { 
        html, 
        documentName: document.name,
        shareToken: req.params.shareToken 
      });
    }

    // 6. Serve other file types directly
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${document.name}"`);
    res.send(contentBuffer);

  } catch (error) {
    console.error('Share access error:', error);
    res.status(500).render('share-error');
  }
});

// Smart encryption detection
function detectEncryption(document, fileBuffer) {
  // Method 1: Check metadata (most reliable)
  const hasEncryptionMetadata = !!(document.encrypted_dek || document.encryption_key_id);
  
  // Method 2: Check file signature
  const header = fileBuffer.slice(0, 8);
  const isKnownFormat = (
    header.toString('ascii', 0, 4) === '%PDF' ||           // PDF
    (header[0] === 0x50 && header[1] === 0x4B) ||         // ZIP/DOCX
    header.toString('ascii', 0, 5) === '{\\"rtf' ||        // RTF
    (header[0] === 0xFF && header[1] === 0xD8)            // JPEG
  );

  return {
    isEncrypted: hasEncryptionMetadata && !isKnownFormat,
    hasMetadata: hasEncryptionMetadata,
    isKnownFormat
  };
}

module.exports = router;