#!/usr/bin/env python3
"""
Clear preview cache for testing
"""

from app.services.preview_service import PreviewService

def clear_cache():
    """Clear preview cache for document 9"""
    preview_service = PreviewService()
    
    # Clear cache for document 9
    preview_service.clear_cache(document_id=9)
    print("CLEARED preview cache for document 9")
    
    # Show current cache state
    print(f"Cache keys remaining: {list(preview_service.cache.keys())}")

if __name__ == "__main__":
    clear_cache()