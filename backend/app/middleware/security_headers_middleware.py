"""
Enhanced security headers middleware for SecureVault.

This middleware provides comprehensive security headers including:
- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)  
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
- Cache-Control for sensitive endpoints
"""

import logging
from typing import Dict, Optional, List
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from ..core.config import settings

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """FIXED: Enhanced middleware with HMAC validation and strict headers."""
    
    def __init__(self, app, config: Optional[Dict] = None):
        super().__init__(app)
        self.config = config or {}
        self.environment = settings.ENVIRONMENT
        self.is_production = self.environment == "production"
        self.hmac_secret = settings.HMAC_SECRET_KEY if hasattr(settings, 'HMAC_SECRET_KEY') else "your-secret-key"
        self.disable_hmac = self.config.get("disable_hmac", False)  # FIXED: Allow disabling HMAC
        
        # Configure CSP based on environment
        self.csp_policy = self._build_csp_policy()
        
    def _build_csp_policy(self) -> str:
        """Build Content Security Policy based on environment."""
        # Base CSP policy
        base_policy = {
            "default-src": ["'self'"],
            "script-src": [
                "'self'",
                "'unsafe-inline'" if not self.is_production else "'self'",
                "https://cdnjs.cloudflare.com",
                "https://unpkg.com",
                # Add specific domains for production
            ],
            "style-src": [
                "'self'",
                "'unsafe-inline'",  # Required for CSS-in-JS frameworks
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com"
            ],
            "img-src": [
                "'self'",
                "data:",  # For base64 images
                "blob:",  # For generated images
                "https:"  # Allow HTTPS images
            ],
            "font-src": [
                "'self'",
                "https://fonts.gstatic.com",
                "data:"  # For inline fonts
            ],
            "connect-src": [
                "'self'",
                # Add your API domains
                "http://localhost:8002" if not self.is_production else "'self'",
                "ws://localhost:3005" if not self.is_production else "'self'",  # WebSocket for HMR
                "wss://localhost:3005" if not self.is_production else "'self'"
            ],
            "media-src": ["'self'"],
            "object-src": ["'none'"],
            "base-uri": ["'self'"],
            "frame-ancestors": ["'none'"],
            "form-action": ["'self'"],
            "upgrade-insecure-requests": [] if self.is_production else None,
            "block-all-mixed-content": [] if self.is_production else None
        }
        
        # Build CSP string
        csp_parts = []
        for directive, sources in base_policy.items():
            if sources is not None:
                if sources:  # Has sources
                    csp_parts.append(f"{directive} {' '.join(sources)}")
                else:  # Empty list means directive without sources
                    csp_parts.append(directive)
        
        return "; ".join(csp_parts)
    
    def _get_security_headers(self, request: Request, response: Response) -> Dict[str, str]:
        """Get security headers based on request and response."""
        headers = {}
        
        # HSTS - HTTP Strict Transport Security
        if self.is_production or request.url.scheme == "https":
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Content Security Policy
        headers["Content-Security-Policy"] = self.csp_policy
        
        # X-Frame-Options - Prevent clickjacking
        headers["X-Frame-Options"] = "DENY"
        
        # X-Content-Type-Options - Prevent MIME sniffing
        headers["X-Content-Type-Options"] = "nosniff"
        
        # X-XSS-Protection - Enable XSS filtering
        headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer Policy - Control referrer information
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy - Control browser features
        permissions = [
            "geolocation=()",
            "microphone=()",
            "camera=()",
            "payment=()",
            "usb=()",
            "vr=()",
            "accelerometer=()",
            "gyroscope=()",
            "magnetometer=()",
            "ambient-light-sensor=()",
            "autoplay=()",
            "encrypted-media=(self)",
            "fullscreen=(self)",
            "picture-in-picture=()"
        ]
        headers["Permissions-Policy"] = ", ".join(permissions)
        
        # Cache Control for sensitive endpoints
        path = request.url.path
        if self._is_sensitive_endpoint(path):
            headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            headers["Pragma"] = "no-cache"
            headers["Expires"] = "0"
        
        # Cross-Origin headers
        headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        headers["Cross-Origin-Opener-Policy"] = "same-origin"
        headers["Cross-Origin-Resource-Policy"] = "same-origin"
        
        # Server header removal/modification
        headers["Server"] = "SecureVault"
        
        # FIXED: Add missing security headers
        headers["X-Permitted-Cross-Domain-Policies"] = "none"
        headers["X-Download-Options"] = "noopen"
        headers["Expect-CT"] = "max-age=86400, enforce" if self.is_production else "max-age=0"
        
        return headers
    
    async def _validate_hmac(self, request: Request) -> bool:
        """FIXED: Validate HMAC signature for API requests."""
        try:
            import hmac
            import hashlib
            import time
            
            # Get HMAC components from headers
            signature = request.headers.get("X-HMAC-Signature")
            timestamp = request.headers.get("X-Timestamp")
            nonce = request.headers.get("X-Nonce")
            
            if not all([signature, timestamp, nonce]):
                return False
            
            # Check timestamp (prevent replay attacks)
            try:
                request_time = int(timestamp)
                current_time = int(time.time())
                if abs(current_time - request_time) > 300:  # 5 minute window
                    return False
            except ValueError:
                return False
            
            # Get request body
            body = await request.body()
            
            # Create message to sign
            message = f"{request.method}|{request.url.path}|{timestamp}|{nonce}|{body.decode('utf-8') if body else ''}"
            
            # Calculate expected signature
            expected_signature = hmac.new(
                self.hmac_secret.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures (constant time)
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            logger.error(f"HMAC validation error: {e}")
            return False
    
    def _generate_response_hmac(self, response: Response) -> str:
        """FIXED: Generate HMAC signature for response."""
        try:
            import hmac
            import hashlib
            import time
            
            timestamp = str(int(time.time()))
            
            # Create message from response
            message = f"{response.status_code}|{timestamp}"
            
            # Generate signature
            signature = hmac.new(
                self.hmac_secret.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            return f"{signature}:{timestamp}"
            
        except Exception as e:
            logger.error(f"Response HMAC generation error: {e}")
            return "error"
    
    def _is_sensitive_endpoint(self, path: str) -> bool:
        """Check if endpoint contains sensitive data."""
        sensitive_patterns = [
            "/api/auth/",
            "/api/v1/users/",
            "/api/v1/mfa/",
            "/api/v1/encryption/",
            "/api/v1/admin/",
            "/api/v1/security/",
            "/api/v1/documents/",
            "/api/v1/rbac/"
        ]
        return any(pattern in path for pattern in sensitive_patterns)
    
    async def dispatch(self, request: Request, call_next):
        """FIXED: Add HMAC validation and enhanced security headers."""
        try:
            # FIXED: Only validate HMAC if not disabled (for debugging)
            if (not self.disable_hmac and 
                self._is_sensitive_endpoint(request.url.path) and 
                request.method in ["POST", "PUT", "DELETE"]):
                if not await self._validate_hmac(request):
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Invalid HMAC signature", "error_code": "INVALID_HMAC"}
                    )
            
            # Process the request
            response = await call_next(request)
            
            # Add security headers
            security_headers = self._get_security_headers(request, response)
            
            for header_name, header_value in security_headers.items():
                response.headers[header_name] = header_value
            
            # Add HMAC signature to response for API endpoints
            if request.url.path.startswith("/api/"):
                response.headers["X-HMAC-Signature"] = self._generate_response_hmac(response)
            
            return response
            
        except Exception as e:
            logger.error(f"Error in security headers middleware: {e}")
            return await call_next(request)


class HSTSMiddleware(BaseHTTPMiddleware):
    """Dedicated HSTS middleware for additional security."""
    
    def __init__(self, app, max_age: int = 31536000, include_subdomains: bool = True, preload: bool = True):
        super().__init__(app)
        self.max_age = max_age
        self.include_subdomains = include_subdomains
        self.preload = preload
        
        # Build HSTS header value
        hsts_value = f"max-age={max_age}"
        if include_subdomains:
            hsts_value += "; includeSubDomains"
        if preload:
            hsts_value += "; preload"
        
        self.hsts_header = hsts_value
    
    async def dispatch(self, request: Request, call_next):
        """Add HSTS header to HTTPS responses."""
        response = await call_next(request)
        
        # Only add HSTS header for HTTPS requests or in production
        if request.url.scheme == "https" or settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = self.hsts_header
        
        return response


class CSPMiddleware(BaseHTTPMiddleware):
    """Dedicated Content Security Policy middleware."""
    
    def __init__(self, app, policy: Optional[str] = None, report_only: bool = False):
        super().__init__(app)
        self.policy = policy or self._get_default_policy()
        self.header_name = "Content-Security-Policy-Report-Only" if report_only else "Content-Security-Policy"
    
    def _get_default_policy(self) -> str:
        """Get default CSP policy."""
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: blob: https:; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "connect-src 'self' http://localhost:8002 ws://localhost:3005 wss://localhost:3005; "
            "object-src 'none'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
    
    async def dispatch(self, request: Request, call_next):
        """Add CSP header to response."""
        response = await call_next(request)
        response.headers[self.header_name] = self.policy
        return response


class SecurityAuditMiddleware(BaseHTTPMiddleware):
    """Middleware to audit security-related events."""
    
    def __init__(self, app):
        super().__init__(app)
        self.security_events = []
    
    async def dispatch(self, request: Request, call_next):
        """Monitor and log security events."""
        # Check for security violations
        violations = self._check_security_violations(request)
        
        if violations:
            logger.warning(f"Security violations detected from {self._get_client_ip(request)}: {violations}")
            # You could integrate with the security service here
        
        response = await call_next(request)
        
        # Check response for security indicators
        self._audit_response(request, response)
        
        return response
    
    def _check_security_violations(self, request: Request) -> List[str]:
        """Check request for security violations."""
        violations = []
        
        # Check for suspicious user agents
        user_agent = request.headers.get("user-agent", "").lower()
        suspicious_agents = ["sqlmap", "nikto", "nmap", "burp", "dirbuster", "gobuster"]
        if any(agent in user_agent for agent in suspicious_agents):
            violations.append("suspicious_user_agent")
        
        # Check for SQL injection patterns in query params
        query_string = str(request.query_params).lower()
        sql_patterns = ["union select", "' or '1'='1", "'; drop table", "' or 1=1", "' union all"]
        if any(pattern in query_string for pattern in sql_patterns):
            violations.append("possible_sql_injection")
        
        # Check for XSS patterns
        xss_patterns = ["<script", "javascript:", "onload=", "onerror=", "alert("]
        if any(pattern in query_string for pattern in xss_patterns):
            violations.append("possible_xss")
        
        # Check for path traversal
        path = request.url.path
        if "../" in path or "..%2f" in path.lower() or "..%5c" in path.lower():
            violations.append("path_traversal_attempt")
        
        return violations
    
    def _audit_response(self, request: Request, response: Response):
        """Audit response for security indicators."""
        # Log sensitive operations
        if response.status_code in [200, 201] and self._is_sensitive_operation(request):
            logger.info(f"Sensitive operation completed: {request.method} {request.url.path} from {self._get_client_ip(request)}")
        
        # Log authentication failures
        if response.status_code == 401:
            logger.warning(f"Authentication failure: {request.method} {request.url.path} from {self._get_client_ip(request)}")
        
        # Log authorization failures
        if response.status_code == 403:
            logger.warning(f"Authorization failure: {request.method} {request.url.path} from {self._get_client_ip(request)}")
    
    def _is_sensitive_operation(self, request: Request) -> bool:
        """Check if operation is sensitive."""
        sensitive_paths = ["/api/auth/", "/api/v1/admin/", "/api/v1/users/", "/api/v1/encryption/"]
        sensitive_methods = ["POST", "PUT", "DELETE"]
        
        return (request.method in sensitive_methods and 
                any(path in request.url.path for path in sensitive_paths))
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address."""
        # Check forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to direct client IP
        if hasattr(request.client, 'host'):
            return request.client.host
        
        return "unknown"