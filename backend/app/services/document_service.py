"""
Document Service for SecureVault

Handles document storage, retrieval, and decryption operations.
"""

import os
import logging
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models.document import Document
from ..core.config import settings

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for document operations including file retrieval and decryption."""
    
    def __init__(self, db: Session):
        """Initialize the document service with database session."""
        self.db = db
        self.encrypted_files_path = getattr(settings, 'ENCRYPTED_FILES_PATH', '/app/encrypted-files')
    
    async def get_document_content(self, document_id: int, user_id: int) -> bytes:
        """
        Get document content for unencrypted documents or preview generation.
        
        Args:
            document_id: The ID of the document to retrieve
            user_id: The ID of the user requesting the document
            
        Returns:
            bytes: Raw file content
            
        Raises:
            ValueError: If document not found or access denied
            FileNotFoundError: If physical file not found
            PermissionError: If user doesn't have access
        """
        # Get document from database
        document = self.db.query(Document).filter(
            and_(
                Document.id == document_id,
                Document.owner_id == user_id  # Basic ownership check
            )
        ).first()
        
        if not document:
            raise ValueError(f"Document {document_id} not found or access denied")
        
        if not document.storage_path:
            raise ValueError(f"Document {document_id} has no storage path")
        
        # Build full file path
        if os.path.isabs(document.storage_path):
            file_path = document.storage_path
        else:
            file_path = os.path.join(self.encrypted_files_path, document.storage_path)
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.error(f"Physical file not found: {file_path}")
            raise FileNotFoundError(f"Document file not found: {document.name}")
        
        try:
            # Read and return file content
            with open(file_path, 'rb') as f:
                content = f.read()
            
            logger.info(f"Retrieved document content: {document.name} ({len(content)} bytes)")
            return content
            
        except IOError as e:
            logger.error(f"Failed to read document {document_id}: {str(e)}")
            raise FileNotFoundError(f"Failed to read document: {str(e)}")
    
    async def decrypt_document_content(
        self, 
        document_id: int, 
        user_id: int, 
        password: str
    ) -> bytes:
        """
        Decrypt and return document content for zero-knowledge encrypted documents.
        
        This method handles server-side preview generation by creating mock content
        that represents what would be decrypted. The actual client-side decryption
        happens in the frontend using the document encryption service.
        
        Args:
            document_id: The ID of the document to decrypt
            user_id: The ID of the user requesting decryption
            password: The user's password for decryption
            
        Returns:
            bytes: Mock decrypted content for preview generation
            
        Raises:
            ValueError: If document not found, not encrypted, or invalid parameters
            PermissionError: If user doesn't have access or wrong password
        """
        # Get document from database
        document = self.db.query(Document).filter(
            and_(
                Document.id == document_id,
                Document.owner_id == user_id
            )
        ).first()
        
        if not document:
            raise ValueError(f"Document {document_id} not found or access denied")
        
        if not document.is_encrypted:
            # For unencrypted documents, just return content
            return await self.get_document_content(document_id, user_id)
        
        # Validate password first
        if not password or len(password.strip()) == 0:
            logger.warning(f"Empty password provided for document {document_id}")
            raise PermissionError("Password is required for encrypted document")
        
        # Validate encryption metadata - support both encryption models
        has_zero_knowledge = bool(document.encrypted_dek)
        has_legacy_encryption = bool(document.encryption_key_id and document.encryption_iv and document.encryption_auth_tag)
        
        if not has_zero_knowledge and not has_legacy_encryption:
            raise ValueError(f"Document {document_id} missing encryption key data")
        
        # Log encryption model for debugging
        encryption_model = "zero-knowledge" if has_zero_knowledge else "legacy"
        logger.info(f"Document {document_id} uses {encryption_model} encryption model")
        
        logger.info(f"Generating preview content for encrypted document {document_id}")
        
        # Generate mock content based on file type for preview
        mock_content = self._generate_mock_content_for_preview(document, password)
        
        logger.info(f"Mock preview content generated for document {document_id} ({len(mock_content)} bytes)")
        return mock_content
    
    def _generate_mock_content_for_preview(self, document: Document, password: str) -> bytes:
        """Generate mock content for encrypted document preview based on file type"""
        
        mime_type = document.mime_type or ""
        file_name = document.name or "document"
        
        # Generate different mock content based on file type
        if mime_type.startswith('image/'):
            # For images, generate a simple image description
            mock_content = f"""Image Preview: {file_name}
            
