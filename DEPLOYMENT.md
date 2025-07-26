# SecureVault Deployment Guide

## Current Development Status

✅ **Infrastructure Setup Complete** (Task 1.2)
- Docker Compose with 5 services (db, redis, backend, frontend, nginx)
- Full networking and health checks
- Persistent volumes and data management

✅ **TDD Test Structure Complete** (Task 2.1)  
- 129 comprehensive test methods
- Unit and integration test coverage
- Security-focused test vectors
- Performance and concurrency testing

🔄 **Basic Application Running**
- Minimal FastAPI backend with health endpoints
- React frontend with status dashboard
- All services containerized and orchestrated

⏳ **Next Phase: Authentication Implementation** (Task 2.2)
- JWT token system implementation
- Password hashing and validation
- Multi-factor authentication
- Session management

## Quick Deployment

### Prerequisites
- Docker Desktop installed and running
- At least 4GB RAM available
- Ports 80, 3000, 5430, 6379, 8000 available

### Deploy
```bash
# 1. Navigate to project directory
cd /path/to/ai_docsafe

# 2. Run deployment script
./deploy.sh
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Nginx Proxy**: http://localhost:80

## What You'll See

### Frontend (localhost:3000)
- Status dashboard showing service connectivity
- Development phase indicators
- API connection testing

### Backend API (localhost:8000)
- Health check endpoints working
- API documentation (Swagger UI)
- Authentication endpoints return "501 Not Implemented" (expected)

### Available Endpoints
- `GET /` - API information
- `GET /health` - Health check
- `GET /health/db` - Database health
- `POST /api/auth/login` - Placeholder (501)
- `POST /api/auth/logout` - Placeholder (501)
- `POST /api/auth/refresh` - Placeholder (501)

## Testing the Deployment

### 1. Check Service Health
```bash
# All services status
./scripts/infrastructure.sh health

# Individual service logs
docker-compose logs backend
docker-compose logs frontend
```

### 2. Test API Connectivity
```bash
# Health check
curl http://localhost:8000/health

# API info
curl http://localhost:8000/

# Database health
curl http://localhost:8000/health/db
```

### 3. Run Tests
```bash
# Run authentication tests (will show what's not implemented)
docker-compose exec backend python -m pytest tests/unit/test_password_hashing.py -v

# Run all tests
docker-compose exec backend python -m pytest tests/ -v
```

## Development Workflow

### Making Changes
1. Edit code in `backend/` or `frontend/`
2. Changes auto-reload (hot reload enabled)
3. Test via browser or API calls

### Running Tests
```bash
# Unit tests only
docker-compose exec backend python -m pytest tests/unit/ -v

# Integration tests
docker-compose exec backend python -m pytest tests/integration/ -v

# All tests with coverage
docker-compose exec backend python -m pytest tests/ --cov=app
```

### Stopping Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Troubleshooting

### Services Won't Start
```bash
# Check Docker resources
docker system info

# View detailed logs
docker-compose logs -f

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

### Port Conflicts
If ports are already in use:
1. Stop conflicting services
2. Or modify ports in `docker-compose.yml`

### Database Issues
```bash
# Check database logs
docker-compose logs db

# Connect to database
docker-compose exec db psql -U securevault_user -d securevault
```

## What's Expected vs Not Working

### ✅ Should Work
- All service containers start successfully
- Health checks pass
- Frontend loads and shows status
- API documentation accessible
- Database and Redis connections

### ❌ Expected to Not Work (Until Task 2.2)
- Login functionality (returns 501)
- User registration
- JWT token generation
- Password authentication
- Session management

This is expected behavior as we're following TDD methodology - tests exist but implementation is the next phase.

## Next Steps

To get full authentication working:
1. Implement Task 2.2 (Authentication Service)
2. Create database models and migrations
3. Implement JWT token system
4. Add password hashing and validation
5. Build MFA system

The comprehensive test suite (129 tests) will guide and validate the implementation.