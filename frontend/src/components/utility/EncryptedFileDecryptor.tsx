/**
 * Encrypted File Decryptor Component
 * 
 * Standalone utility component that allows users to decrypt .docsafe encrypted files
 * outside the main application. This component can be used as a standalone page
 * or integrated into the main application for file decryption purposes.
 */

import React, { useState, useCallback } from 'react';
import { Upload, Download, Lock, Unlock, Eye, EyeOff, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { 
  decryptEncryptedFileWrapper, 
  isEncryptedDocSafeFile, 
  getEncryptedFileInfo,
  ENCRYPTED_FILE_HEADER 
} from '../../utils/encryptedFileWrapper';

interface DecryptorState {
  status: 'idle' | 'loading' | 'success' | 'error';
  file: File | null;
  fileInfo: {
    originalFilename: string;
    originalMimeType: string;
    originalSize: number;
    createdAt: string;
  } | null;
  decryptedData: {
    data: ArrayBuffer;
    filename: string;
    mimeType: string;
  } | null;
  error: string | null;
  password: string;
  showPassword: boolean;
}

const EncryptedFileDecryptor: React.FC = () => {
  const [state, setState] = useState<DecryptorState>({
    status: 'idle',
    file: null,
    fileInfo: null,
    decryptedData: null,
    error: null,
    password: '',
    showPassword: false
  });

  // Handle file drop/selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    setState(prev => ({
      ...prev,
      status: 'loading',
      file,
      fileInfo: null,
      decryptedData: null,
      error: null
    }));

    // Check if it's an encrypted DocSafe file
    file.arrayBuffer().then(buffer => {
      const data = new Uint8Array(buffer);
      
      if (!isEncryptedDocSafeFile(data)) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: 'This is not a valid DocSafe encrypted file (.docsafe)'
        }));
        return;
      }

      try {
        const fileInfo = getEncryptedFileInfo(data);
        setState(prev => ({
          ...prev,
          status: 'idle',
          fileInfo
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: `Failed to read file info: ${error instanceof Error ? error.message : 'Unknown error'}`
        }));
      }
    }).catch(error => {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    });
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Handle decrypt
  const handleDecrypt = useCallback(async () => {
    if (!state.file || !state.password) return;

    setState(prev => ({
      ...prev,
      status: 'loading',
      error: null
    }));

    try {
      const fileData = await state.file.arrayBuffer();
      const data = new Uint8Array(fileData);
      
      const result = await decryptEncryptedFileWrapper(data, state.password);
      
      setState(prev => ({
        ...prev,
        status: 'success',
        decryptedData: {
          data: result.decryptedData,
          filename: result.originalFilename,
          mimeType: result.originalMimeType
        },
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Decryption failed',
        decryptedData: null
      }));
    }
  }, [state.file, state.password]);

  // Handle download decrypted file
  const handleDownload = useCallback(() => {
    if (!state.decryptedData) return;

    const blob = new Blob([state.decryptedData.data], {
      type: state.decryptedData.mimeType
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = state.decryptedData.filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, [state.decryptedData]);

  // Reset state
  const handleReset = useCallback(() => {
    setState({
      status: 'idle',
      file: null,
      fileInfo: null,
      decryptedData: null,
      error: null,
      password: '',
      showPassword: false
    });
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">DocSafe File Decryptor</h1>
        </div>
        <p className="text-gray-600">
          Decrypt and download your password-protected DocSafe files
        </p>
      </div>

      {/* File Upload Area */}
      {!state.file && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Drop your .docsafe file here
          </p>
          <p className="text-gray-500 mb-4">
            or click to browse files
          </p>
          <p className="text-sm text-gray-400">
            Only .docsafe encrypted files are supported
          </p>
          <input
            id="file-input"
            type="file"
            accept=".docsafe"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>
      )}

      {/* File Info */}
      {state.fileInfo && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <FileText className="w-6 h-6 text-blue-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Encrypted File Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Original filename:</span>
                  <span className="font-medium">{state.fileInfo.originalFilename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">File size:</span>
                  <span className="font-medium">{formatFileSize(state.fileInfo.originalSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">File type:</span>
                  <span className="font-medium">{state.fileInfo.originalMimeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Encrypted on:</span>
                  <span className="font-medium">
                    {new Date(state.fileInfo.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Choose different file
          </button>
        </div>
      )}

      {/* Password Input */}
      {state.fileInfo && !state.decryptedData && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Decryption Password
          </label>
          <div className="relative">
            <input
              type={state.showPassword ? 'text' : 'password'}
              value={state.password}
              onChange={(e) => setState(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
              placeholder="Enter the password used to encrypt this file"
              onKeyDown={(e) => e.key === 'Enter' && handleDecrypt()}
            />
            <button
              type="button"
              onClick={() => setState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {state.showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {state.fileInfo && !state.decryptedData && (
        <button
          onClick={handleDecrypt}
          disabled={!state.password || state.status === 'loading'}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {state.status === 'loading' ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Decrypting...
            </>
          ) : (
            <>
              <Unlock className="w-5 h-5" />
              Decrypt File
            </>
          )}
        </button>
      )}

      {/* Success State */}
      {state.decryptedData && (
        <div className="bg-green-50 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold text-green-900">Decryption Successful!</h3>
          </div>
          <p className="text-green-700 mb-4">
            Your file has been decrypted successfully. You can now download it.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Decrypted File
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-600"
            >
              Decrypt Another File
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-medium text-red-900">Error</h3>
          </div>
          <p className="text-red-700">{state.error}</p>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 text-sm text-gray-500">
        <h4 className="font-medium text-gray-700 mb-2">How to use:</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>Select or drag your .docsafe encrypted file</li>
          <li>Enter the password you set when downloading the file</li>
          <li>Click "Decrypt File" to unlock your document</li>
          <li>Download the decrypted file to your computer</li>
        </ol>
      </div>
    </div>
  );
};

export default EncryptedFileDecryptor;