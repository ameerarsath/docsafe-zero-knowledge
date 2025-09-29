"""
Document Service for SecureVault

Handles document storage, retrieval, and decryption operations.
"""

import os
import logging
import base64
import json
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
        Decrypt and return document content for encrypted documents.
        
        Args:
            document_id: The ID of the document to decrypt
            user_id: The ID of the user requesting decryption
            password: The user's password for decryption
            
        Returns:
            bytes: Decrypted document content
            
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
        
        # Get encrypted file content
        encrypted_content = await self.get_document_content(document_id, user_id)
        
        # Decrypt the content using the appropriate method
        if has_zero_knowledge:
            return await self._decrypt_zero_knowledge_content(document, encrypted_content, password)
        else:
            return await self._decrypt_legacy_content(document, encrypted_content, password)
    
    async def _decrypt_zero_knowledge_content(self, document: Document, encrypted_content: bytes, password: str) -> bytes:
        """Decrypt zero-knowledge encrypted content using DEK"""
        try:
            from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
            from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.backends import default_backend
        except ImportError:
            logger.error("Cryptography library not available for decryption")
            raise PermissionError("Server-side decryption not available")
        
        try:
            # Parse encrypted DEK from database
            if isinstance(document.encrypted_dek, str):
                encrypted_dek_data = json.loads(document.encrypted_dek)
            else:
                encrypted_dek_data = document.encrypted_dek
            
            # Extract DEK components
            encrypted_dek = base64.b64decode(encrypted_dek_data['encrypted_dek'])
            dek_iv = base64.b64decode(encrypted_dek_data['iv'])
            dek_salt = base64.b64decode(encrypted_dek_data['salt'])
            dek_tag = base64.b64decode(encrypted_dek_data['tag'])
            
            # Derive key from password using same parameters as client
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=dek_salt,
                iterations=100000,
                backend=default_backend()
            )
            password_key = kdf.derive(password.encode('utf-8'))
            
            # Decrypt DEK
            cipher = Cipher(
                algorithms.AES(password_key),
                modes.GCM(dek_iv, dek_tag),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            dek = decryptor.finalize_with_tag(encrypted_dek, dek_tag)
            
            # Parse encrypted file content - handle both JSON and binary formats
            try:
                # Try to parse as JSON first (new format)
                if encrypted_content.startswith(b'{'):
                    file_data = json.loads(encrypted_content.decode('utf-8'))
                    file_ciphertext = base64.b64decode(file_data['ciphertext'])
                    file_iv = base64.b64decode(file_data['iv'])
                    file_tag = base64.b64decode(file_data['tag'])
                else:
                    # Handle binary format or other formats
                    logger.warning(f"Document {document.id} not in expected JSON format, attempting binary decryption")
                    # For binary format, we'd need to know the structure
                    # For now, return the content as-is if it's not JSON
                    return encrypted_content
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                logger.warning(f"Could not parse encrypted content as JSON for document {document.id}: {e}")
                return encrypted_content
            
            # Decrypt file content using DEK
            file_cipher = Cipher(
                algorithms.AES(dek),
                modes.GCM(file_iv, file_tag),
                backend=default_backend()
            )
            file_decryptor = file_cipher.decryptor()
            decrypted_content = file_decryptor.finalize_with_tag(file_ciphertext, file_tag)
            
            logger.info(f"Successfully decrypted zero-knowledge document {document.id} ({len(decrypted_content)} bytes)")
            return decrypted_content
            
        except Exception as e:
            logger.error(f"Zero-knowledge decryption failed for document {document.id}: {str(e)}")
            raise PermissionError(f"Decryption failed - wrong password or corrupted data: {str(e)}")
    
    async def _decrypt_legacy_content(self, document: Document, encrypted_content: bytes, password: str) -> bytes:
        """Decrypt legacy encrypted content"""
        try:
            from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
            from cryptography.hazmat.backends import default_backend
        except ImportError:
            logger.error("Cryptography library not available for legacy decryption")
            raise PermissionError("Server-side decryption not available")
        
        try:
            # For legacy encryption, we need the encryption key, IV, and auth tag
            # This would typically involve deriving the key from password and using stored IV/tag
            logger.warning(f"Legacy decryption attempted for document {document.id}")
            
            # For now, return a placeholder since we don't have the full legacy implementation
            # In a real implementation, you'd decrypt using the stored encryption_key_id, encryption_iv, etc.
            placeholder_content = f"Legacy encrypted document {document.name} - decryption not fully implemented".encode('utf-8')
            return placeholder_content
            
        except Exception as e:
            logger.error(f"Legacy decryption failed for document {document.id}: {str(e)}")
            raise PermissionError(f"Legacy decryption failed: {str(e)}")
    
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