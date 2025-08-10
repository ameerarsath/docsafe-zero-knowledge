import React from 'react';
import { FileText, Folder, Calendar, User, Tag, Download, Share, Eye, MoreVertical } from 'lucide-react';
import { Document } from '../../services/api/documents';
import { formatFileSize, formatDate } from '../../utils/format';

interface SearchResultsProps {
  documents: Document[];
  searchQuery?: string;
  onDocumentClick: (document: Document) => void;
  onDownload?: (document: Document) => void;
  onShare?: (document: Document) => void;
  onPreview?: (document: Document) => void;
  loading?: boolean;
  className?: string;
}

interface HighlightedTextProps {
  text: string;
  searchQuery?: string;
  className?: string;
}

// Component to highlight search terms in text
const HighlightedText: React.FC<HighlightedTextProps> = ({ text, searchQuery, className = '' }) => {
  if (!searchQuery || !text) {
    return <span className={className}>{text}</span>;
  }

  const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
  
  return (
    <span className={className}>
      {parts.map((part, index) => 
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

// Get file type icon
const getFileTypeIcon = (document: Document) => {
  if (document.document_type === 'folder') {
    return <Folder className="h-5 w-5 text-blue-500" />;
  }

  const category = document.file_category;
  const iconClass = "h-5 w-5";

  switch (category) {
    case 'document':
      return <FileText className={`${iconClass} text-red-500`} />;
    case 'spreadsheet':
      return <FileText className={`${iconClass} text-green-500`} />;
    case 'presentation':
      return <FileText className={`${iconClass} text-orange-500`} />;
    case 'image':
      return <FileText className={`${iconClass} text-purple-500`} />;
    case 'video':
      return <FileText className={`${iconClass} text-pink-500`} />;
    case 'audio':
      return <FileText className={`${iconClass} text-yellow-500`} />;
    case 'archive':
      return <FileText className={`${iconClass} text-gray-500`} />;
    case 'code':
      return <FileText className={`${iconClass} text-blue-600`} />;
    default:
      return <FileText className={`${iconClass} text-gray-400`} />;
  }
};

// Get file category badge
const getCategoryBadge = (category?: string) => {
  if (!category) return null;

  const badgeClasses = {
    document: 'bg-red-100 text-red-800',
    spreadsheet: 'bg-green-100 text-green-800',
    presentation: 'bg-orange-100 text-orange-800',
    image: 'bg-purple-100 text-purple-800',
    video: 'bg-pink-100 text-pink-800',
    audio: 'bg-yellow-100 text-yellow-800',
    archive: 'bg-gray-100 text-gray-800',
    code: 'bg-blue-100 text-blue-800',
    other: 'bg-gray-100 text-gray-600'
  };

  const className = badgeClasses[category as keyof typeof badgeClasses] || badgeClasses.other;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {category}
    </span>
  );
};

const SearchResults: React.FC<SearchResultsProps> = ({
  documents,
  searchQuery,
  onDocumentClick,
  onDownload,
  onShare,
  onPreview,
  loading = false,
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Searching documents...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
        <p className="text-gray-500">
          {searchQuery 
            ? `No documents match your search for "${searchQuery}"`
            : "Try adjusting your search criteria or filters"
          }
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="divide-y divide-gray-200">
        {documents.map((document) => (
          <div
            key={document.id}
            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => onDocumentClick(document)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                {/* File Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getFileTypeIcon(document)}
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      <HighlightedText
                        text={document.name}
                        searchQuery={searchQuery}
                      />
                    </h3>
                    
                    {getCategoryBadge(document.file_category)}
                    
                    {document.is_sensitive && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        Sensitive
                      </span>
                    )}
                    
                    {document.is_shared && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Shared
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {document.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      <HighlightedText
                        text={document.description}
                        searchQuery={searchQuery}
                      />
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {/* File Size */}
                    {document.file_size && (
                      <span className="flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        {formatFileSize(document.file_size)}
                      </span>
                    )}

                    {/* Modified Date */}
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(document.updated_at)}
                    </span>

                    {/* Author (if available) */}
                    {document.author_name && (
                      <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        <HighlightedText
                          text={document.author_name}
                          searchQuery={searchQuery}
                        />
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {document.tags && document.tags.length > 0 && (
                    <div className="flex items-center space-x-1 mt-2">
                      <Tag className="h-3 w-3 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {document.tags.slice(0, 5).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                          >
                            <HighlightedText
                              text={tag}
                              searchQuery={searchQuery}
                            />
                          </span>
                        ))}
                        {document.tags.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{document.tags.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 ml-4">
                {document.document_type === 'document' && onPreview && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(document);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}

                {document.document_type === 'document' && onDownload && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(document);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}

                {onShare && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(document);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Share"
                  >
                    <Share className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="More options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;