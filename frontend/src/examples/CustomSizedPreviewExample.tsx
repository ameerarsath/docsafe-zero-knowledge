/**
 * Example: Custom Sized Document Preview
 * 
 * This example demonstrates how to use the DocumentPreview component
 * with custom sizing for different file types and use cases.
 */

import React, { useState } from 'react';
import { DocumentPreview } from '../components/documents/DocumentPreview';
import { getOptimalPreviewSize, PREVIEW_PRESETS, getSizeByExtension } from '../utils/previewSizes';
import { Document } from '../hooks/useDocuments';

// Sample document data for testing
const sampleDocuments: Document[] = [
  {
    id: 1,
    name: 'sample-image.jpg',
    document_type: 'document',
    mime_type: 'image/jpeg',
    file_size: 2048576,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    description: 'Sample JPEG image',
    parent_id: null,
    owner_id: 1,
    created_by: 1,
    encryption_key_id: null,
    encryption_iv: null,
    encryption_auth_tag: null,
    is_deleted: false,
    tags: [],
    doc_metadata: {}
  },
  {
    id: 2,
    name: 'document.pdf',
    document_type: 'document',
    mime_type: 'application/pdf',
    file_size: 5242880,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    description: 'Sample PDF document',
    parent_id: null,
    owner_id: 1,
    created_by: 1,
    encryption_key_id: null,
    encryption_iv: null,
    encryption_auth_tag: null,
    is_deleted: false,
    tags: [],
    doc_metadata: {}
  },
  {
    id: 3,
    name: 'data.csv',
    document_type: 'document',
    mime_type: 'text/csv',
    file_size: 1024,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    description: 'Sample CSV file',
    parent_id: null,
    owner_id: 1,
    created_by: 1,
    encryption_key_id: null,
    encryption_iv: null,
    encryption_auth_tag: null,
    is_deleted: false,
    tags: [],
    doc_metadata: {}
  }
];

export const CustomSizedPreviewExample: React.FC = () => {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [sizeMode, setSizeMode] = useState<'optimal' | 'preset' | 'extension' | 'custom'>('optimal');

  const getCustomSize = (document: Document) => {
    switch (sizeMode) {
      case 'optimal':
        return getOptimalPreviewSize(document.mime_type, document.name, 'modal');
      
      case 'preset':
        // Use different presets based on file type
        if (document.mime_type.startsWith('image/')) {
          return PREVIEW_PRESETS.large;
        } else if (document.mime_type === 'application/pdf') {
          return PREVIEW_PRESETS.tall;
        } else {
          return PREVIEW_PRESETS.medium;
        }
      
      case 'extension':
        return getSizeByExtension(document.name);
      
      case 'custom':
        // Custom sizes for specific use cases
        return {
          width: '1000px',
          height: '700px',
          maxWidth: '95vw',
          maxHeight: '85vh'
        };
      
      default:
        return undefined;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Custom Sized Document Preview Examples</h1>
      
      {/* Size Mode Selection */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Size Mode</h2>
        <div className="flex gap-4">
          {(['optimal', 'preset', 'extension', 'custom'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSizeMode(mode)}
              className={`px-4 py-2 rounded-lg capitalize ${
                sizeMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {sizeMode === 'optimal' && 'Automatically chooses the best size based on file type and context'}
          {sizeMode === 'preset' && 'Uses predefined size presets (small, medium, large, etc.)'}
          {sizeMode === 'extension' && 'Determines size based on file extension mapping'}
          {sizeMode === 'custom' && 'Uses completely custom dimensions'}
        </p>
      </div>

      {/* Document Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {sampleDocuments.map((doc) => {
          const customSize = getCustomSize(doc);
          
          return (
            <div key={doc.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-2xl">
                  {doc.mime_type.startsWith('image/') ? '🖼️' :
                   doc.mime_type === 'application/pdf' ? '📄' : '📊'}
                </div>
                <div>
                  <h3 className="font-medium">{doc.name}</h3>
                  <p className="text-sm text-gray-600">{doc.mime_type}</p>
                </div>
              </div>
              
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  {doc.mime_type === 'application/pdf' ? 'Custom PDF Viewer:' : 'Preview Size:'}
                </h4>
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  {doc.mime_type === 'application/pdf' ? (
                    <div className="space-y-1">
                      <div>✅ Direct PDF.js canvas rendering</div>
                      <div>🔍 Custom zoom & fit controls</div>
                      <div>📄 Smooth page navigation</div>
                      <div>🖼️ Fully responsive sizing</div>
                      <div>⌨️ Advanced keyboard shortcuts</div>
                      <div>🔄 Clockwise/counter-clockwise rotation</div>
                    </div>
                  ) : (
                    <>
                      <div>Width: {customSize?.width || 'auto'}</div>
                      <div>Height: {customSize?.height || 'auto'}</div>
                      <div>Max Width: {customSize?.maxWidth || 'none'}</div>
                      <div>Max Height: {customSize?.maxHeight || 'none'}</div>
                    </>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setSelectedDocument(doc)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {doc.mime_type === 'application/pdf' ? 'Try Custom PDF Viewer' : 'Preview with Custom Size'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Preview Modal with Custom Size */}
      {selectedDocument && (
        <DocumentPreview
          document={selectedDocument}
          isOpen={true}
          onClose={() => setSelectedDocument(null)}
          customSize={getCustomSize(selectedDocument)}
          onDownload={(id) => console.log('Download document:', id)}
          onShare={(doc) => console.log('Share document:', doc)}
        />
      )}

      {/* Usage Examples */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Usage Examples</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">1. Fixed Size Preview</h3>
            <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`<DocumentPreview
  document={document}
  isOpen={true}
  onClose={onClose}
  customSize={{
    width: '800px',
    height: '600px'
  }}
/>`}
            </pre>
          </div>

          <div>
            <h3 className="font-medium mb-2">2. Responsive Preview</h3>
            <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`<DocumentPreview
  document={document}
  isOpen={true}
  onClose={onClose}
  customSize={{
    width: '100%',
    height: 'auto',
    maxWidth: '90vw',
    maxHeight: '90vh'
  }}
/>`}
            </pre>
          </div>

          <div>
            <h3 className="font-medium mb-2">3. Using Size Utilities</h3>
            <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`import { getOptimalPreviewSize, PREVIEW_PRESETS } from '../utils/previewSizes';

const customSize = getOptimalPreviewSize(
  document.mime_type, 
  document.name, 
  'modal'
);

<DocumentPreview
  document={document}
  isOpen={true}
  onClose={onClose}
  customSize={customSize}
/>`}
            </pre>
          </div>

          <div>
            <h3 className="font-medium mb-2">4. Context-Based Sizing</h3>
            <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
{`// Different sizes for different contexts
const thumbnailSize = PREVIEW_PRESETS.small;
const modalSize = PREVIEW_PRESETS.large;
const fullscreenSize = PREVIEW_PRESETS.fullscreen;

// Thumbnail preview
<DocumentPreview customSize={thumbnailSize} />

// Modal preview  
<DocumentPreview customSize={modalSize} />

// Fullscreen preview
<DocumentPreview customSize={fullscreenSize} />`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomSizedPreviewExample;