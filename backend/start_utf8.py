#!/usr/bin/env python3
"""
UTF-8 safe startup script for SecureVault backend
"""

import sys
import os

# Force UTF-8 encoding before importing anything else
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['PYTHONUTF8'] = '1'
os.environ['LANG'] = 'en_US.UTF-8'
os.environ['LC_ALL'] = 'en_US.UTF-8'

# Configure stdout/stderr to handle UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Import and run the main application
if __name__ == "__main__":
    import uvicorn
    from app.main import app

    print("Starting SecureVault API with UTF-8 encoding...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
        reload=True,
        reload_dirs=["app"],
        log_level="info"
    )