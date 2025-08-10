# Claude Code Repository Guidance

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start full development environment with Docker
docker-compose up -d

# Start only backend services
docker-compose up -d backend db redis

# Start only frontend
docker-compose up -d frontend

# Rebuild containers after dependency changes
docker-compose build

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Linting
cd backend && flake8 . && black . --check
cd frontend && npm run lint
```

## Project Architecture

This is a full-stack application with a FastAPI backend and React frontend, containerized with Docker for development.

### Key Configuration
- **Backend**: FastAPI with Python 3.11+, SQLAlchemy ORM, Alembic migrations
- **Frontend**: React 18+ with TypeScript, Vite build tool
- **Database**: PostgreSQL with Redis for caching/sessions
- **Styling**: Tailwind CSS v4 with PostCSS
- **Containerization**: Docker Compose for development environment
- **API Documentation**: Auto-generated with FastAPI (Swagger/OpenAPI)

### Project Structure
```
/
├── backend/                 - FastAPI application
│   ├── app/
│   │   ├── main.py         - FastAPI app initialization
│   │   ├── api/            - API route handlers
│   │   │   ├── v1/         - API version 1 routes
│   │   │   └── deps.py     - Dependencies and middleware
│   │   ├── core/           - Core functionality
│   │   │   ├── config.py   - Settings and configuration
│   │   │   ├── security.py - Authentication and security
│   │   │   └── database.py - Database connection
│   │   ├── models/         - SQLAlchemy models
│   │   ├── schemas/        - Pydantic schemas for validation
│   │   ├── services/       - Business logic services
│   │   └── utils/          - Utility functions
│   ├── alembic/            - Database migrations
│   ├── tests/              - Backend tests
│   ├── requirements.txt    - Python dependencies
│   └── Dockerfile          - Backend container config
├── frontend/               - React application
│   ├── src/
│   │   ├── components/     - React components
│   │   │   ├── ui/         - Reusable UI components
│   │   │   ├── auth/       - Authentication components
│   │   │   └── layout/     - Layout components
│   │   ├── pages/          - Page components
│   │   ├── hooks/          - Custom React hooks
│   │   ├── services/       - API service functions
│   │   ├── store/          - State management (Zustand/Redux)
│   │   ├── types/          - TypeScript type definitions
│   │   └── utils/          - Utility functions
│   ├── public/             - Static assets
│   ├── package.json        - Node.js dependencies
│   └── Dockerfile          - Frontend container config
├── docker-compose.yml      - Multi-container development setup
└── nginx/                  - Reverse proxy configuration
```

### Important Notes
- API runs on port 8000, Frontend on port 3000
- Database migrations handled with Alembic
- Environment variables managed through .env files
- CORS configured for local development

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
DATABASE_URL=postgresql://user:password@db:5430/dbname
REDIS_URL=redis://redis:6379
SECRET_KEY=your-secret-key
API_V1_STR=/api/v1

# Frontend (.env)
VITE_API_URL=http://localhost:8002
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
# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback migration
docker-compose exec backend alembic downgrade -1
```

## UI Components & Design System

### Frontend Stack
- React 18+ with TypeScript and Vite
- Tailwind CSS for styling
- Headless UI or Radix UI for accessible components
- React Hook Form for form handling
- React Query/TanStack Query for server state

### State Management
- Zustand or Redux Toolkit for global state
- React Query for server state caching
- Local component state with useState/useReducer

### Key Features
- Dashboard for event management
- Content moderation tools
- Export functionality
- Credits system
- Multi-tenant architecture with organization support

## Git Commit Guidelines
- Please use Conventional Commits formatting for git commits
- Please use Conventional Branch naming (prefix-based branch naming convention)
- Please do not mention yourself (Claude) as a co-author when committing, or include any links to Claude Code

## Visual Development Memories
- Please use the playwright MCP server when making visual changes to the front-end to check your work

## Guidance Memories
- Please ask for clarification upfront, upon the initial prompts, when you need more direction

## Linting and Code Quality
- Backend: Use flake8, black, and mypy for Python code quality
- Frontend: Use ESLint and Prettier for TypeScript/React code
- Run linting after completing large additions or refactors

## CLI Tooling Memories
- Please use the `gh` CLI tool when appropriate, create issues, open pull requests, read comments, etc.
- Use Docker Compose commands for container management
- Use Alembic CLI for database migrations

## Documentation Memories
- Please use context? to find the relevant, up-to-date documentation when working with 3rd party libraries
- Backend API documentation available at `/docs` endpoint
- Keep README files updated for both backend and frontend setup instructions

## Development Memories
- Frontend runs on port 3005, backend on port 8002, postgres on port 5430
- Test credentials for rahumana : TestPass123@
- Encryption password : JHNpAZ39g!&Y