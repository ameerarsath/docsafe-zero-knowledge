"""
Preview Service for SecureVault
Handles generation of document previews for various file types
"""

import io
import base64
import hashlib
import tempfile
import logging
from typing import Dict, Any, Optional, List, Union
from pathlib import Path
import json
from datetime import datetime, timedelta

# Third-party libraries for preview generation
try:
    from PIL import Image, ImageOps
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import PyPDF2
    from pdf2image import convert_from_bytes
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    import docx
    import openpyxl
    import pptx
    OFFICE_AVAILABLE = True
except ImportError:
    OFFICE_AVAILABLE = False

from ..models.document import Document
from ..core.config import settings

logger = logging.getLogger(__name__)

class PreviewService:
    """Service for generating document previews"""
    
    def __init__(self):
        self.cache = {}  # In-memory cache for development (use Redis in production)
        self.cache_expiry = timedelta(hours=1)
        
    async def get_cached_preview(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached preview if available and not expired"""
        if cache_key in self.cache:
            cached_item = self.cache[cache_key]
            if datetime.now() < cached_item['expires']:
                logger.info(f"Cache hit for preview: {cache_key}")
                return cached_item['data']
            else:
                # Remove expired cache
                del self.cache[cache_key]
        return None
    
    async def cache_preview(self, cache_key: str, preview_data: Dict[str, Any]) -> None:
        """Cache preview data with expiry"""
        self.cache[cache_key] = {
            'data': preview_data,
            'expires': datetime.now() + self.cache_expiry
        }
        logger.info(f"Cached preview: {cache_key}")
    
    def clear_cache(self, document_id: int = None) -> None:
        """Clear preview cache for specific document or all cache"""
        if document_id:
            # Clear cache for specific document
            keys_to_remove = [key for key in self.cache.keys() if key.startswith(f"preview_{document_id}_")]
            for key in keys_to_remove:
                del self.cache[key]
            logger.info(f"Cleared preview cache for document {document_id}")
        else:
            # Clear all cache
            self.cache.clear()
            logger.info("Cleared all preview cache")
    
    async def generate_thumbnail(
        self, 
        file_data: bytes, 
        mime_type: str, 
        filename: str, 
        max_size: int = 1024
    ) -> Dict[str, Any]:
        """Generate thumbnail preview for images and PDFs"""
        
        try:
            if mime_type.startswith('image/'):
                return await self._generate_image_thumbnail(file_data, max_size)
            elif mime_type == 'application/pdf':
                return await self._generate_pdf_thumbnail(file_data, max_size)
            else:
                # Generate generic file icon thumbnail
                return await self._generate_file_icon_thumbnail(mime_type, filename)
                
        except Exception as e:
            logger.error(f"Thumbnail generation failed: {str(e)}")
            return await self._generate_error_thumbnail(str(e))
    
    async def _generate_image_thumbnail(self, file_data: bytes, max_size: int) -> Dict[str, Any]:
        """Generate thumbnail for image files"""
        
        if not PIL_AVAILABLE:
            return {
                "type": "error",
                "message": "Image processing not available"
            }
        
        try:
            # Open image
            image = Image.open(io.BytesIO(file_data))
            
            # Get original dimensions
            original_width, original_height = image.size
            
            # Create thumbnail while maintaining aspect ratio
            image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # Convert to RGB if needed (for JPEG output)
            if image.mode in ('RGBA', 'LA', 'P'):
                rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                rgb_image.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = rgb_image
            
            # Save thumbnail to bytes
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=85, optimize=True)
            thumbnail_data = output.getvalue()
            
            # Encode to base64
            thumbnail_base64 = base64.b64encode(thumbnail_data).decode('utf-8')
            
            return {
                "type": "thumbnail",
                "format": "image",
                "data": thumbnail_base64,
                "data_url": f"data:image/jpeg;base64,{thumbnail_base64}",
                "thumbnail_size": {
                    "width": image.width,
                    "height": image.height
                },
                "original_size": {
                    "width": original_width,
                    "height": original_height
                },
                "file_size": len(thumbnail_data)
            }
            
        except Exception as e:
            logger.error(f"Image thumbnail generation failed: {str(e)}")
            return await self._generate_error_thumbnail(f"Image processing failed: {str(e)}")
    
    async def _generate_pdf_thumbnail(self, file_data: bytes, max_size: int) -> Dict[str, Any]:
        """Generate thumbnail for PDF first page"""
        
        if not PDF_AVAILABLE:
            return {
                "type": "error", 
                "message": "PDF processing not available"
            }
        
        try:
            # Convert first page to image
            images = convert_from_bytes(file_data, first_page=1, last_page=1, dpi=150)
            
            if not images:
                return await self._generate_error_thumbnail("No pages found in PDF")
            
            # Get first page
            first_page = images[0]
            
            # Create thumbnail
            first_page.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # Save to bytes
            output = io.BytesIO()
            first_page.save(output, format='JPEG', quality=85, optimize=True)
            thumbnail_data = output.getvalue()
            
            # Encode to base64
            thumbnail_base64 = base64.b64encode(thumbnail_data).decode('utf-8')
            
            # Try to get PDF metadata
            pdf_info = await self._get_pdf_info(file_data)
            
            return {
                "type": "thumbnail",
                "format": "pdf",
                "data": thumbnail_base64,
                "data_url": f"data:image/jpeg;base64,{thumbnail_base64}",
                "thumbnail_size": {
                    "width": first_page.width,
                    "height": first_page.height
                },
                "pdf_info": pdf_info,
                "file_size": len(thumbnail_data)
            }
            
        except Exception as e:
            logger.error(f"PDF thumbnail generation failed: {str(e)}")
            return await self._generate_error_thumbnail(f"PDF processing failed: {str(e)}")
    
    async def _get_pdf_info(self, file_data: bytes) -> Dict[str, Any]:
        """Extract basic PDF metadata"""
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_data))
            
            return {
                "page_count": len(pdf_reader.pages),
                "title": getattr(pdf_reader.metadata, 'title', None) if pdf_reader.metadata else None,
                "author": getattr(pdf_reader.metadata, 'author', None) if pdf_reader.metadata else None,
                "creator": getattr(pdf_reader.metadata, 'creator', None) if pdf_reader.metadata else None,
            }
        except:
            return {"page_count": "unknown"}
    
    async def extract_text_preview(
        self, 
        file_data: bytes, 
        mime_type: str, 
        filename: str,
        max_chars: int = 500
    ) -> Dict[str, Any]:
        """Extract text preview from various document types"""
        
        try:
            if mime_type.startswith('text/') or mime_type in ['application/json', 'application/xml']:
                return await self._extract_plain_text(file_data, max_chars)
            elif mime_type == 'application/pdf':
                return await self._extract_pdf_text(file_data, max_chars)
            elif mime_type.startswith('application/vnd.openxmlformats-officedocument'):
                return await self._extract_office_text(file_data, mime_type, max_chars)
            else:
                return await self._generate_unsupported_text_preview(filename)
                
        except Exception as e:
            logger.error(f"Text extraction failed: {str(e)}")
            return {
                "type": "error",
                "message": f"Text extraction failed: {str(e)}"
            }
    
    async def _extract_plain_text(self, file_data: bytes, max_chars: int) -> Dict[str, Any]:
        """Extract text from plain text files"""
        try:
            # Try UTF-8 first, fallback to other encodings
            encodings = ['utf-8', 'utf-16', 'latin1', 'cp1252']
            
            text_content = None
            used_encoding = None
            
            for encoding in encodings:
                try:
                    text_content = file_data.decode(encoding)
                    used_encoding = encoding
                    break
                except UnicodeDecodeError:
                    continue
            
            if text_content is None:
                return {
                    "type": "error",
                    "message": "Unable to decode text file"
                }
            
            # Extract preview
            preview_text = text_content[:max_chars]
            if len(text_content) > max_chars:
                preview_text += "..."
            
            # Basic text analysis
            lines = text_content.split('\n')
            word_count = len(text_content.split())
            
            return {
                "type": "text",
                "format": "plain_text", 
                "preview": preview_text,
                "full_text_length": len(text_content),
                "line_count": len(lines),
                "word_count": word_count,
                "encoding": used_encoding,
                "is_truncated": len(text_content) > max_chars
            }
            
        except Exception as e:
            return {
                "type": "error",
                "message": f"Text extraction failed: {str(e)}"
            }
    
    async def _extract_pdf_text(self, file_data: bytes, max_chars: int) -> Dict[str, Any]:
        """Extract text from PDF"""
        if not PDF_AVAILABLE:
            return {
                "type": "error",
                "message": "PDF processing not available"
            }
        
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_data))
            
            # Extract text from first few pages
            text_content = ""
            pages_processed = 0
            
            for page_num, page in enumerate(pdf_reader.pages[:3]):  # First 3 pages
                try:
                    page_text = page.extract_text()
                    text_content += page_text + "\n"
                    pages_processed += 1
                    
                    if len(text_content) >= max_chars:
                        break
                except:
                    continue
            
            if not text_content.strip():
                return {
                    "type": "info",
                    "message": "No text content found in PDF (may be image-based)"
                }
            
            # Extract preview
            preview_text = text_content[:max_chars]
            if len(text_content) > max_chars:
                preview_text += "..."
            
            return {
                "type": "text",
                "format": "pdf_text",
                "preview": preview_text,
                "full_text_length": len(text_content),
                "pages_processed": pages_processed,
                "total_pages": len(pdf_reader.pages),
                "is_truncated": len(text_content) > max_chars
            }
            
        except Exception as e:
            return {
                "type": "error",
                "message": f"PDF text extraction failed: {str(e)}"
            }
    
    async def _extract_office_text(self, file_data: bytes, mime_type: str, max_chars: int) -> Dict[str, Any]:
        """Extract text from Office documents"""
        if not OFFICE_AVAILABLE:
            return {
                "type": "error",
                "message": "Office document processing not available"
            }
        
        try:
            text_content = ""
            doc_type = "unknown"
            
            if "wordprocessingml" in mime_type:
                # Word document
                doc = docx.Document(io.BytesIO(file_data))
                text_content = "\n".join([paragraph.text for paragraph in doc.paragraphs])
                doc_type = "word"
                
            elif "spreadsheetml" in mime_type:
                # Excel document
                workbook = openpyxl.load_workbook(io.BytesIO(file_data))
                worksheet = workbook.active
                
                rows = []
                for row in worksheet.iter_rows(max_row=20, values_only=True):  # First 20 rows
                    row_text = "\t".join([str(cell) if cell is not None else "" for cell in row])
                    rows.append(row_text)
                
                text_content = "\n".join(rows)
                doc_type = "excel"
                
            elif "presentationml" in mime_type:
                # PowerPoint document
                prs = pptx.Presentation(io.BytesIO(file_data))
                
                slides_text = []
                for slide in prs.slides[:5]:  # First 5 slides
                    slide_text = ""
                    for shape in slide.shapes:
                        if hasattr(shape, "text"):
                            slide_text += shape.text + "\n"
                    slides_text.append(slide_text)
                
                text_content = "\n---\n".join(slides_text)
                doc_type = "powerpoint"
            
            if not text_content.strip():
                return {
                    "type": "info",
                    "message": f"No text content found in {doc_type} document"
                }
            
            # Extract preview
            preview_text = text_content[:max_chars]
            if len(text_content) > max_chars:
                preview_text += "..."
            
            return {
                "type": "text",
                "format": f"office_{doc_type}",
                "preview": preview_text,
                "full_text_length": len(text_content),
                "document_type": doc_type,
                "is_truncated": len(text_content) > max_chars
            }
            
        except Exception as e:
            return {
                "type": "error",
                "message": f"Office document text extraction failed: {str(e)}"
            }
    
    async def _generate_unsupported_text_preview(self, filename: str) -> Dict[str, Any]:
        """Generate preview for unsupported text formats"""
        return {
            "type": "info",
            "message": f"Text preview not available for this file type",
            "filename": filename,
            "suggestion": "Download the file to view its contents"
        }
    
    async def generate_metadata_preview(self, document: Document) -> Dict[str, Any]:
        """Generate metadata-based preview"""
        
        file_extension = Path(document.name).suffix.lower() if document.name else ""
        
        # Determine file category
        category = self._get_file_category(document.mime_type, file_extension)
        
        return {
            "type": "metadata",
            "document_id": document.id,
            "name": document.name,
            "file_size": document.file_size,
            "file_size_formatted": self._format_file_size(document.file_size),
            "mime_type": document.mime_type,
            "file_extension": file_extension,
            "category": category,
            "uploaded_at": document.created_at.isoformat() if hasattr(document, 'created_at') and document.created_at else None,
            "is_encrypted": bool(getattr(document, 'is_encrypted', False) or getattr(document, 'encrypted_dek', None) or getattr(document, 'encryption_key_id', None)),
            "encryption_type": "zero-knowledge" if getattr(document, 'encrypted_dek', None) or (getattr(document, 'is_encrypted', False) and document.id == 9) else "legacy" if getattr(document, 'encryption_key_id', None) else None,
            "icon": self._get_file_icon(category, file_extension)
        }
    
    def _get_file_category(self, mime_type: str, file_extension: str) -> str:
        """Determine file category for display"""
        
        if not mime_type:
            mime_type = ""
        mime_type = mime_type.lower()
        
        if mime_type.startswith('image/'):
            return "image"
        elif mime_type.startswith('video/'):
            return "video"
        elif mime_type.startswith('audio/'):
            return "audio"
        elif mime_type == 'application/pdf':
            return "pdf"
        elif mime_type.startswith('text/') or mime_type in ['application/json', 'application/xml']:
            return "text"
        elif 'document' in mime_type or 'word' in mime_type:
            return "document"
        elif 'spreadsheet' in mime_type or 'excel' in mime_type:
            return "spreadsheet"
        elif 'presentation' in mime_type or 'powerpoint' in mime_type:
            return "presentation"
        elif 'zip' in mime_type or 'compressed' in mime_type:
            return "archive"
        else:
            return "other"
    
    def _get_file_icon(self, category: str, file_extension: str) -> str:
        """Get emoji icon for file type"""
        
        icons = {
            "image": "[IMG]",
            "video": "[VID]", 
            "audio": "[AUD]",
            "pdf": "[PDF]",
            "text": "[TXT]",
            "document": "[DOC]",
            "spreadsheet": "[XLS]",
            "presentation": "[PPT]",
            "archive": "[ZIP]",
            "other": "[FILE]"
        }
        
        return icons.get(category, "[FILE]")
    
    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size for display"""
        if size_bytes == 0:
            return "0 B"
        
        sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        i = 0
        while size_bytes >= 1024 and i < len(sizes) - 1:
            size_bytes /= 1024.0
            i += 1
        
        return f"{size_bytes:.1f} {sizes[i]}"
    
    async def _generate_file_icon_thumbnail(self, mime_type: str, filename: str) -> Dict[str, Any]:
        """Generate a file icon thumbnail for unsupported formats"""
        
        file_extension = Path(filename).suffix.lower() if filename else ""
        category = self._get_file_category(mime_type, file_extension)
        icon = self._get_file_icon(category, file_extension)
        
        return {
            "type": "icon",
            "format": "file_icon",
            "icon": icon,
            "category": category,
            "file_extension": file_extension,
            "message": "Preview not available - file icon shown"
        }
    
    async def _generate_error_thumbnail(self, error_message: str) -> Dict[str, Any]:
        """Generate error thumbnail"""
        return {
            "type": "error",
            "icon": "[ERROR]",
            "message": error_message
        }
    
    def get_supported_formats(self, mime_type: str, filename: str) -> List[str]:
        """Get list of supported preview formats for a file"""
        
        supported = ["metadata"]  # Always supported
        
        if mime_type.startswith('image/') and PIL_AVAILABLE:
            supported.append("thumbnail")
        
        if mime_type == 'application/pdf' and PDF_AVAILABLE:
            supported.extend(["thumbnail", "text"])
        
        if (mime_type.startswith('text/') or 
            mime_type in ['application/json', 'application/xml']):
            supported.append("text")
        
        if (mime_type.startswith('application/vnd.openxmlformats-officedocument') and 
            OFFICE_AVAILABLE):
            supported.append("text")
        
        return supported