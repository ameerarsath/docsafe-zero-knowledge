/**
 * External Share Page
 *
 * Handles external document sharing with password protection
 * and secure file preview
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, Unlock, Eye, EyeOff, FileText, Download, Share2 } from 'lucide-react';
import ExternalShareViewer from '../components/documents/ExternalShareViewer';
import { publicApi } from '../services/publicApi';

interface ShareInfo {
  id: number;
  document_id: number;
  document_name: string;
  document_type: string;
  document_size: number;
  owner_username: string;
  created_at: string;
  expires_at?: string;
  is_password_protected: boolean;
  access_count: number;
  max_access_count?: number;
}

export const ExternalSharePage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();

  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);

  useEffect(() => {
    if (!shareToken) {
      setError('Invalid share link');
      setIsLoading(false);
      return;
    }

    loadShareInfo();
  }, [shareToken]);

  const loadShareInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First try to access without password
      const response = await fetch(`http://localhost:8000/share/${shareToken}/info`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include'
      });

      if (response.status === 401) {
        // Share requires password
        setRequiresPassword(true);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setShareInfo(data);

      if (!data.is_password_protected) {
        setIsAuthenticated(true);
      } else {
        setRequiresPassword(true);
      }

      setIsLoading(false);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Verify password by trying to access the file
      const response = await fetch(`http://localhost:8000/share/${shareToken}/stream`, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'X-Share-Password': password
        }
      });

      if (!response.ok) {
        throw new Error('Invalid password');
      }

      setIsAuthenticated(true);
      setRequiresPassword(false);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared file...</p>
        </div>
      </div>
    );
  }

  if (error && !requiresPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <Lock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Protected</h1>
            <p className="text-gray-600">This file is protected with a password</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter the password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Unlock File'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!shareInfo || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Share2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Shared File</h1>
                <p className="text-sm text-gray-500">
                  Shared by {shareInfo.owner_username} on {formatDate(shareInfo.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {shareInfo.is_password_protected && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <Lock className="h-3 w-3 mr-1" />
                  Protected
                </span>
              )}
              {shareInfo.expires_at && (
                <span className="text-sm text-gray-500">
                  Expires {formatDate(shareInfo.expires_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <FileText className="h-12 w-12 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{shareInfo.document_name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {shareInfo.document_type} • {formatFileSize(shareInfo.document_size)}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>Accessed {shareInfo.access_count} times</span>
                  {shareInfo.max_access_count && (
                    <span>• {shareInfo.max_access_count - shareInfo.access_count} accesses remaining</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                const downloadUrl = `http://localhost:8000/share/${shareToken}/stream?download=true${password ? `&password=${encodeURIComponent(password)}` : ''}`;
                window.open(downloadUrl, '_blank');
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
          </div>
        </div>

        {/* File Viewer */}
        <ExternalShareViewer
          shareToken={shareToken}
          password={password}
          fileName={shareInfo.document_name}
          mimeType={shareInfo.document_type}
          onError={(error) => setError(error.message)}
        />
      </div>
    </div>
  );
};

export default ExternalSharePage;