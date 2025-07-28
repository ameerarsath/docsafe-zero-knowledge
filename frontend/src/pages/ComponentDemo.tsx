/**
 * Component Demo Page
 * 
 * Standalone demo to showcase implemented components
 * without requiring authentication or backend connection
 */

import React, { useState } from 'react';
import DocumentUpload from '../components/documents/DocumentUpload';
import ProgressBar, { MultiStepProgress, CircularProgress } from '../components/ui/ProgressBar';

const ComponentDemo: React.FC = () => {
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(45);

  const steps = ['Upload', 'Encrypt', 'Validate', 'Store'];

  const handleUploadComplete = (documents: any[]) => {
    setUploadedDocs(prev => [...prev, ...documents]);
  };

  const simulateProgress = () => {
    setProgress(prev => (prev + 10) % 101);
  };

  const nextStep = () => {
    setCurrentStep(prev => (prev + 1) % steps.length);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SecureVault Components Demo
          </h1>
          <p className="text-gray-600">
            Showcasing implemented document management components
          </p>
        </div>

        {/* Progress Bar Demos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Progress Indicators</h2>
          
          <div className="space-y-6">
            {/* Standard Progress Bars */}
            <div>
              <h3 className="text-lg font-medium mb-3">Standard Progress Bars</h3>
              <div className="space-y-4">
                <ProgressBar 
                  value={progress} 
                  label="Upload Progress" 
                  showPercentage 
                  variant="primary" 
                />
                <ProgressBar 
                  value={85} 
                  label="Encryption Progress" 
                  showPercentage 
                  variant="success" 
                  animated 
                />
                <ProgressBar 
                  value={0} 
                  label="Processing..." 
                  indeterminate 
                  variant="info" 
                />
              </div>
              
              <button 
                onClick={simulateProgress}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update Progress
              </button>
            </div>

            {/* Multi-step Progress */}
            <div>
              <h3 className="text-lg font-medium mb-3">Multi-step Progress</h3>
              <MultiStepProgress 
                steps={steps} 
                currentStep={currentStep} 
                completedSteps={[0, 1]} 
              />
              <button 
                onClick={nextStep}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Next Step
              </button>
            </div>

            {/* Circular Progress */}
            <div>
              <h3 className="text-lg font-medium mb-3">Circular Progress</h3>
              <div className="flex space-x-4">
                <CircularProgress value={progress} variant="primary" size={80} />
                <CircularProgress value={75} variant="success" size={64} />
                <CircularProgress value={25} variant="warning" size={48} />
              </div>
            </div>
          </div>
        </div>

        {/* Document Upload Demo */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Document Upload Interface</h2>
            <p className="text-gray-600 mt-1">
              Full-featured drag & drop upload with encryption and validation
            </p>
          </div>
          
          {/* Mock encryption status for demo */}
          <div className="px-6 py-3 bg-green-50 border-b border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-green-700">
              <span>🔒</span>
              <span>Client-side encryption enabled</span>
              <span className="text-green-600">• Demo mode (no backend required)</span>
            </div>
          </div>

          <DocumentUpload
            onUploadComplete={handleUploadComplete}
            maxFiles={5}
            maxFileSize={50 * 1024 * 1024} // 50MB
            className="border-0 shadow-none"
          />
        </div>

        {/* Upload Results */}
        {uploadedDocs.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Results</h2>
            <div className="space-y-2">
              {uploadedDocs.map((doc, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded border">
                  <pre className="text-sm text-gray-700">
                    {JSON.stringify(doc, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Implemented Features</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-green-600 mb-2">✅ Completed (Backend)</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Document storage API endpoints</li>
                <li>• Client-side encryption (AES-256-GCM)</li>
                <li>• File upload with metadata</li>
                <li>• Folder hierarchy management</li>
                <li>• RBAC & permissions system</li>
                <li>• Comprehensive test suite</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-green-600 mb-2">✅ Completed (Frontend)</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Drag & drop file upload</li>
                <li>• Progress tracking with animations</li>
                <li>• File validation & security checks</li>
                <li>• Encryption integration hooks</li>
                <li>• Document management utilities</li>
                <li>• Responsive UI components</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-medium text-blue-800 mb-2">🔄 Next: Document Browser</h3>
            <p className="text-sm text-blue-700">
              Tree view, grid/list display, search, preview, and navigation components
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">Demo Notes</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• This demo works without backend connection</li>
            <li>• File upload simulation (no actual upload occurs)</li>
            <li>• Encryption hooks are mocked for demonstration</li>
            <li>• All validation and UI interactions are functional</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ComponentDemo;