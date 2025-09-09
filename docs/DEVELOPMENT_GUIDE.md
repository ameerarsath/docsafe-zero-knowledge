# DocSafe Development Guide

This comprehensive guide covers everything you need to know to develop DocSafe effectively.

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+** - Backend runtime
- **Node.js 18+** - Frontend build tools
- **Docker Desktop** - Container orchestration
- **Git** - Version control
- **VSCode** (recommended) - IDE with configured workspace

### One-Command Setup
```bash
# Navigate to project directory
cd docsafe

# Validate your environment
scripts\validate_environment.bat

# Complete project setup
scripts\setup_project.bat

# Start development environment
scripts\dev\start-dev-hybrid.bat
```

## 📁 Project Structure

```
docsafe/
├── backend/                    # FastAPI Python backend
│   ├── app/                   # Application source code
│   ├── requirements/          # Python dependencies by environment
│   ├── scripts/              # Backend utilities and seeding
│   ├── tests/                # Backend test suite
│   ├── .env.dev/.env.prod    # Environment configurations
│   └── pyproject.toml        # Python tool configuration
├── frontend/                  # React TypeScript frontend
│   ├── src/                  # Application source code
│   ├── public/               # Static assets and utilities
│   ├── .env.dev/.env.prod    # Environment configurations
│   ├── .eslintrc.json        # ESLint configuration
│   └── .prettierrc           # Prettier configuration
├── config/                   # Project-wide configuration
│   ├── docker/              # Docker Compose files
│   ├── environments/        # Environment templates
│   └── nginx/               # Reverse proxy config
├── scripts/                 # Automation scripts
│   ├── dev/                 # Development scripts
│   ├── setup/               # Setup and initialization
│   └── validate_environment.bat # Environment validation
├── .vscode/                 # VSCode workspace configuration
├── .pre-commit-config.yaml  # Code quality hooks
└── docs/                    # Documentation
```

## 🛠️ Development Environment Setup

### Method 1: Automated Setup (Recommended)

```bash
# 1. Validate prerequisites
scripts\validate_environment.bat

# 2. Complete setup
scripts\setup_project.bat

# 3. Setup code quality tools (optional)
scripts\setup\setup-pre-commit.bat

# 4. Start development
scripts\dev\start-dev-hybrid.bat
```

### Method 2: Manual Setup

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements/dev.txt

# Setup environment
copy .env.dev .env

# Run database migrations
alembic upgrade head

# Create admin user
python scripts/create_admin_user.py
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Setup environment
copy .env.dev .env

# Start development server
npm run dev
```

#### Database Setup
```bash
# Start containers
cd config\docker
docker-compose -f docker-compose.dev.yml up -d securevault_postgres redis

# Verify containers
docker ps
```

## 🔧 Development Workflow

### Daily Development
```bash
# 1. Start your development environment
scripts\dev\start-dev-hybrid.bat

# 2. Open VSCode workspace
code docsafe.code-workspace

# 3. Make your changes
# - Backend changes: Hot reload enabled
# - Frontend changes: Hot reload enabled
# - Database changes: Run migrations

# 4. Test your changes
# Backend: pytest (via VSCode or terminal)
# Frontend: npm test (via VSCode or terminal)

# 5. Commit your changes (pre-commit hooks will run)
git add .
git commit -m "feat: add new feature"
```

### Environment Access Points
- **Frontend**: http://localhost:3005
- **Backend API**: http://localhost:8002
- **API Docs**: http://localhost:8002/docs
- **Database**: localhost:5430 (PostgreSQL)
- **Redis**: localhost:6380

### Test Credentials
```
Admin: rahumana / TestPass123@
Manager: manager / manager123
User: testuser / user123
Viewer: viewer / viewer123
```

## 🧪 Testing

### Backend Testing
```bash
cd backend
venv\Scripts\activate

# Run all tests
pytest

# Run specific test categories
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m security      # Security tests only

# Run with coverage
pytest --cov=app --cov-report=html
```

### Frontend Testing
```bash
cd frontend

# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## 🔍 Code Quality

### Automated Quality Checks (Pre-commit Hooks)
```bash
# Install pre-commit hooks (one-time setup)
scripts\setup\setup-pre-commit.bat

# Manual run on all files
pre-commit run --all-files
```

### Manual Code Quality Checks

#### Backend
```bash
cd backend
venv\Scripts\activate

# Format code
black .
isort .

# Lint code
ruff check .

# Type checking
mypy app

# Security scan
bandit -r app
safety check
```

#### Frontend
```bash
cd frontend

# Format code
npm run format

# Lint code
npm run lint
npm run lint:fix

# Type checking
npm run type-check
```

## 🐞 Debugging

### VSCode Debugging Setup
The workspace includes pre-configured debug configurations:

1. **Python: FastAPI Backend** - Debug the backend server
2. **Python: Uvicorn Server** - Debug with Uvicorn
3. **Python: Pytest** - Debug tests
4. **Node.js: Frontend Dev Server** - Debug frontend
5. **Launch Chrome with localhost** - Debug in browser
6. **Launch Full Stack** - Debug both backend and frontend

## 🚨 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using ports
netstat -an | findstr :3005
netstat -an | findstr :8002
netstat -an | findstr :5430

# Kill processes using ports
taskkill /f /im node.exe
taskkill /f /im python.exe
```

#### Database Connection Issues
```bash
# Check container status
docker ps

# View container logs
docker logs securevault_postgres

# Restart containers
docker-compose -f config\docker\docker-compose.dev.yml restart
```

## 🤝 Contributing

### Code Contributions
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes following project conventions
3. Write tests for new functionality
4. Run quality checks: `pre-commit run --all-files`
5. Commit with conventional format: `feat: add new feature`
6. Push and create pull request

### Commit Message Format
Use [Conventional Commits](https://conventionalcommits.org/):
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

---

**Happy Coding!** 🎉

This development environment is designed to be productive, secure, and maintainable.