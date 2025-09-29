"""
Redirect Loop Debugging Middleware for FastAPI

Helps identify and prevent infinite redirect loops in the backend
"""

import time
import logging
from typing import Dict, List, Optional
from fastapi import Request, Response
from fastapi.responses import RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

class RedirectDebuggerMiddleware(BaseHTTPMiddleware):
    """
    Middleware to detect and log redirect loops
    """
    
    def __init__(self, app, max_redirects: int = 5, time_window: int = 10):
        super().__init__(app)
        self.max_redirects = max_redirects
        self.time_window = time_window
        self.redirect_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_redirects))
        
    async def dispatch(self, request: Request, call_next):
        """
        Process request and detect redirect loops
        """
        client_ip = self.get_client_ip(request)
        request_path = request.url.path
        request_time = time.time()
        
        # Log incoming request
        logger.debug(f"🔍 Request: {request.method} {request_path} from {client_ip}")
        
        # Check for potential loops before processing
        self.check_redirect_loop(client_ip, request_path, request_time)
        
        # Process the request
        response = await call_next(request)
        
        # Log redirects
        if isinstance(response, RedirectResponse) or (
            hasattr(response, 'status_code') and 300 <= response.status_code < 400
        ):
            redirect_location = response.headers.get('location', 'unknown')
            logger.warning(f"🔄 REDIRECT {response.status_code}: {request_path} → {redirect_location}")
            
            # Track redirect in history
            self.track_redirect(client_ip, request_path, redirect_location, request_time)
            
        return response
    
    def get_client_ip(self, request: Request) -> str:
        """
        Get client IP address with proxy support
        """
        # Check for forwarded headers (common in proxy setups)
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if request.client:
            return request.client.host
        
        return 'unknown'
    
    def track_redirect(self, client_ip: str, from_path: str, to_path: str, timestamp: float):
        """
        Track redirect in history for loop detection
        """
        redirect_key = f"{client_ip}:{from_path}"
        
        redirect_entry = {
            'from': from_path,
            'to': to_path,
            'timestamp': timestamp
        }
        
        self.redirect_history[redirect_key].append(redirect_entry)
    
    def check_redirect_loop(self, client_ip: str, request_path: str, current_time: float):
        """
        Check if current request might be part of a redirect loop
        """
        redirect_key = f"{client_ip}:{request_path}"
        history = self.redirect_history[redirect_key]
        
        if len(history) < 2:
            return
        
        # Filter recent redirects within time window
        recent_redirects = [
            entry for entry in history 
            if current_time - entry['timestamp'] <= self.time_window
        ]
        
        if len(recent_redirects) >= self.max_redirects:
            # Potential loop detected
            paths = [entry['from'] for entry in recent_redirects]
            unique_paths = set(paths)
            
            if len(unique_paths) <= 2:  # Bouncing between same paths
                logger.error(f"🚨 REDIRECT LOOP DETECTED for {client_ip}")
                logger.error(f"Recent paths: {paths}")
                logger.error(f"Time window: {self.time_window}s")
                
                # Clear history to prevent further loops
                self.redirect_history[redirect_key].clear()
                
                # Could raise an exception here to break the loop
                # raise HTTPException(status_code=508, detail="Loop Detected")

def log_all_redirects():
    """
    Decorator to log all redirects in route handlers
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            if isinstance(result, RedirectResponse):
                logger.warning(f"🔄 Route redirect: {func.__name__} → {result.headers.get('location')}")
            
            return result
        return wrapper
    return decorator

# Utility functions for debugging

def create_redirect_response_with_logging(url: str, status_code: int = 302, headers: dict = None):
    """
    Create a redirect response with automatic logging
    """
    logger.warning(f"🔄 Creating redirect to: {url} (status: {status_code})")
    
    response = RedirectResponse(url=url, status_code=status_code, headers=headers)
    
    # Add debug headers
    response.headers["X-Redirect-Debug"] = "true"
    response.headers["X-Redirect-Timestamp"] = str(time.time())
    
    return response

def check_for_circular_redirects(url_chain: List[str]) -> bool:
    """
    Check if a URL chain contains circular redirects
    """
    seen_urls = set()
    
    for url in url_chain:
        if url in seen_urls:
            logger.error(f"🚨 Circular redirect detected in chain: {url_chain}")
            return True
        seen_urls.add(url)
    
    return False

# Debug route for testing redirect loops
async def debug_redirect_loop(request: Request):
    """
    Debug endpoint to test redirect loop detection
    """
    loop_type = request.query_params.get('type', 'simple')
    
    if loop_type == 'simple':
        # Simple A → B → A loop
        current_path = request.url.path
        if 'step1' in current_path:
            return create_redirect_response_with_logging('/debug/redirect?type=simple&step=step2')
        elif 'step2' in current_path:
            return create_redirect_response_with_logging('/debug/redirect?type=simple&step=step1')
        else:
            return create_redirect_response_with_logging('/debug/redirect?type=simple&step=step1')
    
    elif loop_type == 'auth':
        # Simulate auth loop
        if 'login' in current_path:
            return create_redirect_response_with_logging('/debug/redirect?type=auth&step=protected')
        else:
            return create_redirect_response_with_logging('/debug/redirect?type=auth&step=login')
    
    return {"message": "Redirect loop test", "type": loop_type}

# Configuration for different environments
class RedirectDebugConfig:
    """
    Configuration for redirect debugging
    """
    
    @staticmethod
    def for_development():
        return {
            'max_redirects': 3,
            'time_window': 5,
            'log_level': logging.DEBUG,
            'break_loops': False  # Don't break loops in dev, just log
        }
    
    @staticmethod
    def for_production():
        return {
            'max_redirects': 5,
            'time_window': 10,
            'log_level': logging.WARNING,
            'break_loops': True  # Break loops in production
        }

# Example usage in FastAPI app:
"""
from fastapi import FastAPI
from .middleware.redirect_debugger import RedirectDebuggerMiddleware

app = FastAPI()

# Add redirect debugging middleware
app.add_middleware(
    RedirectDebuggerMiddleware,
    max_redirects=5,
    time_window=10
)

# Add debug route (development only)
if settings.DEBUG:
    app.get("/debug/redirect")(debug_redirect_loop)
"""