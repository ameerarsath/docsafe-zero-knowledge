#!/usr/bin/env python3
"""Test shares import in backend context"""

import sys
import traceback

print("Testing shares import in backend context...")

try:
    # Test individual shares router import
    from app.api.v1.shares import router as shares_router
    print(f"SUCCESS: Shares router imported: {len(shares_router.routes)} routes")

    # Test main API router import
    from app.api import api_router
    print(f"SUCCESS: Main API router imported: {len(api_router.routes)} total routes")

    # Check for shares routes in main router
    shares_routes = []
    for route in api_router.routes:
        if hasattr(route, 'path') and 'shares' in str(route.path):
            shares_routes.append(route)

    print(f"SUCCESS: Found {len(shares_routes)} shares routes in main API router")
    for route in shares_routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            print(f"  - {route.methods} {route.path}")

    # Test FastAPI app import
    from app.main import app
    print("SUCCESS: FastAPI app imported successfully")

    # Check app routes
    app_shares_routes = []
    for route in app.routes:
        if hasattr(route, 'path') and 'shares' in str(route.path):
            app_shares_routes.append(route)

    print(f"SUCCESS: Found {len(app_shares_routes)} shares routes in FastAPI app")

    if len(app_shares_routes) == 0:
        print("WARNING: No shares routes found in FastAPI app - this explains the 404 errors")

        # Let's check all routes in the app
        print("\nAll app routes:")
        for route in app.routes:
            if hasattr(route, 'path'):
                methods = getattr(route, 'methods', 'N/A')
                print(f"  - {methods} {route.path}")

except Exception as e:
    print(f"ERROR: {e}")
    traceback.print_exc()