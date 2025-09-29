import React, { useState, useEffect } from 'react';
import { isActuallyEncrypted } from '../utils/encryptionDetector';

interface Props {
  document: any;
  onError?: (error: string) => void;
}

export const SafeDocumentPreview: React.FC<Props> = ({ document, onError }) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    loadPreview();
  }, [document.id]);

  const loadPreview = async () => {
    try {
      // Download file data
      const response = await fetch(`/api/v1/documents/${document.id}/download`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const fileData = await response.arrayBuffer();

      // Check if actually encrypted
      const encrypted = isActuallyEncrypted(document, fileData);
      
      if (!encrypted) {
        // Direct preview for unencrypted files
        const blob = new Blob([fileData], { type: document.mime_type });
        setPreviewUrl(URL.createObjectURL(blob));
      } else {
        // Handle encrypted files
        if (!hasDecryptionKey()) {
          setNeedsPassword(true);
          return;
        }
        
        const decrypted = await decryptDocument(document, fileData);
        const blob = new Blob([decrypted], { type: document.mime_type });
        setPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (needsPassword) return <div>Password required</div>;
  if (previewUrl) return <iframe src={previewUrl} className="w-full h-96" />;
  return <div>Preview unavailable</div>;
};

// Minimal helper functions
const getToken = () => sessionStorage.getItem('access_token');
const hasDecryptionKey = () => !!sessionStorage.getItem('master_key');
const decryptDocument = async (doc: any, data: ArrayBuffer) => {
  // Your existing decryption logic here
  throw new Error('Implement decryption');
};