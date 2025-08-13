# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start full development environment with Docker
cd config/docker && docker-compose up --build -d

# Start individual services
cd config/docker && docker-compose up -d backend db redis
cd config/docker && docker-compose up -d frontend

# Rebuild containers after dependency changes
cd config/docker && docker-compose build

# View logs
cd config/docker && docker-compose logs -f [service-name]

# Stop all services
cd config/docker && docker-compose down

# Backend linting and code quality
docker-compose run --rm backend black .
docker-compose run --rm backend ruff check .
docker-compose run --rm backend mypy app
docker-compose run --rm backend isort .

# Frontend linting and code quality
docker-compose run --rm frontend npm run lint
docker-compose run --rm frontend npm run format
docker-compose run --rm frontend npm run type-check

# Testing commands
docker-compose run --rm backend pytest
docker-compose run --rm backend pytest --cov=app
docker-compose run --rm frontend npm test
docker-compose run --rm frontend npm run test:coverage

# Security scanning
docker-compose run --rm backend bandit -r app
docker-compose run --rm backend safety check
```

## Project Architecture

This is a full-stack application with a FastAPI backend and React frontend, containerized with Docker for development.

SecureVault is a zero-knowledge enterprise document storage platform with client-side encryption, multi-factor authentication, and role-based access control.

### Key Configuration
- **Backend**: FastAPI with Python 3.11+, SQLAlchemy ORM, Alembic migrations
- **Frontend**: React 18+ with TypeScript, Vite build tool, Zustand for state management
- **Database**: PostgreSQL 15 with Redis for session management
- **Styling**: Tailwind CSS with PostCSS
- **Security**: AES-256-GCM client-side encryption, TOTP-based MFA, 5-tier RBAC
- **Containerization**: Docker Compose for development environment
- **Testing**: Pytest (backend), Vitest (frontend), Playwright (E2E)
- **API Documentation**: Auto-generated with FastAPI (Swagger/OpenAPI)

### Project Structure
```
/
├── backend/                 - FastAPI application
│   ├── app/
│   │   ├── main.py         - FastAPI app initialization
│   │   ├── api/            - API route handlers
│   │   │   ├── auth/       - Authentication endpoints  
│   │   │   └── v1/         - API version 1 routes (documents, encryption, mfa, rbac, etc.)
│   │   ├── core/           - Core functionality
│   │   │   ├── config.py   - Settings and configuration
│   │   │   ├── security.py - Authentication and security
│   │   │   ├── database.py - Database connection
│   │   │   ├── rbac.py     - Role-based access control
│   │   │   └── mfa.py      - Multi-factor authentication
│   │   ├── models/         - SQLAlchemy models (user, document, encryption, etc.)
│   │   ├── schemas/        - Pydantic schemas for validation
│   │   ├── services/       - Business logic services
│   │   └── middleware/     - Security middleware
│   ├── tests/              - Backend tests (unit, integration, security)
│   ├── requirements.txt    - Python dependencies
│   └── Dockerfile          - Backend container config
├── frontend/               - React TypeScript application
│   ├── src/
│   │   ├── components/     - React components
│   │   │   ├── ui/         - Reusable UI components
│   │   │   ├── auth/       - Authentication components
│   │   │   ├── documents/  - Document management components
│   │   │   ├── mfa/        - Multi-factor auth components
│   │   │   ├── rbac/       - Role-based access control components
│   │   │   └── security/   - Security-related components
│   │   ├── pages/          - Page components (dashboard, login, admin, etc.)
│   │   ├── hooks/          - Custom React hooks
│   │   ├── services/       - API service functions
│   │   ├── stores/         - Zustand state management
│   │   ├── types/          - TypeScript type definitions
│   │   └── utils/          - Utility functions (encryption, validation, etc.)
│   ├── package.json        - Node.js dependencies
│   └── Dockerfile          - Frontend container config
├── config/                 - Configuration files
│   ├── docker/             - Docker compose configurations
│   └── nginx/              - Reverse proxy configuration
├── tests/                  - End-to-end tests (Playwright)
├── data/                   - Development data storage
└── docs/                   - Documentation
```

### Important Notes
- Frontend runs on port 3005, Backend on port 8002, PostgreSQL on port 5430, Redis on port 6380
- Nginx reverse proxy on port 8080 (HTTP) and 8443 (HTTPS)
- Database migrations handled with Alembic
- Docker compose files located in `config/docker/`
- Test credentials: username `rahumana`, password `TestPass123@`
- Encryption password: `JHNpAZ39g!&Y`

## Docker Development Setup

### Services
- **backend**: FastAPI application server
- **frontend**: React development server with Vite
- **db**: PostgreSQL database
- **redis**: Redis for caching and sessions
- **nginx**: Reverse proxy (optional for production-like setup)

### Environment Configuration
```bash
# Backend (.env)
DATABASE_URL=postgresql://securevault_user:securevault_password@db:5432/securevault
REDIS_URL=redis://:redis_password@redis:6379/0
SECRET_KEY=your-super-secret-key-change-in-production
ENVIRONMENT=development

# Frontend (.env)
VITE_API_URL=http://localhost:8002
VITE_APP_TITLE=SecureVault
```

## Authentication & Security

### Backend Authentication
- JWT-based authentication with access/refresh tokens
- Password hashing with bcrypt
- OAuth2 with Bearer tokens
- Rate limiting and security headers
- CORS configuration for frontend integration

### Auth Flow
1. User registers/logs in via API endpoints
2. Backend returns JWT access and refresh tokens
3. Frontend stores tokens securely
4. API requests include Authorization header
5. Backend validates tokens on protected routes

## API Integration

### Backend API
- RESTful API with FastAPI
- Auto-generated OpenAPI documentation at `/docs`
- Pydantic models for request/response validation
- Structured error handling with proper HTTP status codes

### Frontend API Layer
- Axios or Fetch for HTTP requests
- API service functions organized by feature
- Request/response interceptors for auth tokens
- Error handling and loading states

## Database & Migrations

### Database Setup
- PostgreSQL as primary database
- SQLAlchemy ORM with declarative models
- Alembic for database migrations
- Connection pooling and async support

### Migration Commands
```bash
# Navigate to docker directory first
cd config/docker

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback migration
docker-compose exec backend alembic downgrade -1

# View migration history
docker-compose exec backend alembic history
```

## UI Components & Design System

### Frontend Stack
- React 18+ with TypeScript and Vite
- Tailwind CSS for styling and responsive design
- Lucide React for icons
- React Hook Form with Zod validation for form handling
- Axios for HTTP requests
- React Router for navigation

### State Management
- Zustand for global state management
- React Context for authentication state
- Local component state with useState/useReducer

### Key Features
- Zero-knowledge document encryption and storage
- Multi-factor authentication (TOTP)
- Role-based access control (5-tier system)
- Document upload, preview, and management
- Admin dashboard with user management
- Security monitoring and audit trails
- Template-based document workflows

## Testing

### Backend Testing
- Pytest with comprehensive test coverage
- Test categories: unit, integration, security
- Markers available: `unit`, `integration`, `security`, `slow`, `auth`, `token`, `password`, `mfa`
- Coverage requirement: minimum 80%
- Test execution: `cd config/docker && docker-compose run --rm backend pytest`

### Frontend Testing  
- Vitest for unit tests
- Testing Library for React component testing
- Test execution: `cd config/docker && docker-compose run --rm frontend npm test`

### End-to-End Testing
- Playwright for E2E testing
- Configuration in `config/playwright.config.js`
- Test execution: `npm run test` from root directory
- Tests focus on zero-knowledge upload and preview workflows

### Running Specific Tests
```bash
# Backend unit tests
docker-compose run --rm backend pytest -m unit

# Backend security tests  
docker-compose run --rm backend pytest -m security

# Frontend with coverage
docker-compose run --rm frontend npm run test:coverage

# E2E tests (Playwright)
npm run test:headed  # Run with browser visible
npm run test:debug   # Run in debug mode
```

## Code Quality

### Backend Standards
- **Formatting**: Black for code formatting
- **Linting**: Ruff for fast Python linting  
- **Type Checking**: MyPy with strict configuration
- **Import Sorting**: isort for organized imports
- **Security**: Bandit for security scanning, Safety for dependency checking

### Frontend Standards
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier for consistent code style
- **Type Checking**: TypeScript strict mode enabled
- **Testing**: Jest/Vitest with Testing Library

## Git Commit Guidelines
- Use Conventional Commits format: `type(scope): description`
- Use conventional branch naming: `feature/`, `fix/`, `chore/`, etc.
- Do not mention Claude as co-author or include Claude Code links