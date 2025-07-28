/**
 * Folder Upload Preview Component
 * 
 * Shows a tree structure of folders and files that will be uploaded,
 * allowing users to review and confirm before starting the upload.
 */

import React, { useState } from 'react';
import {
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  Upload,
  X,
  AlertTriangle,
  Info,
  Settings
} from 'lucide-react';
import { FolderUploadStructure, FolderEntry, FileEntry, FolderValidationResult } from '../../utils/folderTraversal';

interface FolderUploadPreviewProps {
  structure: FolderUploadStructure;
  validation: FolderValidationResult;
  isOpen: boolean;
  onConfirm: (options: UploadOptions) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export interface UploadOptions {
  conflictResolution: 'rename' | 'skip' | 'overwrite';
  createFolders: boolean;
  selectedFiles?: Set<string>; // File paths to include/exclude
}

export default function FolderUploadPreview({
  structure,
  validation,
  isOpen,
  onConfirm,
  onCancel,
  isUploading = false
}: FolderUploadPreviewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [uploadOptions, setUploadOptions] = useState<UploadOptions>({
    conflictResolution: 'rename',
    createFolders: true,
    selectedFiles: new Set(structure.files.map(f => f.path))
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelected = new Set(uploadOptions.selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setUploadOptions({
      ...uploadOptions,
      selectedFiles: newSelected
    });
  };

  const formatFileSize = (bytes: number) => {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderFile = (file: FileEntry, depth: number = 0) => {
    const isSelected = uploadOptions.selectedFiles?.has(file.path) ?? true;
    
    return (
      <div
        key={file.path}
        className={`flex items-center space-x-2 py-1 px-2 hover:bg-gray-50 rounded ${
          depth > 0 ? `ml-${depth * 4}` : ''
        }`}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleFileSelection(file.path)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-900 truncate">
            {file.file.name}
          </div>
          <div className="text-xs text-gray-500">
            {formatFileSize(file.size)} • {file.type || 'Unknown type'}
          </div>
        </div>
      </div>
    );
  };

  const renderFolder = (folder: FolderEntry, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.path);
    const folderFiles = folder.files.length;
    const folderSize = formatFileSize(folder.totalSize);

    return (
      <div key={folder.path}>
        <div
          className={`flex items-center space-x-2 py-2 px-2 hover:bg-gray-50 rounded cursor-pointer ${
            depth > 0 ? `ml-${depth * 4}` : ''
          }`}
          style={{ marginLeft: `${depth * 16}px` }}
          onClick={() => toggleFolder(folder.path)}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {folder.name}
            </div>
            <div className="text-xs text-gray-500">
              {folderFiles} files • {folderSize}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div>
            {/* Render subfolder files */}
            {folder.files.map(file => renderFile(file, depth + 1))}
            
            {/* Render subfolders */}
            {folder.subfolders.map(subfolder => renderFolder(subfolder, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const selectedFileCount = uploadOptions.selectedFiles?.size ?? structure.totalFiles;
  const totalSelectedSize = structure.files
    .filter(f => uploadOptions.selectedFiles?.has(f.path) ?? true)
    .reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Folder Upload Preview
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Review the contents before uploading to SecureVault
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Summary */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {structure.folders.length}
              </div>
              <div className="text-xs text-gray-600">Folders</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {selectedFileCount}
              </div>
              <div className="text-xs text-gray-600">
                Files Selected
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {formatFileSize(totalSelectedSize)}
              </div>
              <div className="text-xs text-gray-600">Total Size</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {structure.maxDepth}
              </div>
              <div className="text-xs text-gray-600">Max Depth</div>
            </div>
          </div>
        </div>

        {/* Validation Messages */}
        {!validation.valid && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Upload Issues Detected
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {validation.warnings.length > 0 && (
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
            <div className="flex">
              <Info className="w-5 h-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Warnings
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <Settings className="w-4 h-4" />
            <span>Upload Options</span>
            {showAdvanced ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Conflict Resolution
                </label>
                <select
                  value={uploadOptions.conflictResolution}
                  onChange={(e) => setUploadOptions({
                    ...uploadOptions,
                    conflictResolution: e.target.value as any
                  })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="rename">Rename duplicates</option>
                  <option value="skip">Skip duplicates</option>
                  <option value="overwrite">Overwrite existing</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="create_folders"
                  checked={uploadOptions.createFolders}
                  onChange={(e) => setUploadOptions({
                    ...uploadOptions,
                    createFolders: e.target.checked
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="create_folders" className="ml-2 text-sm text-gray-700">
                  Create folder structure automatically
                </label>
              </div>
            </div>
          )}
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {/* Root files */}
            {structure.files
              .filter(f => !f.path.includes('/'))
              .map(file => renderFile(file))}
            
            {/* Folders with their contents */}
            {structure.folders.map(folder => renderFolder(folder))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedFileCount} of {structure.totalFiles} files selected
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(uploadOptions)}
              disabled={isUploading || !validation.valid || selectedFileCount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>
                {isUploading ? 'Uploading...' : `Upload ${selectedFileCount} Files`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}