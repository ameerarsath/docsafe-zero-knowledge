#!/usr/bin/env python3
"""
Debug script to inspect FastAPI router registration
"""
import sys
sys.path.append('./backend')

from backend.app.main import app

def debug_routes():
    print("=" * 80)
    print("🔍 EXTREME DEBUGGING: FastAPI Routes Analysis")
    print("=" * 80)

    # Get all routes from the app
    all_routes = []

    def collect_routes(router, prefix=""):
        for route in router.routes:
            if hasattr(route, 'path'):
                full_path = prefix + route.path
                methods = getattr(route, 'methods', set())
                all_routes.append({
                    'path': full_path,
                    'methods': methods,
                    'name': getattr(route, 'name', 'unnamed'),
                    'endpoint': getattr(route, 'endpoint', None)
                })

            # If this route has sub-routes, collect them too
            if hasattr(route, 'router'):
                collect_routes(route.router, prefix + getattr(route, 'path_prefix', ''))

    # Collect all routes
    collect_routes(app.router)

    print(f"📊 TOTAL ROUTES FOUND: {len(all_routes)}")
    print("-" * 80)

    # Filter for shares routes
    shares_routes = [r for r in all_routes if 'shares' in r['path'].lower()]

    print(f"🎯 SHARES ROUTES FOUND: {len(shares_routes)}")
    if shares_routes:
        for route in shares_routes:
            print(f"  ✅ {route['methods']} {route['path']} -> {route['name']}")
    else:
        print("  ❌ NO SHARES ROUTES FOUND!")

    print("-" * 80)

    # Show all v1 API routes
    v1_routes = [r for r in all_routes if '/api/v1' in r['path']]
    print(f"📋 ALL V1 API ROUTES: {len(v1_routes)}")
    for route in sorted(v1_routes, key=lambda x: x['path']):
        print(f"  {list(route['methods'])} {route['path']}")

    print("-" * 80)

    # Check main app router specifically
    print("🔧 MAIN APP ROUTER ANALYSIS:")
    print(f"  App routes count: {len(app.router.routes)}")

    for i, route in enumerate(app.router.routes):
        if hasattr(route, 'path'):
            print(f"  [{i}] {route.path} -> {getattr(route, 'name', 'unnamed')}")
        elif hasattr(route, 'prefix'):
            print(f"  [{i}] Mount: {route.prefix} -> {type(route.app).__name__}")

    return all_routes, shares_routes

if __name__ == "__main__":
    all_routes, shares_routes = debug_routes()

    if not shares_routes:
        print("\n🚨 CRITICAL ISSUE: NO SHARES ROUTES REGISTERED!")
        print("This explains why shares endpoints return 404.")

        # Let's inspect the shares router directly
        print("\n🔍 DIRECT SHARES ROUTER INSPECTION:")
        try:
            from backend.app.api.v1.shares import router as shares_router
            print(f"  Shares router routes: {len(shares_router.routes)}")
            for route in shares_router.routes:
                print(f"    {route.methods} {route.path} -> {route.name}")
        except Exception as e:
            print(f"  ❌ Error importing shares router: {e}")