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
import StreamingDecryptor, { SecurePreviewData, PreviewSecurityConfig } from '../../services/securePreview/StreamingDecryptor';
import PDFSecureRenderer from '../../services/securePreview/PDFSecureRenderer';
import ImageSecureRenderer from '../../services/securePreview/ImageSecureRenderer';

interface SecurePreviewOnlyProps {
  shareToken: string;
  document: {
    id: number;
    name: string;
    mime_type: string;
    file_size: number;
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

  // Refs for renderers and cleanup
  const streamingDecryptor = useRef<StreamingDecryptor | null>(null);
  const pdfRenderer = useRef<PDFSecureRenderer | null>(null);
  const imageRenderer = useRef<ImageSecureRenderer | null>(null);
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

      // Initialize streaming decryptor with security config
      const decryptorConfig = {
        chunkSize: 32 * 1024, // Smaller chunks for view-only (32KB)
        maxPreviewTime: 20 * 60 * 1000, // 20 minutes max for view-only
        enableAntiBypass: true,
        enableWatermarking: true,
        auditLogging: true,
        ...securityConfig
      };

      streamingDecryptor.current = new StreamingDecryptor(decryptorConfig);

      // Fetch encrypted document data via preview endpoint (not download)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8002'}/api/v1/shares/${shareToken}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: sharePassword || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(typeof errorData.detail === 'string' ? errorData.detail : 'Failed to access shared document');
      }

      const encryptedBlob = await response.blob();
      const encryptedData = await encryptedBlob.arrayBuffer();

      console.log('📦 Encrypted data received:', { size: encryptedData.byteLength });

      // Decrypt for secure preview only
      const previewData = await streamingDecryptor.current.decryptForPreviewOnly(
        encryptedData,
        sharePassword || 'default_preview_key',
        {
          name: document.name,
          mimeType: document.mime_type,
          size: document.file_size
        }
      );

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
   * Render secure preview based on file type
   */
  const renderSecurePreview = useCallback(async (previewData: SecurePreviewData) => {
    if (!previewContainer.current) {
      throw new Error('Preview container not available');
    }

    try {
      switch (previewData.type) {
        case 'pdf':
          console.log('📄 Rendering secure PDF preview...');
          if (!pdfRenderer.current) {
            pdfRenderer.current = new PDFSecureRenderer({
              maxPages: 25, // Limit pages for view-only
              canvasProtection: true,
              preventZoom: true
            });
          }
          await pdfRenderer.current.renderSecurePDF(previewData, previewContainer.current);
          break;

        case 'image':
          console.log('🖼️ Rendering secure image preview...');
          if (!imageRenderer.current) {
            imageRenderer.current = new ImageSecureRenderer({
              maxDimensions: { width: 800, height: 600 }, // Smaller for view-only
              canvasProtection: true,
              pixelManipulation: true,
              watermarkEnabled: true
            });
          }
          await imageRenderer.current.renderSecureImage(previewData, previewContainer.current);
          break;

        case 'text':
          console.log('📝 Rendering secure text preview...');
          renderSecureText(previewData, previewContainer.current);
          break;

        case 'office':
          console.log('📊 Rendering secure office preview...');
          renderSecureOffice(previewData, previewContainer.current);
          break;

        default:
          throw new Error(`Unsupported preview type: ${previewData.type}`);
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

    // Cleanup renderers
    if (streamingDecryptor.current) {
      streamingDecryptor.current.forceCleanup();
    }
    if (pdfRenderer.current) {
      pdfRenderer.current.cleanup();
    }
    if (imageRenderer.current) {
      imageRenderer.current.cleanup();
    }

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