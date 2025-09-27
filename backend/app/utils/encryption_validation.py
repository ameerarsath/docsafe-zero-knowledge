"""
Backend encryption validation utilities.

This module ensures consistent Base64 encoding and validation
for encryption data sent to the frontend.
"""

import base64
import binascii
import logging
from typing import Optional, Dict, Any, Tuple

logger = logging.getLogger(__name__)


class Base64ValidationError(Exception):
    """Custom exception for Base64 validation errors."""
    pass


class EncryptionDataValidator:
    """Validates and normalizes encryption data for frontend consumption."""

    @staticmethod
    def validate_base64(data: str, field_name: str = "data") -> bool:
        """
        Validate that a string is proper Base64.

        Args:
            data: The Base64 string to validate
            field_name: Name of the field for error messages

        Returns:
            True if valid Base64

        Raises:
            Base64ValidationError: If invalid Base64
        """
        if not data or not isinstance(data, str):
            raise Base64ValidationError(f"{field_name} must be a non-empty string")

        try:
            # Remove whitespace and validate format
            clean_data = data.strip()

            # Check for valid Base64 characters
            if not all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=' for c in clean_data):
                raise Base64ValidationError(f"{field_name} contains invalid Base64 characters")

            # Attempt to decode
            decoded = base64.b64decode(clean_data, validate=True)

            # Re-encode and compare to ensure round-trip consistency
            re_encoded = base64.b64encode(decoded).decode('utf-8')
            if re_encoded != clean_data:
                logger.warning(f"Base64 round-trip mismatch for {field_name}: {clean_data[:50]}... != {re_encoded[:50]}...")

            return True

        except (binascii.Error, ValueError) as e:
            raise Base64ValidationError(f"{field_name} is not valid Base64: {str(e)}")

    @staticmethod
    def normalize_base64(data: str, field_name: str = "data") -> str:
        """
        Normalize Base64 string by removing whitespace and ensuring proper padding.

        Args:
            data: The Base64 string to normalize
            field_name: Name of the field for error messages

        Returns:
            Normalized Base64 string
        """
        if not data:
            raise Base64ValidationError(f"{field_name} cannot be empty")

        # Remove all whitespace
        clean_data = ''.join(data.split())

        # Add padding if needed
        while len(clean_data) % 4:
            clean_data += '='

        # Validate the result
        EncryptionDataValidator.validate_base64(clean_data, field_name)

        return clean_data

    @staticmethod
    def ensure_binary_to_base64(data: bytes, field_name: str = "data") -> str:
        """
        Convert binary data to Base64 and validate.

        Args:
            data: Binary data to encode
            field_name: Name of the field for error messages

        Returns:
            Base64 encoded string
        """
        if not isinstance(data, bytes):
            raise Base64ValidationError(f"{field_name} must be bytes, got {type(data)}")

        if len(data) == 0:
            raise Base64ValidationError(f"{field_name} cannot be empty")

        try:
            encoded = base64.b64encode(data).decode('utf-8')

            # Validate round-trip
            decoded = base64.b64decode(encoded)
            if decoded != data:
                raise Base64ValidationError(f"{field_name} failed round-trip validation")

            return encoded

        except Exception as e:
            raise Base64ValidationError(f"Failed to encode {field_name} to Base64: {str(e)}")

    @staticmethod
    def validate_encryption_data(encryption_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Validate and normalize all encryption fields for frontend consumption.

        Args:
            encryption_data: Dictionary containing encryption fields

        Returns:
            Dictionary with validated and normalized Base64 fields

        Raises:
            Base64ValidationError: If any field is invalid
        """
        validated_data = {}

        # Required fields with their expected decoded lengths
        required_fields = {
            'encryption_iv': 12,  # 96 bits for GCM
            'encryption_auth_tag': 16,  # 128 bits for GCM
        }

        # Optional fields
        optional_fields = {
            'ciphertext': None,  # Variable length
            'encrypted_dek': None,  # Variable length
        }

        # Validate required fields
        for field_name, expected_length in required_fields.items():
            if field_name not in encryption_data:
                raise Base64ValidationError(f"Required field {field_name} is missing")

            value = encryption_data[field_name]

            # Handle both string and binary data
            if isinstance(value, bytes):
                if expected_length and len(value) != expected_length:
                    raise Base64ValidationError(
                        f"{field_name} has wrong length: expected {expected_length} bytes, got {len(value)}"
                    )
                validated_data[field_name] = EncryptionDataValidator.ensure_binary_to_base64(value, field_name)

            elif isinstance(value, str):
                normalized = EncryptionDataValidator.normalize_base64(value, field_name)

                # Check decoded length if specified
                if expected_length:
                    decoded = base64.b64decode(normalized)
                    if len(decoded) != expected_length:
                        raise Base64ValidationError(
                            f"{field_name} decoded to wrong length: expected {expected_length} bytes, got {len(decoded)}"
                        )

                validated_data[field_name] = normalized

            else:
                raise Base64ValidationError(f"{field_name} must be string or bytes, got {type(value)}")

        # Validate optional fields
        for field_name, expected_length in optional_fields.items():
            if field_name in encryption_data and encryption_data[field_name] is not None:
                value = encryption_data[field_name]

                if isinstance(value, bytes):
                    if len(value) == 0:
                        logger.warning(f"Optional field {field_name} is empty")
                        continue
                    validated_data[field_name] = EncryptionDataValidator.ensure_binary_to_base64(value, field_name)

                elif isinstance(value, str):
                    if not value.strip():
                        logger.warning(f"Optional field {field_name} is empty")
                        continue
                    validated_data[field_name] = EncryptionDataValidator.normalize_base64(value, field_name)

                else:
                    raise Base64ValidationError(f"{field_name} must be string or bytes, got {type(value)}")

        return validated_data

    @staticmethod
    def analyze_encryption_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze encryption data for debugging purposes.

        Args:
            data: Dictionary containing encryption fields

        Returns:
            Analysis results
        """
        analysis = {
            'timestamp': None,
            'fields_present': [],
            'field_lengths': {},
            'decoded_lengths': {},
            'validation_results': {},
            'issues': []
        }

        import datetime
        analysis['timestamp'] = datetime.datetime.now().isoformat()

        for field_name, value in data.items():
            if field_name.startswith('encryption_') or field_name == 'ciphertext':
                analysis['fields_present'].append(field_name)

                if isinstance(value, str):
                    analysis['field_lengths'][field_name] = len(value)

                    try:
                        # Try to validate and get decoded length
                        normalized = EncryptionDataValidator.normalize_base64(value, field_name)
                        decoded = base64.b64decode(normalized)
                        analysis['decoded_lengths'][field_name] = len(decoded)
                        analysis['validation_results'][field_name] = 'valid'

                        # Check for potential truncation
                        if field_name == 'ciphertext' and len(decoded) < 32:
                            analysis['issues'].append(f"{field_name} suspiciously short ({len(decoded)} bytes)")
                        elif field_name == 'encryption_iv' and len(decoded) != 12:
                            analysis['issues'].append(f"{field_name} wrong length ({len(decoded)} bytes, expected 12)")
                        elif field_name == 'encryption_auth_tag' and len(decoded) != 16:
                            analysis['issues'].append(f"{field_name} wrong length ({len(decoded)} bytes, expected 16)")

                    except Exception as e:
                        analysis['validation_results'][field_name] = f'invalid: {str(e)}'
                        analysis['issues'].append(f"{field_name} validation failed: {str(e)}")

                elif isinstance(value, bytes):
                    analysis['field_lengths'][field_name] = f"{len(value)} bytes"
                    analysis['decoded_lengths'][field_name] = len(value)
                    analysis['validation_results'][field_name] = 'binary'

                elif value is None:
                    analysis['validation_results'][field_name] = 'null'
                    analysis['issues'].append(f"{field_name} is None")

                else:
                    analysis['validation_results'][field_name] = f'unexpected_type: {type(value)}'
                    analysis['issues'].append(f"{field_name} has unexpected type: {type(value)}")

        return analysis


def validate_document_encryption_response(document_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and normalize encryption data for a document API response.

    Args:
        document_data: Document data dictionary

    Returns:
        Validated document data with normalized encryption fields
    """
    try:
        # Extract encryption fields
        encryption_fields = {}
        for field in ['encryption_iv', 'encryption_auth_tag', 'ciphertext', 'encrypted_dek']:
            if field in document_data:
                encryption_fields[field] = document_data[field]

        if encryption_fields:
            # Validate and normalize
            validated_encryption = EncryptionDataValidator.validate_encryption_data(encryption_fields)

            # Update document data with validated fields
            document_data.update(validated_encryption)

            logger.info(f"Validated encryption data for document {document_data.get('id', 'unknown')}")

        return document_data

    except Base64ValidationError as e:
        logger.error(f"Encryption validation failed for document {document_data.get('id', 'unknown')}: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error validating document encryption data: {str(e)}")
        raise Base64ValidationError(f"Encryption validation failed: {str(e)}")


def debug_encryption_data(document_id: int, data: Dict[str, Any]) -> None:
    """
    Log detailed analysis of encryption data for debugging.

    Args:
        document_id: Document ID for logging
        data: Encryption data to analyze
    """
    try:
        analysis = EncryptionDataValidator.analyze_encryption_data(data)

        logger.info(f"Encryption data analysis for document {document_id}:")
        logger.info(f"  Fields present: {analysis['fields_present']}")
        logger.info(f"  Field lengths: {analysis['field_lengths']}")
        logger.info(f"  Decoded lengths: {analysis['decoded_lengths']}")
        logger.info(f"  Validation results: {analysis['validation_results']}")

        if analysis['issues']:
            logger.warning(f"  Issues found: {analysis['issues']}")
        else:
            logger.info("  No issues detected")

    except Exception as e:
        logger.error(f"Failed to analyze encryption data for document {document_id}: {str(e)}")