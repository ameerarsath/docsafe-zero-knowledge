# DocSafe Hybrid Development Setup

This guide helps you run the DocSafe project with:
- **Frontend & Backend**: Running locally on your primary system
- **Database**: Running in Docker container named `postgres`
- **Redis**: Running locally on your system

## Prerequisites

### Required Software

1. **Python 3.11+**
   - Download from: https://www.python.org/downloads/
   - Verify: `python --version` or `python3 --version`

2. **Node.js 18+**
   - Download from: https://nodejs.org/
   - Verify: `node --version` && `npm --version`

3. **Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop
   - Verify: `docker --version`

4. **Redis 6+** (Local)
   - Windows: Download from https://redis.io/download or use WSL
   - Alternative: Use Redis Cloud (free tier)
   - Verify: `redis-cli --version`

## Step 1: Docker Database Setup

### 1. Create PostgreSQL Container

```bash
# Create and start PostgreSQL container
docker run -d \
  --name postgres \
  -e POSTGRES_USER=securevault_user \
  -e POSTGRES_PASSWORD=securevault_password \
  -e POSTGRES_DB=securevault \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

# Verify container is running
docker ps
```

### 2. Test Database Connection

```bash
# Connect to PostgreSQL in container
docker exec -it postgres psql -U securevault_user -d securevault

# Test connection (should show database prompt)
\l
\q
```

### 3. Database Management Commands

```bash
# Start existing container
docker start postgres

# Stop container
docker stop postgres

# View container logs
docker logs postgres

# Remove container (if needed to recreate)
docker rm postgres

# Backup database
docker exec postgres pg_dump -U securevault_user securevault > backup.sql

# Restore database
docker exec -i postgres psql -U securevault_user -d securevault < backup.sql
```

## Step 2: Local Redis Setup

### Option 1: Local Redis (Recommended)

```bash
# Download and install Redis for Windows
# Or use WSL with Redis

# Start Redis server
redis-server

# Test Redis (in another terminal)
redis-cli ping
# Should return: PONG
```

### Option 2: Redis in Docker (Alternative)

```bash
# If you prefer Redis in Docker too
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine

# Test Redis
docker exec redis redis-cli ping
```

## Step 3: Backend Setup

### 1. Navigate to Backend Directory
```bash
cd D:\main\project\docsafe\backend
```

### 2. Create Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
```

### 3. Install Dependencies
```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install requirements
pip install -r requirements.txt
```

### 4. Environment Configuration

Create `D:\main\project\docsafe\backend\.env`:
```env
# Database Configuration - Docker PostgreSQL
DATABASE_URL=postgresql://securevault_user:securevault_password@localhost:5432/securevault
POSTGRES_USER=securevault_user
POSTGRES_PASSWORD=securevault_password
POSTGRES_DB=securevault
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis Configuration - Local Redis
REDIS_URL=redis://localhost:6379/0
# If using Redis in Docker:
# REDIS_URL=redis://localhost:6379/0

# Security Configuration
SECRET_KEY=your-super-secret-key-for-jwt-tokens-change-in-production-make-it-very-long-and-random-12345
ENCRYPTION_KEY=another-super-secret-encryption-key-change-in-production-67890
ALGORITHM=HS256

# Application Configuration
ENVIRONMENT=development
DEBUG=true
API_V1_STR=/api/v1
PROJECT_NAME=SecureVault

# CORS Configuration (for local development)
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:3005","http://127.0.0.1:3000","http://127.0.0.1:3005"]

