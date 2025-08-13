import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, X, Calendar, FileText, Users, FolderOpen, Tag, ChevronDown } from 'lucide-react';
import { documentsApi, DocumentSearchParams, DocumentSearchFilters, FileCategory, AuthorSuggestion } from '../../services/api/documents';
import { debounce } from '../../utils/debounce';

interface EnhancedSearchProps {
  onSearch: (params: DocumentSearchParams) => void;
  onClear: () => void;
  initialQuery?: string;
  isAdmin?: boolean;
  canSearchAdvanced?: boolean;  // Can use advanced search features
  canSearchAll?: boolean;       // Can search (basic permission)
  className?: string;
}

interface SearchState {
  query: string;
  showFilters: boolean;
  filters: DocumentSearchFilters;
  tagSuggestions: string[];
  authorSuggestions: AuthorSuggestion[];
  fileCategories: FileCategory[];
  showTagSuggestions: boolean;
  showAuthorSuggestions: boolean;
  tagQuery: string;
  authorQuery: string;
}

const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  onSearch,
  onClear,
  initialQuery = '',
  isAdmin = false,
  canSearchAdvanced = false,
  canSearchAll = true,
  className = ''
}) => {
  const [state, setState] = useState<SearchState>({
    query: initialQuery,
    showFilters: false,
    filters: {},
    tagSuggestions: [],
    authorSuggestions: [],
    fileCategories: [],
    showTagSuggestions: false,
    showAuthorSuggestions: false,
    tagQuery: '',
    authorQuery: ''
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const authorInputRef = useRef<HTMLInputElement>(null);

  // Debounced functions for API calls
  const debouncedTagSearch = useCallback(
    debounce(async (query: string) => {
      try {
        const suggestions = await documentsApi.getTagSuggestions(query, 10);
        setState(prev => ({ ...prev, tagSuggestions: suggestions }));
      } catch (error) {
        console.error('Failed to get tag suggestions:', error);
      }
    }, 300),
    []
  );

  const debouncedAuthorSearch = useCallback(
    debounce(async (query: string) => {
      if (!isAdmin) return;
      try {
        const suggestions = await documentsApi.getAuthorSuggestions(query, 10);
        setState(prev => ({ ...prev, authorSuggestions: suggestions }));
      } catch (error) {
        console.error('Failed to get author suggestions:', error);
      }
    }, 300),
    [isAdmin]
  );

  // Load file categories on mount
  useEffect(() => {
    const loadFileCategories = async () => {
      try {
        const categories = await documentsApi.getFileCategories();
        setState(prev => ({ ...prev, fileCategories: categories }));
      } catch (error) {
        console.error('Failed to load file categories:', error);
      }
    };

    loadFileCategories();
  }, []);

  // Handle search input changes
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setState(prev => ({ ...prev, query }));
  };

  // Handle search submission
  const handleSearch = () => {
    // Always include status filter to exclude deleted files, then add user filters
    const baseFilters = { status: 'active' as const };
    const combinedFilters = { ...baseFilters, ...state.filters };
    
    const searchParams: DocumentSearchParams = {
      query: state.query || undefined,
      filters: combinedFilters,
      sort_by: 'updated_at',
      sort_order: 'desc',
      page: 1,
      size: 20
    };

    onSearch(searchParams);
  };

  // Handle Enter key in search input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle filter changes with auto-search
  const updateFilter = (key: keyof DocumentSearchFilters, value: any) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value }
    }));
    
    // Auto-trigger search when filters change (debounced)
    setTimeout(() => {
      handleSearch();
    }, 300);
  };

  // Clear individual filter
  const clearFilter = (key: keyof DocumentSearchFilters) => {
    setState(prev => {
      const newFilters = { ...prev.filters };
      delete newFilters[key];
      return {
        ...prev,
        filters: newFilters
      };
    });
    
    // Auto-trigger search after clearing filter
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  // Handle tag input
  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagQuery = e.target.value;
    setState(prev => ({ ...prev, tagQuery, showTagSuggestions: true }));
    debouncedTagSearch(tagQuery);
  };

  // Handle author input
  const handleAuthorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const authorQuery = e.target.value;
    setState(prev => ({ ...prev, authorQuery, showAuthorSuggestions: true }));
    debouncedAuthorSearch(authorQuery);
  };

  // Add tag from suggestions
  const addTag = (tag: string) => {
    const currentTags = state.filters.tags || [];
    if (!currentTags.includes(tag)) {
      updateFilter('tags', [...currentTags, tag]);
    }
    setState(prev => ({ 
      ...prev, 
      tagQuery: '', 
      showTagSuggestions: false,
      tagSuggestions: []
    }));
    if (tagInputRef.current) {
      tagInputRef.current.value = '';
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    const currentTags = state.filters.tags || [];
    updateFilter('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  // Select author
  const selectAuthor = (author: AuthorSuggestion) => {
    updateFilter('author_id', author.id);
    setState(prev => ({ 
      ...prev, 
      authorQuery: author.full_name, 
      showAuthorSuggestions: false 
    }));
    if (authorInputRef.current) {
      authorInputRef.current.value = author.full_name;
    }
  };

  // Clear all filters and query
  const handleClearAll = () => {
    setState(prev => ({
      ...prev,
      query: '',
      filters: {},
      showFilters: false,
      tagQuery: '',
      authorQuery: ''
    }));
    
    if (searchInputRef.current) searchInputRef.current.value = '';
    if (tagInputRef.current) tagInputRef.current.value = '';
    if (authorInputRef.current) authorInputRef.current.value = '';
    
    onClear();
  };

  // Count active filters (excluding status which is always 'active')
  const activeFilterCount = Object.keys(state.filters).filter(key => key !== 'status').length;
  
  // Get active filter summary for display
  const getActiveFiltersSummary = () => {
    const summaries: string[] = [];
    if (state.filters.file_category) summaries.push(`Type: ${state.filters.file_category}`);
    if (state.filters.size_range) summaries.push(`Size: ${state.filters.size_range}`);
    if (state.filters.date_range) summaries.push(`Date: ${state.filters.date_range}`);
    if (state.filters.document_type) summaries.push(`Content: ${state.filters.document_type}`);
    if (state.filters.tags?.length) summaries.push(`Tags: ${state.filters.tags.join(', ')}`);
    if (state.filters.author_id) summaries.push(`Author: ${state.authorQuery}`);
    if (state.filters.is_shared) summaries.push('Shared only');
    if (state.filters.is_sensitive) summaries.push('Sensitive only');
    return summaries;
  };

  // Show restricted message if user can't search at all
  if (!canSearchAll) {
    return (
      <div className={`bg-gray-50 rounded-lg border border-gray-200 p-6 text-center ${className}`}>
        <Search className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">Search Not Available</h3>
        <p className="text-gray-500">Your current role does not have search permissions. Please contact your administrator for access.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header with search label */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {canSearchAdvanced ? 'Advanced Search' : 'Search'}
            </h3>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>{canSearchAdvanced ? 'Smart filters • Tag suggestions • Content search' : 'Basic search functionality'}</span>
          </div>
        </div>
      </div>

      {/* Main search bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, content, description, or keywords..."
              value={state.query}
              onChange={handleQueryChange}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base placeholder-gray-400"
            />
          </div>
          
          {canSearchAdvanced && (
            <button
              onClick={() => setState(prev => ({ ...prev, showFilters: !prev.showFilters }))}
              className={`px-4 py-3 rounded-lg border transition-all duration-200 flex items-center space-x-2 ${
                state.showFilters || activeFilterCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
              }`}
            >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${state.showFilters ? 'rotate-180' : ''}`} />
            </button>
          )}
          
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 shadow-sm"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </button>
          
          {(state.query || activeFilterCount > 0) && (
            <button
              onClick={handleClearAll}
              className="px-3 py-3 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
              title="Clear all"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced filters panel */}
      {canSearchAdvanced && state.showFilters && (
        <div className="border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                <Filter className="h-4 w-4 mr-2 text-gray-600" />
                Advanced Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                    {activeFilterCount} active
                  </span>
                )}
              </h4>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
            
            {/* Active filters summary */}
            {activeFilterCount > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-1">Active Filters:</p>
                <p className="text-xs text-blue-700">
                  {getActiveFiltersSummary().join(' • ')}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* File Type Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800 flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-blue-600" />
                  File Type
                </span>
                {state.filters.file_category && (
                  <button
                    onClick={() => clearFilter('file_category')}
                    className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                )}
              </label>
              <select
                value={state.filters.file_category || ''}
                onChange={(e) => updateFilter('file_category', e.target.value || undefined)}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm shadow-sm ${
                  state.filters.file_category ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <option value="">All file types</option>
                {state.fileCategories.map(category => (
                  <option key={category.name} value={category.name}>
                    {category.label} ({category.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Size Range Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800 flex items-center justify-between">
                <span className="flex items-center">
                  <FolderOpen className="h-4 w-4 mr-2 text-blue-600" />
                  File Size
                </span>
                {state.filters.size_range && (
                  <button
                    onClick={() => clearFilter('size_range')}
                    className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                )}
              </label>
              <select
                value={state.filters.size_range || ''}
                onChange={(e) => updateFilter('size_range', e.target.value || undefined)}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm shadow-sm ${
                  state.filters.size_range ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <option value="">Any size</option>
                <option value="small">Small (0-1MB)</option>
                <option value="medium">Medium (1-10MB)</option>
                <option value="large">Large (10-100MB)</option>
                <option value="huge">Huge (100MB+)</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800 flex items-center justify-between">
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                  Date Modified
                </span>
                {state.filters.date_range && (
                  <button
                    onClick={() => clearFilter('date_range')}
                    className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                )}
              </label>
              <select
                value={state.filters.date_range || ''}
                onChange={(e) => updateFilter('date_range', e.target.value || undefined)}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm shadow-sm ${
                  state.filters.date_range ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <option value="">Any time</option>
                <option value="today">Today</option>
                <option value="week">Past week</option>
                <option value="month">Past month</option>
                <option value="quarter">Past quarter</option>
                <option value="year">Past year</option>
                <option value="older">Older than 1 year</option>
              </select>
            </div>

            {/* Tags Filter */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-semibold text-gray-800 flex items-center">
                <Tag className="h-4 w-4 mr-2 text-blue-600" />
                Tags
              </label>
              <div className="relative">
                <input
                  ref={tagInputRef}
                  type="text"
                  placeholder="Type to search and add tags..."
                  value={state.tagQuery}
                  onChange={handleTagInput}
                  onFocus={() => setState(prev => ({ ...prev, showTagSuggestions: true }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm shadow-sm"
                />
                
                {/* Tag suggestions dropdown */}
                {state.showTagSuggestions && state.tagSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {state.tagSuggestions.map(tag => (
                      <button
                        key={tag}
                        onClick={() => addTag(tag)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Selected tags */}
                {state.filters.tags && state.filters.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {state.filters.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-blue-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Author Filter (Admin Only) */}
            {isAdmin && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  Author
                </label>
                <div className="relative">
                  <input
                    ref={authorInputRef}
                    type="text"
                    placeholder="Search by author name..."
                    value={state.authorQuery}
                    onChange={handleAuthorInput}
                    onFocus={() => setState(prev => ({ ...prev, showAuthorSuggestions: true }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm shadow-sm"
                  />
                  
                  {/* Author suggestions dropdown */}
                  {state.showAuthorSuggestions && state.authorSuggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {state.authorSuggestions.map(author => (
                        <button
                          key={author.id}
                          onClick={() => selectAuthor(author)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <div className="font-medium">{author.full_name}</div>
                          <div className="text-sm text-gray-500">{author.email} • {author.document_count} docs</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Document Type Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800 flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-blue-600" />
                  Content Type
                </span>
                {state.filters.document_type && (
                  <button
                    onClick={() => clearFilter('document_type')}
                    className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                )}
              </label>
              <select
                value={state.filters.document_type || ''}
                onChange={(e) => updateFilter('document_type', e.target.value || undefined)}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm shadow-sm ${
                  state.filters.document_type ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <option value="">Files & folders</option>
                <option value="document">Files only</option>
                <option value="folder">Folders only</option>
              </select>
            </div>

            {/* Shared/Sensitive Filters */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-800 mb-3">Special Filters</label>
              <label className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={state.filters.is_shared || false}
                  onChange={(e) => updateFilter('is_shared', e.target.checked || undefined)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="ml-3 text-sm text-gray-700 font-medium">Shared documents only</span>
              </label>
              
              <label className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={state.filters.is_sensitive || false}
                  onChange={(e) => updateFilter('is_sensitive', e.target.checked || undefined)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="ml-3 text-sm text-gray-700 font-medium">Sensitive documents only</span>
              </label>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearch;