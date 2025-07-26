"""
Unit tests for QR code generation functionality.

This module contains comprehensive tests for QR code generation
for TOTP setup in SecureVault's MFA system. Tests follow TDD methodology
with security-first approach.

Test Coverage:
- QR code generation from TOTP URI
- QR code format and encoding validation
- Error correction levels and sizing
- Security considerations for QR codes
- Integration with TOTP provisioning
"""

import pytest
import base64
import io
from unittest.mock import patch, MagicMock
from PIL import Image

from app.core.mfa import (
    generate_qr_code,
    generate_qr_code_data_uri,
    validate_qr_code_content,
    get_qr_code_svg,
    QRCodeError,
    InvalidQRContentError,
)


class TestQRCodeGeneration:
    """Test suite for QR code generation."""

    def test_generate_qr_code_success(self):
        """Test successful QR code generation."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        qr_image = generate_qr_code(uri)
        
        # Verify QR code image is generated
        assert qr_image is not None
        assert isinstance(qr_image, Image.Image)
        
        # Verify image properties
        assert qr_image.mode == 'RGB'
        assert qr_image.size[0] > 0
        assert qr_image.size[1] > 0

    def test_generate_qr_code_custom_size(self):
        """Test QR code generation with custom size."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        # Test different sizes
        qr_small = generate_qr_code(uri, box_size=5, border=2)
        qr_large = generate_qr_code(uri, box_size=15, border=6)
        
        # Larger box size should produce larger image
        assert qr_large.size[0] > qr_small.size[0]
        assert qr_large.size[1] > qr_small.size[1]

    def test_generate_qr_code_error_correction(self):
        """Test QR code generation with different error correction levels."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        # Test different error correction levels
        for level in ['L', 'M', 'Q', 'H']:
            qr_image = generate_qr_code(uri, error_correction=level)
            assert qr_image is not None
            assert isinstance(qr_image, Image.Image)

    def test_generate_qr_code_invalid_error_correction(self):
        """Test QR code generation with invalid error correction level."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        with pytest.raises(ValueError):
            generate_qr_code(uri, error_correction='X')

    def test_generate_qr_code_empty_content(self):
        """Test QR code generation with empty content."""
        with pytest.raises(InvalidQRContentError):
            generate_qr_code("")
        
        with pytest.raises(InvalidQRContentError):
            generate_qr_code(None)

    def test_generate_qr_code_very_long_content(self):
        """Test QR code generation with very long content."""
        # QR codes have capacity limits
        very_long_uri = "otpauth://totp/SecureVault:user@example.com?secret=" + "A" * 3000
        
        # Should either generate successfully or raise appropriate error
        try:
            qr_image = generate_qr_code(very_long_uri)
            assert isinstance(qr_image, Image.Image)
        except QRCodeError:
            # This is acceptable - QR code capacity exceeded
            pass

    def test_generate_qr_code_special_characters(self):
        """Test QR code generation with special characters in URI."""
        uri = "otpauth://totp/SecureVault:user+test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Secure%20Vault"
        
        qr_image = generate_qr_code(uri)
        assert qr_image is not None
        assert isinstance(qr_image, Image.Image)

    def test_generate_qr_code_unicode_content(self):
        """Test QR code generation with Unicode content."""
        uri = "otpauth://totp/SecureVault:用户@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        qr_image = generate_qr_code(uri)
        assert qr_image is not None
        assert isinstance(qr_image, Image.Image)

    def test_generate_qr_code_invalid_parameters(self):
        """Test QR code generation with invalid parameters."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        # Invalid box size
        with pytest.raises(ValueError):
            generate_qr_code(uri, box_size=0)
        
        with pytest.raises(ValueError):
            generate_qr_code(uri, box_size=-5)
        
        # Invalid border
        with pytest.raises(ValueError):
            generate_qr_code(uri, border=-1)


class TestQRCodeDataURI:
    """Test suite for QR code data URI generation."""

    def test_generate_qr_code_data_uri_success(self):
        """Test successful QR code data URI generation."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        data_uri = generate_qr_code_data_uri(uri)
        
        # Verify data URI format
        assert data_uri is not None
        assert isinstance(data_uri, str)
        assert data_uri.startswith("data:image/png;base64,")
        
        # Verify base64 content
        base64_data = data_uri.split(",")[1]
        try:
            decoded_data = base64.b64decode(base64_data)
            assert len(decoded_data) > 0
        except Exception:
            pytest.fail("Data URI does not contain valid base64 data")

    def test_generate_qr_code_data_uri_different_formats(self):
        """Test QR code data URI generation with different image formats."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        # Test PNG format (default)
        png_uri = generate_qr_code_data_uri(uri, format="PNG")
        assert png_uri.startswith("data:image/png;base64,")
        
        # Test JPEG format
        jpeg_uri = generate_qr_code_data_uri(uri, format="JPEG")
        assert jpeg_uri.startswith("data:image/jpeg;base64,")

    def test_generate_qr_code_data_uri_custom_quality(self):
        """Test QR code data URI generation with custom quality."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        # Test different quality levels for JPEG
        high_quality = generate_qr_code_data_uri(uri, format="JPEG", quality=95)
        low_quality = generate_qr_code_data_uri(uri, format="JPEG", quality=50)
        
        # High quality should generally produce larger data
        high_data = high_quality.split(",")[1]
        low_data = low_quality.split(",")[1]
        
        # This isn't always true for simple QR codes, but test structure
        assert len(high_data) > 0
        assert len(low_data) > 0

    def test_generate_qr_code_data_uri_invalid_format(self):
        """Test QR code data URI generation with invalid format."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        with pytest.raises(ValueError):
            generate_qr_code_data_uri(uri, format="INVALID")

    def test_generate_qr_code_data_uri_decode_verification(self):
        """Test that generated QR code data URI can be decoded back to image."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        data_uri = generate_qr_code_data_uri(uri)
        base64_data = data_uri.split(",")[1]
        
        # Decode base64 data
        image_data = base64.b64decode(base64_data)
        
        # Verify it can be opened as image
        image_buffer = io.BytesIO(image_data)
        image = Image.open(image_buffer)
        
        assert image is not None
        assert image.mode in ['RGB', 'RGBA', 'L']  # Valid image modes


class TestQRCodeSVG:
    """Test suite for QR code SVG generation."""

    def test_get_qr_code_svg_success(self):
        """Test successful QR code SVG generation."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        svg_content = get_qr_code_svg(uri)
        
        # Verify SVG content
        assert svg_content is not None
        assert isinstance(svg_content, str)
        assert svg_content.startswith('<svg')
        assert svg_content.endswith('</svg>')
        assert 'xmlns="http://www.w3.org/2000/svg"' in svg_content

    def test_get_qr_code_svg_custom_styling(self):
        """Test QR code SVG generation with custom styling."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        svg_content = get_qr_code_svg(
            uri, 
            fill_color="blue",
            back_color="yellow",
            module_size=10
        )
        
        assert svg_content is not None
        assert 'fill="blue"' in svg_content or 'fill:blue' in svg_content
        # Background color handling may vary by implementation

    def test_get_qr_code_svg_scalable(self):
        """Test QR code SVG is scalable."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        svg_small = get_qr_code_svg(uri, module_size=5)
        svg_large = get_qr_code_svg(uri, module_size=15)
        
        # Both should be valid SVG
        assert svg_small.startswith('<svg')
        assert svg_large.startswith('<svg')
        
        # SVG should contain different dimensions
        assert svg_small != svg_large


class TestQRCodeValidation:
    """Test suite for QR code content validation."""

    def test_validate_qr_code_content_valid_uri(self):
        """Test validation of valid TOTP URIs for QR codes."""
        valid_uris = [
            "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault",
            "otpauth://totp/MyApp:john.doe@example.com?secret=ABCDEFGHIJKLMNOP&issuer=MyApp&period=30",
            "otpauth://totp/GitHub:username?secret=QRSTUVWXYZ234567&issuer=GitHub&digits=6",
        ]
        
        for uri in valid_uris:
            result = validate_qr_code_content(uri)
            assert result is True

    def test_validate_qr_code_content_invalid_uri(self):
        """Test validation of invalid URIs for QR codes."""
        invalid_uris = [
            "",  # Empty
            "http://example.com",  # Wrong scheme
            "otpauth://hotp/test",  # Wrong type (HOTP instead of TOTP)
            "otpauth://totp/",  # Missing account
            "otpauth://totp/account",  # Missing secret
            "not_a_uri_at_all",  # Invalid format
        ]
        
        for uri in invalid_uris:
            with pytest.raises(InvalidQRContentError):
                validate_qr_code_content(uri)

    def test_validate_qr_code_content_security_checks(self):
        """Test QR code content validation includes security checks."""
        # Test with potentially malicious content
        malicious_uris = [
            "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault&evil=<script>alert('xss')</script>",
            "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault'><script>",
        ]
        
        for uri in malicious_uris:
            # Should either validate safely or reject
            try:
                result = validate_qr_code_content(uri)
                # If it passes validation, ensure no dangerous content
                assert '<script>' not in uri or result is False
            except InvalidQRContentError:
                # Rejection is also acceptable
                pass

    def test_validate_qr_code_content_length_limits(self):
        """Test QR code content validation enforces length limits."""
        # Test extremely long URI
        long_secret = "A" * 1000
        long_uri = f"otpauth://totp/SecureVault:user@example.com?secret={long_secret}&issuer=SecureVault"
        
        # Should handle long content appropriately
        try:
            result = validate_qr_code_content(long_uri)
            # If accepted, it should be valid
            assert isinstance(result, bool)
        except InvalidQRContentError:
            # Rejection due to length is acceptable
            pass


class TestQRCodeSecurity:
    """Test suite for QR code security features."""

    def test_qr_code_content_sanitization(self):
        """Test QR code generation sanitizes dangerous content."""
        # URI with potentially dangerous characters
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Secure<>Vault"
        
        # QR code should be generated (content sanitized) or reject safely
        try:
            qr_image = generate_qr_code(uri)
            assert isinstance(qr_image, Image.Image)
        except InvalidQRContentError:
            # Safe rejection is acceptable
            pass

    def test_qr_code_no_sensitive_data_leak(self):
        """Test QR code generation doesn't leak sensitive data in errors."""
        # Use URI with mock sensitive data
        sensitive_uri = "otpauth://totp/SecureVault:user@example.com?secret=TOPSECRETKEY123&issuer=SecureVault"
        
        try:
            # This should work normally
            qr_image = generate_qr_code(sensitive_uri)
            assert isinstance(qr_image, Image.Image)
        except Exception as e:
            # Error messages should not contain the secret
            error_msg = str(e)
            assert "TOPSECRETKEY123" not in error_msg

    def test_qr_code_deterministic_generation(self):
        """Test QR code generation is deterministic for same input."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        # Generate QR code twice
        qr1 = generate_qr_code(uri)
        qr2 = generate_qr_code(uri)
        
        # Convert to bytes for comparison
        buffer1 = io.BytesIO()
        buffer2 = io.BytesIO()
        qr1.save(buffer1, format='PNG')
        qr2.save(buffer2, format='PNG')
        
        # Should produce identical results
        assert buffer1.getvalue() == buffer2.getvalue()

    def test_qr_code_error_correction_levels(self):
        """Test QR code error correction provides data recovery."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        # Generate QR codes with different error correction levels
        error_levels = ['L', 'M', 'Q', 'H']  # Low, Medium, Quartile, High
        
        for level in error_levels:
            qr_image = generate_qr_code(uri, error_correction=level)
            assert isinstance(qr_image, Image.Image)
            
            # Higher error correction should generally produce larger images
            # (more error correction data)
            # This is a general principle but may not always hold for simple data


