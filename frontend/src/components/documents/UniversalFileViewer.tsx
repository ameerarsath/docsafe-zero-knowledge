/**
 * Universal File Viewer Component
 *
 * Handles preview and download for all file types in external shares
 * without using blob URLs to avoid Chrome security restrictions.
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Download,
  Eye,
  File,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface UniversalFileViewerProps {
  shareToken: string;
  password?: string;
  document: {
    id: number;
    name: string;
    mime_type: string;
    size: number;
  };
  className?: string;
}

interface FileTypeInfo {
  icon: React.ReactNode;
  type: string;
  canPreview: boolean;
  previewUrl?: string;
  downloadUrl: string;
}

export const UniversalFileViewer: React.FC<UniversalFileViewerProps> = ({
  shareToken,
  password,
  document,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileTypeInfo | null>(null);

  const baseUrl = 'http://localhost:8000';
  const streamUrl = `${baseUrl}/share/${shareToken}/stream${password ? `?password=${encodeURIComponent(password)}` : ''}`;
  const downloadUrl = `${baseUrl}/share/${shareToken}/stream?download=true${password ? `&password=${encodeURIComponent(password)}` : ''}`;

  useEffect(() => {
    const checkFileAccessibility = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if the file is accessible
        const response = await fetch(streamUrl, {
          method: 'HEAD',
          mode: 'cors',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Determine file type info
        const info = getFileTypeInfo(document.mime_type, streamUrl, downloadUrl);
        setFileInfo(info);
        setIsLoading(false);
      } catch (err) {
        const error = err as Error;
        setError(error.message);
        setIsLoading(false);
      }
    };

    checkFileAccessibility();
  }, [streamUrl, downloadUrl, document.mime_type]);

  const getFileTypeInfo = (mimeType: string, previewUrl: string, downloadUrl: string): FileTypeInfo => {
    const baseInfo = {
      downloadUrl,
      canPreview: false,
      previewUrl: undefined
    };

    switch (mimeType) {
      case 'application/pdf':
        return {
          ...baseInfo,
          icon: <File className="h-12 w-12 text-red-500" />,
          type: 'PDF Document',
          canPreview: true,
          previewUrl
        };

      case 'image/jpeg':
      case 'image/jpg':
      case 'image/png':
      case 'image/gif':
      case 'image/webp':
      case 'image/svg+xml':
        return {
          ...baseInfo,
          icon: <Image className="h-12 w-12 text-green-500" />,
          type: 'Image',
          canPreview: true,
          previewUrl
        };

      case 'text/plain':
      case 'text/html':
      case 'text/csv':
      case 'text/css':
      case 'application/json':
      case 'text/xml':
        return {
          ...baseInfo,
          icon: <FileText className="h-12 w-12 text-blue-500" />,
          type: 'Text Document',
          canPreview: true,
          previewUrl
        };

      case 'video/mp4':
      case 'video/webm':
      case 'video/ogg':
        return {
          ...baseInfo,
          icon: <Film className="h-12 w-12 text-purple-500" />,
          type: 'Video',
          canPreview: true,
          previewUrl
        };

      case 'audio/mp3':
      case 'audio/wav':
      case 'audio/ogg':
        return {
          ...baseInfo,
          icon: <Music className="h-12 w-12 text-yellow-500" />,
          type: 'Audio',
          canPreview: true,
          previewUrl
        };

      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return {
          ...baseInfo,
          icon: <FileText className="h-12 w-12 text-blue-600" />,
          type: 'Word Document',
          canPreview: false
        };

      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return {
          ...baseInfo,
          icon: <FileText className="h-12 w-12 text-green-600" />,
          type: 'Excel Spreadsheet',
          canPreview: false
        };

      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return {
          ...baseInfo,
          icon: <FileText className="h-12 w-12 text-orange-600" />,
          type: 'PowerPoint Presentation',
          canPreview: false
        };

      case 'application/zip':
      case 'application/x-rar-compressed':
      case 'application/x-7z-compressed':
      case 'application/x-tar':
      case 'application/gzip':
        return {
          ...baseInfo,
          icon: <Archive className="h-12 w-12 text-gray-500" />,
          type: 'Archive',
          canPreview: false
        };

      default:
        return {
          ...baseInfo,
          icon: <File className="h-12 w-12 text-gray-500" />,
          type: 'File',
          canPreview: false
        };
    }
  };

  const handleDownload = () => {
    window.open(downloadUrl, '_blank');
  };

  const handlePreview = () => {
    if (fileInfo?.previewUrl) {
      window.open(fileInfo.previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading file information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 ${className}`}>
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Access File</h3>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!fileInfo) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 ${className}`}>
        <div className="text-center">
          <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">File information not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* File Header */}
      <div className="p-6 border-b">
        <div className="flex items-start space-x-4">
          {fileInfo.icon}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {document.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {fileInfo.type} • {formatFileSize(document.size)}
            </p>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {fileInfo.canPreview && (
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-700">Preview</h4>
            <button
              onClick={handlePreview}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open in New Tab
            </button>
          </div>

          {document.mime_type === 'application/pdf' && (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={fileInfo.previewUrl}
                className="w-full h-96 border-0"
                title={document.name}
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          )}

          {document.mime_type.startsWith('image/') && (
            <div className="border rounded-lg overflow-hidden bg-gray-50 p-4">
              <img
                src={fileInfo.previewUrl}
                alt={document.name}
                className="max-w-full max-h-96 mx-auto object-contain"
                onLoad={() => setIsLoading(false)}
                onError={() => setError('Failed to load image')}
              />
            </div>
          )}

          {document.mime_type.startsWith('text/') && (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={fileInfo.previewUrl}
                className="w-full h-96 border-0"
                title={document.name}
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>
      )}

      {/* Actions Section */}
      <div className="p-6 bg-gray-50 rounded-b-lg">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Download File
          </button>

          {fileInfo.canPreview && (
            <button
              onClick={handlePreview}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </button>
          )}
        </div>

        {!fileInfo.canPreview && (
          <p className="text-sm text-gray-500 mt-3 text-center">
            This file type cannot be previewed. Please download it to view.
          </p>
        )}
      </div>
    </div>
  );
};

export default UniversalFileViewer;