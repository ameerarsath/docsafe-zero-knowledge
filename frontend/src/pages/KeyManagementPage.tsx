/**
 * Key Management Page for SecureVault
 * 
 * Provides comprehensive encryption key management for both users and admins:
 * - User-focused zero-knowledge key management
 * - Admin-level system key management
 * - Key rotation and security operations
 * - Security audits and diagnostics
 */

import React, { useState, useEffect } from 'react';
import {
  Key,
  Shield,
  Plus,
  RotateCcw,
  Eye,
  EyeOff,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Database,
  RefreshCw,
  Copy,
  Search,
  Filter,
  Calendar,
  Lock,
  Unlock,
  Settings
} from 'lucide-react';
import { LoadingSpinner } from '../components/ui';
import AppLayout from '../components/layout/AppLayout';
import { encryptionApi, EncryptionKey as ApiEncryptionKey } from '../services/api/encryptionService';
import SessionKeyManager from '../components/security/SessionKeyManager';
import KeyManagementInterface from '../components/security/KeyManagementInterface';

interface EncryptionKey {
  id: string;
  key_id: string;
  user_id?: number;
  username?: string;
  key_type: 'user' | 'admin_escrow' | 'system';
  algorithm: string;
  key_size: number;
  created_at: string;
  last_used?: string;
  expires_at?: string;
  is_active: boolean;
  usage_count: number;
  status: 'active' | 'expired' | 'revoked' | 'pending';
}

// Convert API response to local interface
function convertApiKeyToLocal(apiKey: ApiEncryptionKey, username?: string): EncryptionKey {
  return {
    id: apiKey.id.toString(),
    key_id: apiKey.key_id,
    user_id: apiKey.user_id,
    username: username,
    key_type: 'user', // Default to user, will be enhanced later
    algorithm: apiKey.algorithm,
    key_size: apiKey.key_size,
    created_at: apiKey.created_at,
    last_used: apiKey.last_used,
    expires_at: apiKey.expires_at,
    is_active: apiKey.is_active,
    usage_count: apiKey.usage_count,
    status: apiKey.is_active ? 'active' : 'expired'
  };
}

interface KeyGenerationRequest {
  key_type: 'user' | 'admin_escrow' | 'system';
  user_id?: number;
  algorithm?: string;
  key_size?: number;
  expires_days?: number;
}

type ManagementTab = 'user' | 'admin';

