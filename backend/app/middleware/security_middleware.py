"""
Security monitoring middleware for SecureVault.

This middleware provides:
- Real-time request monitoring and analysis
- Automatic security event detection
- Rate limiting enforcement
- IP blocking enforcement
- Suspicious activity detection
"""

import asyncio
import time
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..services.security_service import security_service


logger = logging.getLogger(__name__)


class SecurityMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for security monitoring and threat detection."""
    
    def __init__(self, app, excluded_paths: Optional[list] = None):
        super().__init__(app)
        self.excluded_paths = excluded_paths or [
            "/health", "/docs", "/openapi.json", "/favicon.ico"
        ]
        self.request_cache = {}  # Simple in-memory cache for request tracking
    
    async def dispatch(self, request: Request, call_next):
        """Process request through security monitoring."""
        start_time = time.time()
        
        # Skip monitoring for excluded paths
        if any(request.url.path.startswith(path) for path in self.excluded_paths):
            return await call_next(request)
        
        # Extract request information
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        # Get database session
        db: Session = next(get_db())
        
        try:
            # Check if IP is blocked
            if security_service.is_ip_blocked(client_ip, db):
                logger.warning(f"Blocked request from IP: {client_ip}")
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "Access denied. Your IP address has been blocked due to suspicious activity.",
                        "error_code": "IP_BLOCKED"
                    }
                )
            
            # Check rate limiting
            if security_service.is_rate_limited(client_ip):
                logger.warning(f"Rate limited request from IP: {client_ip}")
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please slow down.",
                        "error_code": "RATE_LIMITED"
                    }
                )
            
            # Process the request
            response = await call_next(request)
            
            # Analyze the request for security threats
            await self._analyze_request(request, response, client_ip, user_agent, db)
            
            return response
            
        except Exception as e:
            logger.error(f"Security middleware error: {e}")
            # Don't block requests due to middleware errors
            return await call_next(request)
        finally:
            db.close()
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request."""
        # Check for forwarded IP headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to direct client IP
        if hasattr(request.client, 'host'):
            return request.client.host
        
        return "unknown"
    
    async def _analyze_request(self, request: Request, response: Response, 
                             client_ip: str, user_agent: str, db: Session):
        """Analyze request for security threats."""
        try:
            # Extract request details
            method = request.method
            path = request.url.path
            status_code = response.status_code
            
            # Determine event type based on request
            event_type = self._classify_request(method, path, status_code)
            
            if not event_type:
                return  # Skip non-security-relevant requests
            
            # Get user ID if authenticated
            user_id = await self._extract_user_id(request)
            
            # Create event data
            event_data = {
                "event_type": event_type,
                "ip_address": client_ip,
                "user_id": user_id,
                "user_agent": user_agent,
                "session_id": self._extract_session_id(request),
                "timestamp": datetime.utcnow().isoformat(),
                "additional_data": {
                    "method": method,
                    "path": path,
                    "status_code": status_code,
                    "request_size": request.headers.get("content-length", 0),
                    "referer": request.headers.get("referer"),
                    "query_params": str(request.query_params) if request.query_params else None
                }
            }
            
            # Add failed login specific data
            if event_type == "failed_login":
                event_data["additional_data"]["login_attempt"] = True
            
            # Add suspicious patterns
            suspicion_score = self._calculate_suspicion_score(request, user_agent, path)
            if suspicion_score > 0:
                event_data["additional_data"]["suspicion_score"] = suspicion_score
            
            # Analyze asynchronously to avoid blocking response
            asyncio.create_task(
                security_service.analyze_event(event_data, db)
            )
            
        except Exception as e:
            logger.error(f"Error analyzing request: {e}")
    
    def _classify_request(self, method: str, path: str, status_code: int) -> Optional[str]:
        """Classify request type for security analysis."""
        # Authentication endpoints
        if "auth/login" in path:
            if status_code == 401 or status_code == 403:
                return "failed_login"
            elif status_code == 200:
                return "login"
        
        if "auth/logout" in path:
            return "logout"
        
        # Document operations
        if "/documents/" in path:
            if method == "GET":
                return "download" if "download" in path else "read"
            elif method == "POST":
                return "upload"
            elif method == "PUT":
                return "write"
            elif method == "DELETE":
                return "delete"
        
        # API access
        if path.startswith("/api/"):
            return "api_call"
        
        # Admin operations
        if "/admin/" in path:
            return "admin_access"
        
        # Suspicious patterns
        if self._is_suspicious_path(path):
            return "suspicious_access"
        
        # High-frequency requests
        if method == "GET" and status_code == 200:
            return "access"
        
        return None
    
    def _is_suspicious_path(self, path: str) -> bool:
        """Check if path matches suspicious patterns."""
        suspicious_patterns = [
            ".env", "config", "admin", "phpinfo", "wp-admin", "wp-content",
            "backup", "database", "sql", "dump", ".git", ".svn",
            "shell", "cmd", "exec", "eval", "system"
        ]
        
        path_lower = path.lower()
        return any(pattern in path_lower for pattern in suspicious_patterns)
    
    def _calculate_suspicion_score(self, request: Request, user_agent: str, path: str) -> float:
        """Calculate suspicion score for the request."""
        score = 0.0
        
        # Suspicious user agents
        suspicious_agents = [
            "bot", "crawler", "spider", "scraper", "scanner", 
            "curl", "wget", "python", "perl", "php",
            "sqlmap", "nikto", "nmap", "masscan"
        ]
        
        user_agent_lower = user_agent.lower()
        for agent in suspicious_agents:
            if agent in user_agent_lower:
                score += 2.0
                break
        
        # Empty or missing user agent
        if not user_agent or len(user_agent) < 10:
            score += 1.0
        
        # Suspicious paths
        if self._is_suspicious_path(path):
            score += 3.0
        
        # Direct IP access (no Host header with domain)
        host = request.headers.get("host", "")
        if not host or self._is_ip_address(host):
            score += 1.0
        
        # Missing common headers
        if not request.headers.get("accept"):
            score += 0.5
        if not request.headers.get("accept-language"):
            score += 0.5
        
        return score
    
    def _is_ip_address(self, host: str) -> bool:
        """Check if host is an IP address."""
        try:
            parts = host.split(":")  # Handle port
            ip_part = parts[0]
            
            # Simple IPv4 check
            octets = ip_part.split(".")
            if len(octets) == 4:
                return all(0 <= int(octet) <= 255 for octet in octets)
            
            # Simple IPv6 check
            return ":" in ip_part and len(ip_part) > 2
        except:
            return False
    
    async def _extract_user_id(self, request: Request) -> Optional[int]:
        """Extract authenticated user ID from request."""
        try:
            # Try to get user from JWT token or session
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                # Would need to decode JWT to get user ID
                # This is a placeholder - actual implementation would
                # decode the JWT token and extract user ID
                pass
            
            # Check for session-based authentication
            session_id = request.cookies.get("session_id")
            if session_id:
                # Would look up user ID from session store
                pass
            
            return None  # Placeholder
            
        except Exception as e:
            logger.error(f"Error extracting user ID: {e}")
            return None
    
    def _extract_session_id(self, request: Request) -> Optional[str]:
        """Extract session ID from request."""
        # Check cookies
        session_id = request.cookies.get("session_id")
        if session_id:
            return session_id
        
        # Check headers
        session_header = request.headers.get("x-session-id")
        if session_header:
            return session_header
        
        return None


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting requests."""
    
    def __init__(self, app, requests_per_minute: int = 60, 
                 burst_size: int = 10, excluded_paths: Optional[list] = None):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.excluded_paths = excluded_paths or ["/health", "/docs"]
        self.request_counts = {}  # IP -> deque of request timestamps
    
    async def dispatch(self, request: Request, call_next):
        """Apply rate limiting to requests."""
        # Skip rate limiting for excluded paths
        if any(request.url.path.startswith(path) for path in self.excluded_paths):
            return await call_next(request)
        
        client_ip = self._get_client_ip(request)
        
        # Check rate limit
        if self._is_rate_limited(client_ip):
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded. Maximum {self.requests_per_minute} requests per minute.",
                    "error_code": "RATE_LIMITED",
                    "retry_after": 60
                },
                headers={"Retry-After": "60"}
            )
        
        # Record the request
        self._record_request(client_ip)
        
        return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address."""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        if hasattr(request.client, 'host'):
            return request.client.host
        
        return "unknown"
    
    def _is_rate_limited(self, client_ip: str) -> bool:
        """Check if client IP is rate limited."""
        current_time = time.time()
        
        if client_ip not in self.request_counts:
            return False
        
        # Clean old requests (older than 1 minute)
        minute_ago = current_time - 60
        self.request_counts[client_ip] = [
            req_time for req_time in self.request_counts[client_ip]
            if req_time > minute_ago
        ]
        
        # Check if rate limit exceeded
        request_count = len(self.request_counts[client_ip])
        return request_count >= self.requests_per_minute
    
    def _record_request(self, client_ip: str):
        """Record a request from the client IP."""
        current_time = time.time()
        
        if client_ip not in self.request_counts:
            self.request_counts[client_ip] = []
        
        self.request_counts[client_ip].append(current_time)
        
        # Keep only recent requests to prevent memory bloat
        minute_ago = current_time - 60
        self.request_counts[client_ip] = [
            req_time for req_time in self.request_counts[client_ip]
            if req_time > minute_ago
        ]