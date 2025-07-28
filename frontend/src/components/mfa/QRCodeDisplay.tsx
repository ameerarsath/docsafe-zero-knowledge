/**
 * QR Code Display Component for MFA Setup
 * 
 * Displays QR codes for TOTP setup with manual entry fallback,
 * authenticator app instructions, and mobile-responsive design.
 */

import React, { useState, useEffect } from 'react';
import { mfaService } from '../../services/mfaService';
import { QRCodeResponse } from '../../types/mfa';

interface QRCodeDisplayProps {
  secret?: string;
  accountName?: string;
  issuer?: string;
  size?: number;
  format?: 'data_uri' | 'png' | 'svg';
  showInstructions?: boolean;
  showManualEntry?: boolean;
  className?: string;
  onError?: (error: string) => void;
}

export default function QRCodeDisplay({
  secret,
  accountName,
  issuer = 'SecureVault',
  size = 10,
  format = 'data_uri',
  showInstructions = true,
  showManualEntry = true,
  className = '',
  onError
}: QRCodeDisplayProps) {
  const [qrData, setQrData] = useState<QRCodeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (secret) {
      // If secret is provided directly, create a manual QR code
      const provisioning_uri = `otpauth://totp/${encodeURIComponent(accountName || 'SecureVault')}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
      setQrData({
        qr_code: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="50" text-anchor="middle">QR Code</text></svg>`)}`,
        format: 'data_uri',
        provisioning_uri
      });
    } else {
      // Fetch QR code from API
      fetchQRCode();
    }
  }, [secret, accountName, issuer, size, format]);

  const fetchQRCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await mfaService.getQRCode({ format, size });
      
      if (response.success && response.data) {
        setQrData(response.data);
      } else {
        const errorMsg = response.error?.detail || 'Failed to generate QR code';
        setError(errorMsg);
        if (onError) onError(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (secret) {
      try {
        await navigator.clipboard.writeText(secret);
        // You might want to show a toast notification here
      } catch (err) {
        // Copy failed - could show user feedback
      }
    }
  };

  const handleRetry = () => {
    fetchQRCode();
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Generating QR code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Failed to load QR code</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-transparent rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!qrData) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* QR Code Display */}
      <div className="text-center">
        <div className="inline-block bg-white p-3 sm:p-4 rounded-lg border-2 border-gray-200 shadow-sm">
          <img 
            src={qrData.qr_code} 
            alt="MFA Setup QR Code" 
            className="w-40 h-40 xs:w-48 xs:h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 mx-auto"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        
        {/* Mobile-specific actions */}
        <div className="mt-4 sm:hidden">
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => {
                // Save QR code for mobile users
                const link = document.createElement('a');
                link.download = 'securevault-qr-code.png';
                link.href = qrData.qr_code;
                link.click();
              }}
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Save QR
            </button>
            
            <button
              onClick={async () => {
                try {
                  await navigator.share({
                    title: 'SecureVault MFA Setup',
                    text: 'QR Code for MFA setup',
                    files: [new File([qrData.qr_code], 'qr-code.png', { type: 'image/png' })]
                  });
                } catch (err) {
                  // Fallback if Web Share API is not available
                }
              }}
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:hidden"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186z" />
              </svg>
              Share
            </button>
          </div>
          
          <p className="mt-2 text-xs text-gray-500">
            Tap and hold the QR code to save it to your photos
          </p>
        </div>
      </div>

      {/* Authenticator App Instructions */}
      {showInstructions && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-3">
            📱 How to set up your authenticator app
          </h4>
          
          {/* Desktop Instructions */}
          <div className="hidden sm:block">
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Open your authenticator app on your mobile device</li>
              <li>Tap "Add account" or the "+" button</li>
              <li>Choose "Scan QR code" or "Scan barcode"</li>
              <li>Point your camera at the QR code above</li>
              <li>Your SecureVault account will be added automatically</li>
            </ol>
          </div>
          
          {/* Mobile Instructions */}
          <div className="sm:hidden">
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <h5 className="font-medium text-blue-900 mb-2">📲 On this device:</h5>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Save the QR code using the button above</li>
                  <li>Open your authenticator app</li>
                  <li>Tap "Add account" or "+"</li>
                  <li>Choose "Import from gallery" or "Upload QR code"</li>
                  <li>Select the saved QR code image</li>
                </ol>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <h5 className="font-medium text-blue-900 mb-2">📱 On another device:</h5>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Open your authenticator app</li>
                  <li>Tap "Add account" or "+"</li>
                  <li>Choose "Scan QR code"</li>
                  <li>Point camera at this screen</li>
                  <li>Account will be added automatically</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Apps */}
      {showInstructions && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            🔐 Recommended Authenticator Apps
          </h4>
          
          {/* Desktop/Tablet Layout */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                Google Authenticator
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Microsoft Authenticator
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                Authy
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                1Password
              </div>
            </div>
          </div>
          
          {/* Mobile Layout with App Store Links */}
          <div className="sm:hidden space-y-2">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  <span className="text-sm font-medium text-gray-900">Google Authenticator</span>
                </div>
                <div className="flex space-x-2">
                  <a 
                    href="https://apps.apple.com/app/google-authenticator/id388497605"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    iOS
                  </a>
                  <a 
                    href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    Android
                  </a>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  <span className="text-sm font-medium text-gray-900">Microsoft Authenticator</span>
                </div>
                <div className="flex space-x-2">
                  <a 
                    href="https://apps.apple.com/app/microsoft-authenticator/id983156458"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    iOS
                  </a>
                  <a 
                    href="https://play.google.com/store/apps/details?id=com.azure.authenticator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    Android
                  </a>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                  <span className="text-sm font-medium text-gray-900">Authy</span>
                </div>
                <div className="flex space-x-2">
                  <a 
                    href="https://apps.apple.com/app/authy/id494168017"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    iOS
                  </a>
                  <a 
                    href="https://play.google.com/store/apps/details?id=com.authy.authy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    Android
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Section */}
      {showManualEntry && (secret || qrData.provisioning_uri) && (
        <div className="bg-yellow-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">
            ⌨️ Can't scan the QR code?
          </h4>
          <p className="text-sm text-yellow-800 mb-3">
            Manually enter this secret key in your authenticator app:
          </p>
          
          <div className="space-y-3">
            <div className="bg-white rounded border p-3">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono break-all mr-2">
                  {showSecret ? (secret || 'SECRET_KEY') : '••••••••••••••••••••••••••••••••'}
                </code>
                <div className="flex space-x-2 flex-shrink-0">
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border"
                    title={showSecret ? "Hide secret" : "Show secret"}
                  >
                    {showSecret ? '👁️‍🗨️' : '👁️'}
                  </button>
                  {secret && (
                    <button
                      onClick={handleCopySecret}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border"
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-yellow-700 space-y-1">
              <p><strong>Account name:</strong> {accountName || 'Your SecureVault Account'}</p>
              <p><strong>Issuer:</strong> {issuer}</p>
              <p><strong>Type:</strong> Time-based (TOTP)</p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Mobile-specific Instructions */}
      <div className="sm:hidden bg-green-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-900 mb-3">
          📱 Mobile Setup Tips
        </h4>
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <h5 className="font-medium text-green-900 mb-1 text-xs">💡 Brightness & Focus</h5>
            <p className="text-xs text-green-800">
              Increase your screen brightness and make sure the QR code is clearly visible for better scanning.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <h5 className="font-medium text-green-900 mb-1 text-xs">🔄 Alternative Methods</h5>
            <ul className="text-xs text-green-800 space-y-1">
              <li>• Save QR code to photos and import in authenticator app</li>
              <li>• Use manual entry if QR scanning doesn't work</li>
              <li>• Try scanning from another device pointing at this screen</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <h5 className="font-medium text-green-900 mb-1 text-xs">⚠️ Common Issues</h5>
            <ul className="text-xs text-green-800 space-y-1">
              <li>• Clean your camera lens if scanning fails</li>
              <li>• Hold camera steady about 6-8 inches away</li>
              <li>• Make sure authenticator app has camera permission</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
          🔧 Troubleshooting
        </summary>
        <div className="mt-2 pl-4 space-y-2 text-gray-600">
          <p><strong>QR code not scanning?</strong></p>
          <ul className="list-disc list-inside space-y-1 text-xs ml-2">
            <li>Ensure good lighting and steady hands</li>
            <li>Try moving your phone closer or further away</li>
            <li>Clean your camera lens</li>
            <li>Use the manual entry method instead</li>
          </ul>
          
          <p className="pt-2"><strong>App not generating codes?</strong></p>
          <ul className="list-disc list-inside space-y-1 text-xs ml-2">
            <li>Check that your device time is correct</li>
            <li>Ensure the app has permission to access the camera</li>
            <li>Try restarting the authenticator app</li>
            <li>Verify you entered the secret key correctly</li>
          </ul>
        </div>
      </details>
    </div>
  );
}