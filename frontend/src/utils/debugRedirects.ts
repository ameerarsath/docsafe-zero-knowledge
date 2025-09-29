/**
 * Redirect Loop Debugging Utilities
 * 
 * Tools to help identify and debug infinite redirect loops
 */

interface RedirectLogEntry {
  timestamp: number;
  url: string;
  method: string;
  status?: number;
  redirectTo?: string;
}

class RedirectDebugger {
  private logs: RedirectLogEntry[] = [];
  private maxLogs = 50;
  private redirectThreshold = 5;

  constructor() {
    this.setupFetchInterceptor();
    this.setupNavigationListener();
  }

  /**
   * Intercept fetch requests to log API calls
   */
  private setupFetchInterceptor() {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || 'unknown';
      const method = args[1]?.method || 'GET';
      
      this.addLog({
        timestamp: Date.now(),
        url,
        method
      });

      try {
        const response = await originalFetch.apply(window, args);
        
        // Log redirects
        if (response.status >= 300 && response.status < 400) {
          const redirectTo = response.headers.get('Location') || 'unknown';
          this.addLog({
            timestamp: Date.now(),
            url,
            method,
            status: response.status,
            redirectTo
          });
          
          this.checkForLoop(url, redirectTo);
        }
        
        return response;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    };
  }

  /**
   * Listen for navigation events
   */
  private setupNavigationListener() {
    if (typeof window === 'undefined') return;

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', (event) => {
      this.addLog({
        timestamp: Date.now(),
        url: window.location.href,
        method: 'NAVIGATION'
      });
    });

    // Override history methods
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(state, title, url) {
      debugger.addLog({
        timestamp: Date.now(),
        url: url?.toString() || window.location.href,
        method: 'PUSH_STATE'
      });
      return originalPushState.apply(history, arguments);
    };

    history.replaceState = function(state, title, url) {
      debugger.addLog({
        timestamp: Date.now(),
        url: url?.toString() || window.location.href,
        method: 'REPLACE_STATE'
      });
      return originalReplaceState.apply(history, arguments);
    };
  }

  /**
   * Add log entry
   */
  private addLog(entry: RedirectLogEntry) {
    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Redirect Debug:', entry);
    }
  }

  /**
   * Check for potential redirect loops
   */
  private checkForLoop(fromUrl: string, toUrl: string) {
    const recentLogs = this.logs.slice(-this.redirectThreshold);
    const urlPattern = recentLogs.map(log => log.url);
    
    // Check if we're bouncing between the same URLs
    const uniqueUrls = new Set(urlPattern);
    if (uniqueUrls.size <= 2 && recentLogs.length >= this.redirectThreshold) {
      console.error('🚨 REDIRECT LOOP DETECTED!');
      console.error('Recent URLs:', urlPattern);
      console.error('Full logs:', this.logs);
      
      // Optionally break the loop
      if (confirm('Redirect loop detected. Break the loop and go to dashboard?')) {
        window.location.href = '/dashboard';
      }
    }
  }

  /**
   * Get recent logs
   */
  getLogs(): RedirectLogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs for analysis
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create global instance
const debugger = new RedirectDebugger();

// Export utilities
export const redirectDebugger = debugger;

/**
 * React hook for redirect debugging
 */
export function useRedirectDebugger() {
  const [logs, setLogs] = React.useState<RedirectLogEntry[]>([]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setLogs(debugger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    logs,
    clearLogs: () => debugger.clearLogs(),
    exportLogs: () => debugger.exportLogs()
  };
}

/**
 * Component to display redirect logs
 */
export function RedirectDebugPanel() {
  const { logs, clearLogs, exportLogs } = useRedirectDebugger();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      width: '400px',
      height: '300px',
      backgroundColor: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      overflow: 'auto'
    }}>
      <div style={{ marginBottom: '10px' }}>
        <strong>Redirect Debug Panel</strong>
        <button onClick={clearLogs} style={{ marginLeft: '10px' }}>Clear</button>
        <button onClick={() => console.log(exportLogs())} style={{ marginLeft: '5px' }}>
          Export
        </button>
      </div>
      
      <div>
        {logs.slice(-10).map((log, index) => (
          <div key={index} style={{ 
            marginBottom: '5px',
            color: log.status ? (log.status >= 300 && log.status < 400 ? 'orange' : 'white') : 'lightblue'
          }}>
            <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
            <div>{log.method} {log.url}</div>
            {log.redirectTo && <div>→ {log.redirectTo}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Browser console debugging commands
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugRedirects = {
    getLogs: () => debugger.getLogs(),
    clearLogs: () => debugger.clearLogs(),
    exportLogs: () => debugger.exportLogs(),
    
    // Quick test for redirect loops
    testLoop: () => {
      console.log('Testing redirect loop detection...');
      for (let i = 0; i < 6; i++) {
        debugger.addLog({
          timestamp: Date.now(),
          url: i % 2 === 0 ? '/share/test' : '/login',
          method: 'GET'
        });
      }
    }
  };
  
  console.log('🔧 Redirect debugging tools available at window.debugRedirects');
}