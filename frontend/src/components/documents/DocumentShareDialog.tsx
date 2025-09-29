/**
 * Document Share Dialog Component for SecureVault
 * 
 * Features:
 * - Create secure document shares
 * - Internal and external sharing options
 * - Expiration date settings
 * - Permission levels
 * - Share link management
 * - Access tracking
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Eye, 
  Download, 
  Users, 
  Globe, 
  Clock, 
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  Link as LinkIcon
} from 'lucide-react';
import { Document } from '../../hooks/useDocuments';
import { ShareService, DocumentShare, ShareSettings } from '../../services/api/shares';
import { EncryptedShareService } from '../../services/encryptedShareService';

interface DocumentShareDialogProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface LocalShareSettings {
  shareType: 'internal' | 'external' | 'public';
  permissions: string[];
  expiresAt: string;
  shareName: string;
  requirePassword: boolean;
  sharePassword: string;
  maxAccess: number | null;
  encryptionPassword?: string; // Add encryption password support
}

// Use DocumentShare from the API service
type ExistingShare = DocumentShare;

interface ShareDialogState {
  settings: LocalShareSettings;
  existingShares: ExistingShare[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  successMessage: string | null;
  activeTab: 'create' | 'manage';
}

export const DocumentShareDialog: React.FC<DocumentShareDialogProps> = ({
  document,
  isOpen,
  onClose,
  className = ''
}) => {
  const [state, setState] = useState<ShareDialogState>({
    settings: {
      shareType: 'external',
      permissions: ['read'],
      expiresAt: '',
      shareName: '',
      requirePassword: false,
      sharePassword: '',
      maxAccess: null
    },
    existingShares: [],
    isLoading: false,
    isCreating: false,
    error: null,
    successMessage: null,
    activeTab: 'create'
  });

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<ShareDialogState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Update settings helper
   */
  const updateSettings = useCallback((updates: Partial<LocalShareSettings>) => {
    updateState({
      settings: { ...state.settings, ...updates }
    });
  }, [state.settings, updateState]);

  /**
   * Load existing shares
   */
  const loadExistingShares = useCallback(async () => {
    console.log('🔄 Loading existing shares for document:', document.id);
    updateState({ isLoading: true, error: null });

    try {
      const response = await ShareService.getDocumentShares(document.id);
      console.log('📥 Shares response:', response);

      // Handle both direct array response and wrapped response
      let shares: ExistingShare[] = [];
      if (Array.isArray(response)) {
        shares = response;
      } else if (response && response.shares) {
        shares = response.shares;
      } else if (response && Array.isArray(response)) {
        shares = response;
      }

      console.log('📋 Processed shares:', shares);
      updateState({
        existingShares: shares,
        isLoading: false
      });
    } catch (error: any) {
      console.error('❌ Failed to load shares:', error);

      // Better error handling with specific messages
      let errorMessage = 'Failed to load shares';

      if (error.response?.status === 404) {
        errorMessage = 'Document not found or you do not have permission to view shares';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view shares for this document';
      } else if (error.response?.status === 422) {
        errorMessage = 'Invalid request. Please refresh the page and try again';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later';
      } else if (error.message && !error.message.includes('[object Object]')) {
        errorMessage = error.message;
      }

      updateState({
        error: errorMessage,
        existingShares: [], // Always provide empty array instead of keeping old state
        isLoading: false
      });
    }
  }, [document.id, updateState]); // Remove state.existingShares dependency to prevent infinite loops

  /**
   * Create new share
   */
  const createShare = useCallback(async () => {
    console.log('🔄 Creating share with settings:', state.settings);

    // Validation
    if (!state.settings.shareName.trim()) {
      console.warn('❌ Share name is required');
      updateState({ error: 'Share name is required' });
      return;
    }

    if (state.settings.permissions.length === 0) {
      console.warn('❌ At least one permission is required');
      updateState({ error: 'At least one permission is required' });
      return;
    }

    updateState({ isCreating: true, error: null });
    console.log('🚀 Starting share creation...');

    try {
      // Check if document is encrypted and external sharing is requested
      const isEncrypted = EncryptedShareService.requiresDecryption(document);
      let encryptionPassword: string | null = null;

      if (isEncrypted && state.settings.shareType === 'external') {
        console.log('🔐 Document is encrypted and external sharing requested, getting encryption password...');

        // Prompt for encryption password before share creation
        encryptionPassword = prompt('Enter encryption password to enable external sharing of this encrypted document:');

        if (!encryptionPassword) {
          updateState({ isCreating: false, error: 'Encryption password is required for external sharing of encrypted documents.' });
          return;
        }

        // Try to validate encryption password
        let validationPassed = false;
        let validationError: string | null = null;

        try {
          // First try the lightweight validation approach
          await EncryptedShareService.validateEncryptionPassword(document, encryptionPassword);
          console.log('✅ Encryption password validated successfully (lightweight)');
          validationPassed = true;
        } catch (error) {
          console.warn('⚠️ Lightweight validation failed, trying full validation...', error);

          // If lightweight validation fails, try full validation as fallback
          try {
            await EncryptedShareService.validateEncryptionPasswordWithDownload(document, encryptionPassword);
            console.log('✅ Encryption password validated successfully (full validation)');
            validationPassed = true;
          } catch (fullValidationError) {
            console.error('❌ Full encryption password validation failed:', fullValidationError);

            // Provide specific error messages based on the error type
            if (fullValidationError instanceof Error) {
              const errorMsg = fullValidationError.message.toLowerCase();
              if (errorMsg.includes('not accessible') || errorMsg.includes('permission')) {
                validationError = 'Cannot validate encryption password: Document access denied. You may not have permission to access this document for sharing.';
              } else if (errorMsg.includes('moved') || errorMsg.includes('deleted') || errorMsg.includes('missing')) {
                validationError = 'Cannot validate encryption password: Document file appears to be missing from storage. Please contact an administrator.';
              } else if (errorMsg.includes('403') || errorMsg.includes('forbidden')) {
                validationError = 'Access denied: You do not have permission to share this document.';
              } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
                validationError = 'Document not found or inaccessible. The document may have been moved or you may lack access permissions.';
              } else if (errorMsg.includes('format')) {
                validationError = 'Invalid encryption password format. Please check your password and try again.';
              } else {
                validationError = 'Invalid encryption password. Please verify the password is correct and try again.';
              }
            } else {
              validationError = 'Unable to validate encryption password. Please try again or contact support.';
            }
          }
        }

        if (!validationPassed && validationError) {
          // Ask user if they want to proceed without validation
          const proceedWithoutValidation = confirm(
            `${validationError}\n\n` +
            'Would you like to proceed with share creation anyway? ' +
            'Note: If the encryption password is incorrect, recipients may not be able to access the shared document.'
          );

          if (!proceedWithoutValidation) {
            updateState({
              isCreating: false,
              error: validationError + ' Share creation cancelled.'
            });
            return;
          } else {
            console.warn('⚠️ User chose to proceed without password validation');
          }
        }

        // Store encryption password for share creation (separate from share password)
        // Don't update state - use local variable to avoid async state issues
      }

      // Create share with validated encryption password
      console.log('📡 Calling ShareService.createShare...');

      // Use local settings with encryption password to avoid async state issues
      const shareSettings = {
        ...state.settings,
        encryptionPassword: (isEncrypted && state.settings.shareType === 'external') ? encryptionPassword : undefined
      };

      const response = await ShareService.createShare({
        documentId: document.id,
        settings: shareSettings
      });

      console.log('✅ Share created successfully:', response);

      // Build success message with instructions
      let successMsg = `Share "${response.share.shareName}" created successfully!`;

      if (response.share.shareType === 'external') {
        successMsg += ' Anyone with the link can access this document.';
      } else if (response.share.shareType === 'internal') {
        successMsg += ' Only authenticated users can access this document.';
      }

      if (!response.share.permissions.includes('download')) {
        successMsg += ' Recipients can view but not download.';
      }

      updateState({
        existingShares: [...(state.existingShares || []), response.share],
        successMessage: successMsg,
        isCreating: false,
        activeTab: 'manage'
      });

      // Copy URL to clipboard
      try {
        await ShareService.copyShareUrl(response.share.shareToken);
        console.log('📋 URL copied to clipboard');
        updateState({
          successMessage: successMsg + ' Share link copied to clipboard!'
        });
      } catch (clipboardError) {
        console.warn('Failed to copy to clipboard:', clipboardError);
        // Show the share URL in the success message if copy fails
        const shareUrl = ShareService.generateShareUrl(response.share.shareToken);
        updateState({
          successMessage: `${successMsg} Share link: ${shareUrl}`
        });
      }

      // Reset form but keep default permissions
      updateSettings({
        shareName: '',
        expiresAt: '',
        requirePassword: false,
        sharePassword: '',
        maxAccess: null,
        permissions: ['read'] // Always keep at least read permission
      });

    } catch (error) {
      console.error('❌ Failed to create share:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to create share. Please check the console for details.',
        isCreating: false
      });
    }
  }, [document.id, state.settings, state.existingShares, updateState, updateSettings]);

  /**
   * Copy share link to clipboard
   */
  const copyShareLink = useCallback(async (shareToken: string) => {
    try {
      await ShareService.copyShareUrl(shareToken);
      updateState({ successMessage: 'Share link copied to clipboard!' });
    } catch (error) {
      console.error('Failed to copy link:', error);
      updateState({ error: 'Failed to copy link to clipboard' });
    }
  }, [updateState]);

  /**
   * Revoke share
   */
  const revokeShare = useCallback(async (shareId: number) => {
    updateState({ isLoading: true });

    try {
      await ShareService.revokeShare(shareId);

      updateState({
        existingShares: (state.existingShares || []).map(share =>
          share.id === shareId ? { ...share, isActive: false } : share
        ),
        isLoading: false,
        successMessage: 'Share revoked successfully!'
      });
    } catch (error) {
      console.error('Failed to revoke share:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to revoke share',
        isLoading: false
      });
    }
  }, [state.existingShares, updateState]);

  /**
   * Format date for display
   */
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  /**
   * Get minimum expiration date (24 hours from now)
   */
  const minExpirationDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 16);
  }, []);

  /**
   * Get share type info
   */
  const getShareTypeInfo = useCallback((shareType: string) => {
    switch (shareType) {
      case 'internal':
        return {
          icon: <Users className="w-4 h-4" />,
          label: 'Internal',
          description: 'Requires authentication - only logged-in users can access'
        };
      case 'external':
        return {
          icon: <Globe className="w-4 h-4" />,
          label: 'External',
          description: 'No authentication required - anyone with the link can access'
        };
      case 'public':
        return {
          icon: <Globe className="w-4 h-4" />,
          label: 'Public',
          description: 'Publicly accessible, no link required'
        };
      default:
        return {
          icon: <Shield className="w-4 h-4" />,
          label: 'Unknown',
          description: ''
        };
    }
  }, []);

  /**
   * Clear messages after timeout
   */
  useEffect(() => {
    if (state.successMessage || state.error) {
      const timer = setTimeout(() => {
        updateState({ successMessage: null, error: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.successMessage, state.error, updateState]);

  // Load existing shares when dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log('📂 Share dialog opened, loading existing shares for document:', document.id);
      // Clear any previous state and load fresh
      updateState({
        existingShares: [],
        error: null,
        successMessage: null,
        isLoading: false
      });
      loadExistingShares();
    }
  }, [isOpen, document.id, loadExistingShares, updateState]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      updateState({
        error: null,
        successMessage: null,
        activeTab: 'create'
      });
    }
  }, [isOpen, updateState]);

  if (!isOpen) return null;
  
  // Return early if no document is provided
  if (!document) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Document Selected</h3>
            <p className="text-gray-600 mb-4">Please select a document to share.</p>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Share Document
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {document.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        {(state.error || state.successMessage) && (
          <div className="p-4 border-b border-gray-200">
            {state.error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{state.error}</span>
              </div>
            )}
            {state.successMessage && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-700">{state.successMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => updateState({ activeTab: 'create', error: null })}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              state.activeTab === 'create'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Create Share
          </button>
          <button
            onClick={() => {
              console.log('🔄 Switching to manage tab, clearing errors and refreshing...');
              updateState({ activeTab: 'manage', error: null });
              // Refresh shares when switching to manage tab
              if (state.activeTab !== 'manage') {
                loadExistingShares();
              }
            }}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              state.activeTab === 'manage'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Shares ({state.existingShares?.filter(s => s && s.isActive).length || 0})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {state.activeTab === 'create' ? (
            <div className="space-y-6">
              {/* Encryption Notice */}
              {EncryptedShareService.requiresDecryption(document) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Encrypted Document - External Sharing Available</h4>
                      <p className="text-sm text-blue-700">
                        This document is encrypted. For external sharing, you will be prompted to provide the encryption password to enable server-side decryption for recipients.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Share Name - Always visible */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={state.settings.shareName}
                  onChange={(e) => updateSettings({ shareName: e.target.value })}
                  placeholder="e.g., Team Review, Client Access"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {!state.settings.shareName.trim() && (
                  <p className="text-xs text-red-500 mt-1">Share name is required</p>
                )}
              </div>

              {/* Share Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Type
                </label>
                <div className="space-y-2">
                  {['internal', 'external'].map(type => {
                    const info = getShareTypeInfo(type);
                    const isEncrypted = EncryptedShareService.requiresDecryption(document);
                    
                    return (
                      <label key={type} className="flex items-center p-3 border rounded-lg border-gray-200 cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="shareType"
                          value={type}
                          checked={state.settings.shareType === type}
                          onChange={(e) => updateSettings({ shareType: e.target.value as any })}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2 mr-3 text-gray-500">
                          {info.icon}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{info.label}</div>
                          <div className="text-sm text-gray-500">
                            {info.description}
                            {isEncrypted && type === 'external' && ' (Requires encryption password)'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'read', label: 'View', icon: <Eye className="w-4 h-4" /> },
                    { value: 'download', label: 'Download', icon: <Download className="w-4 h-4" /> }
                  ].map(permission => (
                    <label key={permission.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={state.settings.permissions.includes(permission.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateSettings({
                              permissions: [...state.settings.permissions, permission.value]
                            });
                          } else {
                            updateSettings({
                              permissions: state.settings.permissions.filter(p => p !== permission.value)
                            });
                          }
                        }}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center space-x-2 text-gray-700">
                        {permission.icon}
                        <span>{permission.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={state.settings.expiresAt}
                    onChange={(e) => updateSettings({ expiresAt: e.target.value })}
                    min={minExpirationDate}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no expiration
                </p>
              </div>

              {/* Create Button */}
              <div className="flex flex-col items-end space-y-2">
                {/* Debug Info */}
                <div className="text-xs text-gray-500">
                  Debug: Name="{state.settings.shareName}" | Permissions={state.settings.permissions.length} | Creating={state.isCreating ? 'Yes' : 'No'}
                </div>

                <button
                  onClick={createShare}
                  disabled={state.isCreating || !state.settings.shareName.trim() || state.settings.permissions.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  title={
                    !state.settings.shareName.trim() ? 'Share name is required' :
                    state.settings.permissions.length === 0 ? 'At least one permission is required' :
                    state.isCreating ? 'Creating share...' :
                    'Create new share'
                  }
                >
                  {state.isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {state.isCreating ? 'Creating...' : 'Create Share'}
                  </span>
                </button>

                {/* Validation messages */}
                {!state.settings.shareName.trim() && (
                  <p className="text-xs text-red-500">Please enter a share name</p>
                )}
                {state.settings.permissions.length === 0 && (
                  <p className="text-xs text-red-500">Please select at least one permission</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {state.isLoading ? (
                <div className="flex flex-col items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-2" />
                  <p className="text-sm text-gray-500">Loading shares...</p>
                </div>
              ) : state.error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-red-900 mb-2">Error Loading Shares</h4>
                  <p className="text-red-600 mb-4">{state.error}</p>
                  <button
                    onClick={() => {
                      console.log('🔄 Retrying load shares...');
                      loadExistingShares();
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : !state.existingShares || state.existingShares.length === 0 ? (
                <div className="text-center py-8">
                  <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No shares available</h4>
                  <p className="text-gray-500 mb-4">Create a share to get started.</p>
                  <button
                    onClick={() => updateState({ activeTab: 'create' })}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create First Share
                  </button>
                </div>
              ) : (
                (state.existingShares || []).filter(share => share && share.id).map(share => {
                  const typeInfo = getShareTypeInfo(share.shareType);
                  const shareUrl = `${window.location.origin}/share/${share.shareToken}`;
                  
                  return (
                    <div key={share.id} className={`border rounded-lg p-4 ${share.isActive ? 'border-gray-200' : 'border-gray-300 bg-gray-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className={`font-medium ${share.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                              {share.shareName}
                            </h4>
                            <div className="flex items-center space-x-1 text-gray-500">
                              {typeInfo.icon}
                              <span className="text-xs">{typeInfo.label}</span>
                            </div>
                            {!share.isActive && (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                                Revoked
                              </span>
                            )}
                            {ShareService.isShareExpired(share.expiresAt) && (
                              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                                Expired
                              </span>
                            )}
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Permissions: {ShareService.formatPermissions(share.permissions)}</div>
                            <div>Created: {formatDate(share.createdAt)}</div>
                            {share.expiresAt && (
                              <div className={ShareService.isShareExpired(share.expiresAt) ? 'text-red-600' : ''}>
                                Expires: {formatDate(share.expiresAt)}
                              </div>
                            )}
                            <div>Access count: {share.accessCount}</div>
                            {share.lastAccessedAt && (
                              <div>Last accessed: {formatDate(share.lastAccessedAt)}</div>
                            )}
                            {share.createdBy && (
                              <div>Created by: {share.createdBy.username}</div>
                            )}
                          </div>

                          {share.isActive && !ShareService.isShareExpired(share.expiresAt) && (
                            <div className="mt-3 flex items-center space-x-2">
                              <div className="flex items-center flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                                <LinkIcon className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-600 truncate">{shareUrl}</span>
                              </div>
                              <button
                                onClick={() => copyShareLink(share.shareToken)}
                                className="p-1 text-gray-500 hover:text-gray-700"
                                title="Copy link"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {share.isActive && (
                          <button
                            onClick={() => revokeShare(share.id)}
                            disabled={state.isLoading}
                            className="ml-4 px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentShareDialog;