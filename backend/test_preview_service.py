#!/usr/bin/env python3
"""
Test preview service with mock content
"""

import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.preview_service import PreviewService

async def test_preview_service():
    print("Testing preview service with mock content...")
    
    # Mock content from our document service
    mock_content = b"Mock decrypted content for document demo.txt"
    mime_type = "text/plain"
    filename = "demo.txt"
    
    preview_service = PreviewService()
    
    try:
        print("Testing extract_text_preview...")
        result = await preview_service.extract_text_preview(
            mock_content, mime_type, filename
        )
        print(f"SUCCESS: Preview generated")
        print(f"Result: {result}")
        return True
    except Exception as e:
        print(f"ERROR: Preview generation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_preview_service())
    print(f"\nTest result: {'PASSED' if result else 'FAILED'}")