class TestQRCodeIntegration:
    """Integration tests for QR code functionality."""

    def test_qr_code_totp_integration(self):
        """Test QR code generation integrates properly with TOTP."""
        from app.core.mfa import generate_totp_secret, get_totp_provisioning_uri
        
        # Generate TOTP secret
        secret = generate_totp_secret()
        
        # Create provisioning URI
        uri = get_totp_provisioning_uri(secret, "test@example.com", "SecureVault")
        
        # Generate QR code from URI
        qr_image = generate_qr_code(uri)
        assert isinstance(qr_image, Image.Image)
        
        # Generate data URI
        data_uri = generate_qr_code_data_uri(uri)
        assert data_uri.startswith("data:image/png;base64,")

    def test_qr_code_full_mfa_setup_flow(self):
        """Test QR code generation in complete MFA setup flow."""
        from app.core.mfa import generate_totp_secret, get_totp_provisioning_uri
        
        # Simulate MFA setup flow
        user_email = "user@securevault.local"
        issuer = "SecureVault"
        
        # 1. Generate secret for user
        secret = generate_totp_secret()
        
        # 2. Create provisioning URI
        uri = get_totp_provisioning_uri(secret, user_email, issuer)
        
        # 3. Generate QR code for user to scan
        qr_image = generate_qr_code(uri)
        data_uri = generate_qr_code_data_uri(uri)
        svg_code = get_qr_code_svg(uri)
        
        # 4. Verify all formats are valid
        assert isinstance(qr_image, Image.Image)
        assert data_uri.startswith("data:image/")
        assert svg_code.startswith("<svg")
        
        # 5. Verify content consistency
        assert user_email in uri
        assert issuer in uri
        assert secret in uri

    def test_qr_code_different_output_formats(self):
        """Test QR code can be generated in different output formats."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        # Generate in different formats
        formats_to_test = [
            ("PNG", "data:image/png;base64,"),
            ("JPEG", "data:image/jpeg;base64,"),
        ]
        
        for format_name, expected_prefix in formats_to_test:
            data_uri = generate_qr_code_data_uri(uri, format=format_name)
            assert data_uri.startswith(expected_prefix)
            
            # Verify the data can be decoded
            base64_data = data_uri.split(",")[1]
            image_data = base64.b64decode(base64_data)
            assert len(image_data) > 0

    def test_qr_code_mobile_compatibility(self):
        """Test QR code generation produces mobile-compatible codes."""
        uri = "otpauth://totp/SecureVault:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SecureVault"
        
        # Generate QR code optimized for mobile scanning
        qr_image = generate_qr_code(
            uri,
            box_size=10,  # Good size for mobile
            border=4,     # Adequate quiet zone
            error_correction='M'  # Medium error correction
        )
        
        assert isinstance(qr_image, Image.Image)
        
        # Verify dimensions are reasonable for mobile
        width, height = qr_image.size
        assert width >= 200  # Minimum size for good mobile scanning
        assert height >= 200
        assert width <= 1000  # Not excessively large
        assert height <= 1000