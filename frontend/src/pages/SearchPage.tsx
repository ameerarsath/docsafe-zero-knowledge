import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, AlertCircle } from 'lucide-react';
import EnhancedSearch from '../components/search/EnhancedSearch';
import SearchResults from '../components/search/SearchResults';
import { documentsApi, DocumentSearchParams, Document } from '../services/api/documents';
import { useAuth } from '../contexts/AuthContext';

interface SearchPageState {
  documents: Document[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  hasNext: boolean;
  currentSearchParams: DocumentSearchParams | null;
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [state, setState] = useState<SearchPageState>({
    documents: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    hasNext: false,
    currentSearchParams: null
  });

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Load initial search from URL parameters
  useEffect(() => {
    const query = searchParams.get('q');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const fileCategory = searchParams.get('category');
    const author = searchParams.get('author');
    const sizeRange = searchParams.get('size');
    const dateRange = searchParams.get('date');

    if (query || tags || fileCategory || author || sizeRange || dateRange) {
      const initialParams: DocumentSearchParams = {
        query: query || undefined,
        filters: {
          tags: tags || undefined,
          file_category: fileCategory as any || undefined,
          author_id: author ? parseInt(author) : undefined,
          size_range: sizeRange as any || undefined,
          date_range: dateRange as any || undefined
        },
        page: 1,
        size: 20
      };

      handleSearch(initialParams);
    }
  }, [searchParams]);

  // Update URL when search parameters change
  const updateURL = useCallback((params: DocumentSearchParams) => {
    const newSearchParams = new URLSearchParams();
    
    if (params.query) {
      newSearchParams.set('q', params.query);
    }
    
    if (params.filters?.tags?.length) {
      newSearchParams.set('tags', params.filters.tags.join(','));
    }
    
    if (params.filters?.file_category) {
      newSearchParams.set('category', params.filters.file_category);
    }
    
    if (params.filters?.author_id) {
      newSearchParams.set('author', params.filters.author_id.toString());
    }
    
    if (params.filters?.size_range) {
      newSearchParams.set('size', params.filters.size_range);
    }
    
    if (params.filters?.date_range) {
      newSearchParams.set('date', params.filters.date_range);
    }
    
    setSearchParams(newSearchParams);
  }, [setSearchParams]);

  // Handle search
  const handleSearch = useCallback(async (params: DocumentSearchParams) => {
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      currentSearchParams: params
    }));

    try {
      const response = await documentsApi.searchDocumentsAdvanced(params);
      
      setState(prev => ({
        ...prev,
        documents: response.documents,
        total: response.total,
        page: response.page,
        hasNext: response.has_next,
        loading: false
      }));

      // Update URL
      updateURL(params);
      
    } catch (error) {
      console.error('Search failed:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }));
    }
  }, [updateURL]);

  // Handle load more (pagination)
  const handleLoadMore = useCallback(async () => {
    if (!state.currentSearchParams || !state.hasNext || state.loading) return;

    const nextPageParams = {
      ...state.currentSearchParams,
      page: state.page + 1
    };

    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await documentsApi.searchDocumentsAdvanced(nextPageParams);
      
      setState(prev => ({
        ...prev,
        documents: [...prev.documents, ...response.documents],
        page: response.page,
        hasNext: response.has_next,
        loading: false
      }));
      
    } catch (error) {
      console.error('Load more failed:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load more results'
      }));
    }
  }, [state.currentSearchParams, state.hasNext, state.loading, state.page]);

  // Handle clear search
  const handleClear = useCallback(() => {
    setState({
      documents: [],
      loading: false,
      error: null,
      total: 0,
      page: 1,
      hasNext: false,
      currentSearchParams: null
    });
    
    setSearchParams({});
  }, [setSearchParams]);

  // Handle document actions
  const handleDocumentClick = useCallback((document: Document) => {
    if (document.document_type === 'folder') {
      navigate(`/documents?folder=${document.id}`);
    } else {
      navigate(`/documents/${document.id}`);
    }
  }, [navigate]);

  const handleDownload = useCallback(async (document: Document) => {
    try {
      await documentsApi.downloadDocument(document.id);
    } catch (error) {
      console.error('Download failed:', error);
      // You could show a toast notification here
    }
  }, []);

  const handlePreview = useCallback((document: Document) => {
    // Open preview modal or navigate to preview page
    navigate(`/documents/${document.id}/preview`);
  }, [navigate]);

  const handleShare = useCallback((document: Document) => {
    // Open share modal
    navigate(`/documents/${document.id}/share`);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <SearchIcon className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Search Documents</h1>
          </div>
          <p className="text-gray-600">
            Search through your documents by name, content, tags, and more. Use advanced filters to narrow down results.
          </p>
        </div>

        {/* Enhanced Search Component */}
        <div className="mb-8">
          <EnhancedSearch
            onSearch={handleSearch}
            onClear={handleClear}
            initialQuery={searchParams.get('q') || ''}
            isAdmin={isAdmin}
          />
        </div>

        {/* Search Results Info */}
        {state.currentSearchParams && !state.loading && !state.error && (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {state.total > 0 ? (
                  <>
                    Showing {state.documents.length} of {state.total} results
                    {state.currentSearchParams.query && (
                      <> for "<span className="font-medium">{state.currentSearchParams.query}</span>"</>
                    )}
                  </>
                ) : (
                  'No results found'
                )}
              </div>
              
              {state.hasNext && (
                <button
                  onClick={handleLoadMore}
                  disabled={state.loading}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  Load more results
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {state.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700 font-medium">Search Error</span>
            </div>
            <p className="text-red-600 mt-1">{state.error}</p>
          </div>
        )}

        {/* Search Results */}
        <div className="mb-8">
          <SearchResults
            documents={state.documents}
            searchQuery={state.currentSearchParams?.query}
            onDocumentClick={handleDocumentClick}
            onDownload={handleDownload}
            onPreview={handlePreview}
            onShare={handleShare}
            loading={state.loading}
          />
        </div>

        {/* Load More Button */}
        {state.hasNext && !state.loading && (
          <div className="text-center">
            <button
              onClick={handleLoadMore}
              className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Load More Results
            </button>
          </div>
        )}

        {/* Empty State - No Search Performed */}
        {!state.currentSearchParams && !state.loading && (
          <div className="text-center py-12">
            <SearchIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start Your Search</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Enter keywords, select filters, and discover the documents you're looking for. 
              Our enhanced search makes finding your files quick and easy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;