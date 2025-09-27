#!/usr/bin/env python3
"""Test script to verify shares router import"""

import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from app.api.v1.shares import router
    print('SUCCESS: Shares router imported successfully')
    print(f'Router has {len(router.routes)} routes')
    for route in router.routes:
        print(f'  - {route.methods} {route.path}')
except Exception as e:
    print(f'ERROR: Import error: {e}')
    import traceback
    traceback.print_exc()

# Also test the main API router
try:
    from app.api import api_router
    print('\nSUCCESS: Main API router imported successfully')
    shares_routes = [route for route in api_router.routes if 'shares' in str(route.path)]
    print(f'Found {len(shares_routes)} shares-related routes in main router')
    for route in shares_routes:
        print(f'  - {route.methods} {route.path}')
except Exception as e:
    print(f'ERROR: API router import error: {e}')
    import traceback
    traceback.print_exc()