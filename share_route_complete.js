const mammoth = require('mammoth');

app.get('/share/:token', async (req, res) => {
  try {
    const share = await getShareByToken(req.params.token);
    if (!share) return res.status(404).send('Share not found');
    
    const document = await getDocument(share.document_id);
    const fileBuffer = await readFile(document.storage_path);
    
    // Smart detection: check file signature first
    const isPlain = detectPlainFile(fileBuffer);
    const hasEncryptionMeta = !!(document.encrypted_dek || document.encryption_key_id);
    
    let contentBuffer;
    if (!isPlain && hasEncryptionMeta) {
      // Actually encrypted - decrypt
      contentBuffer = await decryptFile(fileBuffer, share.password);
    } else {
      // Plain file - use as-is
      contentBuffer = fileBuffer;
    }
    
    // Handle DOCX with Mammoth (same as preview)
    if (document.mime_type.includes('wordprocessingml')) {
      const { value: html } = await mammoth.convertToHtml({ buffer: contentBuffer });
      return res.send(`<html><body>${html}</body></html>`);
    }
    
    // Serve other files directly
    res.setHeader('Content-Type', document.mime_type);
    res.send(contentBuffer);
    
  } catch (error) {
    res.status(500).send('Share access failed');
  }
});

function detectPlainFile(buffer) {
  const header = buffer.slice(0, 8);
  return (
    header.toString('ascii', 0, 4) === '%PDF' ||
    (header[0] === 0x50 && header[1] === 0x4B) ||  // ZIP/DOCX
    (header[0] === 0xFF && header[1] === 0xD8)     // JPEG
  );
}