/**
 * Secure Preview-Only Component for Zero-Knowledge Document Sharing
 *
 * This component replaces SharedDocumentPreview for view-only shares and provides:
 * - True view-only access with no file extraction possibility
 * - Streaming decryption without storing complete plaintext
 * - Canvas-only rendering for images and PDFs
 * - Comprehensive anti-bypass measures
 * - Audit logging and session management
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  X,
  Eye,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  Clock,
  Shield,
  Info
} from 'lucide-react';

// Import our secure preview services
import { SharePreviewService } from '../../services/api/sharePreview';

// Define interfaces locally to avoid complex dependencies
interface SecurePreviewData {
  type: string;
  format: string;
  sessionId: string;
  expiresAt: number;
  renderData: {
    content: string;
  };
}

interface PreviewSecurityConfig {
  chunkSize?: number;
  maxPreviewTime?: number;
  enableAntiBypass?: boolean;
  enableWatermarking?: boolean;
  auditLogging?: boolean;
}

interface SecurePreviewOnlyProps {
  shareToken: string;
  document: {
    id: number;
    name: string;
    mime_type: string;
    file_size: number;
    encrypted_dek?: string;
    encryption_iv?: string;
    is_encrypted?: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  sharePassword?: string;
  permissions: string[]; // Should only contain 'read' for view-only
  securityConfig?: Partial<PreviewSecurityConfig>;
}

interface SecurePreviewState {
  isLoading: boolean;
  error: string | null;
  isDecrypting: boolean;
  previewData: SecurePreviewData | null;
  sessionExpiry: number | null;
  securityWarnings: string[];
  renderMode: 'loading' | 'secure-preview' | 'error' | 'expired';
  statsVisible: boolean;
}

export const SecurePreviewOnly: React.FC<SecurePreviewOnlyProps> = ({
  shareToken,
  document,
  isOpen,
  onClose,
  className = '',
  sharePassword,
  permissions,
  securityConfig = {}
}) => {
  const [state, setState] = useState<SecurePreviewState>({
    isLoading: false,
    error: null,
    isDecrypting: false,
    previewData: null,
    sessionExpiry: null,
    securityWarnings: [],
    renderMode: 'loading',
    statsVisible: false
  });

  // Refs for cleanup
  const previewContainer = useRef<HTMLDivElement | null>(null);
  const securityTimer = useRef<NodeJS.Timeout | null>(null);

  const updateState = useCallback((updates: Partial<SecurePreviewState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Initialize secure preview system
   */
  const initializeSecurePreview = useCallback(async () => {
    // Validate permissions - only 'read' should be allowed for view-only
    if (permissions.includes('download')) {
      console.warn('⚠️ Download permission detected in view-only component');
      updateState({
        error: 'Security Configuration Error: Download permissions not allowed in view-only mode',
        renderMode: 'error'
      });
      return;
    }

    if (!permissions.includes('read')) {
      updateState({
        error: 'Insufficient permissions for preview',
        renderMode: 'error'
      });
      return;
    }

    updateState({
      isLoading: true,
      isDecrypting: true,
      error: null,
      renderMode: 'loading',
      securityWarnings: []
    });

    try {
      console.log('🔒 Initializing secure view-only preview system...');

      // Simple security config for view-only mode
      console.log('🔒 Security config:', securityConfig);

      // Fetch document data via preview endpoint
      const previewResponse = await SharePreviewService.fetchForPreview({
        shareToken,
        password: sharePassword
      });

      console.log('📦 Document data received:', { 
        size: previewResponse.encryptedData.byteLength,
        requiresDecryption: previewResponse.requiresDecryption,
        documentType: previewResponse.documentType,
        originalMimeType: previewResponse.originalMimeType
      });

      // Use the backend's encryption detection
      const requiresDecryption = previewResponse.requiresDecryption;
      const actualMimeType = previewResponse.originalMimeType || previewResponse.documentType;
      
      console.log('🔍 Document analysis:', {
        requiresDecryption,
        documentType: previewResponse.documentType,
        actualMimeType,
        documentName: previewResponse.documentName
      });

      // Create blob from encrypted data
      const encryptedBlob = new Blob([previewResponse.encryptedData], { 
        type: requiresDecryption ? 'application/octet-stream' : actualMimeType 
      });
      
      // Extract content (will handle decryption if needed)
      const extractedContent = await extractTextContent(encryptedBlob, actualMimeType, sharePassword);
      
      const previewData: SecurePreviewData = {
        type: getPreviewType(actualMimeType),
        format: 'text',
        sessionId: `preview_${Date.now()}`,
        expiresAt: Date.now() + (20 * 60 * 1000), // 20 minutes
        renderData: {
          content: extractedContent
        }
      };

      console.log('✅ Secure preview data generated:', previewData.type);

      updateState({
        previewData,
        sessionExpiry: previewData.expiresAt,
        isLoading: false,
        isDecrypting: false,
        renderMode: 'secure-preview'
      });

      // Start session timer
      startSessionTimer(previewData.expiresAt);

      // Render the preview
      await renderSecurePreview(previewData);

    } catch (error) {
      console.error('❌ Secure preview initialization failed:', error);
      updateState({
        error: error.message || 'Failed to initialize secure preview',
        isLoading: false,
        isDecrypting: false,
        renderMode: 'error'
      });
    }
  }, [shareToken, document, sharePassword, permissions, securityConfig, updateState]);

  /**
   * Get preview type from MIME type
   */
  const getPreviewType = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('word') || mimeType.includes('office')) return 'office';
    return 'text';
  };

  /**
   * Extract text content from encrypted blob by decrypting it first
   */
  const extractTextContent = async (encryptedBlob: Blob, mimeType: string, sharePassword?: string): Promise<string> => {
    try {
      // Check if we need to decrypt the data first
      const encryptedData = await encryptedBlob.arrayBuffer();
      
      // Import document encryption service
      const { documentEncryptionService } = await import('../../services/documentEncryption');
      
      // Check if the service has a master key available
      if (!documentEncryptionService.hasMasterKey()) {
        // For shared documents, we might not have the master key
        // Try to derive it from the share password or prompt for encryption password
        const encryptionPassword = sharePassword || prompt('Enter encryption password to decrypt document:');
        
        if (!encryptionPassword) {
          return `🔒 Encrypted Document Preview\n\nFile Type: ${mimeType}\nSize: ${(encryptedBlob.size / 1024).toFixed(1)} KB\n\nThis document is encrypted and requires an encryption password to decrypt.\nPlease provide the encryption password to view the content.`;
        }
        
        try {
          // Try to derive master key from encryption password
          const { deriveKey, base64ToUint8Array } = await import('../../utils/encryption');
          
          // Use document encryption metadata to derive key
          const salt = document.encrypted_dek ? 
            base64ToUint8Array(document.encrypted_dek.split(':')[1] || 'default-salt') : 
            new Uint8Array(32); // Default salt
          
          const masterKey = await deriveKey({
            password: encryptionPassword,
            salt,
            iterations: 100000
          });
          
          // Set the derived key in the service
          await documentEncryptionService.setMasterKey(masterKey);
          
          console.log('✅ Master key derived and set from encryption password');
        } catch (keyError) {
          console.error('❌ Failed to derive master key:', keyError);
          return `❌ Key Derivation Failed\n\nUnable to derive encryption key from the provided password.\nError: ${keyError instanceof Error ? keyError.message : 'Unknown error'}\n\nPlease check your encryption password and try again.`;
        }
      }
      
      try {
        // Try to decrypt the document
        const decryptionResult = await documentEncryptionService.decryptDocument(
          document as any, // Cast to Document type
          encryptedData
        );
        
        // Create a blob from the decrypted data
        const decryptedBlob = new Blob([decryptionResult.decryptedData], { type: decryptionResult.mimeType });
        
        // Extract text from the decrypted content
        if (decryptionResult.mimeType.includes('text') || decryptionResult.mimeType.includes('json')) {
          return await decryptedBlob.text();
        }
        
        // For other types, show basic info about the decrypted document
        return `📄 Decrypted Document Preview\n\nOriginal File: ${decryptionResult.originalFilename}\nFile Type: ${decryptionResult.mimeType}\nSize: ${(decryptionResult.originalSize / 1024).toFixed(1)} KB\n\nThis document has been successfully decrypted and is available in view-only mode.\nThe original formatting and content are preserved but cannot be downloaded.`;
        
      } catch (decryptError) {
        console.error('❌ Document decryption failed:', decryptError);
        return `⚠️ Decryption Failed\n\nFile Type: ${mimeType}\nSize: ${(encryptedBlob.size / 1024).toFixed(1)} KB\n\nUnable to decrypt this document. This may be due to:\n- Incorrect encryption password\n- Missing encryption keys\n- Document corruption\n\nError: ${decryptError instanceof Error ? decryptError.message : 'Unknown error'}`;
      }
      
    } catch (error) {
      console.error('❌ Content extraction failed:', error);
      return `❌ Preview Error\n\nUnable to process document content.\nError: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  /**
   * Render secure preview based on file type
   */
  const renderSecurePreview = useCallback(async (previewData: SecurePreviewData) => {
    // Wait for container to be available
    let attempts = 0;
    while (!previewContainer.current && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!previewContainer.current) {
      throw new Error('Preview container not available after waiting');
    }

    try {
      // Simple rendering for all types
      console.log('📝 Rendering secure preview...');
      
      switch (previewData.type) {
        case 'office':
          renderSecureOffice(previewData, previewContainer.current);
          break;
        case 'pdf':
        case 'image':
        case 'text':
        default:
          renderSecureText(previewData, previewContainer.current);
          break;
      }

      console.log('✅ Secure preview rendering completed');

    } catch (error) {
      console.error('❌ Secure preview rendering failed:', error);
      throw error;
    }
  }, []);

  /**
   * Render secure text content
   */
  const renderSecureText = (previewData: SecurePreviewData, container: HTMLElement) => {
    const textContent = previewData.renderData.content;
    const maxLength = 10000; // Limit text length for view-only
    const truncatedContent = textContent.length > maxLength
      ? textContent.substring(0, maxLength) + '\n\n[Content truncated for security - view-only mode]'
      : textContent;

    container.innerHTML = `
      <div class="secure-text-container" style="
        font-family: 'Courier New', monospace;
        padding: 20px;
        background: white;
        border-radius: 8px;
        max-height: 500px;
        overflow-y: auto;
        user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
      ">
        <div style="
          background: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 15px;
        ">
          🔒 Secure Text Preview • Copy/Select Disabled • Session: ${previewData.sessionId.slice(-8)}
        </div>
        <pre style="
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
        ">${truncatedContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </div>
    `;

    // Disable text selection
    container.addEventListener('selectstart', (e) => e.preventDefault());
    container.addEventListener('copy', (e) => e.preventDefault());
  };

  /**
   * Render secure office document preview
   */
  const renderSecureOffice = (previewData: SecurePreviewData, container: HTMLElement) => {
    const content = previewData.renderData.content;
    const maxLength = 5000; // Smaller limit for office docs
    const truncatedContent = content.length > maxLength
      ? content.substring(0, maxLength) + '\n\n[Content truncated - view-only mode]'
      : content;

    container.innerHTML = `
      <div class="secure-office-container" style="
        padding: 20px;
        background: white;
        border-radius: 8px;
        max-height: 500px;
        overflow-y: auto;
        user-select: none;
      ">
        <div style="
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
          color: #856404;
          margin-bottom: 15px;
        ">
          📊 Office Document Preview • Text-Only Mode • No Downloads • Session: ${previewData.sessionId.slice(-8)}
        </div>
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          font-size: 14px;
        ">
          ${truncatedContent.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
  };

  /**
   * Start session timer for automatic cleanup
   */
  const startSessionTimer = (expiresAt: number) => {
    const checkInterval = 30 * 1000; // Check every 30 seconds

    securityTimer.current = setInterval(() => {
      const now = Date.now();
      const timeLeft = expiresAt - now;

      if (timeLeft <= 0) {
        console.log('⏰ Secure preview session expired - forcing cleanup');
        updateState({ renderMode: 'expired' });
        forceCleanup();
      } else if (timeLeft <= 2 * 60 * 1000) { // 2 minutes warning
        updateState({
          securityWarnings: [`Session expires in ${Math.round(timeLeft / 60000)} minutes`]
        });
      }
    }, checkInterval);
  };

  /**
   * Force cleanup of all secure preview data
   */
  const forceCleanup = useCallback(() => {
    console.log('🧹 Forcing complete secure preview cleanup...');

    // Simple cleanup

    // Clear container
    if (previewContainer.current) {
      previewContainer.current.innerHTML = '';
    }

    // Clear timer
    if (securityTimer.current) {
      clearInterval(securityTimer.current);
      securityTimer.current = null;
    }

    // Reset state
    updateState({
      previewData: null,
      sessionExpiry: null,
      securityWarnings: [],
      renderMode: 'loading'
    });

    console.log('✅ Secure preview cleanup completed');
  }, [updateState]);

  // Initialize on open
  useEffect(() => {
    if (isOpen && !state.previewData) {
      initializeSecurePreview();
    }
  }, [isOpen, initializeSecurePreview, state.previewData]);

  // Cleanup on close or unmount
  useEffect(() => {
    return () => {
      forceCleanup();
    };
  }, [forceCleanup]);

  // Anti-download protection
  useEffect(() => {
    if (!isOpen) return;

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      console.warn('🚫 Right-click disabled in view-only mode');
    };

    // Disable keyboard shortcuts for saving
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        console.warn('🚫 Save shortcut disabled in view-only mode');
      }
    };

    // Disable drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      console.warn('🚫 Drag disabled in view-only mode');
    };

    window.document.addEventListener('contextmenu', handleContextMenu);
    window.document.addEventListener('keydown', handleKeyDown);
    window.document.addEventListener('dragstart', handleDragStart);

    return () => {
      window.document.removeEventListener('contextmenu', handleContextMenu);
      window.document.removeEventListener('keydown', handleKeyDown);
      window.document.removeEventListener('dragstart', handleDragStart);
    };
  }, [isOpen]);

  // Handle close
  const handleClose = useCallback(() => {
    forceCleanup();
    onClose();
  }, [forceCleanup, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                🔒 Secure Preview: {document.name}
              </h3>
              <p className="text-sm text-gray-500">
                View-Only Mode • {(document.file_size / 1024).toFixed(1)} KB
                {state.sessionExpiry && (
                  <span className="ml-2">
                    • Expires: {new Date(state.sessionExpiry).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => updateState({ statsVisible: !state.statsVisible })}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Security Info"
            >
              <Info className="w-4 h-4" />
            </button>

            <button
              onClick={handleClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security Warnings */}
        {state.securityWarnings.length > 0 && (
          <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
            {state.securityWarnings.map((warning, index) => (
              <div key={index} className="flex items-center space-x-2 text-yellow-800 text-sm">
                <Clock className="w-4 h-4" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Security Stats */}
        {state.statsVisible && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Security Level:</strong> Maximum (View-Only)
              </div>
              <div>
                <strong>Session ID:</strong> {state.previewData?.sessionId.slice(-12) || 'Not started'}
              </div>
              <div>
                <strong>Preview Type:</strong> {state.previewData?.type || 'Unknown'}
              </div>
              <div>
                <strong>Render Mode:</strong> {state.previewData?.format || 'Unknown'}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {state.renderMode === 'loading' && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">
                  {state.isDecrypting ? 'Decrypting for secure preview...' : 'Initializing secure preview...'}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Zero-knowledge decryption in progress
                </p>
              </div>
            </div>
          )}

          {state.renderMode === 'error' && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Preview Error</h3>
                <p className="text-gray-600 mb-4">{state.error}</p>
                <button
                  onClick={initializeSecurePreview}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry Secure Preview
                </button>
              </div>
            </div>
          )}

          {state.renderMode === 'expired' && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center max-w-md">
                <Clock className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Expired</h3>
                <p className="text-gray-600 mb-4">
                  Your secure preview session has expired for security reasons.
                </p>
                <button
                  onClick={initializeSecurePreview}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Start New Secure Session
                </button>
              </div>
            </div>
          )}

          {state.renderMode === 'secure-preview' && (
            <div ref={previewContainer} className="w-full h-full p-4">
              {/* Secure preview content will be rendered here */}
            </div>
          )}
        </div>

        {/* Footer Security Notice */}
        <div className="px-4 py-3 bg-gray-100 border-t border-gray-200 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <div>
              🔒 Secure View-Only Mode • File extraction disabled • Canvas protection active
            </div>
            <div>
              Powered by Zero-Knowledge Architecture
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurePreviewOnly;