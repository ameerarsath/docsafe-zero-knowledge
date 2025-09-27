/**
 * Document Preview Component for SecureVault
 * 
 * Features:
 * - Preview various document types (PDF, images, text)
 * - Fallback for unsupported types
 * - Loading states and error handling
 * - Full-screen modal support
 * - Download and share actions
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  FileText,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  FileDown
} from 'lucide-react';
import { Document } from '../../hooks/useDocuments';
import { documentsApi } from '../../services/api/documents';
import { useEncryption } from '../../hooks/useEncryption';
import { DocumentShareDialog } from './DocumentShareDialog';
import { getDocumentPreview } from '../../services/documentPreview';
import '../../styles/document-preview.css';
import '../../styles/docx-preview.css';


interface DocumentPreviewProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (documentId: number) => void;
  onShare?: (document: Document) => void;
  className?: string;
}

interface PreviewState {
  content: string | null;
  isLoading: boolean;
  error: string | any | null;
  zoom: number;
  rotation: number;
  needsPassword: boolean;
  isDecrypting: boolean;
  decryptedBlob: Blob | null;
  blobUrl: string | null;
  isFullscreen: boolean;
  pluginResult: any | null;
  isGeneratingPreview: boolean;
  decryptedDocumentId: number | null; // Track which document is decrypted
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document: currentDocument,
  isOpen,
  onClose,
  onDownload,
  onShare,
  className = ''
}) => {
  const [state, setState] = useState<PreviewState>({
    content: null,
    isLoading: false,
    error: null,
    zoom: 100,
    rotation: 0,
    needsPassword: true,
    isDecrypting: false,
    decryptedBlob: null,
    blobUrl: null,
    isFullscreen: false,
    pluginResult: null,
    isGeneratingPreview: false,
    decryptedDocumentId: null
  });

  const [password, setPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Use encryption hook for decryption
  const { decryptDownloadedFile, keys } = useEncryption();


  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<PreviewState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Check if document type is previewable using plugin system
   */
  const isPreviewable = useCallback((doc: Document): boolean => {
    if (!doc.mime_type && !doc.name) return false;

    // Import the plugin registry dynamically to check support
    try {
      import('../../services/documentPreview').then(({ previewPluginRegistry }) => {
        const plugin = previewPluginRegistry.getPlugin(doc.mime_type || '', doc.name);
        return !!plugin;
      });
    } catch (error) {
      console.warn('Plugin system not available, using fallback detection');
    }

    // Fallback to basic mime type checking
    const previewableTypes = [
      'text/plain', 'text/csv', 'text/markdown', 'application/json', 'application/xml',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    const extension = doc.name.toLowerCase().split('.').pop();
    const supportedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'txt', 'csv', 'md', 'json', 'xml', 'xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt'];

    return previewableTypes.includes(doc.mime_type || '') ||
           (extension && supportedExtensions.includes(extension));
  }, []);

  /**
   * Generate preview using enhanced client-side plugin system
   */
  const generateDocumentPreview = useCallback(async (blob: Blob, fileName: string, mimeType: string) => {
    console.log('🚀 generateDocumentPreview called with client-side priority:', { fileName, mimeType, size: blob.size });
    updateState({ isGeneratingPreview: true, error: null });

    try {
      console.log('🎯 Calling enhanced getDocumentPreview with client-side processing...');

      // Force client-side processing for non-PDF documents to bypass server issues
      const isNonPDF = !mimeType.includes('pdf') && !fileName.toLowerCase().endsWith('.pdf');
      const options = isNonPDF ? {
        forceClientSide: true,
        bypassServer: true,
        metadata: {
          modifiedDate: currentDocument.updated_at ? new Date(currentDocument.updated_at).toLocaleDateString() : new Date().toLocaleDateString()
        }
      } : {
        metadata: {
          modifiedDate: currentDocument.updated_at ? new Date(currentDocument.updated_at).toLocaleDateString() : new Date().toLocaleDateString()
        }
      };

      const previewResult = await getDocumentPreview(blob, fileName, mimeType, options);

      console.log('✅ Client-side plugin preview result received:', {
        type: previewResult.type,
        format: previewResult.format,
        pluginName: previewResult.metadata?.pluginName,
        processingTime: previewResult.metadata?.processingTime,
        hasContent: !!previewResult.content,
        extractionMethod: previewResult.metadata?.extractionMethod
      });

      // Immediately set plugin result and clear all loading states
      updateState({
        pluginResult: previewResult,
        content: previewResult.format === 'html' ? previewResult.content : null,
        isGeneratingPreview: false,
        isLoading: false,
        isDecrypting: false,
        error: null
      });

      // Log successful processing
      if (previewResult.metadata?.extractionMethod) {
        console.log(`✅ Document processed successfully using method: ${previewResult.metadata.extractionMethod}`);
      }

    } catch (error) {
      console.error('❌ Client-side plugin preview generation failed:', error);

      // Provide helpful error message based on error type
      let errorMessage = 'Document preview failed';

      if (error instanceof Error) {
        if (error.message.includes('ZIP validation failed')) {
          errorMessage = 'Document format issue detected, but processing may still be possible';
        } else if (error.message.includes('Package not found')) {
          errorMessage = 'Client-side processing bypassed server issues - document content may still be available';
        } else if (error.message.includes('Office document processing not available')) {
          errorMessage = 'Using enhanced client-side processing for this document type';
        } else {
          errorMessage = `Preview processing error: ${error.message}`;
        }
      }

      updateState({
        pluginResult: {
          type: 'error',
          format: 'html',
          error: errorMessage,
          content: `<div class="error-content">
            <h3>⚠️ Preview Processing Notice</h3>
            <p>${errorMessage}</p>
            <p>The document is available for download and should open normally in the appropriate application.</p>
            <ul>
              <li>Download the file using the download button</li>
              <li>Open with the appropriate software</li>
              <li>The file content should be intact despite preview limitations</li>
            </ul>
          </div>`
        },
        isGeneratingPreview: false,
        isLoading: false,
        isDecrypting: false
      });
    }
  }, [updateState, currentDocument]);

  const decryptAndPreview = useCallback(async (encryptionPassword: string) => {
    if (!currentDocument || !isPreviewable(currentDocument)) {
      updateState({ content: null, error: 'Preview not available for this file type' });
      return;
    }

    updateState({ isDecrypting: true, error: null });

    try {
      console.log('🔐 Starting document decryption for preview:', currentDocument.name);

      // Fetch the encrypted document data
      const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8002'}/api/v1/documents/${currentDocument.id}/download`;
      console.log('🔗 DOWNLOAD - Fetching from URL:', downloadUrl);

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || sessionStorage.getItem('access_token')}`,
        },
      });

      console.log('🔗 DOWNLOAD - Response:', {
        status: response.status,
        contentLength: response.headers.get('Content-Length'),
        contentType: response.headers.get('Content-Type')
      });

      if (!response.ok) {
        // Enhanced error handling for different HTTP status codes
        let errorMessage = 'Failed to fetch document';
        let errorType = 'GENERIC_ERROR';
        let suggestedActions: string[] = [];

        try {
          const errorResponse = await response.json();
          if (errorResponse.detail) {
            errorMessage = errorResponse.detail;
          }
          if (errorResponse.error_type) {
            errorType = errorResponse.error_type;
          }
        } catch {
          // If response is not JSON, use default error message based on status
          switch (response.status) {
            case 404:
              errorMessage = 'Document file not found. The file may have been moved, deleted, or renamed.';
              errorType = 'FILE_NOT_FOUND';
              suggestedActions = [
                'Check if the file still exists in the system',
                'Verify the document hasn\'t been moved to a different location',
                'Contact your administrator if this is unexpected',
                'Try refreshing the page and attempting again'
              ];
              break;
            case 403:
              errorMessage = 'Access denied. You do not have permission to view this document.';
              errorType = 'ACCESS_DENIED';
              suggestedActions = [
                'Contact the document owner to request access',
                'Check if your account permissions have changed',
                'Verify you are logged in with the correct account',
                'Contact your administrator for permission review'
              ];
              break;
            case 410:
              errorMessage = 'Document has been permanently deleted and is no longer available.';
              errorType = 'FILE_DELETED';
              suggestedActions = [
                'Check if the document is available in trash/recycle bin',
                'Contact your administrator about document recovery',
                'Look for backup copies of the document'
              ];
              break;
            case 422:
              errorMessage = 'Document format is corrupted or unsupported for preview.';
              errorType = 'CORRUPTED_FILE';
              suggestedActions = [
                'Try downloading the file directly',
                'Check if the original file was uploaded correctly',
                'Verify the file format is supported',
                'Contact support if the issue persists'
              ];
              break;
            case 429:
              errorMessage = 'Too many requests. Please wait a moment before trying again.';
              errorType = 'RATE_LIMITED';
              suggestedActions = [
                'Wait a few moments and try again',
                'Avoid rapid successive preview attempts'
              ];
              break;
            case 500:
              errorMessage = 'Server error occurred while accessing the document file.';
              errorType = 'SERVER_ERROR';
              suggestedActions = [
                'Try refreshing the page',
                'Wait a few minutes and try again',
                'Contact technical support if the problem persists'
              ];
              break;
            case 502:
            case 503:
            case 504:
              errorMessage = 'Service temporarily unavailable. Please try again later.';
              errorType = 'SERVICE_UNAVAILABLE';
              suggestedActions = [
                'Wait a few minutes and try again',
                'Check if there are any system maintenance announcements',
                'Contact support if the issue continues'
              ];
              break;
            default:
              errorMessage = `Failed to fetch document (Status: ${response.status})`;
              errorType = 'HTTP_ERROR';
              suggestedActions = [
                'Try refreshing the page',
                'Check your internet connection',
                'Contact support with the error code'
              ];
          }
        }

        const error = new Error(errorMessage);
        (error as any).type = errorType;
        (error as any).suggestedActions = suggestedActions;
        (error as any).statusCode = response.status;
        throw error;
      }

      const encryptedBlob = await response.blob();
      console.log('📦 Downloaded blob:', {
        size: encryptedBlob.size,
        type: encryptedBlob.type,
        expectedSize: response.headers.get('Content-Length')
      });

      // Check encryption status more robustly
      const hasLegacyEncryption = !!(currentDocument.encryption_key_id && currentDocument.encryption_iv && currentDocument.encryption_auth_tag);
      const hasZeroKnowledgeEncryption = !!currentDocument.encrypted_dek;
      const hasEncryption = hasLegacyEncryption || hasZeroKnowledgeEncryption;

      // For PDFs, always prefer client-side plugin system
      const isPDF = currentDocument.mime_type === 'application/pdf' || currentDocument.name.toLowerCase().endsWith('.pdf');

      if (isPDF) {
        console.log('📄 PDF detected - using client-side plugin system');

        if (hasEncryption) {
          console.log('🔑 PDF appears encrypted, attempting decryption...');

          try {
            // Check if we have encryption keys available
            if (!keys || keys.length === 0) {
              console.warn('⚠️ No encryption keys available, treating PDF as non-encrypted');

              // Clear all loading states immediately when keys are missing
              updateState({
                isDecrypting: false,
                isGeneratingPreview: false,
                isLoading: false,
                error: 'No encryption keys available. This document may be unencrypted or you may need to set up encryption keys first.'
              });

              throw new Error('No encryption keys available');
            }

            if (hasLegacyEncryption) {
              console.log('🔄 Decrypting PDF with legacy encryption...');

              const encryptedData = await encryptedBlob.arrayBuffer();
              const decryptionMetadata = {
                keyId: currentDocument.encryption_key_id,
                iv: currentDocument.encryption_iv,
                authTag: currentDocument.encryption_auth_tag,
                originalName: currentDocument.name,
                mimeType: currentDocument.mime_type
              };

              const decryptedFile = await decryptDownloadedFile(encryptedData, decryptionMetadata, encryptionPassword);
              console.log('✅ PDF decrypted successfully with legacy encryption');

              const pluginOptions = {
                metadata: {
                  modifiedDate: currentDocument.updated_at ? new Date(currentDocument.updated_at).toLocaleDateString() : new Date().toLocaleDateString()
                }
              };
              const previewResult = await getDocumentPreview(decryptedFile, currentDocument.name, currentDocument.mime_type || 'application/pdf', pluginOptions);
              updateState({
                pluginResult: previewResult,
                content: previewResult.format === 'html' ? previewResult.content : null
              });

              updateState({
                isDecrypting: false,
                needsPassword: false,
                decryptedBlob: decryptedFile,
                decryptedDocumentId: currentDocument.id
              });

              setShowPasswordDialog(false);
              return;
            } else if (hasZeroKnowledgeEncryption) {
              console.log('🔄 Zero-knowledge encrypted PDF - fallback to non-encrypted preview');
              throw new Error('Zero-knowledge encryption not supported for PDF preview yet');
            }

          } catch (decryptionError) {
            console.warn('⚠️ PDF decryption failed, treating as non-encrypted:', decryptionError);

            // Clear all loading states when decryption fails
            updateState({
              isDecrypting: false,
              isGeneratingPreview: false,
              isLoading: false
            });

            // If this is a critical error (like missing keys), show error instead of continuing
            if (decryptionError.message?.includes('No encryption keys available')) {
              return; // Error state already set above
            }

            // Continue to non-encrypted handling below for other errors
          }
        }

        // PDF is not encrypted OR decryption failed - use directly with plugin system
        console.log('📄 Processing PDF as non-encrypted document');
        const pluginOptions = {
          metadata: {
            modifiedDate: currentDocument.updated_at ? new Date(currentDocument.updated_at).toLocaleDateString() : new Date().toLocaleDateString()
          }
        };
        const previewResult = await getDocumentPreview(encryptedBlob, currentDocument.name, currentDocument.mime_type || 'application/pdf', pluginOptions);
        updateState({
          pluginResult: previewResult,
          content: previewResult.format === 'html' ? previewResult.content : null
        });

        updateState({
          isDecrypting: false,
          needsPassword: false,
          decryptedBlob: encryptedBlob,
          decryptedDocumentId: currentDocument.id
        });

        setShowPasswordDialog(false);
        return;
      }

      // For non-PDF files, prioritize client-side processing to bypass server issues
      if (hasEncryption) {
        console.log('🔑 Processing encrypted non-PDF document with client-side priority:', {
          documentId: currentDocument.id,
          hasLegacyEncryption,
          hasZeroKnowledgeEncryption,
          mimeType: currentDocument.mime_type
        });

        // Try client-side decryption first to bypass server temp file issues
        if (hasLegacyEncryption) {
          try {
            console.log('🔄 Attempting client-side decryption for non-PDF...');

            const encryptedData = await encryptedBlob.arrayBuffer();
            const decryptionMetadata = {
              keyId: currentDocument.encryption_key_id,
              iv: currentDocument.encryption_iv,
              authTag: currentDocument.encryption_auth_tag,
              originalName: currentDocument.name,
              mimeType: currentDocument.mime_type
            };

            const decryptedFile = await decryptDownloadedFile(encryptedData, decryptionMetadata, encryptionPassword);
            console.log('✅ Client-side decryption successful for non-PDF');

            // Use client-side plugin processing with document metadata
            const pluginOptions = {
              metadata: {
                modifiedDate: currentDocument.updated_at ? new Date(currentDocument.updated_at).toLocaleDateString() : new Date().toLocaleDateString()
              }
            };
            const previewResult = await getDocumentPreview(decryptedFile, currentDocument.name, currentDocument.mime_type || 'application/octet-stream', pluginOptions);

            // Process plugin result similar to generatePluginPreview
            updateState({
              pluginResult: previewResult,
              content: previewResult.format === 'html' ? previewResult.content : null,
              isGeneratingPreview: false,
              isLoading: false,
              isDecrypting: false,
              needsPassword: false,
              decryptedBlob: decryptedFile,
              decryptedDocumentId: currentDocument.id,
              error: null
            });

            setShowPasswordDialog(false);
            return;

          } catch (clientDecryptError) {
            console.warn('⚠️ Client-side decryption failed, attempting server fallback:', clientDecryptError);

            // Check if this is a password error that should stop the flow
            const errorMessage = clientDecryptError.message?.toLowerCase() || '';
            if (errorMessage.includes('wrong password') ||
                errorMessage.includes('authentication failed') ||
                errorMessage.includes('invalid password')) {
              // Don't attempt fallback for password errors - show immediately
              updateState({
                isDecrypting: false,
                error: '🔑 Incorrect password. Please check your password and try again.'
              });
              return;
            }
          }
        }

        // Fallback to server-side preview only if client-side fails
        try {
          console.log('🔄 Attempting server-side preview as fallback...');
          const { documentPreviewService } = await import('../../services/api/documentPreview');

          const previewData = await documentPreviewService.getEncryptedPreview(
            currentDocument.id,
            encryptionPassword,
            { previewType: 'auto' }
          );

          console.log('✅ Server-side preview generated as fallback:', previewData);

          // Generate plugin preview from the server response
          if (previewData.type === 'decrypted' && previewData.preview) {
            const previewBlob = new Blob([previewData.preview], { type: 'text/plain' });
            const pluginOptions = {
              metadata: {
                modifiedDate: currentDocument.updated_at ? new Date(currentDocument.updated_at).toLocaleDateString() : new Date().toLocaleDateString()
              }
            };
            const previewResult = await getDocumentPreview(previewBlob, currentDocument.name, 'text/plain', pluginOptions);
            updateState({
              pluginResult: previewResult,
              content: previewResult.format === 'html' ? previewResult.content : null
            });
          } else if (previewData.type === 'thumbnail' && previewData.data_url) {
            updateState({
              pluginResult: {
                type: 'success',
                format: 'image',
                dataUrl: previewData.data_url,
                content: previewData.data || '',
                metadata: { pluginName: 'ServerPreview', processingTime: '0ms' }
              }
            });
          } else {
            updateState({
              pluginResult: {
                type: 'success',
                format: 'text',
                content: previewData.message || previewData.preview || 'Preview generated successfully',
                metadata: { pluginName: 'ServerPreview', processingTime: '0ms' }
              }
            });
          }

          updateState({
            isDecrypting: false,
            needsPassword: false,
            isGeneratingPreview: false,
            isLoading: false,
            error: null
          });

          setShowPasswordDialog(false);
          return;

        } catch (previewError) {
          console.error('❌ Both client-side and server-side processing failed:', previewError);
          // Continue to general client-side processing below
        }
      }
      
      // Client-side decryption fallback (for compatibility)
      if (currentDocument.encryption_key_id && currentDocument.encryption_iv && currentDocument.encryption_auth_tag) {
        console.log('🔄 Falling back to client-side decryption');

        try {
          // Convert blob to ArrayBuffer for decryption
          const encryptedData = await encryptedBlob.arrayBuffer();

          // Prepare decryption metadata
          const decryptionMetadata = {
            keyId: currentDocument.encryption_key_id,
            iv: currentDocument.encryption_iv,
            authTag: currentDocument.encryption_auth_tag,
            originalName: currentDocument.name,
            mimeType: currentDocument.mime_type
          };

          // Decrypt the document
          const decryptedFile = await decryptDownloadedFile(encryptedData, decryptionMetadata, encryptionPassword);
          console.log('✅ Document decrypted successfully:', decryptedFile.name);

          // Generate plugin preview from decrypted file with document metadata
          const pluginOptions = {
            metadata: {
              modifiedDate: currentDocument.updated_at ? new Date(currentDocument.updated_at).toLocaleDateString() : new Date().toLocaleDateString()
            }
          };
          const previewResult = await getDocumentPreview(decryptedFile, currentDocument.name, currentDocument.mime_type || 'application/octet-stream', pluginOptions);

          // Process plugin result
          updateState({
            pluginResult: previewResult,
            content: previewResult.format === 'html' ? previewResult.content : null,
            isGeneratingPreview: false,
            isLoading: false,
            isDecrypting: false,
            needsPassword: false,
            decryptedBlob: decryptedFile,
            decryptedDocumentId: currentDocument.id,
            error: null
          });

          setShowPasswordDialog(false);

        } catch (decryptionError) {
          console.error('❌ Client-side decryption failed:', decryptionError);

          // Check if this is a password-related error
          const errorMessage = decryptionError.message?.toLowerCase() || '';
          if (errorMessage.includes('wrong password') ||
              errorMessage.includes('authentication failed') ||
              errorMessage.includes('invalid password') ||
              errorMessage.includes('decryption failed')) {
            throw new Error('🔑 Incorrect password. Please check your password and try again.');
          }

          throw new Error(`Decryption failed: ${decryptionError.message}`);
        }

      } else {
        console.log('📄 Document not encrypted, using directly');
        // Document is not encrypted, use directly for plugin preview
        const pluginOptions = {
          metadata: {
            modifiedDate: currentDocument.updated_at ? new Date(currentDocument.updated_at).toLocaleDateString() : new Date().toLocaleDateString()
          }
        };
        const previewResult = await getDocumentPreview(encryptedBlob, currentDocument.name, currentDocument.mime_type || 'application/octet-stream', pluginOptions);
        updateState({
          pluginResult: previewResult,
          content: previewResult.format === 'html' ? previewResult.content : null,
          isDecrypting: false,
          needsPassword: false,
          decryptedBlob: encryptedBlob,
          decryptedDocumentId: currentDocument.id
        });
      }

      setShowPasswordDialog(false);

    } catch (error) {
      console.error('❌ Document preview failed:', error);

      // Provide user-friendly error messages
      let errorMessage = 'Failed to load document preview';

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // Check for specific error types and provide appropriate messages
        if (message.includes('missing from disk') || message.includes('not found on storage') || message.includes('file not found')) {
          errorMessage = `📁 Document Missing: The file "${currentDocument.name}" is no longer available on the server. It may have been moved, deleted, or the storage location is inaccessible.`;
        } else if (message.includes('access denied') || message.includes('permission')) {
          errorMessage = `🔒 Access Denied: You don't have permission to access "${currentDocument.name}" or the file permissions have changed.`;
        } else if (message.includes('corrupted') || message.includes('invalid')) {
          errorMessage = `⚠️ File Error: The document "${currentDocument.name}" appears to be corrupted or invalid.`;
        } else if (message.includes('wrong password') || message.includes('decryption failed')) {
          errorMessage = `🔑 Decryption Failed: Unable to decrypt "${currentDocument.name}". Please check your password.`;
        } else if (message.includes('moved during download') || message.includes('disappeared')) {
          errorMessage = `📋 File Changed: The document "${currentDocument.name}" was modified during preview. Please refresh and try again.`;
        } else {
          // Use the original error message if it's already user-friendly
          errorMessage = error.message;
        }
      }

      updateState({
        error: errorMessage,
        isDecrypting: false,
        isGeneratingPreview: false,
        isLoading: false,
        pluginResult: null // Clear any partial plugin results
      });
    }
  }, [currentDocument, isPreviewable, updateState, decryptDownloadedFile, keys, getDocumentPreview]);


  /**
   * Handle password submission
   */
  const handlePasswordSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      decryptAndPreview(password);
    }
  }, [password, decryptAndPreview]);

  /**
   * Start preview process (show password dialog or use cached decryption)
   */
  const startPreview = useCallback(() => {
    if (!currentDocument) return;

    // Check if this document is already decrypted (cached state)
    const isDocumentAlreadyDecrypted = state.decryptedDocumentId === currentDocument.id;

    if (isDocumentAlreadyDecrypted && !state.needsPassword) {
      console.log('📋 Using cached decrypted state for document:', currentDocument.name);
      updateState({ isLoading: false });
      return;
    }

    // Check if document is encrypted and needs password
    const hasLegacyEncryption = !!(currentDocument.encryption_key_id && currentDocument.encryption_iv && currentDocument.encryption_auth_tag);
    const hasZeroKnowledgeEncryption = !!currentDocument.encrypted_dek;
    const hasEncryption = hasLegacyEncryption || hasZeroKnowledgeEncryption;

    if (hasEncryption && state.needsPassword) {
      setShowPasswordDialog(true);
    } else {
      // Document is not encrypted or already decrypted, proceed directly
      updateState({
        isLoading: false,
        needsPassword: false
      });
    }
  }, [currentDocument, state.needsPassword, state.decryptedDocumentId, updateState]);

  /**
   * Handle zoom controls
   */
  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    updateState({
      zoom: direction === 'in' ? Math.min(state.zoom + 25, 200) :
            direction === 'out' ? Math.max(state.zoom - 25, 25) :
            100
    });
  }, [state.zoom, updateState]);

  /**
   * Handle rotation
   */
  const handleRotate = useCallback(() => {
    updateState({ rotation: (state.rotation + 90) % 360 });
  }, [state.rotation, updateState]);

  /**
   * Toggle fullscreen mode
   */
  const toggleFullscreen = useCallback(() => {
    updateState({ isFullscreen: !state.isFullscreen });
  }, [state.isFullscreen, updateState]);

  /**
   * Handle document export/print
   */
  const handleExport = useCallback(() => {
    if (state.blobUrl) {
      // Create a new window for printing
      const printWindow = window.open(state.blobUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else {
      // Fallback to download
      onDownload?.(currentDocument.id);
    }
  }, [state.blobUrl, currentDocument.name, currentDocument.id, onDownload]);

  /**
   * Format file size
   */
  const formatFileSize = useCallback((bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Get file type icon
   */
  const getFileIcon = useCallback((mimeType?: string) => {
    if (!mimeType) return <FileText className="w-8 h-8 text-gray-400" />;
    
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📋';
    if (mimeType.startsWith('text/')) return '📃';
    return '📁';
  }, []);

  /**
   * Render preview content based on file type and plugin results
   */
  const renderPreviewContent = useCallback(() => {
    // CRITICAL: If we have plugin result, render it IMMEDIATELY and skip ALL other checks
    if (state.pluginResult) {
      console.log('🎯 Plugin result exists, rendering plugin content IMMEDIATELY');
      console.log('Loading states at render time:', {
        isLoading: state.isLoading,
        isGeneratingPreview: state.isGeneratingPreview,
        isDecrypting: state.isDecrypting,
        pluginResultType: state.pluginResult.type,
        pluginResultFormat: state.pluginResult.format
      });

      // RENDER PLUGIN CONTENT IMMEDIATELY - NO OTHER CHECKS
      if (state.pluginResult.type === 'success') {
        switch (state.pluginResult.format) {
          case 'html':
            console.log('🔍 DocumentPreview rendering HTML:', {
              contentPreview: state.pluginResult.content.substring(0, 200),
              pluginName: state.pluginResult.metadata?.pluginName,
              isHTML: state.pluginResult.content.includes('<'),
              contentLength: state.pluginResult.content.length
            });
            return (
              <div className="flex-1 overflow-auto">
                <div
                  dangerouslySetInnerHTML={{ __html: state.pluginResult.content }}
                  className="w-full h-full"
                />
                {state.pluginResult.metadata?.processingTime && (
                  <div className="text-xs text-gray-400 p-2 border-t">
                    Plugin: {state.pluginResult.metadata.pluginName} •
                    Processed in {state.pluginResult.metadata.processingTime}
                  </div>
                )}
              </div>
            );
          case 'image':
            return (
              <div className="flex items-center justify-center min-h-64 p-4">
                <div
                  style={{
                    transform: `scale(${state.zoom / 100}) rotate(${state.rotation}deg)`,
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <img
                    src={state.pluginResult.dataUrl || `data:image/png;base64,${state.pluginResult.content}`}
                    alt={currentDocument.name}
                    className="max-w-full max-h-96 object-contain border border-gray-200 rounded-lg shadow-sm"
                    onError={() => {
                      updateState({ error: 'Failed to display plugin-generated image' });
                    }}
                  />
                </div>
              </div>
            );
          case 'iframe':
            return (
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={state.pluginResult.content}
                  className="w-full h-full border-none"
                  title={`Preview: ${currentDocument.name}`}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            );
          case 'text':
            return (
              <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{state.pluginResult.content}</pre>
                </div>
              </div>
            );
        }
      } else if (state.pluginResult.type === 'error') {
        return (
          <div className="flex items-center justify-center min-h-64 p-6">
            <div className="text-center max-w-2xl">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold mb-3 text-orange-600">
                Plugin Preview Failed
              </h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-left">
                <p className="text-orange-800 font-medium mb-4">
                  {state.pluginResult.error || 'Failed to generate preview'}
                </p>
                {state.pluginResult.content && (
                  <div dangerouslySetInnerHTML={{ __html: state.pluginResult.content }} />
                )}
              </div>
            </div>
          </div>
        );
      }
    }

    if ((state.isDecrypting || state.isGeneratingPreview) && !state.pluginResult) {
      const isLargeFile = currentDocument?.file_size && currentDocument.file_size > 50 * 1024 * 1024;
      const fileSizeDisplay = currentDocument?.file_size ? `${Math.round(currentDocument.file_size / 1024 / 1024)}MB` : '';

      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 mb-2">
              {state.isDecrypting ? 'Decrypting document...' : 'Generating preview...'}
            </p>
            <p className="text-gray-500 text-sm">
              {state.isDecrypting
                ? isLargeFile
                  ? `Decrypting large file (${fileSizeDisplay}). This may take several minutes.`
                  : 'Please wait while we decrypt your document'
                : 'Processing document with our preview system'
              }
            </p>
            {isLargeFile && state.isDecrypting && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 text-xs">
                  <strong>Large File Notice:</strong> Files over 50MB may take 2-5 minutes to decrypt.
                  Browser performance may be affected during this process.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (state.needsPassword && !showPasswordDialog) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Document Encrypted</h3>
            <p className="text-gray-600 mb-4">
              This document is encrypted and requires a password to preview
            </p>
            <button
              onClick={() => setShowPasswordDialog(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Eye className="w-4 h-4 mr-2" />
              Decrypt and Preview
            </button>
          </div>
        </div>
      );
    }

    if (state.isLoading && !state.pluginResult) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (state.error) {
      // Parse error information if available
      const errorObj = typeof state.error === 'object' ? state.error as any : { message: state.error };
      const errorType = errorObj?.type || 'GENERIC_ERROR';
      const suggestedActions = errorObj?.suggestedActions || [];
      const statusCode = errorObj?.statusCode;

      // Choose appropriate icon and colors based on error type
      const getErrorDisplay = (type: string) => {
        switch (type) {
          case 'FILE_NOT_FOUND':
            return { icon: '🔍', color: 'amber', title: 'File Not Found' };
          case 'ACCESS_DENIED':
            return { icon: '🔒', color: 'red', title: 'Access Denied' };
          case 'FILE_DELETED':
            return { icon: '🗑️', color: 'gray', title: 'File Deleted' };
          case 'CORRUPTED_FILE':
            return { icon: '⚠️', color: 'orange', title: 'File Corrupted' };
          case 'RATE_LIMITED':
            return { icon: '⏱️', color: 'yellow', title: 'Rate Limited' };
          case 'SERVER_ERROR':
            return { icon: '🔧', color: 'red', title: 'Server Error' };
          case 'SERVICE_UNAVAILABLE':
            return { icon: '🚫', color: 'gray', title: 'Service Unavailable' };
          default:
            return { icon: '❌', color: 'red', title: 'Preview Error' };
        }
      };

      const { icon, color, title } = getErrorDisplay(errorType);

      return (
        <div className="flex items-center justify-center min-h-64 p-6">
          <div className="text-center max-w-2xl">
            <div className="text-6xl mb-4">{icon}</div>
            <h3 className={`text-xl font-semibold mb-3 ${color === 'red' ? 'text-red-600' : color === 'amber' ? 'text-amber-600' : color === 'gray' ? 'text-gray-600' : color === 'orange' ? 'text-orange-600' : color === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>
              {title}
            </h3>

            <div className={`${color === 'red' ? 'bg-red-50 border-red-200' : color === 'amber' ? 'bg-amber-50 border-amber-200' : color === 'gray' ? 'bg-gray-50 border-gray-200' : color === 'orange' ? 'bg-orange-50 border-orange-200' : color === 'yellow' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'} border rounded-lg p-6 text-left`}>
              <p className={`${color === 'red' ? 'text-red-800' : color === 'amber' ? 'text-amber-800' : color === 'gray' ? 'text-gray-800' : color === 'orange' ? 'text-orange-800' : color === 'yellow' ? 'text-yellow-800' : 'text-red-800'} font-medium mb-4`}>
                {errorObj.message || state.error}
              </p>

              {statusCode && (
                <p className={`${color === 'red' ? 'text-red-600' : color === 'amber' ? 'text-amber-600' : color === 'gray' ? 'text-gray-600' : color === 'orange' ? 'text-orange-600' : color === 'yellow' ? 'text-yellow-600' : 'text-red-600'} text-sm mb-4`}>
                  Error Code: {statusCode}
                </p>
              )}

              {suggestedActions.length > 0 && (
                <div className="mt-4">
                  <h4 className={`font-semibold ${color === 'red' ? 'text-red-800' : color === 'amber' ? 'text-amber-800' : color === 'gray' ? 'text-gray-800' : color === 'orange' ? 'text-orange-800' : color === 'yellow' ? 'text-yellow-800' : 'text-red-800'} mb-2`}>
                    What you can try:
                  </h4>
                  <ul className={`${color === 'red' ? 'text-red-700' : color === 'amber' ? 'text-amber-700' : color === 'gray' ? 'text-gray-700' : color === 'orange' ? 'text-orange-700' : color === 'yellow' ? 'text-yellow-700' : 'text-red-700'} text-sm space-y-1`}>
                    {suggestedActions.map((action: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                {errorType === 'FILE_NOT_FOUND' && (
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Refresh Page
                  </button>
                )}
                {onDownload && ['CORRUPTED_FILE', 'FILE_NOT_FOUND'].includes(errorType) && (
                  <button
                    onClick={() => onDownload(currentDocument.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Try Download
                  </button>
                )}
                {['RATE_LIMITED', 'SERVER_ERROR', 'SERVICE_UNAVAILABLE'].includes(errorType) && (
                  <button
                    onClick={() => {
                      updateState({ error: null, isLoading: true });
                      setTimeout(() => {
                        startPreview();
                      }, 2000);
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                  >
                    Retry in 2s
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }


    if (!isPreviewable(currentDocument)) {
      // Provide specific messages based on file type
      const fileExtension = currentDocument.name.toLowerCase().split('.').pop() || '';
      const mimeType = currentDocument.mime_type || '';

      let message = 'This file type is not supported for preview.';
      let suggestions: string[] = [];

      // Specific guidance based on file type
      if (['pdf'].includes(fileExtension) || mimeType.includes('pdf')) {
        message = 'PDF preview is temporarily unavailable.';
        suggestions = ['Try refreshing the page', 'Download to view with a PDF reader'];
      } else if (['doc', 'docx'].includes(fileExtension) || mimeType.includes('word') || mimeType.includes('document')) {
        message = 'Word document preview is temporarily unavailable.';
        suggestions = ['Download to view in Microsoft Word', 'Convert to PDF for preview support'];
      } else if (['xls', 'xlsx'].includes(fileExtension) || mimeType.includes('excel') || mimeType.includes('sheet')) {
        message = 'Excel file preview is temporarily unavailable.';
        suggestions = ['Download to view in Microsoft Excel', 'Convert to CSV for preview support'];
      } else if (['ppt', 'pptx'].includes(fileExtension) || mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
        message = 'PowerPoint presentations are not supported for preview.';
        suggestions = ['Download to view in Microsoft PowerPoint', 'Convert to PDF for preview support'];
      } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExtension) || mimeType.includes('zip') || mimeType.includes('archive')) {
        message = 'Archive files cannot be previewed.';
        suggestions = ['Download to extract and view contents', 'Extract files individually for preview'];
      } else if (['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm'].includes(fileExtension)) {
        message = 'Executable files cannot be previewed for security reasons.';
        suggestions = ['Download with caution', 'Scan for viruses before running'];
      } else if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(fileExtension) || mimeType.includes('video')) {
        message = 'Video files are not supported for preview.';
        suggestions = ['Download to view in a video player', 'Convert to a supported format'];
      } else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(fileExtension) || mimeType.includes('audio')) {
        message = 'Audio files are not supported for preview.';
        suggestions = ['Download to play in an audio player', 'Convert to a supported format'];
      } else if (fileExtension && !['txt', 'html', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'svg'].includes(fileExtension)) {
        message = `Files with .${fileExtension} extension are not supported for preview.`;
        suggestions = ['Download to view with appropriate software', 'Check file format compatibility'];
      }

      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">{getFileIcon(currentDocument.mime_type)}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview Not Available</h3>
            <p className="text-gray-600 mb-4">{message}</p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
              <h4 className="font-medium text-gray-700 mb-2">File Information:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Name:</span> {currentDocument.name}</p>
                <p><span className="font-medium">Type:</span> {mimeType || 'Unknown'}</p>
                <p><span className="font-medium">Size:</span> {formatFileSize(currentDocument.file_size)}</p>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4 text-left">
                <h4 className="font-medium text-blue-700 mb-2">What you can try:</h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => onDownload?.(currentDocument.id)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download to View
            </button>
          </div>
        </div>
      );
    }

    // PDF preview - handled by plugin system above, this section removed

    // Image preview - handled by plugin system above, this section removed

    // Text preview - handled by plugin system above, this section removed

    // If no plugin handled the preview, return null to show fallback
    return null;
  }, [state, currentDocument, isPreviewable, getFileIcon, onDownload]);


  // Start preview when document changes
  useEffect(() => {
    if (isOpen && currentDocument) {
      startPreview();
    }
  }, [isOpen, currentDocument, startPreview]);

  // Listen for PDF render success and error events
  useEffect(() => {
    const handlePdfRenderSuccess = (event: CustomEvent) => {
      console.log('🎯 PDF render success - hiding spinner immediately');
      console.log('Event detail:', event.detail);

      // Immediately clear all loading states
      updateState({
        isGeneratingPreview: false,
        isLoading: false,
        isDecrypting: false,
        error: null
      });
    };

    const handlePdfRenderError = (event: CustomEvent) => {
      console.log('🎯 PDF render error received in DocumentPreview:', event.detail);
      // Clear loading states and set error
      updateState({
        isGeneratingPreview: false,
        isLoading: false,
        isDecrypting: false,
        error: `PDF preview failed: ${event.detail?.error || 'Unknown error'}`
      });
    };

    // Use global document object explicitly to avoid shadowing
    globalThis.document.addEventListener('pdfRenderSuccess', handlePdfRenderSuccess as EventListener);
    globalThis.document.addEventListener('pdfRenderError', handlePdfRenderError as EventListener);

    return () => {
      globalThis.document.removeEventListener('pdfRenderSuccess', handlePdfRenderSuccess as EventListener);
      globalThis.document.removeEventListener('pdfRenderError', handlePdfRenderError as EventListener);
    };
  }, [updateState]);

  // Clear loading states when plugin result is available
  useEffect(() => {
    if (state.pluginResult) {
      console.log('🎯 Plugin result available, clearing ALL loading states immediately');
      console.log('Plugin result type:', state.pluginResult.type);
      console.log('Plugin result format:', state.pluginResult.format);

      updateState({
        isGeneratingPreview: false,
        isLoading: false,
        isDecrypting: false
      });
    }
  }, [state.pluginResult, updateState]);

  // Timeout fallback to prevent infinite loading
  useEffect(() => {
    if ((state.isLoading || state.isGeneratingPreview || state.isDecrypting) && !state.pluginResult) {
      const timeout = setTimeout(() => {
        console.log('⏰ Loading timeout - clearing spinner and showing error');

        // Check if PDF and provide specific error message
        const isPDF = currentDocument?.mime_type === 'application/pdf' ||
                      currentDocument?.name.toLowerCase().endsWith('.pdf');

        updateState({
          isLoading: false,
          isGeneratingPreview: false,
          isDecrypting: false,
          error: isPDF ?
            'PDF preview timed out. The document may be large or complex. Try downloading it instead.' :
            'Preview timed out. Try refreshing or downloading the document.'
        });
      }, 15000); // Extended timeout for PDFs

      return () => clearTimeout(timeout);
    }
  }, [state.isLoading, state.isGeneratingPreview, state.isDecrypting, state.pluginResult, currentDocument, updateState]);



  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clean up blob URL to prevent memory leaks
      if (state.blobUrl) {
        URL.revokeObjectURL(state.blobUrl);
      }
      
      updateState({
        content: null,
        error: null,
        zoom: 100,
        rotation: 0,
        needsPassword: true,
        isDecrypting: false,
        decryptedBlob: null,
        blobUrl: null,
        isFullscreen: false,
        pluginResult: null,
        isGeneratingPreview: false,
        decryptedDocumentId: null
      });
      setPassword('');
      setShowPasswordDialog(false);
      setShowShareDialog(false);
    }
  }, [isOpen, updateState, state.blobUrl]);

  if (!isOpen) return null;
  
  // Return early if no document is provided
  if (!currentDocument) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Document Selected</h3>
            <p className="text-gray-600 mb-4">Please select a document to preview.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-lg shadow-xl w-full flex flex-col transition-all duration-300 ${
          state.isFullscreen
            ? 'max-w-full max-h-full h-full m-0 rounded-none'
            : 'max-w-6xl max-h-[90vh]'
        } ${className}`}
        style={state.isFullscreen ? { width: '100vw', height: '100vh' } : {}}
      >
        {/* Header - Hide file info when plugin provides its own header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            {!state.pluginResult && (
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {currentDocument.name}
                </h3>
                <div className="flex items-center space-x-6 text-sm text-gray-500 mt-1">
                  <span>{currentDocument.mime_type || 'Unknown type'}</span>
                  <span>{formatFileSize(currentDocument.file_size)}</span>
                  <span>Modified {new Date(currentDocument.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            {state.pluginResult && (
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {currentDocument.name}
                </h3>
                <div className="flex items-center space-x-6 text-sm text-gray-500 mt-1">
                  <span>{currentDocument.mime_type || 'Unknown type'}</span>
                  <span>{formatFileSize(currentDocument.file_size)}</span>
                  {state.pluginResult?.metadata?.wordCount && (
                    <span>{state.pluginResult.metadata.wordCount} words</span>
                  )}
                  {state.pluginResult?.metadata?.pageCount && (
                    <span>{state.pluginResult.metadata.pageCount} pages</span>
                  )}
                  <span>Modified {new Date(currentDocument.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2 ml-4">
            {isPreviewable(currentDocument) && currentDocument.mime_type?.startsWith('image/') && (
              <>
                <button
                  onClick={() => handleZoom('out')}
                  disabled={state.zoom <= 25}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-500 min-w-12 text-center">
                  {state.zoom}%
                </span>
                <button
                  onClick={() => handleZoom('in')}
                  disabled={state.zoom >= 200}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 text-gray-600 hover:text-gray-800"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="w-px h-6 bg-gray-300 mx-2" />

            <button
              onClick={handleExport}
              className="p-2 text-gray-600 hover:text-gray-800"
              title="Export/Print"
            >
              <FileDown className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDownload?.(currentDocument.id)}
              className="p-2 text-gray-600 hover:text-gray-800"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowShareDialog(true)}
              className="p-2 text-gray-600 hover:text-gray-800"
              title="Share Document"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-600 hover:text-gray-800"
              title={state.isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {state.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreviewContent()}
        </div>

        {/* Footer */}
        {currentDocument.description && (
          <div className="border-t border-gray-200 p-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Description:</span> {currentDocument.description}
            </p>
          </div>
        )}
      </div>

      {/* Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Decrypt Document</h3>
                  <p className="text-sm text-gray-500">Enter your password to preview this encrypted document</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="decryption-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="decryption-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your document password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    autoFocus
                  />
                </div>

                <div className="text-xs text-gray-500">
                  <p>📄 Document: <span className="font-medium">{currentDocument.name}</span></p>
                  <p>📊 Size: <span className="font-medium">{formatFileSize(currentDocument.file_size)}</span></p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordDialog(false);
                      setPassword('');
                    }}
                    className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!password.trim() || state.isDecrypting}
                    className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {state.isDecrypting ? 'Decrypting...' : 'Decrypt & Preview'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Document Share Dialog */}
      <DocumentShareDialog
        document={currentDocument}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
      />
    </div>
  );
};

export default DocumentPreview;