# File Storage
UPLOAD_DIR=./encrypted-files
MAX_FILE_SIZE=104857600
ALLOWED_FILE_TYPES=["application/pdf","image/jpeg","image/png","text/plain","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]

# Email Configuration (optional)
MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-email@example.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_TLS=true
MAIL_SSL=false

# Session Configuration
SESSION_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Security Headers
SECURE_SSL_REDIRECT=false
SECURE_HSTS_SECONDS=0
```

### 5. Database Migration
```bash
# Make sure PostgreSQL container is running
docker start postgres

# Initialize Alembic (if needed)
alembic init alembic

# Create and apply migrations
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### 6. Create Admin User
```bash
# Create admin user
python create_admin_user.py
```

### 7. Start Backend Server
```bash
# Make sure virtual environment is activated
venv\Scripts\activate

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

## Step 4: Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd D:\main\project\docsafe\frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

Create `D:\main\project\docsafe\frontend\.env`:
```env
# API Configuration
VITE_API_URL=http://localhost:8002
VITE_WS_URL=ws://localhost:8002

# Application Configuration
VITE_APP_TITLE=DocSafe
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=development

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=false

# Security
VITE_SECURE_COOKIES=false
VITE_ENABLE_HTTPS=false

# File Upload
VITE_MAX_FILE_SIZE=104857600
VITE_CHUNK_SIZE=1048576

# Encryption
VITE_ENCRYPTION_ALGORITHM=AES-GCM
VITE_KEY_LENGTH=256

# UI Configuration
VITE_THEME=light
VITE_ENABLE_DARK_MODE=true
```

### 4. Start Frontend Server
```bash
npm run dev
```

## Step 5: Quick Start Scripts

I'll create convenient scripts for you to manage this hybrid setup.

## Step 6: Verification

### 1. Check Services
```bash
# Check Docker database
docker ps | findstr postgres

# Check backend API
curl http://localhost:8002/api/v1/health

# Check Redis (if local)
redis-cli ping
```

### 2. Check Frontend
- Open browser: http://localhost:3005
- Should see DocSafe login page

### 3. Test Login
- Use admin credentials created in Step 3.6
- Should be able to login and access dashboard

## Development Workflow

### Daily Startup
```bash
# 1. Start Docker database
docker start postgres

# 2. Start Redis (if local)
redis-server

# 3. Start Backend (new terminal, in backend directory)
venv\Scripts\activate
uvicorn app.main:app --reload --port 8002

# 4. Start Frontend (new terminal, in frontend directory)
npm run dev
```

### Daily Shutdown
```bash
# Stop services with Ctrl+C in terminals
# Optionally stop Docker container
docker stop postgres
```

## Troubleshooting

### Common Issues

1. **Docker Database Connection Failed**
   ```bash
   # Check if container is running
   docker ps
   
   # Start container if stopped
   docker start postgres
   
   # Check container logs
   docker logs postgres
   
   # Test connection
   docker exec -it postgres psql -U securevault_user -d securevault
   ```

2. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -ano | findstr :5432
   netstat -ano | findstr :8002
   netstat -ano | findstr :3005
   
   # Kill process if needed
   taskkill /PID [process-id] /F
   ```

3. **Database Migration Issues**
   ```bash
   # Reset Alembic if needed
   alembic stamp head
   alembic revision --autogenerate -m "Reset migration"
   alembic upgrade head
   ```

4. **Redis Connection Issues**
   ```bash
   # If Redis not working, try Docker Redis
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   
   # Update REDIS_URL in .env if needed
   ```

## Advantages of This Setup

✅ **Local Development Speed** - No Docker overhead for app code
✅ **Database Isolation** - Database in container, easy to reset/backup
✅ **Consistent Database** - Same PostgreSQL version across environments
✅ **Easy Database Management** - Docker commands for backup/restore
✅ **Live Reload** - Fast development with local code changes
✅ **IDE Integration** - Full IntelliSense and debugging support

## Production Notes

For production deployment:
1. Use managed database service (AWS RDS, etc.)
2. Use Redis cluster or managed Redis
3. Change all secret keys and passwords
4. Enable HTTPS/SSL
5. Configure proper CORS origins
6. Set up proper logging and monitoring

## Need Help?

1. Check Docker container status: `docker ps`
2. Check backend logs in terminal
3. Check frontend logs in browser console
4. Verify all services are running on correct ports
5. Check environment variables are correctly set