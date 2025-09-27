#!/usr/bin/env python3
import sys
sys.path.append('./backend')

def debug_shares():
    print("=" * 50)
    print("EXTREME DEBUGGING: Shares Router Analysis")
    print("=" * 50)

    # Test 1: Import shares router directly
    try:
        from backend.app.api.v1.shares import router as shares_router
        print(f"SUCCESS: Shares router imported with {len(shares_router.routes)} routes")
        for i, route in enumerate(shares_router.routes):
            print(f"  [{i}] {route.methods} {route.path} -> {route.name}")
    except Exception as e:
        print(f"ERROR importing shares router: {e}")
        return

    print("-" * 50)

    # Test 2: Import main app
    try:
        from backend.app.main import app
        print(f"SUCCESS: Main app imported with {len(app.router.routes)} routes")
    except Exception as e:
        print(f"ERROR importing main app: {e}")
        return

    print("-" * 50)

    # Test 3: Check if shares routes are in main app
    all_paths = []
    for route in app.router.routes:
        if hasattr(route, 'path'):
            all_paths.append(route.path)
        if hasattr(route, 'routes'):  # Sub-router
            for subroute in route.routes:
                if hasattr(subroute, 'path'):
                    all_paths.append(subroute.path)

    shares_paths = [p for p in all_paths if 'shares' in p.lower()]
    print(f"Shares paths found in main app: {shares_paths}")

    if not shares_paths:
        print("CRITICAL: NO SHARES PATHS IN MAIN APP!")

        # Test 4: Check API router registration
        print("-" * 50)
        print("DEBUGGING API ROUTER:")
        try:
            from backend.app.api import api_router
            print(f"API router has {len(api_router.routes)} routes")

            for route in api_router.routes:
                if hasattr(route, 'path') and 'shares' in route.path:
                    print(f"  FOUND SHARES: {route.path}")

        except Exception as e:
            print(f"ERROR with API router: {e}")

if __name__ == "__main__":
    debug_shares()