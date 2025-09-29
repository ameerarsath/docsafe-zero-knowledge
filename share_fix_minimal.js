// MINIMAL PATCH: Add this to your existing share route
function isPlainFile(buffer) {
  const header = buffer.slice(0, 8);
  return (
    header.toString('ascii', 0, 4) === '%PDF' ||  // PDF
    (header[0] === 0x50 && header[1] === 0x4B)    // ZIP/DOCX
  );
}

// In your share route, BEFORE any decryption attempt:
app.get('/share/:token', async (req, res) => {
  const share = await getShare(req.params.token);
  const document = await getDocument(share.document_id);
  const fileBuffer = await readFile(document.storage_path);
  
  // FIX: Check actual file type, ignore DB flag
  if (isPlainFile(fileBuffer)) {
    // Serve as-is for plain files
    res.setHeader('Content-Type', document.mime_type);
    return res.send(fileBuffer);
  }
  
  // Only decrypt if file is actually encrypted
  if (document.is_encrypted) {
    const decrypted = await decrypt(fileBuffer, password);
    return res.send(decrypted);
  }
  
  res.send(fileBuffer);
});