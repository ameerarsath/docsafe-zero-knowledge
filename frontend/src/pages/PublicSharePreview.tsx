/**
 * Public Share Preview Page
 *
 * Displays shared documents for external users without requiring authentication.
 * Handles all file types with universal preview support including:
 * - Images (png, jpg, gif, webp, svg, etc.)
 * - Documents (pdf, docx, xlsx, pptx)
 * - Text files (html, xml, json, txt, csv, md)
 * - Media (mp4, mp3, video, audio)
 * - Archives (zip, rar, 7z, tar, gz)
 *
 * Server-side decryption for encrypted documents when password is provided.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Download,
  Eye,
  Lock,
  FileText,
  AlertCircle,
  Loader2,
  Shield
} from 'lucide-react';
import { createUniversalFilePreview } from '../utils/universalFilePreview';

// API Configuration - get from environment or fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

/**
 * Helper to build full API URL
 */
function getApiUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const url = `${API_BASE_URL}/${cleanPath}`;
  console.log('🔗 API URL constructed:', url);
  return url;
}

interface ShareMetadata {
  share_token: string;
  document_name: string;
  document_id: number;
  mime_type: string;
  file_size: number;
  share_type: string;
  require_password: boolean;
  is_encrypted: boolean;
  allow_download: boolean;
  allow_preview: boolean;
  created_at: string;
  expires_at?: string;
  access_count: number;
  max_access_count?: number;
}

export function PublicSharePreview() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [searchParams] = useSearchParams();

  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [zoom, setZoom] = useState(100);

  // Get password from URL query parameter if provided
  const urlPassword = searchParams.get('password');

  /**
   * Fetch share metadata
   */
  const fetchShareMetadata = useCallback(async () => {
    if (!shareToken) {
      setError('Invalid share link');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use configured API URL instead of relative path
      const apiUrl = getApiUrl(`api/v1/shares/external/${shareToken}/metadata`);
      console.log('📡 Fetching share metadata from:', apiUrl);
      const response = await fetch(apiUrl);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Share not found or has expired');
        }
        if (response.status === 410) {
          throw new Error('Share has been revoked or expired');
        }
        throw new Error('Failed to load share information');
      }

      const data = await response.json();
      setMetadata(data);

      // If password is required and not provided, show prompt
      if (data.require_password && !urlPassword) {
        setShowPasswordPrompt(true);
      } else {
        // Automatically load file if no password required or password provided in URL
        loadFile(urlPassword || undefined);
      }

    } catch (err) {
      console.error('Error fetching share metadata:', err);
      setError(err instanceof Error ? err.message : 'Failed to load share');
    } finally {
      setIsLoading(false);
    }
  }, [shareToken, urlPassword]);

  /**
   * Load file with optional password
   */
  const loadFile = useCallback(async (filePassword?: string) => {
    if (!shareToken || !metadata) return;

    try {
      setIsLoadingFile(true);
      setError(null);

      // Build URL with password parameter using configured API base
      const apiPath = `api/v1/shares/external/${shareToken}/stream`;
      const url = new URL(getApiUrl(apiPath));
      if (filePassword || password) {
        url.searchParams.append('password', filePassword || password);
      }

      console.log('📥 Loading shared file from:', url.toString());

      const response = await fetch(url.toString());

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid password. Please try again.');
        }
        if (response.status === 404) {
          throw new Error('Shared file not found');
        }
        if (response.status === 410) {
          throw new Error('Share has expired or been revoked');
        }
        throw new Error(`Failed to load file (Status: ${response.status})`);
      }

      const blob = await response.blob();
      console.log('✅ File loaded successfully:', {
        size: blob.size,
        type: blob.type
      });

      setFileBlob(blob);
      setShowPasswordPrompt(false);

    } catch (err) {
      console.error('Error loading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file');

      // Show password prompt again if authentication failed
      if (err instanceof Error && err.message.includes('password')) {
        setShowPasswordPrompt(true);
      }
    } finally {
      setIsLoadingFile(false);
    }
  }, [shareToken, metadata, password]);

  /**
   * Handle password submission
   */
  const handlePasswordSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      loadFile();
    }
  }, [password, loadFile]);

  /**
   * Download file
   */
  const handleDownload = useCallback(() => {
    if (!fileBlob || !metadata) return;

    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = metadata.document_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [fileBlob, metadata]);

  // Load metadata on mount
  useEffect(() => {
    fetchShareMetadata();
  }, [fetchShareMetadata]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading shared document...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !metadata) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Share Not Available</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please check the share link or contact the person who shared this document with you.
          </p>
        </div>
      </div>
    );
  }

  // Password prompt
  if (showPasswordPrompt && metadata) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Password Required</h2>
            <p className="text-gray-600">{metadata.document_name}</p>
            <p className="text-sm text-gray-500 mt-2">
              This shared document is password protected
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter share password"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!password.trim() || isLoadingFile}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoadingFile ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  View Document
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main document view
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                {metadata?.is_encrypted ? (
                  <Shield className="w-6 h-6 text-blue-600" />
                ) : (
                  <FileText className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {metadata?.document_name || 'Shared Document'}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span>{metadata?.mime_type || 'Unknown type'}</span>
                  <span>{formatFileSize(metadata?.file_size || 0)}</span>
                  {metadata?.is_encrypted && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Shield className="w-4 h-4" />
                      Encrypted
                    </span>
                  )}
                </div>
              </div>
            </div>

            {metadata?.allow_download && fileBlob && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {isLoadingFile ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading document...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Document</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        ) : fileBlob && metadata ? (
          // Universal file preview
          <div className="flex-1 overflow-hidden">
            {createUniversalFilePreview(
              fileBlob,
              metadata.mime_type || 'application/octet-stream',
              metadata.document_name,
              zoom
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to View</h3>
              <p className="text-gray-600 mb-4">{metadata?.document_name}</p>
              <button
                onClick={() => loadFile()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye className="w-5 h-5" />
                Load Document
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
