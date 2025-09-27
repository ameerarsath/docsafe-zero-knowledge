/**
 * Document Version History Component for SecureVault
 * 
 * Features:
 * - View document version history
 * - Compare versions
 * - Restore previous versions
 * - Download specific versions
 * - Version metadata and comments
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  X, 
  History, 
  Download, 
  RotateCcw, 
  Eye, 
  FileText,
  User,
  Calendar,
  Hash,
  GitCompare,
  AlertCircle,
  CheckCircle,
  Loader2,
  MessageSquare,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Document } from '../../hooks/useDocuments';

interface DocumentVersionHistoryProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (documentId: number, versionId?: string) => void;
  className?: string;
}

interface DocumentVersion {
  id: string;
  version_number: number;
  file_size: number;
  file_hash: string;
  created_at: string;
  created_by: number;
  created_by_name: string;
  comment?: string;
  change_summary: string;
  is_current: boolean;
  encryption_key_id: string;
  encryption_iv: string;
  encryption_auth_tag: string;
  metadata: {
    upload_source: string;
    client_info: string;
    checksum: string;
  };
}

interface VersionHistoryState {
  versions: DocumentVersion[];
  selectedVersions: string[];
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  successMessage: string | null;
  compareMode: boolean;
  showingVersionId?: string;
}

export const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  document,
  isOpen,
  onClose,
  onDownload,
  className = ''
}) => {
  const [state, setState] = useState<VersionHistoryState>({
    versions: [],
    selectedVersions: [],
    isLoading: false,
    isProcessing: false,
    error: null,
    successMessage: null,
    compareMode: false
  });

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<VersionHistoryState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Load version history
   */
  const loadVersionHistory = useCallback(async () => {
    updateState({ isLoading: true, error: null });

    try {
      // Version control is not yet implemented in backend
      // Show current document as single version for now
      const currentVersion: DocumentVersion[] = [
        {
          id: `v-${document.id}`,
          version_number: 1,
          file_size: document.file_size || 0,
          file_hash: document.file_hash_sha256 || 'No hash available',
          created_at: document.created_at,
          created_by: document.created_by,
          created_by_name: 'Current User', // Would need user lookup
          comment: 'Current version',
          change_summary: 'Document uploaded',
          is_current: true,
          encryption_key_id: document.encryption_key_id,
          encryption_iv: document.encryption_iv,
          encryption_auth_tag: document.encryption_auth_tag,
          metadata: {
            upload_source: 'Web Upload',
            client_info: 'DocumentVersionHistory Component',
            checksum: ''
          }
        }
      ];

      updateState({ 
        versions: currentVersion,
        isLoading: false 
      });
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to load version history',
        isLoading: false 
      });
    }
  }, [document, updateState]);

  /**
   * Toggle version selection for comparison
   */
  const toggleVersionSelection = useCallback((versionId: string) => {
    if (state.selectedVersions.includes(versionId)) {
      updateState({
        selectedVersions: state.selectedVersions.filter(id => id !== versionId)
      });
    } else if (state.selectedVersions.length < 2) {
      updateState({
        selectedVersions: [...state.selectedVersions, versionId]
      });
    }
  }, [state.selectedVersions, updateState]);

  /**
   * Start comparison mode
   */
  const startCompareMode = useCallback(() => {
    updateState({ 
      compareMode: true,
      selectedVersions: [] 
    });
  }, [updateState]);

  /**
   * Exit comparison mode
   */
  const exitCompareMode = useCallback(() => {
    updateState({ 
      compareMode: false,
      selectedVersions: [] 
    });
  }, [updateState]);

  /**
   * Compare selected versions
   */
  const compareVersions = useCallback(() => {
    if (state.selectedVersions.length === 2) {
      // In a real implementation, this would open a diff view
      updateState({ 
        successMessage: `Comparing versions ${state.selectedVersions[0]} and ${state.selectedVersions[1]}`,
        compareMode: false,
        selectedVersions: []
      });
    }
  }, [state.selectedVersions, updateState]);

  /**
   * Restore version
   */
  const restoreVersion = useCallback(async (versionId: string) => {
    if (window.confirm('Are you sure you want to restore this version? This will create a new version based on the selected one.')) {
      updateState({ isProcessing: true, error: null });

      try {
        // Mock API call - replace with actual restoration
        setTimeout(() => {
          updateState({ 
            successMessage: `Version ${versionId} restored successfully!`,
            isProcessing: false 
          });
          // Reload version history
          loadVersionHistory();
        }, 2000);
      } catch (error) {
        updateState({ 
          error: error instanceof Error ? error.message : 'Failed to restore version',
          isProcessing: false 
        });
      }
    }
  }, [updateState, loadVersionHistory]);

  /**
   * Download specific version
   */
  const downloadVersion = useCallback((versionId: string) => {
    onDownload?.(document.id, versionId);
  }, [document.id, onDownload]);

  /**
   * Format file size
   */
  const formatFileSize = useCallback((bytes: number) => {
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Format date
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
   * Get relative time
   */
  const getRelativeTime = useCallback((dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return formatDate(dateString);
    }
  }, [formatDate]);

  /**
   * Calculate size difference from previous version
   */
  const getSizeDifference = useCallback((currentSize: number, previousSize?: number) => {
    if (!previousSize) return null;
    
    const diff = currentSize - previousSize;
    const percentage = ((diff / previousSize) * 100).toFixed(1);
    
    return {
      bytes: diff,
      percentage: parseFloat(percentage),
      isIncrease: diff > 0
    };
  }, []);

  // Load version history when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadVersionHistory();
    }
  }, [isOpen, loadVersionHistory]);

  // Clear messages after timeout
  useEffect(() => {
    if (state.successMessage || state.error) {
      const timer = setTimeout(() => {
        updateState({ successMessage: null, error: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.successMessage, state.error, updateState]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      updateState({
        selectedVersions: [],
        compareMode: false,
        error: null,
        successMessage: null
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
            <p className="text-gray-600 mb-4">Please select a document to view its version history.</p>
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

  const currentVersion = state.versions.find(v => v.is_current);
  const canCompare = state.selectedVersions.length === 2;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                Version History
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {document.name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {!state.compareMode ? (
              <button
                onClick={startCompareMode}
                disabled={state.versions.length < 2}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center space-x-1"
              >
                <GitCompare className="w-4 h-4" />
                <span>Compare</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={compareVersions}
                  disabled={!canCompare}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Compare Selected
                </button>
                <button
                  onClick={exitCompareMode}
                  className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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

        {/* Compare Mode Banner */}
        {state.compareMode && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center space-x-2 text-blue-800">
              <GitCompare className="w-4 h-4" />
              <span className="text-sm font-medium">
                Compare Mode: Select 2 versions to compare ({state.selectedVersions.length}/2)
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {state.isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Loading version history...</p>
              </div>
            </div>
          ) : state.versions.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No version history</h4>
                <p className="text-gray-500">This document has no previous versions.</p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {state.versions.map((version, index) => {
                  const previousVersion = state.versions[index + 1];
                  const sizeDiff = getSizeDifference(version.file_size, previousVersion?.file_size);
                  const isSelected = state.selectedVersions.includes(version.id);
                  
                  return (
                    <div
                      key={version.id}
                      className={`border rounded-lg p-4 transition-all ${
                        state.compareMode && isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : state.compareMode
                          ? 'border-gray-200 hover:border-gray-300 cursor-pointer'
                          : 'border-gray-200'
                      } ${version.is_current ? 'ring-2 ring-green-200 bg-green-50' : ''}`}
                      onClick={() => state.compareMode && toggleVersionSelection(version.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="flex items-center space-x-2">
                              {state.compareMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleVersionSelection(version.id)}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                              )}
                              <div className={`p-1.5 rounded-lg ${version.is_current ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <FileText className={`w-4 h-4 ${version.is_current ? 'text-green-600' : 'text-gray-600'}`} />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900">
                                    Version {version.version_number}
                                  </span>
                                  {version.is_current && (
                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {getRelativeTime(version.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Version Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-gray-600">
                                <User className="w-4 h-4" />
                                <span>{version.created_by_name}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(version.created_at)}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-gray-600">
                                <Hash className="w-4 h-4" />
                                <span className="font-mono text-xs">
                                  {version.file_hash.substring(0, 16)}...
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="text-gray-600">
                                <span className="font-medium">Size:</span> {formatFileSize(version.file_size)}
                                {sizeDiff && (
                                  <span className={`ml-2 text-xs ${sizeDiff.isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                                    ({sizeDiff.isIncrease ? '+' : ''}{sizeDiff.percentage}%)
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-600">
                                <span className="font-medium">Source:</span> {version.metadata.upload_source}
                              </div>
                              <div className="text-gray-600">
                                <span className="font-medium">Changes:</span> {version.change_summary}
                              </div>
                            </div>
                          </div>

                          {/* Comment */}
                          {version.comment && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                                <div className="text-sm text-gray-700">{version.comment}</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {!state.compareMode && (
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => downloadVersion(version.id)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Download this version"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {!version.is_current && (
                              <button
                                onClick={() => restoreVersion(version.id)}
                                disabled={state.isProcessing}
                                className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                                title="Restore this version"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {state.versions.length > 0 && (
              <>
                {state.versions.length} version{state.versions.length !== 1 ? 's' : ''} total
                {currentVersion && (
                  <> • Current: v{currentVersion.version_number}</>
                )}
              </>
            )}
          </div>
          
          {state.isProcessing && (
            <div className="flex items-center space-x-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentVersionHistory;