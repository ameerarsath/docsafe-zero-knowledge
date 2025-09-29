/**
 * Shared Document Access Page
 *
 * Allows users to access documents via share links without requiring login
 * Handles different share types (internal, external, public) and permissions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  Lock,
  AlertCircle,
  Loader2,
  Shield,
  Clock,
  User,
  Globe,
  Users
} from 'lucide-react';
import { DocumentPreview } from '../components/documents/DocumentPreview';
import { SharedDocumentPreview } from '../components/documents/SharedDocumentPreview';
// import SecurePreviewOnly from '../components/documents/SecurePreviewOnly';
import { ShareService, ShareAccessResponse } from '../services/api/shares';
import { EncryptedShareService, SharedDocumentAccess } from '../services/encryptedShareService';

interface SharedDocumentState {
  isLoading: boolean;
  isValidating: boolean;
  shareData: ShareAccessResponse | null;
  error: string | null;
  requiresPassword: boolean;
  isPasswordProtected: boolean;
  accessGranted: boolean;
}

interface ShareMetadata {
  shareName: string;
  shareType: 'internal' | 'external' | 'public';
  permissions: string[];
  expiresAt?: string;
  createdAt: string;
  accessCount: number;
  maxAccess?: number;
}

export const SharedDocumentPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<SharedDocumentState>({
    isLoading: true,
    isValidating: false,
    shareData: null,
    error: null,
    requiresPassword: false,
    isPasswordProtected: false,
    accessGranted: false
  });

  const [password, setPassword] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const { shareData } = state;

  const documentMemo = useMemo(() => {
    if (!shareData) return null;
    return {
      id: shareData.document.id,
      name: shareData.document.name,
      mime_type: shareData.document.mime_type,
      file_size: shareData.document.file_size
    };
  }, [shareData]);

  const permissionsMemo = useMemo(() => {
    if (!shareData) return [];
    return shareData.permissions;
  }, [shareData]);


  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<SharedDocumentState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Validate share token and load document
   */
  const validateAndLoadShare = useCallback(async (sharePassword?: string) => {
    if (!shareToken) {
      updateState({
        error: 'Invalid share link - no token provided',
        isLoading: false
      });
      return;
    }

    updateState({
      isValidating: true,
      error: null
    });

    try {
      console.log('🔍 Validating share token:', shareToken);

      // For mock mode, create a realistic share validation
      if (ShareService.isMockMode()) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

        // Mock share validation
        const mockShareData: ShareAccessResponse = {
          document: {
            id: Math.floor(Math.random() * 1000),
            name: 'Shared Document.pdf',
            file_size: 2456789,
            mime_type: 'application/pdf',
            created_at: '2025-01-15T10:00:00Z',
            description: 'This is a shared document accessible via link'
          },
          permissions: ['read', 'download'],
          shareInfo: {
            shareName: 'Public Demo Share',
            shareType: 'external',
            expiresAt: '2025-12-31T23:59:59Z',
            accessCount: 15
          }
        };

        updateState({
          shareData: mockShareData,
          accessGranted: true,
          isLoading: false,
          isValidating: false
        });

        // Auto-enable preview for better user experience
        setShowPreview(true);

        console.log('✅ Mock share validation successful');
        return;
      }

      // Real API call
      const shareData = await ShareService.accessSharedDocument(shareToken, sharePassword);

      updateState({
        shareData,
        accessGranted: true,
        isLoading: false,
        isValidating: false
      });

      // Auto-enable preview for better user experience
      setShowPreview(true);

      console.log('✅ Share access granted:', shareData);

    } catch (error: any) {
      console.error('❌ Share validation failed:', error);

      // Enhanced error details extraction from structured response
      const errorData = error.response?.data;
      const errorDetail = errorData?.detail || errorData;

      // Robust error message extraction
      let errorMessage = 'Failed to access shared document';
      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (typeof errorDetail === 'object' && errorDetail !== null) {
        if (errorDetail.message) {
          errorMessage = errorDetail.message;
        } else if (errorDetail.error) {
          errorMessage = errorDetail.error;
        } else if (errorDetail.detail && typeof errorDetail.detail === 'string') {
          errorMessage = errorDetail.detail;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } else if (error.message && error.message !== '[object Object]') {
        errorMessage = error.message;
      }

      console.log('📋 Error response data:', errorData);
      console.log('📋 Error detail:', errorDetail);

      // Handle specific HTTP error codes with structured responses
      const status = error.response?.status;

      if (status === 404) {
        updateState({
          error: errorDetail?.error === 'Invalid share link'
            ? 'Invalid share link - The share link you are trying to access does not exist or has been removed.'
            : 'Document not found - The document associated with this share no longer exists.',
          isLoading: false,
          isValidating: false
        });
        return;
      }

      if (status === 410) {
        let expiredMessage = 'This link has expired';
        if (errorDetail?.error === 'Share link expired') {
          expiredMessage = 'This share link has expired and is no longer accessible.';
        } else if (errorDetail?.error === 'Share link revoked') {
          expiredMessage = 'This share link has been revoked by the document owner and is no longer accessible.';
        } else if (errorDetail?.error === 'Access limit reached') {
          expiredMessage = 'This share link has reached its maximum access limit and is no longer accessible.';
        }

        updateState({
          error: expiredMessage,
          isLoading: false,
          isValidating: false
        });
        return;
      }

      if (status === 403) {
        if (errorDetail?.requiresLogin || errorDetail?.error === 'Authentication required') {
          updateState({
            error: 'You need to be logged in to access this internal share.',
            isLoading: false,
            isValidating: false
          });

          // Redirect to login with return URL after showing the message
          setTimeout(() => {
            const returnUrl = encodeURIComponent(window.location.pathname);
            navigate(`/login?returnUrl=${returnUrl}`);
          }, 3000);
        } else {
          updateState({
            error: "You don't have permission to access this document",
            isLoading: false,
            isValidating: false
          });
        }
        return;
      }

      if (status === 401) {
        if (errorDetail?.requirePassword) {
          updateState({
            requiresPassword: true,
            isPasswordProtected: true,
            isValidating: false,
            error: errorDetail?.error === 'Invalid password'
              ? 'Incorrect password - please try again'
              : 'This shared document requires a password to access'
          });
        } else {
          updateState({
            error: errorMessage || 'Authentication failed',
            isLoading: false,
            isValidating: false
          });
        }
        return;
      }

      if (status >= 500) {
        updateState({
          error: 'Server error - Please try again later. If the problem persists, contact support.',
          isLoading: false,
          isValidating: false
        });
        return;
      }

      // Handle legacy error messages for backward compatibility
      if (errorMessage.includes('expired') || errorMessage.includes('revoked')) {
        updateState({
          error: 'This link has expired or been revoked',
          isLoading: false,
          isValidating: false
        });
      } else if (errorMessage.includes('Authentication required') || errorMessage.includes('internal shares')) {
        updateState({
          error: 'You need to be logged in to access this internal share.',
          isLoading: false,
          isValidating: false
        });

        setTimeout(() => {
          const returnUrl = encodeURIComponent(window.location.pathname);
          navigate(`/login?returnUrl=${returnUrl}`);
        }, 3000);
      } else if (errorMessage.includes('password') || errorMessage.includes('unauthorized')) {
        updateState({
          requiresPassword: true,
          isPasswordProtected: true,
          isValidating: false,
          error: 'This shared document requires a password'
        });
      } else {
        // Generic fallback
        updateState({
          error: errorMessage || 'Access Denied - Failed to access shared document',
          isLoading: false,
          isValidating: false
        });
      }
    }
  }, [shareToken, updateState]);

  /**
   * Handle password submission
   */
  const handlePasswordSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      validateAndLoadShare(password);
    }
  }, [password, validateAndLoadShare]);

  /**
   * Handle document download
   */
  const handleDownload = useCallback(async () => {
    if (!shareToken || !state.shareData) return;

    try {
      console.log('📥 Downloading shared document...');

      if (ShareService.isMockMode()) {
        // Mock download
        const blob = new Blob(['Mock shared document content'], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = state.shareData.document.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      // For encrypted documents, use the EncryptedShareService
      const document = state.shareData.document;

      if (EncryptedShareService.requiresDecryption(document as any)) {
        console.log('🔐 Document requires decryption...');

        // For shared documents, we don't have the user's encryption key
        // In a real implementation, you might:
        // 1. Prompt for the document password
        // 2. Use a share-specific decryption key
        // 3. Handle pre-decrypted shares

        // For now, let's try to download with the share service
        try {
          const blob = await ShareService.downloadSharedDocument(shareToken, password);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = document.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (encryptedError) {
          console.warn('Standard download failed, document may need special handling:', encryptedError);
          updateState({ error: 'This document requires special access. Please contact the document owner.' });
        }
      } else {
        // Standard download for non-encrypted documents
        const blob = await ShareService.downloadSharedDocument(shareToken, password);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

    } catch (error) {
      console.error('Failed to download shared document:', error);
      updateState({ error: 'Failed to download document' });
    }
  }, [shareToken, state.shareData, password, updateState]);

  /**
   * Get share type icon and info
   */
  const getShareTypeInfo = useCallback((shareType: string) => {
    switch (shareType) {
      case 'internal':
        return { icon: <Users className="w-4 h-4" />, label: 'Internal', color: 'blue' };
      case 'external':
        return { icon: <Globe className="w-4 h-4" />, label: 'External', color: 'green' };
      case 'public':
        return { icon: <Globe className="w-4 h-4" />, label: 'Public', color: 'purple' };
      default:
        return { icon: <Shield className="w-4 h-4" />, label: 'Unknown', color: 'gray' };
    }
  }, []);

  /**
   * Format file size
   */
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Check if share is expired
   */
  const isExpired = useCallback((expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }, []);

  // Initialize validation on mount
  useEffect(() => {
    validateAndLoadShare();
  }, [validateAndLoadShare]);

  // Loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Shared Document</h2>
          <p className="text-gray-600">Validating access permissions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error && !state.requiresPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Access Denied</h2>
            <p className="text-gray-600 mb-6">{state.error}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Password required state
  if (state.requiresPassword && !state.accessGranted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Required</h2>
              <p className="text-gray-600">This shared document is password protected</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="share-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Document Password
                </label>
                <input
                  id="share-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the share password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  autoFocus
                />
              </div>

              {state.error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">{state.error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={state.isValidating || !password.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                {state.isValidating && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{state.isValidating ? 'Validating...' : 'Access Document'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Document access granted - show document viewer
  if (state.accessGranted && state.shareData && documentMemo && permissionsMemo) {
    const { document, permissions, shareInfo } = state.shareData;
    const shareTypeInfo = getShareTypeInfo(shareInfo.shareType);
    const expired = isExpired(shareInfo.expiresAt);

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 truncate">
                    {document.name}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{formatFileSize(document.file_size)}</span>
                    <div className="flex items-center space-x-1">
                      {shareTypeInfo.icon}
                      <span>{shareInfo.shareName}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {permissions.includes('read') && (
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`px-3 py-2 text-white rounded-lg transition-colors flex items-center space-x-2 ${
                      showPreview
                        ? 'bg-gray-600 hover:bg-gray-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
                  </button>
                )}

                {permissions.includes('download') && (
                  <button
                    onClick={handleDownload}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Share Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {shareTypeInfo.icon}
                  <span className="text-sm font-medium text-gray-900">
                    {shareInfo.shareName}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs text-${shareTypeInfo.color}-700 bg-${shareTypeInfo.color}-100`}>
                    {shareTypeInfo.label}
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Permissions: {permissions.join(', ')}</span>
                  <span>Access count: {shareInfo.accessCount}</span>
                  {shareInfo.expiresAt && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span className={expired ? 'text-red-600' : ''}>
                        {expired ? 'Expired' : 'Expires'}: {new Date(shareInfo.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Document Preview */}
        {showPreview && permissions.includes('read') && shareToken && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <SharedDocumentPreview
                shareToken={shareToken}
                document={documentMemo}
                isOpen={true}
                onClose={() => setShowPreview(false)}
                onDownload={permissions.includes('download') ? () => handleDownload() : undefined}
                sharePassword={password}
                permissions={permissionsMemo}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Document</h2>
        <p className="text-gray-600">Please try again later.</p>
      </div>
    </div>
  );
};

export default SharedDocumentPage;
