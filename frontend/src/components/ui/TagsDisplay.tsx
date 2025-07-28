/**
 * Tags Display Component
 * 
 * A component for displaying tags on documents and folders with:
 * - Compact visual representation
 * - Click to filter functionality
 * - Overflow handling for many tags
 * - Color coding for different tag types
 */

import React from 'react';
import { Tag } from 'lucide-react';

interface TagsDisplayProps {
  tags: string[];
  onTagClick?: (tag: string) => void;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  className?: string;
}

// Define colors for different tag categories
const getTagColor = (tag: string): string => {
  const tagLower = tag.toLowerCase();
  
  // Priority/Status tags
  if (['urgent', 'important', 'critical'].includes(tagLower)) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (['draft', 'in-progress', 'pending'].includes(tagLower)) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
  if (['final', 'approved', 'completed'].includes(tagLower)) {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  if (['review', 'feedback', 'revision'].includes(tagLower)) {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  }
  
  // Security tags
  if (['confidential', 'secret', 'private'].includes(tagLower)) {
    return 'bg-purple-100 text-purple-800 border-purple-200';
  }
  if (['public', 'open'].includes(tagLower)) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  
  // Department tags
  if (['marketing', 'sales', 'hr', 'engineering', 'finance', 'legal'].includes(tagLower)) {
    return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  }
  
  // Default color
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

export const TagsDisplay: React.FC<TagsDisplayProps> = ({
  tags,
  onTagClick,
  maxVisible = 3,
  size = 'sm',
  interactive = true,
  className = ''
}) => {
  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = Math.max(0, tags.length - maxVisible);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const handleTagClick = (tag: string, event: React.MouseEvent) => {
    if (interactive && onTagClick) {
      event.preventDefault();
      event.stopPropagation();
      onTagClick(tag);
    }
  };

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {visibleTags.map((tag, index) => (
        <span
          key={index}
          onClick={(e) => handleTagClick(tag, e)}
          className={`
            inline-flex items-center rounded-md border font-medium
            ${sizeClasses[size]}
            ${getTagColor(tag)}
            ${interactive && onTagClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}
          `}
          title={interactive ? `Click to filter by "${tag}"` : tag}
        >
          <Tag className={`
            mr-1
            ${size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-3.5 h-3.5'}
          `} />
          {tag}
        </span>
      ))}
      
      {hiddenCount > 0 && (
        <span
          className={`
            inline-flex items-center rounded-md border bg-gray-50 text-gray-600 border-gray-200
            ${sizeClasses[size]}
            ${interactive ? 'cursor-pointer hover:bg-gray-100' : ''}
          `}
          title={`${hiddenCount} more tags: ${tags.slice(maxVisible).join(', ')}`}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
};

// Utility component for tag filtering
export const TagFilter: React.FC<{
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onClearAll: () => void;
}> = ({ selectedTags, onTagToggle, onClearAll }) => {
  if (selectedTags.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <span className="text-sm text-blue-700 font-medium">Filtered by:</span>
      <div className="flex items-center gap-1 flex-wrap">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
          >
            <Tag className="w-3 h-3 mr-1" />
            {tag}
            <button
              onClick={() => onTagToggle(tag)}
              className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              ×
            </button>
          </span>
        ))}
        <button
          onClick={onClearAll}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Clear all
        </button>
      </div>
    </div>
  );
};

export default TagsDisplay;