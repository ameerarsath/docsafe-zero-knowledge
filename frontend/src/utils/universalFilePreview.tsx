/**
 * Universal File Preview Handler
 *
 * Provides universal file preview for ALL file types after decryption.
 * Creates appropriate renderers based on mime type and file extension.
 *
 * Supports 50+ file extensions including:
 * - Images: png, jpg, jpeg, gif, webp, svg, bmp, tiff, ico
 * - Documents: pdf, docx, xlsx, pptx, doc, xls, ppt
 * - Text: html, xml, json, txt, csv, md, css, js, ts
 * - Media: mp4, mp3, webm, wav, ogg
 * - Archives: zip, rar, 7z, tar, gz
 * - And more...
 */

import React, { useEffect, useState } from 'react';
import {
  Download,
  FileText,
  File,
  Music,
  Archive,
  AlertCircle,
  Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface UniversalFilePreviewProps {
  blob: Blob;
  mimeType: string;
  fileName: string;
  zoom?: number;
}

/**
 * Text File Viewer Component
 * Handles async blob reading for text-based files (CSV, JSON, TXT, etc.)
 */
function TextFileViewer({ blob, fileName, mimeType }: { blob: Blob; fileName: string; mimeType: string | null }) {
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const readBlobText = async () => {
      try {
        setLoading(true);
        const content = await blob.text();
        setText(content);
        console.log('✅ Text file content loaded:', fileName, `${content.length} characters`);
      } catch (err) {
        console.error('❌ Failed to read text blob:', err);
        setError(err instanceof Error ? err.message : 'Failed to read file content');
      } finally {
        setLoading(false);
      }
    };

    readBlobText();
  }, [blob, fileName]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-spin" />
          <p className="text-gray-600">Loading {fileName}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Failed to load text file</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-2 font-medium flex items-center justify-between">
          <span>{fileName} ({mimeType || 'text file'})</span>
          <span className="text-xs text-gray-500">{text.length} characters</span>
        </div>
        <pre className="whitespace-pre-wrap bg-white border border-gray-200 rounded p-4 font-mono text-sm overflow-auto max-h-[600px]">
          {text}
        </pre>
      </div>
    </div>
  );
}

/**
 * Excel File Viewer Component
 * Parses Excel files using SheetJS and renders as HTML table
 */
function ExcelViewer({ blob, fileName }: { blob: Blob; fileName: string }) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parseExcel = async () => {
      try {
        setLoading(true);
        const arrayBuffer = await blob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to HTML table
        const htmlTable = XLSX.utils.sheet_to_html(worksheet, { id: 'excel-table' });
        setHtml(htmlTable);

        console.log('✅ Excel file parsed:', fileName, `${workbook.SheetNames.length} sheets`);
      } catch (err) {
        console.error('❌ Failed to parse Excel file:', err);
        setError(err instanceof Error ? err.message : 'Failed to parse Excel file');
      } finally {
        setLoading(false);
      }
    };

    parseExcel();
  }, [blob, fileName]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-green-500 mx-auto mb-2 animate-spin" />
          <p className="text-gray-600">Parsing Excel file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Failed to parse Excel file</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <style>{`
        #excel-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        #excel-table td, #excel-table th {
          border: 1px solid #e5e7eb;
          padding: 8px;
          text-align: left;
        }
        #excel-table th {
          background-color: #f3f4f6;
          font-weight: 600;
          position: sticky;
          top: 0;
        }
        #excel-table tr:hover {
          background-color: #f9fafb;
        }
      `}</style>
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-4 font-medium">
          {fileName}
        </div>
        <div
          className="bg-white border border-gray-200 rounded overflow-auto max-h-[600px]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

/**
 * Word Document Viewer Component
 * Converts Word documents to HTML using Mammoth.js
 */
function WordViewer({ blob, fileName }: { blob: Blob; fileName: string }) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const parseWord = async () => {
      try {
        setLoading(true);
        const arrayBuffer = await blob.arrayBuffer();

        // Dynamic import of mammoth (required for proper loading)
        const mammoth = await import('mammoth');

        // Convert to HTML using mammoth
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            styleMap: [
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh"
            ]
          }
        );

        setHtml(result.value);

        if (result.messages.length > 0) {
          console.warn('⚠️ Word conversion messages:', result.messages);
        }

        console.log('✅ Word document converted:', fileName);
      } catch (err) {
        console.error('❌ Failed to convert Word document:', err);
        setError(err instanceof Error ? err.message : 'Failed to convert Word document');
      } finally {
        setLoading(false);
      }
    };

    parseWord();
  }, [blob, fileName]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-spin" />
          <p className="text-gray-600">Converting Word document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Failed to convert Word document</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-4 font-medium">
          {fileName}
        </div>
        <div
          className="bg-white border border-gray-200 rounded p-6 prose prose-sm max-w-none overflow-auto max-h-[600px]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

/**
 * Create universal file preview for any file type
 */
