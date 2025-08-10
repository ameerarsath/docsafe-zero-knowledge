/**
 * Key Management Interface Component
 * 
 * Provides a comprehensive interface for users to manage their encryption keys:
 * - View key status and encryption statistics
 * - Rotate encryption keys
 * - Run security diagnostics
 * - View security recommendations
 * - Manage key escrow and recovery options
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Key, RefreshCw, AlertTriangle, CheckCircle, 
  Info, Settings, Download, Upload, Eye, EyeOff,
  Lock, Unlock, Activity, BarChart3, FileKey,
  AlertCircle, Zap, Clock, Users, HelpCircle
} from 'lucide-react';
import {
  keyManagementService,
  KeyStatus,
  EncryptionStatistics,
  SecurityAudit,
  KeyValidationResult,
  KeyRotationRequest
} from '../../services/keyManagement';
import { documentEncryptionService } from '../../services/documentEncryption';
import LoadingSpinner from '../ui/LoadingSpinner';

interface KeyManagementInterfaceProps {
  className?: string;
}

type ActiveTab = 'overview' | 'rotation' | 'diagnostics' | 'audit' | 'settings';

export default function KeyManagementInterface({ className = '' }: KeyManagementInterfaceProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [encryptionStats, setEncryptionStats] = useState<EncryptionStatistics | null>(null);
  const [securityAudit, setSecurityAudit] = useState<SecurityAudit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Key rotation state
  const [isRotating, setIsRotating] = useState(false);
  const [rotationForm, setRotationForm] = useState<KeyRotationRequest>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordValidation, setPasswordValidation] = useState<KeyValidationResult | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Diagnostics state
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

  /**
   * Initialize key management data
   */
  const initializeData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Initialize the service (this would typically be done at app level)
      await keyManagementService.initialize({});
      
      // Load key status and statistics
      const [status, stats] = await Promise.all([
        keyManagementService.getKeyStatus(),
        keyManagementService.getEncryptionStatistics()
      ]);
      
      setKeyStatus(status);
      setEncryptionStats(stats);
      
      // Load last audit if available
      const lastAudit = keyManagementService.getLastAudit();
      if (lastAudit) {
        setSecurityAudit(lastAudit);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load key management data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  /**
   * Handle password validation for key rotation
   */
  useEffect(() => {
    if (rotationForm.newPassword) {
      const validation = keyManagementService.validatePassword(rotationForm.newPassword);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation(null);
    }
  }, [rotationForm.newPassword]);

  /**
   * Handle key rotation
   */
  const handleKeyRotation = async () => {
    if (!passwordValidation?.isValid) {
      setError('New password does not meet security requirements');
      return;
    }

    if (rotationForm.newPassword !== rotationForm.confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsRotating(true);
    setError(null);

    try {
      const result = await keyManagementService.rotateEncryptionKey(rotationForm);
      
      if (result.success) {
        // Reset form and refresh data
        setRotationForm({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        });
        await initializeData();
        setActiveTab('overview');
        alert(`Key rotation successful! ${result.documentsReencrypted} documents re-encrypted.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Key rotation failed');
    } finally {
      setIsRotating(false);
    }
  };

  /**
   * Run security diagnostics
   */
  const runDiagnostics = async () => {
    setRunningDiagnostics(true);
    setError(null);

    try {
      const result = await keyManagementService.runDiagnostics();
      setDiagnosticsResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Diagnostics failed');
    } finally {
      setRunningDiagnostics(false);
    }
  };

  /**
   * Perform security audit
   */
  const performAudit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const audit = await keyManagementService.performSecurityAudit();
      setSecurityAudit(audit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Security audit failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get status color based on key status
   */
  const getStatusColor = (status: string | boolean) => {
    if (status === true || status === 'strong' || status === 'healthy') return 'text-green-600';
    if (status === 'medium' || status === 'warning') return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Get status icon based on key status
   */
  const getStatusIcon = (status: string | boolean) => {
    if (status === true || status === 'strong' || status === 'healthy') return <CheckCircle className="h-5 w-5" />;
    if (status === 'medium' || status === 'warning') return <AlertTriangle className="h-5 w-5" />;
    return <AlertCircle className="h-5 w-5" />;
  };

  if (isLoading && !keyStatus) {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Key Management</h1>
                <p className="text-sm text-gray-600">Manage your encryption keys and security settings</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {keyStatus && (
                <div className={`flex items-center ${getStatusColor(keyStatus.isConfigured && keyStatus.isLoaded)}`}>
                  {getStatusIcon(keyStatus.isConfigured && keyStatus.isLoaded)}
                  <span className="ml-2 text-sm font-medium">
                    {keyStatus.isConfigured && keyStatus.isLoaded ? 'Secure' : 'Needs Attention'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'rotation', label: 'Key Rotation', icon: RefreshCw },
            { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
            { id: 'audit', label: 'Security Audit', icon: Shield },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white shadow-sm rounded-lg">
        {/* Overview Tab */}
        {activeTab === 'overview' && keyStatus && encryptionStats && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Key Status Card */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Key Status</h3>
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Configured:</span>
                    <div className={`flex items-center ${getStatusColor(keyStatus.isConfigured)}`}>
                      {getStatusIcon(keyStatus.isConfigured)}
                      <span className="ml-1 text-sm">{keyStatus.isConfigured ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Loaded:</span>
                    <div className={`flex items-center ${getStatusColor(keyStatus.isLoaded)}`}>
                      {getStatusIcon(keyStatus.isLoaded)}
                      <span className="ml-1 text-sm">{keyStatus.isLoaded ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Strength:</span>
                    <div className={`flex items-center ${getStatusColor(keyStatus.keyStrength)}`}>
                      {getStatusIcon(keyStatus.keyStrength)}
                      <span className="ml-1 text-sm capitalize">{keyStatus.keyStrength}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Encryption Statistics Card */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Encryption Stats</h3>
                  <FileKey className="h-5 w-5 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Documents:</span>
                    <span className="text-sm font-medium">{encryptionStats.totalDocuments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Encrypted:</span>
                    <span className="text-sm font-medium">{encryptionStats.encryptedDocuments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Coverage:</span>
                    <span className="text-sm font-medium">{encryptionStats.encryptionCoverage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${encryptionStats.encryptionCoverage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Security Score Card */}
              {securityAudit && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">Security Score</h3>
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getStatusColor(securityAudit.riskLevel === 'low')}`}>
                      {securityAudit.complianceScore}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">out of 100</div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      securityAudit.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                      securityAudit.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {securityAudit.riskLevel.toUpperCase()} RISK
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Security Recommendations */}
            {securityAudit && securityAudit.securityRecommendations.length > 0 && (
              <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <h3 className="text-lg font-medium text-yellow-800">Security Recommendations</h3>
                </div>
                <ul className="space-y-2">
                  {securityAudit.securityRecommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span className="text-sm text-yellow-800">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center mt-6">
              <button
                onClick={performAudit}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
              >
                <Shield className="h-4 w-4 mr-2" />
                Run Security Audit
              </button>
            </div>
          </div>
        )}

        {/* Key Rotation Tab */}
        {activeTab === 'rotation' && (
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <RefreshCw className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Rotate Encryption Key</h2>
                <p className="text-gray-600">
                  Change your encryption password to enhance security. This will re-encrypt all your documents with a new key.
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleKeyRotation(); }} className="space-y-6">
                {/* Current Password */}
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Current Encryption Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      id="currentPassword"
                      value={rotationForm.currentPassword}
                      onChange={(e) => setRotationForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your current encryption password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    New Encryption Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      id="newPassword"
                      value={rotationForm.newPassword}
                      onChange={(e) => setRotationForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your new encryption password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password Validation */}
                  {passwordValidation && (
                    <div className="mt-2">
                      <div className="flex items-center mb-2">
                        <div className={`flex items-center ${getStatusColor(passwordValidation.isValid)}`}>
                          {getStatusIcon(passwordValidation.keyStrength)}
                          <span className="ml-2 text-sm font-medium">
                            {passwordValidation.keyStrength.toUpperCase()} ({passwordValidation.securityScore}/100)
                          </span>
                        </div>
                      </div>
                      {passwordValidation.recommendations.length > 0 && (
                        <ul className="text-sm text-gray-600 space-y-1">
                          {passwordValidation.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-red-500 mr-2">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      id="confirmNewPassword"
                      value={rotationForm.confirmNewPassword}
                      onChange={(e) => setRotationForm(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Confirm your new encryption password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {rotationForm.confirmNewPassword && rotationForm.newPassword !== rotationForm.confirmNewPassword && (
                    <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                  )}
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Important Security Notice</p>
                      <p>
                        Key rotation will re-encrypt all your documents with the new password. 
                        This process cannot be undone. Make sure you remember your new password - 
                        if you forget it, your encrypted documents will be permanently inaccessible.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={isRotating || !passwordValidation?.isValid || rotationForm.newPassword !== rotationForm.confirmNewPassword}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isRotating ? (
                      <>
                        <LoadingSpinner size="sm" color="white" className="mr-2" />
                        Rotating Key...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Rotate Encryption Key
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Diagnostics Tab */}
        {activeTab === 'diagnostics' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <Activity className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">System Diagnostics</h2>
                <p className="text-gray-600">
                  Run comprehensive tests to verify encryption functionality and identify potential issues.
                </p>
              </div>

              <div className="flex justify-center mb-8">
                <button
                  onClick={runDiagnostics}
                  disabled={runningDiagnostics}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
                >
                  {runningDiagnostics ? (
                    <>
                      <LoadingSpinner size="sm" color="white" className="mr-2" />
                      Running Diagnostics...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Run Diagnostics
                    </>
                  )}
                </button>
              </div>

              {/* Diagnostics Results */}
              {diagnosticsResult && (
                <div className="space-y-4">
                  <div className={`border rounded-lg p-4 ${
                    diagnosticsResult.overallHealth === 'healthy' ? 'border-green-200 bg-green-50' :
                    diagnosticsResult.overallHealth === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                    'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Overall Health</h3>
                      <div className={`flex items-center ${getStatusColor(diagnosticsResult.overallHealth === 'healthy')}`}>
                        {getStatusIcon(diagnosticsResult.overallHealth === 'healthy')}
                        <span className="ml-2 font-medium capitalize">{diagnosticsResult.overallHealth}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Individual Test Results */}
                    {[
                      { key: 'webCryptoSupported', label: 'Web Crypto API Support' },
                      { key: 'basicEncryptionWorking', label: 'Basic Encryption' },
                      { key: 'dekFunctionalityWorking', label: 'DEK Functionality' },
                      { key: 'masterKeyLoaded', label: 'Master Key Loaded' }
                    ].map((test) => (
                      <div key={test.key} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{test.label}</span>
                          <div className={`flex items-center ${getStatusColor(diagnosticsResult[test.key])}`}>
                            {getStatusIcon(diagnosticsResult[test.key])}
                            <span className="ml-2 text-sm">
                              {diagnosticsResult[test.key] ? 'Pass' : 'Fail'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Issues */}
                  {diagnosticsResult.issues.length > 0 && (
                    <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-red-800 mb-3">Issues Found</h3>
                      <ul className="space-y-2">
                        {diagnosticsResult.issues.map((issue: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <AlertCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-red-800">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Audit Tab */}
        {activeTab === 'audit' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Audit</h2>
                <p className="text-gray-600">
                  Comprehensive security analysis of your encryption setup and recommendations for improvement.
                </p>
              </div>

              {securityAudit ? (
                <div className="space-y-6">
                  {/* Audit Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getStatusColor(securityAudit.complianceScore >= 80)}`}>
                        {securityAudit.complianceScore}
                      </div>
                      <div className="text-sm text-gray-600">Compliance Score</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getStatusColor(securityAudit.riskLevel === 'low')}`}>
                        {securityAudit.riskLevel.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600">Risk Level</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {securityAudit.securityRecommendations.length}
                      </div>
                      <div className="text-sm text-gray-600">Recommendations</div>
                    </div>
                  </div>

                  {/* Audit Details */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Audit Results</h3>
                    <div className="text-sm text-gray-600 mb-4">
                      Last run: {new Date(securityAudit.timestamp).toLocaleString()}
                    </div>
                    
                    {securityAudit.securityRecommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Security Recommendations</h4>
                        <ul className="space-y-2">
                          {securityAudit.securityRecommendations.map((recommendation, index) => (
                            <li key={index} className="flex items-start">
                              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 mb-6">No security audit has been performed yet.</p>
                  <button
                    onClick={performAudit}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center mx-auto"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Run Security Audit
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <Settings className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Key Management Settings</h2>
                <p className="text-gray-600">
                  Configure advanced encryption settings and security preferences.
                </p>
              </div>

              <div className="space-y-6">
                {/* Encryption Method */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Encryption Method</h3>
                      <p className="text-sm text-gray-600">Current key derivation algorithm</p>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {keyStatus?.encryptionMethod || 'PBKDF2-SHA256'}
                    </span>
                  </div>
                </div>

                {/* Key Iterations */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Key Derivation Iterations</h3>
                      <p className="text-sm text-gray-600">Higher values provide better security but slower performance</p>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {keyStatus?.keyDerivationIterations?.toLocaleString() || '500,000'}
                    </span>
                  </div>
                </div>

                {/* Clear Keys */}
                <div className="border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-red-900">Clear Keys from Memory</h3>
                      <p className="text-sm text-red-600">Remove encryption keys from browser memory for security</p>
                    </div>
                    <button
                      onClick={() => {
                        keyManagementService.clearSensitiveData();
                        alert('Encryption keys cleared from memory');
                        setKeyStatus(prev => prev ? { ...prev, isLoaded: false } : null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    >
                      Clear Keys
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}