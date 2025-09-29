# ERR_TOO_MANY_REDIRECTS Debug Guide

## Root Cause Analysis

The infinite redirect loop is caused by a **proxy configuration conflict** in your Vite config:

```typescript
// PROBLEMATIC PROXY RULE in vite.config.ts
'/share': {
  target: 'http://localhost:8002',
  changeOrigin: true,
  rewrite: (path) => `/api${path}`
}
```

This intercepts React Router's `/share/:shareToken` route and forwards it to the backend, creating a loop.

## Common Causes of Redirect Loops

### 1. **Proxy Configuration Conflicts** (Your Issue)
- Frontend proxy intercepts routes meant for React Router
- Backend redirects back to frontend
- Creates infinite loop

### 2. **Authentication Middleware Loops**
- Auth middleware redirects unauthenticated users to login
- Login redirects back to original URL
- Original URL requires auth, creating loop

### 3. **Route Conflicts**
- Multiple routes handling same path
- Conflicting redirect rules
- Middleware redirecting to same route

### 4. **Session/Cookie Issues**
- Expired sessions causing auth redirects
- Cookie domain/path mismatches
- CORS issues with credentials

## Debugging Tools & Techniques

### 1. **Browser Network Tab Analysis**
```javascript
// Add to browser console to trace redirects
let redirectCount = 0;
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log(`Request ${++redirectCount}:`, args[0]);
  return originalFetch.apply(this, args);
};
```

### 2. **Express/Node.js Redirect Logging**
```javascript
// Add middleware to log all redirects
app.use((req, res, next) => {
  const originalRedirect = res.redirect;
  res.redirect = function(status, url) {
    if (typeof status === 'string') {
      url = status;
      status = 302;
    }
    console.log(`🔄 REDIRECT ${status}: ${req.originalUrl} → ${url}`);
    return originalRedirect.call(this, status, url);
  };
  next();
});
```

### 3. **React Router Debug Component**
```typescript
// Add to your App.tsx for route debugging
import { useLocation } from 'react-router-dom';

function RouteDebugger() {
  const location = useLocation();
  console.log('🛣️ Route changed:', location.pathname, location.search);
  return null;
}

// Add inside Router component
<RouteDebugger />
```

## Solutions

### 1. **Fix Vite Proxy Configuration** (Immediate Fix)

Replace your current vite.config.ts with:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3005,
    proxy: {
      // Only proxy API calls, not share routes
      '/api': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
      // REMOVE the /share proxy rule completely
    }
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  worker: {
    format: 'es'
  }
})
```

### 2. **Alternative: Specific API Proxy Rules**

If you need backend share endpoints, use specific paths:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8002',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  },
  // Only proxy share API endpoints, not the frontend route
  '/api/shares': {
    target: 'http://localhost:8002',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

### 3. **Authentication Middleware Fix**

```javascript
// Prevent auth loops in Express middleware
app.use('/share/:token', (req, res, next) => {
  // Skip auth for public share routes
  req.skipAuth = true;
  next();
});

app.use(authMiddleware);

function authMiddleware(req, res, next) {
  if (req.skipAuth) return next();
  
  // Prevent redirect loops
  if (req.path === '/login' && req.get('Referer')?.includes('/login')) {
    return res.status(400).json({ error: 'Authentication loop detected' });
  }
  
  // Your auth logic here
}
```

### 4. **React Router Protection**

```typescript
// Prevent route loops in React
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [redirectCount, setRedirectCount] = useState(0);
  
  useEffect(() => {
    // Detect redirect loops
    if (redirectCount > 3) {
      console.error('Redirect loop detected, stopping');
      navigate('/error', { replace: true });
      return;
    }
    
    setRedirectCount(prev => prev + 1);
  }, [location.pathname]);
  
  return <>{children}</>;
}
```

## Debugging Checklist

### ✅ **Frontend Checks**
- [ ] Check Vite proxy configuration
- [ ] Verify React Router routes don't conflict
- [ ] Check for authentication redirects in components
- [ ] Verify no duplicate route definitions
- [ ] Check useEffect hooks for navigation loops

### ✅ **Backend Checks**
- [ ] Check Express route definitions
- [ ] Verify middleware order
- [ ] Check authentication middleware redirects
- [ ] Verify CORS configuration
- [ ] Check session middleware

### ✅ **Network Checks**
- [ ] Check browser Network tab for redirect chain
- [ ] Verify request headers (Authorization, Cookies)
- [ ] Check response status codes (301, 302, 307, 308)
- [ ] Verify proxy server configuration

### ✅ **Environment Checks**
- [ ] Check environment variables
- [ ] Verify port configurations
- [ ] Check reverse proxy settings (Nginx/Apache)
- [ ] Verify SSL/TLS configuration

## Testing Commands

```bash
# Test share route directly
curl -v http://localhost:3005/share/test123

# Test with redirect following disabled
curl -v --max-redirs 0 http://localhost:3005/share/test123

# Test backend API directly
curl -v http://localhost:8002/api/shares/test123/access

# Check proxy behavior
curl -v -H "Host: localhost:3005" http://localhost:3005/share/test123
```

## Prevention Strategies

1. **Separate API and Frontend Routes**
   - Use `/api/` prefix for all backend routes
   - Keep frontend routes without `/api/`

2. **Explicit Proxy Rules**
   - Only proxy specific API paths
   - Avoid wildcards that might catch frontend routes

3. **Route Validation**
   - Add middleware to detect loops
   - Implement redirect counters
   - Log all redirects in development

4. **Testing**
   - Test share links in incognito mode
   - Test with different authentication states
   - Test with network throttling

## Quick Fix Summary

**Immediate action**: Remove the `/share` proxy rule from `vite.config.ts`:

```diff
proxy: {
  '/api': {
    target: 'http://localhost:8002',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
- '/share': {
-   target: 'http://localhost:8002',
-   changeOrigin: true,
-   rewrite: (path) => `/api${path}`
- }
}
```

This should immediately resolve your ERR_TOO_MANY_REDIRECTS issue.