export function createUniversalFilePreview(
  blob: Blob,
  mimeType: string,
  fileName: string,
  zoom: number = 100
): React.ReactElement {
  // Create blob URL for universal file handling
  const blobUrl = URL.createObjectURL(blob);
  console.log('🌐 Creating universal file preview for:', { mimeType, fileName, blobUrl });

  // 1. IMAGE TYPES - render in <img> tag
  if (mimeType?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|tif|ico)$/i.test(fileName)) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto" style={{ zoom: `${zoom}%` }}>
        <img
          src={blobUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain border border-gray-200 rounded-lg shadow-sm"
          onLoad={() => console.log('✅ Image loaded successfully:', fileName)}
          onError={(e) => console.error('❌ Image failed to load:', fileName, e)}
        />
      </div>
    );
  }

  // 2. PDF - render in iframe
  if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    return (
      <div className="flex-1 overflow-hidden">
        <iframe
          src={blobUrl}
          className="w-full h-full border-none"
          title={`PDF: ${fileName}`}
        />
      </div>
    );
  }

  // 3. EXCEL FILES - parse and render as HTML table
  if (mimeType && (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('ms-excel') ||
    /\.(xlsx|xls|ods)$/i.test(fileName)
  )) {
    console.log('📊 Using ExcelViewer for:', fileName);
    return <ExcelViewer blob={blob} fileName={fileName} />;
  }

  // 4. WORD DOCUMENTS - convert to HTML and render
  if (mimeType && (
    mimeType.includes('wordprocessing') ||
    mimeType.includes('msword') ||
    /\.(docx|doc|odt)$/i.test(fileName)
  )) {
    console.log('📝 Using WordViewer for:', fileName);
    return <WordViewer blob={blob} fileName={fileName} />;
  }

  // 5. POWERPOINT - show download option (complex to preview)
  if (mimeType && (
    mimeType.includes('presentation') ||
    mimeType.includes('ms-powerpoint') ||
    /\.(pptx|ppt|odp)$/i.test(fileName)
  )) {
    console.log('📊 PowerPoint file - download required:', fileName);
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-2xl">
          <FileText className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">PowerPoint Presentation</h3>
          <p className="text-gray-600 mb-4 font-medium">{fileName}</p>
          <p className="text-sm text-gray-500 mb-2">Type: {mimeType || 'Presentation'}</p>
          <p className="text-sm text-gray-500 mb-6">
            Download to view presentation with full animations and formatting
          </p>
          <a
            href={blobUrl}
            download={fileName}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-sm"
          >
            <Download className="w-5 h-5" />
            Download {fileName}
          </a>
        </div>
      </div>
    );
  }

  // 6. TEXT-BASED FILES
  if (mimeType?.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml' ||
      /\.(html|htm|xml|json|txt|csv|md|css|js|ts|tsx|jsx|py|java|c|cpp|h|hpp|rb|go|rs|sh|bash|yaml|yml|toml|ini|conf)$/i.test(fileName)) {

    // 6a. HTML files - render in iframe WITHOUT sandbox for "original format" display
    // Note: These are encrypted user documents, trusted after decryption
    if (mimeType === 'text/html' || fileName.toLowerCase().endsWith('.html') || fileName.toLowerCase().endsWith('.htm')) {
      console.log('🌐 Rendering HTML file without sandbox restrictions:', fileName);
      return (
        <div className="flex-1 overflow-hidden">
          <iframe
            src={blobUrl}
            className="w-full h-full border-none"
            title={`HTML: ${fileName}`}
            // No sandbox - allow full HTML functionality for "original format"
          />
        </div>
      );
    }

    // 6b. Other text files - use TextFileViewer component to handle async blob reading
    return <TextFileViewer blob={blob} fileName={fileName} mimeType={mimeType} />;
  }

  // 7. VIDEO FILES
  if (mimeType?.startsWith('video/') || /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)$/i.test(fileName)) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-4">
            <p className="text-gray-700 font-medium">{fileName}</p>
          </div>
          <video controls className="w-full max-h-[600px] border border-gray-200 rounded-lg shadow-sm">
            <source src={blobUrl} type={mimeType || 'video/mp4'} />
            Your browser does not support video playback.
          </video>
        </div>
      </div>
    );
  }

  // 8. AUDIO FILES
  if (mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a|wma|opus)$/i.test(fileName)) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full">
          <Music className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Audio File</h3>
          <p className="text-gray-600 mb-6 font-medium">{fileName}</p>
          <audio controls className="w-full">
            <source src={blobUrl} type={mimeType || 'audio/mpeg'} />
            Your browser does not support audio playback.
          </audio>
        </div>
      </div>
    );
  }

  // 9. ARCHIVE FILES (zip, rar, 7z, tar, gz)
  if (mimeType && (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) ||
      /\.(zip|rar|7z|tar|gz|bz2|xz|tgz)$/i.test(fileName)) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-2xl">
          <Archive className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Archive File</h3>
          <p className="text-gray-600 mb-4 font-medium">{fileName}</p>
          <p className="text-sm text-gray-500 mb-2">Type: {mimeType || 'Archive'}</p>
          <p className="text-sm text-gray-500 mb-6">
            Download the archive to extract and view contents
          </p>
          <a
            href={blobUrl}
            download={fileName}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Download className="w-5 h-5" />
            Download {fileName}
          </a>
        </div>
      </div>
    );
  }

  // 10. DEFAULT FALLBACK - download link for all other types
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-2xl">
        <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">File Preview</h3>
        <p className="text-gray-600 mb-4 font-medium">{fileName}</p>
        <p className="text-sm text-gray-500 mb-2">Type: {mimeType || 'Unknown'}</p>
        <p className="text-sm text-gray-500 mb-6">
          This file type cannot be previewed in the browser. Download to view with an external application.
        </p>
        <a
          href={blobUrl}
          download={fileName}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <Download className="w-5 h-5" />
          Download {fileName}
        </a>
      </div>
    </div>
  );
}

/**
 * Component wrapper for universal file preview
 */
export const UniversalFilePreview: React.FC<UniversalFilePreviewProps> = ({
  blob,
  mimeType,
  fileName,
  zoom = 100
}) => {
  return createUniversalFilePreview(blob, mimeType, fileName, zoom);
};
