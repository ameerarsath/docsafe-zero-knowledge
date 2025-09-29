// Minimal patch for share route - detect file type before decryption
app.get('/share/:shareId', async (req, res) => {
  try {
    const share = await getShareByToken(req.params.shareId);
    const document = await getDocument(share.document_id);
    const fileBuffer = await readFile(document.storage_path);
    
    // CRITICAL FIX: Detect actual file type regardless of DB flag
    const isActuallyEncrypted = !isPlainFile(fileBuffer);
    
    if (isActuallyEncrypted && document.is_encrypted) {
      // Truly encrypted - decrypt first
      const decrypted = await decryptFile(fileBuffer, share.password);
      return serveFile(res, decrypted, document.mime_type);
    } else {
      // Plain file - serve directly
      return serveFile(res, fileBuffer, document.mime_type);
    }
  } catch (error) {
    res.status(500).send('Share access failed');
  }
});

// Detect if file is plain (not encrypted)
function isPlainFile(buffer) {
  const header = buffer.slice(0, 8);
  return (
    header.toString('ascii', 0, 4) === '%PDF' ||  // PDF
    header[0] === 0x50 && header[1] === 0x4B ||   // ZIP/DOCX
    header.toString('ascii', 0, 4) === '{\\"rt'    // RTF
  );
}

function serveFile(res, buffer, mimeType) {
  res.setHeader('Content-Type', mimeType || 'application/octet-stream');
  res.send(buffer);
}