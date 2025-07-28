/**
 * Tags Input Component
 * 
 * A reusable component for adding and managing tags with:
 * - Tag input with autocomplete
 * - Visual tag display with remove buttons
 * - Predefined tag suggestions
 * - Keyboard navigation (Enter to add, Backspace to remove)
 */

import React, { useState, useCallback, useEffect, useRef, KeyboardEvent } from 'react';
import { X, Tag, Plus } from 'lucide-react';

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
  allowCustomTags?: boolean;
}

const COMMON_TAGS = [
  'urgent', 'important', 'draft', 'final', 'approved', 'review',
  'confidential', 'public', 'internal', 'marketing', 'sales', 'hr',
  'engineering', 'finance', 'legal', 'project', 'meeting', 'report',
  'contract', 'invoice', 'presentation', 'document', 'image', 'archive'
];

export const TagsInput: React.FC<TagsInputProps> = ({
  tags,
  onChange,
  suggestions = COMMON_TAGS,
  placeholder = 'Add tags...',
  maxTags = 10,
  className = '',
  disabled = false,
  allowCustomTags = true
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input value and exclude already selected tags
  const filteredSuggestions = suggestions.filter(
    suggestion => 
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(suggestion) &&
      inputValue.length > 0
  );

  const addTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (
      trimmedTag &&
      !tags.includes(trimmedTag) &&
      tags.length < maxTags &&
      (allowCustomTags || suggestions.includes(trimmedTag))
    ) {
      onChange([...tags, trimmedTag]);
      setInputValue('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [tags, onChange, maxTags, allowCustomTags, suggestions]);

  const removeTag = useCallback((tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  }, [tags, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.length > 0);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
        addTag(filteredSuggestions[selectedSuggestionIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
  };

  const handleInputFocus = () => {
    if (inputValue.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 200);
  };

  // Effect to handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Tags Display and Input Container */}
      <div className={`
        min-h-[2.5rem] p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500
        ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
      `}>
        <div className="flex flex-wrap gap-1 items-center">
          {/* Existing Tags */}
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          
          {/* Input Field */}
          {!disabled && tags.length < maxTags && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={tags.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[120px] border-none outline-none bg-transparent text-sm"
            />
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`
                w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
                ${index === selectedSuggestionIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
              `}
            >
              <div className="flex items-center">
                <Tag className="w-3 h-3 mr-2 text-gray-400" />
                {suggestion}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Helpful Text */}
      <div className="mt-1 text-xs text-gray-500">
        {disabled ? null : (
          <>
            {tags.length > 0 && `${tags.length}/${maxTags} tags`}
            {tags.length === 0 && 'Type to add tags, press Enter to confirm'}
            {tags.length < maxTags && tags.length > 0 && ' • Type to add more'}
          </>
        )}
      </div>
    </div>
  );
};

export default TagsInput;