export default function KeyManagementPage() {
  const [activeTab, setActiveTab] = useState<ManagementTab>('user');
  const [keys, setKeys] = useState<EncryptionKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<EncryptionKey | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showKeyDetails, setShowKeyDetails] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showingMockData, setShowingMockData] = useState(false);

  // Mock data for demonstration
  const mockKeys: EncryptionKey[] = [
    {
      id: '1',
      key_id: 'user_key_001',
      user_id: 1,
      username: 'arahuman',
      key_type: 'user',
      algorithm: 'AES-256-GCM',
      key_size: 256,
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      last_used: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days from now
      is_active: true,
      usage_count: 45,
      status: 'active'
    },
    {
      id: '2',
      key_id: 'admin_escrow_001',
      key_type: 'admin_escrow',
      algorithm: 'RSA-4096',
      key_size: 4096,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
      last_used: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      is_active: true,
      usage_count: 12,
      status: 'active'
    },
    {
      id: '3',
      key_id: 'system_key_001',
      key_type: 'system',
      algorithm: 'AES-256-GCM',
      key_size: 256,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(), // 30 days ago
      last_used: new Date().toISOString(),
      is_active: true,
      usage_count: 1234,
      status: 'active'
    },
    {
      id: '4',
      key_id: 'user_key_002',
      user_id: 2,
      username: 'testuser',
      key_type: 'user',
      algorithm: 'AES-256-GCM',
      key_size: 256,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(), // 60 days ago
      expires_at: new Date(Date.now() - 5 * 86400000).toISOString(), // Expired 5 days ago
      is_active: false,
      usage_count: 89,
      status: 'expired'
    }
  ];

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to load real keys from API
      const apiKeys = await encryptionApi.getAllKeys();
      const convertedKeys = apiKeys.map(key => convertApiKeyToLocal(key));

      // If no real keys exist, fall back to mock data for demo
      if (convertedKeys.length === 0) {
        setKeys(mockKeys);
        setShowingMockData(true);
      } else {
        setKeys(convertedKeys);
        setShowingMockData(false);
      }
    } catch (err) {
      // Failed to load real keys, using mock data
      // Fall back to mock data if API fails
      setKeys(mockKeys);
      setShowingMockData(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async (request: KeyGenerationRequest) => {
    try {
      setError(null);
      
      // Call real API to generate key
      const apiKey = await encryptionApi.createEncryptionKey({
        algorithm: request.algorithm || 'AES-256-GCM',
        key_size: request.key_size || 256,
        expires_days: request.expires_days
      });
      
      const newKey = convertApiKeyToLocal(apiKey);
      setKeys([newKey, ...keys]);
      setShowGenerateModal(false);
      
      // Reload keys to get updated list
      await loadKeys();
    } catch (err) {
      setError(`Failed to generate new key: ${err.message}`);
    }
  };

  const handleRotateKey = async (keyId: string) => {
    try {
      setError(null);

      // Find the key to get the actual key_id
      const key = keys.find(k => k.id === keyId);
      if (!key) {
        throw new Error('Key not found');
      }

      // Check if this is a mock key (these are demo keys that don't exist in the database)
      const isMockKey = ['admin_escrow_001', 'system_key_001', 'user_key_001', 'user_key_002'].includes(key.key_id);

      if (isMockKey) {
        // For mock keys, simulate rotation
        alert(`Mock key rotation simulated for ${key.key_id}. This is demo data - please create real keys to test rotation functionality.`);
        return;
      }

      // Call real API to rotate key
      const rotatedKey = await encryptionApi.rotateKey(key.key_id);
      const updatedKey = convertApiKeyToLocal(rotatedKey);

      setKeys(keys.map(k => k.id === keyId ? updatedKey : k));

      // Reload keys to get updated list
      await loadKeys();
    } catch (err) {
      if (err.message && err.message.includes('not found')) {
        setError(`Cannot rotate key: This appears to be demo data. Please create real encryption keys to test rotation functionality.`);
      } else {
        setError(`Failed to rotate key: ${err.message}`);
      }
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      setError(null);

      // Find the key to get the actual key_id
      const key = keys.find(k => k.id === keyId);
      if (!key) {
        throw new Error('Key not found');
      }

      // Check if this is a mock key (these are demo keys that don't exist in the database)
      const isMockKey = ['admin_escrow_001', 'system_key_001', 'user_key_001', 'user_key_002'].includes(key.key_id);

      if (isMockKey) {
        // For mock keys, simulate revocation
        alert(`Mock key revocation simulated for ${key.key_id}. This is demo data - please create real keys to test revocation functionality.`);
        // Update the local state to show it as revoked
        setKeys(keys.map(k =>
          k.id === keyId
            ? { ...k, is_active: false, status: 'revoked' }
            : k
        ));
        return;
      }

      // Call real API to deactivate key
      await encryptionApi.deactivateKey(key.key_id);

      setKeys(keys.map(k =>
        k.id === keyId
          ? { ...k, is_active: false, status: 'revoked' }
          : k
      ));

      // Reload keys to get updated list
      await loadKeys();
    } catch (err) {
      if (err.message && err.message.includes('not found')) {
        setError(`Cannot revoke key: This appears to be demo data. Please create real encryption keys to test revocation functionality.`);
      } else {
        setError(`Failed to revoke key: ${err.message}`);
      }
    }
  };

  const getKeyTypeIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="w-4 h-4" />;
      case 'admin_escrow': return <Shield className="w-4 h-4" />;
      case 'system': return <Database className="w-4 h-4" />;
      default: return <Key className="w-4 h-4" />;
    }
  };

  const getKeyTypeColor = (type: string) => {
    switch (type) {
      case 'user': return 'text-blue-600 bg-blue-100';
      case 'admin_escrow': return 'text-purple-600 bg-purple-100';
      case 'system': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-orange-600 bg-orange-100';
      case 'revoked': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredKeys = keys.filter(key => {
    const matchesSearch = searchTerm === '' || 
      key.key_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      key.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || key.key_type === filterType;
    const matchesStatus = filterStatus === 'all' || key.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <AppLayout 
      title="Key Management" 
      subtitle="Manage your encryption keys and security settings"
    >
      <div className="space-y-6">
        {/* Header with Tab Navigation */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <Shield className="w-8 h-8 text-blue-600" />
                  <span>Key Management</span>
                </h1>
                <p className="text-gray-600">Manage your encryption keys and security settings</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-6 px-6">
            <button
              onClick={() => setActiveTab('user')}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'user'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="h-4 w-4 mr-2" />
              Personal Keys
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'admin'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="h-4 w-4 mr-2" />
              System Keys
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'user' ? (
          <KeyManagementInterface />
        ) : (
          <div className="space-y-6">
            {/* Admin Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">System Key Administration</h2>
                <p className="text-gray-600">Manage system-wide encryption keys and admin escrow</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={loadKeys}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Key
                </button>
              </div>
            </div>

      {/* Session Management */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SessionKeyManager showStatus={true} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Key className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Keys</p>
              <p className="text-2xl font-bold text-gray-900">{keys.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Keys</p>
              <p className="text-2xl font-bold text-gray-900">
                {keys.filter(k => k.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Escrow Keys</p>
              <p className="text-2xl font-bold text-gray-900">
                {keys.filter(k => k.key_type === 'admin_escrow').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">
                {keys.filter(k => k.expires_at && new Date(k.expires_at) < new Date(Date.now() + 7 * 86400000)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search keys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Key Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="user">User Keys</option>
              <option value="admin_escrow">Admin Escrow</option>
              <option value="system">System Keys</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterStatus('all');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Keys Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Algorithm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 p-2 rounded-lg ${getKeyTypeColor(key.key_type)}`}>
                        {getKeyTypeIcon(key.key_type)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {key.key_id}
                        </div>
                        {key.username && (
                          <div className="text-sm text-gray-500">
                            User: {key.username}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {key.algorithm}
                    </div>
                    <div className="text-sm text-gray-500">
                      {key.key_size} bits
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(key.status)}`}>
                      {key.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{key.usage_count} times</div>
                    {key.last_used && (
                      <div className="text-xs text-gray-500">
                        Last: {formatDate(key.last_used)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>Created: {formatDate(key.created_at)}</div>
                    {key.expires_at && (
                      <div className="text-xs text-gray-500">
                        Expires: {formatDate(key.expires_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setShowKeyDetails(showKeyDetails === key.id ? null : key.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        {showKeyDetails === key.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {key.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleRotateKey(key.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Rotate Key"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRevokeKey(key.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredKeys.length === 0 && (
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No encryption keys found</p>
          </div>
        )}
      </div>

            {/* Generate Key Modal */}
            {showGenerateModal && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Generate New Key</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    handleGenerateKey({
                      key_type: formData.get('key_type') as 'user' | 'admin_escrow' | 'system',
                      algorithm: formData.get('algorithm') as string,
                      key_size: parseInt(formData.get('key_size') as string),
                      expires_days: parseInt(formData.get('expires_days') as string) || undefined
                    });
                  }}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Key Type</label>
                        <select name="key_type" required className="w-full border border-gray-300 rounded-lg px-3 py-2">
                          <option value="user">User Key</option>
                          <option value="admin_escrow">Admin Escrow</option>
                          <option value="system">System Key</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Algorithm</label>
                        <select name="algorithm" className="w-full border border-gray-300 rounded-lg px-3 py-2">
                          <option value="AES-256-GCM">AES-256-GCM</option>
                          <option value="RSA-4096">RSA-4096</option>
                          <option value="ChaCha20-Poly1305">ChaCha20-Poly1305</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Key Size (bits)</label>
                        <select name="key_size" className="w-full border border-gray-300 rounded-lg px-3 py-2">
                          <option value="256">256</option>
                          <option value="512">512</option>
                          <option value="2048">2048</option>
                          <option value="4096">4096</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expires In (days)</label>
                        <input
                          type="number"
                          name="expires_days"
                          placeholder="30"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowGenerateModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        Generate Key
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}