#!/usr/bin/env python3
"""
Test runner script for SecureVault authentication tests.

This script provides a convenient way to run different types of tests
with appropriate configurations and reporting.
"""

import sys
import subprocess
import argparse
from pathlib import Path


def run_command(cmd, description):
    """Run a command and handle errors."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    print('='*60)
    
    result = subprocess.run(cmd, capture_output=False, text=True)
    
    if result.returncode != 0:
        print(f"\nERROR: {description} failed with exit code {result.returncode}")
        return False
    else:
        print(f"\nSUCCESS: {description} completed successfully")
        return True


def run_unit_tests():
    """Run unit tests only."""
    cmd = [
        "python", "-m", "pytest",
        "tests/unit/",
        "-v",
        "--tb=short",
        "--cov=app",
        "--cov-report=term-missing",
        "-m", "unit"
    ]
    return run_command(cmd, "Unit Tests")


def run_integration_tests():
    """Run integration tests only."""
    cmd = [
        "python", "-m", "pytest",
        "tests/integration/",
        "-v",
        "--tb=short",
        "--cov=app",
        "--cov-report=term-missing",
        "-m", "integration"
    ]
    return run_command(cmd, "Integration Tests")


def run_security_tests():
    """Run security-focused tests only."""
    cmd = [
        "python", "-m", "pytest",
        "tests/",
        "-v",
        "--tb=short",
        "-m", "security"
    ]
    return run_command(cmd, "Security Tests")


def run_auth_tests():
    """Run authentication-related tests only."""
    cmd = [
        "python", "-m", "pytest",
        "tests/",
        "-v",
        "--tb=short",
        "-k", "auth or login or token or password"
    ]
    return run_command(cmd, "Authentication Tests")


def run_all_tests():
    """Run all tests with full coverage."""
    cmd = [
        "python", "-m", "pytest",
        "tests/",
        "-v",
        "--tb=short",
        "--cov=app",
        "--cov-report=term-missing",
        "--cov-report=html",
        "--cov-fail-under=80"
    ]
    return run_command(cmd, "All Tests")


def run_fast_tests():
    """Run only fast tests (excluding slow ones)."""
    cmd = [
        "python", "-m", "pytest",
        "tests/",
        "-v",
        "--tb=short",
        "-m", "not slow"
    ]
    return run_command(cmd, "Fast Tests")


def run_code_quality_checks():
    """Run code quality checks."""
    checks = [
        (["black", "--check", "app/", "tests/"], "Black formatting check"),
        (["ruff", "check", "app/", "tests/"], "Ruff linting"),
        (["mypy", "app/"], "MyPy type checking"),
        (["isort", "--check-only", "app/", "tests/"], "Import sorting check"),
    ]
    
    success = True
    for cmd, description in checks:
        if not run_command(cmd, description):
            success = False
    
    return success


def run_security_scans():
    """Run security scanning tools."""
    scans = [
        (["bandit", "-r", "app/", "-f", "json"], "Bandit security scan"),
        (["safety", "check"], "Safety dependency scan"),
    ]
    
    success = True
    for cmd, description in scans:
        if not run_command(cmd, description):
            success = False
    
    return success


def main():
    """Main test runner."""
    parser = argparse.ArgumentParser(description="SecureVault Test Runner")
    parser.add_argument(
        "test_type",
        choices=[
            "unit", "integration", "security", "auth", "all", 
            "fast", "quality", "security-scan"
        ],
        help="Type of tests to run"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )
    parser.add_argument(
        "--fail-fast", "-x",
        action="store_true",
        help="Stop on first failure"
    )
    
    args = parser.parse_args()
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    print(f"Working directory: {backend_dir}")
    
    success = True
    
    if args.test_type == "unit":
        success = run_unit_tests()
    elif args.test_type == "integration":
        success = run_integration_tests()
    elif args.test_type == "security":
        success = run_security_tests()
    elif args.test_type == "auth":
        success = run_auth_tests()
    elif args.test_type == "all":
        success = run_all_tests()
    elif args.test_type == "fast":
        success = run_fast_tests()
    elif args.test_type == "quality":
        success = run_code_quality_checks()
    elif args.test_type == "security-scan":
        success = run_security_scans()
    
    # Print summary
    print(f"\n{'='*60}")
    if success:
        print("🎉 All checks passed successfully!")
        print("='*60")
        sys.exit(0)
    else:
        print("ERROR: Some checks failed!")
        print("='*60")
        sys.exit(1)


if __name__ == "__main__":
    main()