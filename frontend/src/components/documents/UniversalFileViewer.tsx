/**
 * Universal File Viewer Component
 *
 * Handles preview and download for all file types in external shares
 * Supports: PDF, Images, Office files (DOC/XLSX/PPTX), Text files (TXT/CSV/HTML), etc.
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
  useGoogleDocsViewer?: boolean;
  useIframe?: boolean;
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
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  // Use environment variable for API URL with fallback
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8002';

  // Correct endpoint: /api/v1/shares/{token}/preview (the one we just fixed!)
  const previewUrl = `${baseUrl}/api/v1/shares/${shareToken}/preview${password ? `?password=${encodeURIComponent(password)}` : ''}`;
  const downloadUrl = `${baseUrl}/api/v1/shares/${shareToken}/download${password ? `?password=${encodeURIComponent(password)}` : ''}`;

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔍 UniversalFileViewer: Fetching preview from:', previewUrl);

        const response = await fetch(previewUrl, {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Failed to load preview' }));
          throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
        }

        // Get the blob
        const blob = await response.blob();
        setPreviewBlob(blob);

        // Determine file type info
        const info = getFileTypeInfo(document.mime_type, blob, downloadUrl);
        setFileInfo(info);
        setIsLoading(false);

        console.log('✅ UniversalFileViewer: Preview loaded successfully', {
          mimeType: document.mime_type,
          blobSize: blob.size,
          canPreview: info.canPreview
        });
      } catch (err) {
        const error = err as Error;
        console.error('❌ UniversalFileViewer: Failed to load preview:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [previewUrl, document.mime_type]);

  const getFileTypeInfo = (mimeType: string, blob: Blob, downloadUrl: string): FileTypeInfo => {
    const blobUrl = URL.createObjectURL(blob);

    const baseInfo = {
      downloadUrl,
      canPreview: true, // Enable preview for ALL files by default
      previewUrl: blobUrl,
      useIframe: false,
      useGoogleDocsViewer: false
    };

    switch (mimeType) {
      case 'application/pdf':
        return {
          ...baseInfo,
          icon: <File className="h-12 w-12 text-red-500" />,
          type: 'PDF Document',
          useIframe: true
        };

      case 'image/jpeg':
      case 'image/jpg':
      case 'image/png':
      case 'image/gif':
      case 'image/webp':
      case 'image/svg+xml':
      case 'image/bmp':
        return {
          ...baseInfo,
          icon: <Image className="h-12 w-12 text-green-500" />,
          type: 'Image'
        };

      case 'text/plain':
      case 'text/csv':
      case 'text/css':
      case 'text/javascript':
      case 'application/json':
      case 'text/xml':
        return {
          ...baseInfo,
          icon: <FileText className="h-12 w-12 text-blue-500" />,
          type: 'Text Document',
          useIframe: true
        };

      case 'text/html':
        return {
          ...baseInfo,
          icon: <FileText className="h-12 w-12 text-orange-500" />,
          type: 'HTML Document',
          useIframe: true
        };

      case 'video/mp4':
      case 'video/webm':
      case 'video/ogg':
        return {
          ...baseInfo,
          icon: <Film className="h-12 w-12 text-purple-500" />,
          type: 'Video'
        };

      case 'audio/mp3':
      case 'audio/mpeg':
      case 'audio/wav':
      case 'audio/ogg':
        return {
          ...baseInfo,
          icon: <Music className="h-12 w-12 text-yellow-500" />,
          type: 'Audio'
        };

      // OFFICE FILES - NOW ENABLED FOR PREVIEW!
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return {
          ...baseInfo,
          icon: <FileText className="h-12 w-12 text-blue-600" />,
          type: 'Word Document',
          canPreview: true,
          useGoogleDocsViewer: true
        };

      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return {
          ...baseInfo,
          icon: <FileText className="h-12 w-12 text-green-600" />,
          type: 'Excel Spreadsheet',
          canPreview: true,
          useGoogleDocsViewer: true
        };

      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return {
          ...baseInfo,
          icon: <FileText className="h-12 w-12 text-orange-600" />,
          type: 'PowerPoint Presentation',
          canPreview: true,
          useGoogleDocsViewer: true
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
          canPreview: false // Archives can't be previewed
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
    if (previewBlob) {
      const url = URL.createObjectURL(previewBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
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
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 ${className}`}>
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Preview</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Download File
          </button>
        </div>
      </div>
    );
  }

  if (!fileInfo || !previewBlob) {
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
      {fileInfo.canPreview && fileInfo.previewUrl && (
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

          {/* Office files via Google Docs Viewer */}
          {fileInfo.useGoogleDocsViewer && (
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                className="w-full h-[600px] border-0"
                title={document.name}
                sandbox="allow-same-origin allow-scripts"
                onError={() => {
                  console.warn('Google Docs Viewer failed, showing download option');
                  setError('Preview not available for this file. Please download to view.');
                }}
              />
            </div>
          )}

          {/* PDF and Text files via iframe */}
          {fileInfo.useIframe && !fileInfo.useGoogleDocsViewer && (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={fileInfo.previewUrl}
                className="w-full h-[600px] border-0"
                title={document.name}
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            </div>
          )}

          {/* Images */}
          {document.mime_type.startsWith('image/') && (
            <div className="border rounded-lg overflow-hidden bg-gray-50 p-4">
              <img
                src={fileInfo.previewUrl}
                alt={document.name}
                className="max-w-full max-h-[600px] mx-auto object-contain"
                onError={() => setError('Failed to load image')}
              />
            </div>
          )}

          {/* Video */}
          {document.mime_type.startsWith('video/') && (
            <div className="border rounded-lg overflow-hidden">
              <video
                src={fileInfo.previewUrl}
                controls
                className="w-full max-h-[600px]"
                onError={() => setError('Failed to load video')}
              >
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {/* Audio */}
          {document.mime_type.startsWith('audio/') && (
            <div className="border rounded-lg overflow-hidden p-4 bg-gray-50">
              <audio
                src={fileInfo.previewUrl}
                controls
                className="w-full"
                onError={() => setError('Failed to load audio')}
              >
                Your browser does not support audio playback.
              </audio>
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
              Preview in New Tab
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
