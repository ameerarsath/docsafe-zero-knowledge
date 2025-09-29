# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**DocSafe** is a zero-knowledge document storage platform built with FastAPI (backend) and React/TypeScript (frontend). It features client-side encryption, multi-factor authentication, and role-based access control.

### Key Architecture Components

- **Zero-Knowledge Encryption**: AES-256-GCM with PBKDF2 key derivation (100,000+ iterations)
- **Authentication**: JWT tokens with refresh rotation, TOTP-based MFA
- **Authorization**: 5-tier RBAC system (Admin, Manager, User, Viewer, Guest)
- **Document Processing**: Client-side encryption, server-side metadata storage
- **Database**: PostgreSQL with Alembic migrations
- **Cache**: Redis for session management

## Development Environment

### Primary Development Mode (Hybrid)
```bash
# Recommended development setup - local frontend/backend, Docker database
scripts/dev/start-dev-hybrid.bat

# Access points:
# Frontend: http://localhost:3005
# Backend API: http://localhost:8002
# API Docs: http://localhost:8002/docs
# Database: PostgreSQL in Docker (localhost:5430)
```

### Alternative Development Modes
```bash
# Full Docker environment
scripts/prod/start-prod.bat
# Access: http://localhost:8080 (via Nginx)

# Local development (manual setup)
# Requires local PostgreSQL and Redis installation
```

### Test Credentials
- **Username**: `rahumana`
- **Password**: `TestPass123@`
- **Encryption Password**: `JHNpAZ39g!&Y`

## Backend Development (FastAPI)

### Environment Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements/dev.txt
```

### Database Operations
```bash
# Run migrations
alembic upgrade head

# Create migration
alembic revision --autogenerate -m "Description"

# Create admin user
python scripts/create_admin_user.py
```

### Testing
```bash
# Unit tests
pytest -m unit

# Integration tests
pytest -m integration

# Security tests
pytest -m security

# Full test suite with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_specific_file.py

# Run with verbose output
pytest -v
```

### Code Quality
```bash
# Format code
black .
isort .

# Lint code
ruff check .
ruff check --fix .

# Type checking
mypy app

# Security scanning
bandit -r app
safety check
```

### Backend Server
```bash
# Development server with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002

# Production server
uvicorn app.main:app --host 0.0.0.0 --port 8002
```

## Frontend Development (React/TypeScript)

### Environment Setup
```bash
cd frontend
npm install
```

### Development Server
```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing
```bash
# Unit tests
npm test

# Test with coverage
npm run test:coverage

# Run tests in UI mode
npm run test:ui

# Type checking
npm run type-check
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Complete quality check
npm run quality:check
```

## API Architecture

### Core Endpoints
- **Authentication**: `/api/v1/auth/` (login, logout, refresh, MFA)
- **Documents**: `/api/v1/documents/` (CRUD operations, upload, download)
- **Shares**: `/api/v1/shares/` (create, manage document shares)
- **Users**: `/api/v1/users/` (user management)
- **Admin**: `/api/v1/admin/` (administrative functions)
- **RBAC**: `/api/v1/rbac/` (role and permission management)

### Security Implementation
- **Authentication**: JWT Bearer tokens with refresh rotation
- **Authorization**: Role-based access control with inheritance
- **Encryption**: Client-side AES-256-GCM, server never sees plaintext
- **Session Management**: Redis-based sessions with timeout
- **Security Headers**: CSP, CORS, CSRF protection

### Database Schema
- **Users**: User accounts with credentials and MFA settings
- **Roles**: 5-tier hierarchy (Admin, Manager, User, Viewer, Guest)
- **Permissions**: Granular operation permissions
- **Documents**: Metadata and encrypted content
- **Shares**: Document sharing with access control
- **Audit Logs**: All operations tracked for compliance

## Common Development Commands

### Database Management
```bash
# Start database container (from project root)
cd config/docker
docker-compose -f docker-compose.dev.yml up -d postgres

# Reset database
docker-compose down
docker volume rm docsafe_securevault_postgres_data
docker-compose up -d

# Database backup
pg_dump -h localhost -p 5430 -U securevault_user securevault > backup.sql
```

### Environment Configuration
- **Local Development**: `config/environments/.env.development`
- **Docker**: `config/environments/.env.docker`
- **Production**: `config/environments/.env.production`

### Script Management
```bash
# Setup project (one-time)
scripts/setup_project.bat

# Development environment
scripts/dev/start-dev-hybrid.bat

# Production environment
scripts/prod/start-prod.bat

# Run all tests
scripts/test-all.bat
```

## Security Guidelines

### Zero-Knowledge Principles
- All sensitive data must be encrypted on client before transmission
- Server never has access to encryption keys or plaintext data
- Use only authenticated encryption (AES-256-GCM, ChaCha20-Poly1305)
- Generate fresh random nonces for every encryption operation

### Cryptography Standards
- **Key Derivation**: Argon2id (preferred) or PBKDF2-HMAC-SHA-256 (≥200,000 iterations)
- **Encryption**: AES-256-GCM with 256-bit keys
- **Integrity**: AEAD authentication tags mandatory
- **Randomness**: CSPRNG for all cryptographic operations

### Data Validation
- Validate all inputs using Pydantic schemas
- Sanitize all outputs and database queries
- Use parameterized queries to prevent SQL injection
- Implement rate limiting and brute force protection

## Troubleshooting

### Common Issues
- **Database Connection**: Ensure Docker is running and containers are healthy
- **CORS Issues**: Check backend CORS middleware configuration
- **Encryption Errors**: Verify encryption password and key derivation parameters
- **MFA Problems**: Check time synchronization and TOTP secret storage
- **RBAC Issues**: Verify role assignments and permission inheritance

### Debug Commands
```bash
# Check database status
docker-compose ps

# View backend logs
docker-compose logs backend

# Test API connectivity
curl http://localhost:8002/health

# Verify Redis connection
redis-cli ping
```

## File Structure Key Areas

### Backend Important Files
- `app/main.py` - FastAPI application entry point
- `app/core/security.py` - Authentication and security logic
- `app/core/rbac.py` - Role-based access control
- `app/api/v1/` - API endpoints organized by feature
- `app/models/` - SQLAlchemy database models
- `app/schemas/` - Pydantic request/response schemas
- `app/services/` - Business logic layer
- `tests/` - Test suite with unit/integration/security tests

### Frontend Important Files
- `src/services/api.ts` - Centralized API client
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/components/` - Reusable React components
- `src/pages/` - Page-level components
- `src/stores/` - State management (Zustand)
- `src/utils/` - Utility functions and helpers
