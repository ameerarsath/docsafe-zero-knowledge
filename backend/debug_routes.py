#!/usr/bin/env python3
"""Debug script to check registered routes in FastAPI app."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.main import app
    print("SUCCESS: App imported successfully")
    print("\nREGISTERED ROUTES:")

    for route in app.routes:
        if hasattr(route, 'path'):
            methods = getattr(route, 'methods', set()) if hasattr(route, 'methods') else 'N/A'
            print(f"  {route.path} - {methods}")
        else:
            print(f"  {type(route).__name__} - {getattr(route, 'prefix', 'no prefix')}")

    print(f"\nTOTAL ROUTES: {len(app.routes)}")

    # Check specifically for our public endpoint
    public_csp_found = False
    for route in app.routes:
        if hasattr(route, 'path') and 'public/csp' in route.path:
            public_csp_found = True
            print(f"FOUND: Public CSP endpoint: {route.path}")
            break

    if not public_csp_found:
        print("ERROR: Public CSP endpoint not found!")

except Exception as e:
    print(f"ERROR: importing app: {e}")
    import traceback
    traceback.print_exc()