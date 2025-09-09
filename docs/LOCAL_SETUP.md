# DocSafe Local Development Setup

This guide helps you run the DocSafe project directly on your system without Docker.

## Prerequisites

### Required Software

1. **Python 3.11+**
   - Download from: https://www.python.org/downloads/
   - Verify: `python --version` or `python3 --version`

2. **Node.js 18+**
   - Download from: https://nodejs.org/
   - Verify: `node --version` && `npm --version`

3. **PostgreSQL 15+**
   - Download from: https://www.postgresql.org/download/
   - Or use PostgreSQL installer for Windows
   - Verify: `psql --version`

4. **Redis 6+**
   - Windows: Download from https://redis.io/download or use WSL
   - Alternative: Use Redis Cloud (free tier)
   - Verify: `redis-cli --version`

## Step 1: Database Setup

### PostgreSQL Setup

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database and user
CREATE DATABASE securevault;
CREATE USER securevault_user WITH PASSWORD 'securevault_password';
GRANT ALL PRIVILEGES ON DATABASE securevault TO securevault_user;
ALTER USER securevault_user CREATEDB;

# Exit PostgreSQL
\q
```

### Redis Setup

**Option 1: Local Redis (recommended)**
```bash
# Start Redis server
redis-server

# Test Redis (in another terminal)
redis-cli ping
# Should return: PONG
```

**Option 2: Redis Cloud (if local Redis issues)**
1. Sign up at https://redis.com/try-free/
2. Create a free database
3. Get connection string: `redis://:[password]@[endpoint]:[port]`

## Step 2: Backend Setup

### 1. Navigate to Backend Directory
```bash
cd D:\main\project\docsafe\backend
```

### 2. Create Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
# source venv/bin/activate

# Verify activation (should show (venv) in prompt)
```

### 3. Install Dependencies
```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install requirements
pip install -r requirements.txt
```

### 4. Environment Configuration
```bash
# Create .env file in backend directory
# Copy and paste the content below
```

Create `D:\main\project\docsafe\backend\.env`:
```env
# Database Configuration
DATABASE_URL=postgresql://securevault_user:securevault_password@localhost:5432/securevault
POSTGRES_USER=securevault_user
POSTGRES_PASSWORD=securevault_password
POSTGRES_DB=securevault

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
# If using Redis Cloud, replace with your connection string:
# REDIS_URL=redis://:[your-password]@[your-endpoint]:[port]

# Security Configuration
SECRET_KEY=your-super-secret-key-for-jwt-tokens-change-in-production-make-it-very-long-and-random
ENCRYPTION_KEY=another-super-secret-encryption-key-change-in-production
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

# Email Configuration (optional - for password reset)
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
# Initialize Alembic (if not done)
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

### 6. Create Admin User
```bash
# Run the admin creation script
python create_admin_user.py
```

### 7. Start Backend Server
```bash
# Development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002

# Alternative with more verbose logging
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002 --log-level debug
```

**Backend should be running at:** http://localhost:8002
**API Documentation:** http://localhost:8002/docs

## Step 3: Frontend Setup

### 1. Navigate to Frontend Directory
```bash
# Open new terminal window
cd D:\main\project\docsafe\frontend
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Or if you prefer yarn:
# yarn install
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
# Development server
npm run dev

# Or with host binding
npm run dev -- --host 0.0.0.0
```

**Frontend should be running at:** http://localhost:3005

## Step 4: Verification

### 1. Check Backend Health
```bash
# Test API endpoint
curl http://localhost:8002/api/v1/health
# Should return: {"status": "ok"}

# Check database connection
curl http://localhost:8002/api/v1/admin/health
```

### 2. Check Frontend
- Open browser: http://localhost:3005
- Should see DocSafe login page
- No console errors in browser developer tools

### 3. Test Login
- Use admin credentials created in Step 2.6
- Should be able to login and access dashboard

## Step 5: Development Commands

### Backend Commands (from backend directory with venv activated)
```bash
# Start development server
uvicorn app.main:app --reload --port 8002

# Run tests
pytest

# Run tests with coverage
pytest --cov=app

# Code formatting
black .
isort .

# Linting
ruff check .

# Type checking
mypy app

# Security scanning
bandit -r app
safety check
```

### Frontend Commands (from frontend directory)
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# Testing
npm run test
npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Change ports in .env files or kill existing processes
   # Find process using port
   netstat -ano | findstr :8002
   netstat -ano | findstr :3005
   
   # Kill process by PID
   taskkill /PID [process-id] /F
   ```

2. **Database Connection Failed**
   ```bash
   # Check PostgreSQL is running
   pg_isready -h localhost -p 5432
   
   # Check credentials and database exists
   psql -h localhost -U securevault_user -d securevault
   ```

3. **Redis Connection Failed**
   ```bash
   # Check Redis is running
   redis-cli ping
   
   # Start Redis if needed
   redis-server
   ```

4. **Python Virtual Environment Issues**
   ```bash
   # Make sure virtual environment is activated
   which python  # Should show path to venv
   
   # Reinstall requirements if needed
   pip install --force-reinstall -r requirements.txt
   ```

5. **Node.js Dependencies Issues**
   ```bash
   # Clear npm cache and reinstall
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

## Production Considerations

For production deployment:
1. Change all secret keys and passwords
2. Use environment variables for sensitive data
3. Enable HTTPS/SSL
4. Configure proper CORS origins
5. Use production database (not localhost)
6. Enable security headers
7. Set up proper logging
8. Configure backup strategies

## Need Help?

1. Check logs for specific error messages
2. Verify all services are running (PostgreSQL, Redis)
3. Ensure all environment variables are set correctly
4. Check firewall/antivirus isn't blocking ports
5. Verify Python/Node.js versions match requirements