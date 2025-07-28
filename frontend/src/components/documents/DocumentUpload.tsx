/**
 * Document Upload Component for SecureVault
 * 
 * Features:
 * - Drag & drop file upload
 * - Multiple file selection
 * - Progress tracking with visual indicators
 * - File validation (size, type, security)
 * - Client-side encryption before upload
 * - Folder selection for organization
 * - Upload queue management
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle, FolderOpen, Lock } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useEncryption } from '../../hooks/useEncryption';
import useAuthStore from '../../stores/authStore';
import { documentsApi } from '../../services/api/documents';

// Types
interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'encrypting' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  encryptedSize?: number;
  keyId?: string;
}

interface DocumentUploadProps {
  parentFolderId?: number | null;
  onUploadComplete?: (documents: any[]) => void;
  onClose?: () => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  className?: string;
  autoResetAfterUpload?: boolean; // Auto-reset component state after successful upload
}

const DEFAULT_ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_MAX_FILES = 10;

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  parentFolderId = null,
  onUploadComplete,
  onClose,
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  className = '',
  autoResetAfterUpload = true
}) => {
  const user = useAuthStore((state) => state.user);
  const {
    currentKey,
    isInitialized,
    encryptFileForUpload,
    createEncryptionKey,
    error: encryptionError
  } = useEncryption();

  // State
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(parentFolderId);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Refs
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size must be less than ${Math.round(maxFileSize / (1024 * 1024))}MB`;
    }

    // Check file type
    if (!acceptedFileTypes.includes(file.type)) {
      return `File type "${file.type}" is not supported`;
    }

    // Check for potentially dangerous files
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif'];
    const fileName = file.name.toLowerCase();
    if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
      return 'Executable files are not allowed for security reasons';
    }

    return null;
  }, [maxFileSize, acceptedFileTypes]);

  /**
   * Handle file drop/selection
   */
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setGlobalError(null);

    // Check total file count
    const totalFiles = uploadFiles.length + acceptedFiles.length;
    if (totalFiles > maxFiles) {
      setGlobalError(`Maximum ${maxFiles} files allowed. Please remove some files first.`);
      return;
    }

    // Process and validate files
    const newUploadFiles: UploadFile[] = [];
    for (const file of acceptedFiles) {
      const validationError = validateFile(file);
      const uploadFile: UploadFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        status: validationError ? 'error' : 'pending',
        progress: 0,
        error: validationError || undefined
      };
      newUploadFiles.push(uploadFile);
    }

    setUploadFiles(prev => [...prev, ...newUploadFiles]);

    // Show password prompt if we have valid files and no current encryption key
    const hasValidFiles = newUploadFiles.some(f => f.status === 'pending');
    if (hasValidFiles && !currentKey) {
      setShowPasswordPrompt(true);
    }
  }, [uploadFiles.length, maxFiles, validateFile, currentKey]);

  /**
   * Remove file from upload queue
   */
  const removeFile = useCallback((fileId: string) => {
    // Abort upload if in progress
    const controller = abortControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(fileId);
    }

    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadQueue(prev => prev.filter(id => id !== fileId));
  }, []);

  /**
   * Update file status and progress
   */
  const updateFileStatus = useCallback((
    fileId: string, 
    status: UploadFile['status'], 
    progress?: number, 
    error?: string,
    extraData?: Partial<UploadFile>
  ) => {
    setUploadFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status, progress: progress ?? f.progress, error, ...extraData }
        : f
    ));
  }, []);

  /**
   * Encrypt and upload a single file
   */
  const uploadSingleFile = useCallback(async (uploadFile: UploadFile, password: string, encryptionKey?: any) => {
    const { id, file } = uploadFile;
    
    try {
      // Create abort controller
      const controller = new AbortController();
      abortControllersRef.current.set(id, controller);

      // Encrypt file
      updateFileStatus(id, 'encrypting', 10);
      
      const encryptionResult = await encryptFileForUpload(
        file,
        password,
        (progress) => {
          updateFileStatus(id, 'encrypting', 10 + (progress * 0.3)); // 10-40%
        },
        encryptionKey
      );

      if (controller.signal.aborted) return;

      updateFileStatus(id, 'uploading', 40, undefined, {
        encryptedSize: encryptionResult.encryptedFile.size,
        keyId: encryptionResult.encryptionMetadata.keyId
      });

      // Calculate file hash for validation
      const fileBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
      const fileHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Prepare upload metadata as JSON (matches DocumentUpload schema)
      const uploadMetadata = {
        name: file.name,
        parent_id: selectedFolder || null,
        description: '',
        tags: [],
        doc_metadata: {},
        is_sensitive: false,
        encryption_key_id: encryptionResult.encryptionMetadata.keyId,
        encryption_iv: encryptionResult.encryptionMetadata.iv,
        encryption_auth_tag: encryptionResult.encryptionMetadata.authTag,
        file_size: file.size, // Original file size (for database storage)
        file_hash: fileHash,
        mime_type: file.type
      };

      // Prepare form data (backend expects upload_data as JSON string)
      const formData = new FormData();
      formData.append('file', encryptionResult.encryptedFile);
      formData.append('upload_data', JSON.stringify(uploadMetadata));

      // Upload file
      const response = await documentsApi.uploadDocument(
        formData,
        (progress) => {
          updateFileStatus(id, 'uploading', 40 + (progress * 0.6)); // 40-100%
        },
        controller.signal
      );

      if (controller.signal.aborted) return;

      updateFileStatus(id, 'completed', 100);
      abortControllersRef.current.delete(id);

      return response;
    } catch (error) {
      if (!abortControllersRef.current.get(id)?.signal.aborted) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        updateFileStatus(id, 'error', 0, errorMessage);
      }
      abortControllersRef.current.delete(id);
      throw error;
    }
  }, [encryptFileForUpload, selectedFolder, updateFileStatus]);

  /**
   * Start upload process
   */
  const startUpload = useCallback(async (encryptionPassword: string) => {
    if (!isInitialized || uploadFiles.length === 0) return;

    setIsUploading(true);
    setShowPasswordPrompt(false);
    setGlobalError(null);

    const validFiles = uploadFiles.filter(f => f.status === 'pending');
    const uploadedDocuments: any[] = [];

    try {
      // Create encryption key if none exists
      let activeKey = currentKey;
      if (!activeKey) {
        try {
          const newKey = await createEncryptionKey({
            password: encryptionPassword,
            hint: 'Default encryption key for document uploads',
            replaceExisting: false
          });
          activeKey = newKey;
          // Created new encryption key successfully
        } catch (error) {
          // Failed to create encryption key
          setGlobalError('Failed to create encryption key. Please try again.');
          return;
        }
      }

      // Verify we have an active key before proceeding
      if (!activeKey) {
        setGlobalError('No encryption key available after creation. Please try again.');
        return;
      }

      // Upload files sequentially to avoid overwhelming the server
      for (const uploadFile of validFiles) {
        try {
          const document = await uploadSingleFile(uploadFile, encryptionPassword, activeKey);
          if (document) {
            uploadedDocuments.push(document);
          }
        } catch (error) {
          // Failed to upload file
        }
      }

      // Clear successful uploads first
      setUploadFiles(prev => prev.filter(f => f.status !== 'completed'));

      // Notify parent component after clearing state
      if (uploadedDocuments.length > 0 && onUploadComplete) {
        // Small delay to ensure UI updates before callback
        setTimeout(() => {
          onUploadComplete(uploadedDocuments);
          
          // Auto-reset component state if enabled
          if (autoResetAfterUpload) {
            setTimeout(() => {
              setUploadFiles([]);
              setPassword('');
              setGlobalError(null);
            }, 1000); // Reset after 1 second
          }
        }, 100);
      }

    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [isInitialized, uploadFiles, uploadSingleFile, onUploadComplete, currentKey, createEncryptionKey]);

  /**
   * Handle password submission
   */
  const handlePasswordSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      startUpload(password);
      setPassword('');
    }
  }, [password, startUpload]);

  /**
   * Get file type icon
   */
  const getFileIcon = useCallback((file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word') || file.type.includes('document')) return '📝';
    if (file.type.includes('excel') || file.type.includes('sheet')) return '📊';
    if (file.type.includes('powerpoint') || file.type.includes('presentation')) return '📋';
    if (file.type.includes('text')) return '📃';
    return '📁';
  }, []);

  /**
   * Format file size
   */
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Dropzone configuration
   */
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    multiple: true,
    disabled: isUploading
  });

  // Auto-focus password input when shown
  useEffect(() => {
    if (showPasswordPrompt && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [showPasswordPrompt]);

  // Clean up abort controllers on unmount
  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(controller => controller.abort());
      abortControllersRef.current.clear();
    };
  }, []);

  const hasValidFiles = uploadFiles.some(f => f.status === 'pending');
  const hasCompletedFiles = uploadFiles.some(f => f.status === 'completed');
  const hasErrors = uploadFiles.some(f => f.status === 'error') || !!globalError || !!encryptionError;

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Upload className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Upload Documents</h3>
            <p className="text-sm text-gray-500">
              Drag files here or click to browse (max {maxFiles} files, {Math.round(maxFileSize / (1024 * 1024))}MB each)
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Encryption Status */}
      {isInitialized && (
        <div className="px-6 py-3 bg-green-50 border-b border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-green-700">
            <Lock className="w-4 h-4" />
            <span>Client-side encryption enabled</span>
            {currentKey && (
              <span className="text-green-600">• Active key: {currentKey.keyId.substring(0, 8)}...</span>
            )}
          </div>
        </div>
      )}

      {/* Global Error */}
      {hasErrors && (
        <div className="px-6 py-3 bg-red-50 border-b border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span>{globalError || encryptionError || 'Some files have errors'}</span>
          </div>
        </div>
      )}

      {/* Dropzone */}
      <div className="p-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragActive && !isDragReject ? 'border-blue-400 bg-blue-50' : ''}
            ${isDragReject ? 'border-red-400 bg-red-50' : ''}
            ${!isDragActive ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50' : ''}
            ${isUploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop files here' : 'Drop files here or click to browse'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: PDF, Word, Excel, PowerPoint, Images, Text files
              </p>
            </div>
          </div>
        </div>

        {/* Folder Selection */}
        {uploadFiles.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <FolderOpen className="w-4 h-4" />
              <span>Upload to:</span>
              <select
                value={selectedFolder || ''}
                onChange={(e) => setSelectedFolder(e.target.value ? Number(e.target.value) : null)}
                className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                disabled={isUploading}
              >
                <option value="">Root Folder</option>
                {/* TODO: Add folder options from API */}
              </select>
            </div>
          </div>
        )}

        {/* File List */}
        {uploadFiles.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Files to upload:</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uploadFiles.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg"
                >
                  {/* File Icon */}
                  <div className="text-2xl">{getFileIcon(uploadFile.file)}</div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {uploadFile.file.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        {/* Status Icon */}
                        {uploadFile.status === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {uploadFile.status === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        {(uploadFile.status === 'encrypting' || uploadFile.status === 'uploading') && (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        )}

                        {/* Remove Button */}
                        {uploadFile.status === 'pending' || uploadFile.status === 'error' ? (
                          <button
                            onClick={() => removeFile(uploadFile.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            disabled={isUploading}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadFile.file.size)}
                        {uploadFile.encryptedSize && ` → ${formatFileSize(uploadFile.encryptedSize)} encrypted`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {uploadFile.status === 'pending' && 'Ready'}
                        {uploadFile.status === 'encrypting' && 'Encrypting...'}
                        {uploadFile.status === 'uploading' && 'Uploading...'}
                        {uploadFile.status === 'completed' && 'Completed'}
                        {uploadFile.status === 'error' && 'Error'}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    {(uploadFile.status === 'encrypting' || uploadFile.status === 'uploading') && (
                      <div className="mt-2">
                        <div className="bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${uploadFile.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {uploadFile.error && (
                      <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {uploadFiles.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''} selected
              {hasCompletedFiles && ` • ${uploadFiles.filter(f => f.status === 'completed').length} completed`}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setUploadFiles([])}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isUploading}
              >
                Clear All
              </button>
              {hasValidFiles && !currentKey && (
                <button
                  onClick={() => setShowPasswordPrompt(true)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  disabled={isUploading}
                >
                  Start Upload
                </button>
              )}
              {hasValidFiles && currentKey && (
                <button
                  onClick={() => setShowPasswordPrompt(true)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload Files'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Encryption Password</h3>
                <p className="text-sm text-gray-500">Enter your password to encrypt files before upload</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="encryption-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  ref={passwordInputRef}
                  id="encryption-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your encryption password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setPassword('');
                  }}
                  className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!password.trim()}
                  className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Encrypt & Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;