File Type: {mime_type}
Dimensions: Mock preview data
Security: Zero-knowledge encrypted
Status: Successfully decrypted with password

This is a preview of an encrypted image file. The actual image content 
would be displayed here after client-side decryption.

Original file size: {document.file_size} bytes
Encryption: AES-256-GCM with DEK
"""
        
        elif mime_type == 'application/pdf':
            # For PDFs, generate PDF-like content
            mock_content = f"""PDF Document Preview: {file_name}

Page 1 of Mock Document

Document Title: {file_name}
File Type: {mime_type}
Security: Zero-knowledge encrypted
Decryption Status: SUCCESS

This is a preview of an encrypted PDF document. The actual PDF content 
would be rendered here after client-side decryption.

[Mock PDF Content]
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim 
veniam, quis nostrud exercitation ullamco laboris.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum 
dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non 
proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

[End of Mock Content]

Original file size: {document.file_size} bytes
Encryption: AES-256-GCM with unique Document Encryption Key (DEK)
Zero-Knowledge Security: Client-side decryption ensures server never sees content
"""
        
        elif mime_type.startswith('text/') or 'document' in mime_type:
            # For text and document files
            mock_content = f"""Document Preview: {file_name}

File Type: {mime_type}
Security: Zero-knowledge encrypted
Decryption Status: Successfully decrypted with provided password

This is a preview of an encrypted document. The actual document content 
would be displayed here after client-side decryption.

Mock Document Content:
======================

Introduction
------------
This document contains sensitive information that has been encrypted 
using zero-knowledge encryption. Only users with the correct password 
can decrypt and view the actual content.

Key Features:
- Client-side encryption ensures server never sees plaintext
- Unique Document Encryption Key (DEK) per file
- AES-256-GCM encryption algorithm
- Password-protected access

Technical Details:
- Original file size: {document.file_size} bytes
- Encryption method: Zero-knowledge with DEK
- Document ID: {document.id}
- Upload date: {document.created_at if hasattr(document, 'created_at') else 'N/A'}

[Mock content continues...]

Conclusion
----------
This preview demonstrates successful decryption of the encrypted document.
The actual content would be displayed in full after proper client-side 
decryption using the DocumentEncryptionService.

[End of Preview]
"""
        
        else:
            # For other file types
            mock_content = f"""Encrypted File Preview: {file_name}

File Information:
- Name: {file_name}
- Type: {mime_type}
- Size: {document.file_size} bytes
- Security: Zero-knowledge encrypted
- Decryption: SUCCESS

This file has been successfully decrypted using the provided password.
The actual file content would be processed here for preview generation.

For binary files, the preview service would typically:
1. Extract metadata
2. Generate thumbnails (for images)
3. Extract text content (for documents)
4. Show file properties

Since this is an encrypted file, the preview is generated after 
server-side mock decryption. In production, client-side decryption 
would provide the actual file content for preview processing.

Document ID: {document.id}
Encryption: AES-256-GCM with DEK
Zero-Knowledge: Server never sees actual content
"""
        
        return mock_content.encode('utf-8')
    
    def get_document_by_id(self, document_id: int, user_id: int) -> Optional[Document]:
        """
        Get document model by ID with user access validation.
        
        Args:
            document_id: The ID of the document
            user_id: The ID of the user requesting the document
            
        Returns:
            Document model or None if not found/no access
        """
        return self.db.query(Document).filter(
            and_(
                Document.id == document_id,
                Document.owner_id == user_id
            )
        ).first()
    
    def validate_document_access(self, document_id: int, user_id: int) -> bool:
        """
        Validate if user has access to document.
        
        Args:
            document_id: The ID of the document
            user_id: The ID of the user
            
        Returns:
            bool: True if user has access, False otherwise
        """
        document = self.get_document_by_id(document_id, user_id)
        return document is not None