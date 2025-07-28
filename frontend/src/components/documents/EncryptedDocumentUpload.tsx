/**
 * Encrypted Document Upload Component
 * 
 * Handles secure document uploads with:
 * - Session-based encryption
 * - Automatic encryption before upload
 * - Progress tracking
 * - Error handling
 * - Session management integration
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Upload,
  File,
  CheckCircle,
  AlertCircle,
  Lock,
  Key,
  X,
  Shield,
  Clock,
  FolderOpen,
  Folder
} from 'lucide-react';
import { encryptionApi } from '../../services/api/encryptionService';
import { useSessionStatus } from '../security/SessionKeyManager';
import SessionKeyManager from '../security/SessionKeyManager';
import TagsInput from '../ui/TagsInput';
import FolderUploadPreview, { UploadOptions } from './FolderUploadPreview';
import { 
  processFolderDrop, 
  containsFolders, 
  getFolderCreationOrder,
  validateFolderStructure,
  FolderUploadStructure,
  FolderValidationResult
} from '../../utils/folderTraversal';
import { folderUploadApi } from '../../services/api/folderUpload';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'encrypting' | 'completed' | 'error';
  progress: number;
  error?: string;
  encryptionMetadata?: any;
  folderPath?: string; // For folder uploads
}

type UploadMode = 'files' | 'folder';

interface FolderUploadSession {
  structure: FolderUploadStructure;
  validation: FolderValidationResult;
  options?: UploadOptions;
  totalFiles: number;
  completedFiles: number;
  isActive: boolean;
}

interface EncryptedDocumentUploadProps {
  onUploadComplete?: (file: UploadedFile) => void;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
  className?: string;
  autoResetAfterUpload?: boolean; // Auto-reset component state after successful upload
  parentFolderId?: number | null; // Parent folder for uploads
}

export default function EncryptedDocumentUpload({
  onUploadComplete,
  maxFileSize = 100, // 100MB default
  allowedTypes = ['application/pdf', 'image/*', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  className = '',
  autoResetAfterUpload = true,
  parentFolderId = null
}: EncryptedDocumentUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [attemptedUploadWithoutSession, setAttemptedUploadWithoutSession] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploadMode, setUploadMode] = useState<UploadMode>('files');
  
  // Folder upload state
  const [folderUploadSession, setFolderUploadSession] = useState<FolderUploadSession | null>(null);
  const [showFolderPreview, setShowFolderPreview] = useState(false);
  
  const sessionStatus = useSessionStatus();

  // Validation: if sessionStatus says active but no CryptoKey, clear session quietly
  useEffect(() => {
    const sessionKey = encryptionApi.getSessionKey();
    if (sessionStatus.isActive && (!sessionKey || !sessionKey.cryptoKey)) {
      encryptionApi.clearSession();
      sessionStatus.refreshStatus?.();
    }
  }, [sessionStatus.isActive, showSessionManager, attemptedUploadWithoutSession]);

  // Don't auto-show session manager on mount - only show when upload is attempted
  // This prevents interfering with normal page browsing

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`;
    }

    // Check file type
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const category = type.split('/')[0];
        return file.type.startsWith(category + '/');
      }
      return file.type === type;
    });

    if (!isAllowed) {
      return 'File type not allowed';
    }

    return null;
  };

  const handleFiles = useCallback(async (files: File[]) => {
    // Check if we need to prompt for encryption password
    const sessionKey = encryptionApi.getSessionKey();
    const hasValidEncryptionSession = sessionStatus.isActive && sessionKey && sessionKey.cryptoKey;
    
    if (!hasValidEncryptionSession) {
      setAttemptedUploadWithoutSession(true);
      setShowSessionManager(true);
      return;
    }

    for (const file of files) {
      const validationError = validateFile(file);
      
      const uploadedFile: UploadedFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: validationError ? 'error' : 'encrypting',
        progress: 0,
        error: validationError || undefined
      };

      setUploadedFiles(prev => [...prev, uploadedFile]);

      if (!validationError) {
        await processFileUpload(file, uploadedFile.id);
      }
    }
  }, [sessionStatus.isActive, parentFolderId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      // Check if drop contains folders
      if (containsFolders(e.dataTransfer)) {
        // Handle folder upload
        const structure = await processFolderDrop(e.dataTransfer);
        const validation = validateFolderStructure(structure, {
          maxFiles: 1000,
          maxTotalSize: 500 * 1024 * 1024, // 500MB
          maxDepth: 10,
          maxFileSize: maxFileSize * 1024 * 1024,
          allowedTypes: allowedTypes
        });
        
        setFolderUploadSession({
          structure,
          validation,
          totalFiles: structure.totalFiles,
          completedFiles: 0,
          isActive: false
        });
        setUploadMode('folder');
        setShowFolderPreview(true);
      } else {
        // Handle regular file upload
        const files = Array.from(e.dataTransfer.files);
        setUploadMode('files');
        handleFiles(files);
      }
    } catch (error) {
      // If folder processing fails, fallback to regular file upload
      console.warn('Folder processing failed, falling back to file upload:', error);
      
      try {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          setUploadMode('files');
          handleFiles(files);
        } else {
          // Show error if no files can be processed
          setUploadedFiles(prev => [...prev, {
            id: Date.now().toString(),
            name: 'Upload Error',
            size: 0,
            type: 'error',
            status: 'error',
            progress: 0,
            error: error instanceof Error ? error.message : 'Failed to process dropped items'
          }]);
        }
      } catch (fallbackError) {
        setUploadedFiles(prev => [...prev, {
          id: Date.now().toString(),
          name: 'Upload Error',
          size: 0,
          type: 'error',
          status: 'error',
          progress: 0,
          error: 'Failed to process dropped items'
        }]);
      }
    }
  }, [handleFiles, maxFileSize, allowedTypes]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, [handleFiles]);

  const processFileUploadWithParent = async (file: File, fileId: string, fileParentId: number | null) => {
    try {
      // Update status to encrypting
      updateFileStatus(fileId, 'encrypting', 10);

      // Get session key for encryption
      const sessionKey = encryptionApi.getSessionKey();
      if (!sessionKey) {
        throw new Error('No active session key for encryption');
      }
      
      // Use client-side encryption utilities
      const { encryptFile } = await import('../../utils/encryption');
      
      // Use the encryptFile function which handles progress and file specifics
      const encryptionResult = await encryptFile(
        file,
        sessionKey.cryptoKey, // Use the actual CryptoKey
        (progress) => {
          updateFileStatus(fileId, 'encrypting', 10 + (progress * 0.4)); // 10-50%
        }
      );
      
      updateFileStatus(fileId, 'uploading', 50);

      // Create FormData for upload
      const formData = new FormData();
      
      // Convert encrypted data back to Uint8Array then to Blob
      const encryptedBytes = Uint8Array.from(atob(encryptionResult.ciphertext), c => c.charCodeAt(0));
      const authTagBytes = Uint8Array.from(atob(encryptionResult.authTag), c => c.charCodeAt(0));
      
      // Combine ciphertext and auth tag for storage
      const combinedData = new Uint8Array(encryptedBytes.length + authTagBytes.length);
      combinedData.set(encryptedBytes);
      combinedData.set(authTagBytes, encryptedBytes.length);
      
      const encryptedBlob = new Blob([combinedData], { type: 'application/octet-stream' });
      formData.append('file', encryptedBlob, file.name);
      
      // Calculate file hash for verification
      const fileBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const file_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Add upload metadata including salt for key derivation
      const uploadMetadata = {
        name: file.name,
        parent_id: fileParentId,
        description: '',
        tags: selectedTags,
        doc_metadata: {
          encryption_salt: sessionKey.salt, // Store salt for decryption
          encryption_algorithm: sessionKey.algorithm,
          encryption_iterations: 100000 // Store iterations used
        },
        is_sensitive: true, // Mark as sensitive since it's encrypted
        encryption_key_id: sessionKey.keyId,
        encryption_iv: encryptionResult.iv,
        encryption_auth_tag: encryptionResult.authTag,
        file_size: file.size, // Original file size
        file_hash: file_hash, // SHA-256 hash of original file
        mime_type: file.type
      };
      
      formData.append('upload_data', JSON.stringify(uploadMetadata));

      
      // Import documents API dynamically to avoid circular imports
      const { documentsApi } = await import('../../services/api/documents');
      
      // Upload the encrypted file
      const document = await documentsApi.uploadDocument(
        formData,
        (progress) => {
          updateFileStatus(fileId, 'uploading', 50 + (progress * 0.5)); // 50-100%
        }
      );

      updateFileStatus(fileId, 'completed', 100);

      // Extend session on successful upload
      sessionStatus.extendSession();

      // Call completion callback
      const completedFile = uploadedFiles.find(f => f.id === fileId);
      if (completedFile && onUploadComplete) {
        onUploadComplete({
          ...completedFile,
          status: 'completed',
          progress: 100,
          encryptionMetadata: {
            key_id: sessionKey.keyId,
            iv: encryptionResult.iv,
            auth_tag: encryptionResult.authTag,
            algorithm: encryptionResult.algorithm
          }
        });
        
        // Auto-reset component state if enabled
        if (autoResetAfterUpload) {
          setTimeout(() => {
            setUploadedFiles([]);
            setIsDragOver(false);
          }, 1500); // Reset after 1.5 seconds
        }
      }

      // Auto-remove completed files after a delay (fallback)
      setTimeout(() => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      }, 3000); // Remove after 3 seconds if not already cleared

    } catch (error) {
      updateFileStatus(fileId, 'error', 0, error instanceof Error ? error.message : 'Upload failed');
    }
  };

  // Wrapper function for backwards compatibility
  const processFileUpload = async (file: File, fileId: string) => {
    return processFileUploadWithParent(file, fileId, parentFolderId);
  };

  /**
   * Handle folder upload confirmation
   */
  const handleFolderUploadConfirm = useCallback(async (options: UploadOptions) => {
    if (!folderUploadSession) return;

    // Check session before starting upload
    const sessionKey = encryptionApi.getSessionKey();
    const hasValidEncryptionSession = sessionStatus.isActive && sessionKey && sessionKey.cryptoKey;
    
    if (!hasValidEncryptionSession) {
      setAttemptedUploadWithoutSession(true);
      setShowSessionManager(true);
      return;
    }

    try {
      setShowFolderPreview(false);
      setFolderUploadSession(prev => prev ? {
        ...prev,
        options,
        isActive: true
      } : null);

      // Process folder upload
      await processFolderUpload(folderUploadSession.structure, options);
      
    } catch (error) {
      setUploadedFiles(prev => [...prev, {
        id: Date.now().toString(),
        name: 'Folder Upload Error',
        size: 0,
        type: 'error',
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to upload folder'
      }]);
    }
  }, [folderUploadSession, sessionStatus.isActive]);

  /**
   * Process folder upload
   */
  const processFolderUpload = async (structure: FolderUploadStructure, options: UploadOptions) => {
    try {
      if (!structure || typeof structure !== 'object') {
        throw new Error('Invalid folder structure provided');
      }
      
      // Step 1: Create folder structure
      const folderPaths = getFolderCreationOrder(structure);
      if (!Array.isArray(folderPaths)) {
        throw new Error('Failed to get folder creation order');
      }
      
      const folderItems = folderPaths.map(path => {
        if (!path || typeof path !== 'string') {
          throw new Error(`Invalid folder path: ${path}`);
        }
        
        return {
          name: path.split('/').pop() || path,
          path: path,
          parent_path: path.includes('/') ? path.split('/').slice(0, -1).join('/') : undefined,
          description: '',
          tags: selectedTags || []
        };
      });

      let createdFolders: Record<string, number> = {};

      if (folderItems.length > 0) {
        const createRequest = {
          parent_id: parentFolderId,
          folders: folderItems,
          conflict_resolution: options.conflictResolution === 'rename' ? 'rename' : 'skip'
        };
        
        const folderResult = await folderUploadApi.createFolders(createRequest);

        // Map folder paths to IDs with comprehensive safety checks
        const successful = folderResult?.successful || [];
        const skipped = folderResult?.skipped || [];
        
        if (Array.isArray(successful)) {
          successful.forEach(folder => {
            if (folder && typeof folder === 'object' && folder.path && folder.document_id) {
              createdFolders[folder.path] = folder.document_id;
            }
          });
        }
        
        if (Array.isArray(skipped)) {
          skipped.forEach(folder => {
            if (folder && typeof folder === 'object' && folder.path && folder.document_id) {
              createdFolders[folder.path] = folder.document_id;
            }
          });
        }
      }

      // Step 2: Upload files
      const allFiles = structure?.files || [];
      const selectedFilesSet = options?.selectedFiles || new Set();
      
      const selectedFiles = allFiles.filter(f => {
        if (!f || !f.path) return false;
        return selectedFilesSet.size === 0 || selectedFilesSet.has(f.path);
      });

      if (selectedFiles.length === 0) {
        return;
      }

      // Process files in batches for better performance
      const batchSize = 5;
      let completedCount = 0;

      for (let i = 0; i < selectedFiles.length; i += batchSize) {
        const batch = selectedFiles.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (fileEntry) => {
          const fileId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const uploadedFile: UploadedFile = {
            id: fileId,
            name: fileEntry.file.name,
            size: fileEntry.size,
            type: fileEntry.type,
            status: 'encrypting',
            progress: 0,
            folderPath: fileEntry.relativePath
          };

          setUploadedFiles(prev => [...prev, uploadedFile]);

          try {
            // Extract folder path from the file's full path (not relativePath!)
            let fileParentId = parentFolderId; // Default to root
            
            if (fileEntry.path.includes('/')) {
              // File is in a subfolder, extract the folder path
              const folderPath = fileEntry.path.split('/').slice(0, -1).join('/');
              
              if (createdFolders[folderPath]) {
                fileParentId = createdFolders[folderPath];
              }
            }
            
            await processFileUploadWithParent(fileEntry.file, fileId, fileParentId);
            completedCount++;
            
            setFolderUploadSession(prev => prev ? {
              ...prev,
              completedFiles: completedCount
            } : null);
            
          } catch (error) {
            console.error(`Failed to upload file ${fileEntry.file.name}:`, error);
          }
        });

        await Promise.all(batchPromises);
      }

      // Mark folder upload as complete
      setFolderUploadSession(prev => prev ? {
        ...prev,
        isActive: false
      } : null);

      // Auto-reset if enabled
      if (autoResetAfterUpload) {
        setTimeout(() => {
          setFolderUploadSession(null);
          setUploadMode('files');
        }, 2000);
      }

    } catch (error) {
      throw error;
    }
  };

  /**
   * Cancel folder upload
   */
  const handleFolderUploadCancel = useCallback(() => {
    setShowFolderPreview(false);
    setFolderUploadSession(null);
    setUploadMode('files');
  }, []);


  const updateFileStatus = (
    fileId: string, 
    status: UploadedFile['status'], 
    progress: number, 
    error?: string
  ) => {
    setUploadedFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, status, progress, error }
          : file
      )
    );
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'encrypting':
        return <Lock className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'uploading':
        return <Upload className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'encrypting':
        return 'Encrypting...';
      case 'uploading':
        return 'Uploading...';
      case 'completed':
        return 'Upload Complete';
      case 'error':
        return 'Upload Failed';
      default:
        return 'Pending';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts when component unmounts
      setUploadedFiles([]);
    };
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Session Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Shield className="w-5 h-5 text-blue-600 mr-2" />
            Encrypted Document Upload
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSessionManager(!showSessionManager)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showSessionManager ? 'Hide' : 'Show'} Session Manager
            </button>
            <button
              onClick={() => {
                // Clear both via API and directly
                encryptionApi.clearSession();
                sessionStorage.removeItem('session_encryption_key');
                sessionStorage.removeItem('session_key_expiry');
                
                sessionStatus.refreshStatus?.();
                setAttemptedUploadWithoutSession(false);
              }}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Force Clear Session
            </button>
          </div>
        </div>

        {showSessionManager && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            {attemptedUploadWithoutSession && !sessionStatus.isActive && (
              <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                Please enter your encryption password to upload files securely.
              </div>
            )}
            <SessionKeyManager onSessionChange={(isActive) => {
              if (isActive) {
                setShowSessionManager(false);
                setAttemptedUploadWithoutSession(false);
                // Refresh session status immediately
                sessionStatus.refreshStatus?.();
              }
            }} />
          </div>
        )}
      </div>

      {/* Tags Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags (optional)
        </label>
        <TagsInput
          tags={selectedTags}
          onChange={setSelectedTags}
          placeholder="Add tags to organize your documents..."
          maxTags={10}
        />
        <p className="mt-1 text-xs text-gray-500">
          Tags help organize and find your documents later
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={false}
          accept={allowedTypes.join(',')}
        />
        
        <div className="space-y-4">
          <div className="flex justify-center space-x-2">
            {uploadMode === 'folder' ? (
              <>
                <Folder className="w-10 h-10 text-blue-500" />
                <FolderOpen className="w-10 h-10 text-blue-600" />
              </>
            ) : (
              <Upload className="w-12 h-12 text-gray-400" />
            )}
          </div>
          
          <div>
            <label
              htmlFor="file-upload"
              className="cursor-pointer font-medium text-blue-600 hover:text-blue-500"
            >
              {uploadMode === 'folder' 
                ? 'Folder Upload Mode'
                : sessionStatus.isActive 
                  ? 'Upload encrypted documents & folders' 
                  : 'Click to upload (will prompt for encryption password)'
              }
            </label>
            <p className="text-gray-500 text-sm mt-1">
              {sessionStatus.isActive ? (
                <>
                  Drag and drop files or folders here, or click to select files
                  {uploadMode === 'folder' && folderUploadSession && (
                    <span className="block text-blue-600 mt-1">
                      📁 {folderUploadSession.structure.rootFolder} ready to upload
                    </span>
                  )}
                </>
              ) : (
                <>Will prompt for your password to create encryption session</>
              )}
            </p>
          </div>
          
          <div className="text-xs text-gray-400 space-y-1">
            <p>
              Max file size: {maxFileSize}MB | 
              Supported: PDF, Images, Documents
            </p>
            <p className="flex items-center space-x-4">
              <span>✅ Individual files</span>
              <span>✅ Entire folders</span>
              <span>✅ Nested structure preserved</span>
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-md font-medium text-gray-900 mb-4">Upload Progress</h4>
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {getStatusIcon(file.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-600">
                      {getStatusText(file.status)}
                      {file.error && `: ${file.error}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.progress}%
                    </p>
                  </div>
                  
                  {file.status !== 'error' && file.status !== 'completed' && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => removeFile(file.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Folder Upload Preview */}
      {folderUploadSession && (
        <FolderUploadPreview
          structure={folderUploadSession.structure}
          validation={folderUploadSession.validation}
          isOpen={showFolderPreview}
          onConfirm={handleFolderUploadConfirm}
          onCancel={handleFolderUploadCancel}
          isUploading={folderUploadSession.isActive}
        />
      )}
    </div>
  );
}