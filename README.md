# DocSafe - Zero-Knowledge Document Storage Platform

A secure, enterprise-grade document storage platform with client-side encryption, multi-factor authentication, and role-based access control.

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+** - Backend runtime
- **Node.js 18+** - Frontend build tool
- **Docker & Docker Compose** - Container orchestration
- **PostgreSQL 15** - Primary database (via Docker)
- **Redis 6** - Session management (via Docker)

### Development Setup (Recommended)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd docsafe

# 2. Run the setup script
scripts\setup_project.bat

# 3. Start development environment (local frontend/backend, Docker database)
scripts\dev\start-dev-hybrid.bat

# 4. Access the application
# Frontend: http://localhost:3005
# Backend API: http://localhost:8002
# API Documentation: http://localhost:8002/docs
```

### Test Credentials
- **Username**: `rahumana`
- **Password**: `TestPass123@`
- **Encryption Password**: `JHNpAZ39g!&Y`

## 📁 Project Structure

```
docsafe/
├── backend/                    # FastAPI Python backend
│   ├── app/                   # Application code
│   │   ├── api/              # API endpoints
│   │   ├── core/             # Core functionality
│   │   ├── models/           # Database models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── middleware/       # Security middleware
│   ├── requirements/         # Python dependencies
│   │   ├── base.txt         # Core requirements
│   │   ├── dev.txt          # Development tools
│   │   └── prod.txt         # Production server
│   ├── scripts/             # Backend utility scripts
│   └── tests/               # Backend test suite
├── frontend/                  # React TypeScript frontend
│   ├── src/                 # Application source
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   ├── stores/          # State management
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
├── config/                   # Configuration files
│   ├── docker/              # Docker compose files
│   ├── environments/        # Environment configurations
│   ├── nginx/               # Reverse proxy config
│   └── database/            # Database scripts
├── scripts/                  # Project automation scripts
│   ├── dev/                 # Development scripts
│   ├── prod/                # Production scripts
│   └── setup/               # Setup scripts
├── tests/                    # End-to-end tests
├── docs/                     # Documentation
└── data/                     # Runtime data storage
```

## 🔧 Development Modes

### 1. Hybrid Development (Recommended)
- **Frontend**: Local (http://localhost:3005)
- **Backend**: Local (http://localhost:8002)
- **Database**: Docker container (securevault_postgres)
- **Command**: `scripts\dev\start-dev-hybrid.bat`

### 2. Full Docker Development
- **All services**: Docker containers
- **Access**: http://localhost:8080 (via Nginx)
- **Command**: `scripts\prod\start-prod.bat`

### 3. Local Development
- **All services**: Local installation
- **Database**: Local PostgreSQL required
- **Command**: Manual setup required

## 🛡️ Security Features

### Zero-Knowledge Encryption
- **Client-side AES-256-GCM encryption**
- **PBKDF2 key derivation** (100,000 iterations)
- **Document Encryption Key (DEK)** architecture
- **No plaintext data** stored on server

### Multi-Factor Authentication
- **TOTP-based MFA** (Google Authenticator, Authy)
- **QR code provisioning**
- **Backup codes** for account recovery
- **Emergency disable** functionality

### Role-Based Access Control (RBAC)
- **5-tier role system**: Admin, Manager, User, Viewer, Guest
- **Granular permissions** for all operations
- **Role inheritance** and delegation
- **Audit trail** for all access events

### Security Headers & Middleware
- **HTTPS enforcement** in production
- **CSRF protection** with secure tokens
- **XSS prevention** with CSP headers
- **Rate limiting** and brute force protection

## 🔧 Database Management

```bash
# Navigate to docker directory for all database operations
cd config\docker

# Start database only
docker-compose -f docker-compose.dev.yml up -d postgres

# Run migrations
cd ..\..\backend
call venv\Scripts\activate
alembic upgrade head

# Create admin user
python scripts\create_admin_user.py

# Database backup
pg_dump -h localhost -p 5430 -U securevault_user securevault > backup.sql
```

## 🧪 Testing

### Backend Tests
```bash
cd config\docker

# Unit tests
docker-compose run --rm backend pytest -m unit

# Integration tests  
docker-compose run --rm backend pytest -m integration

# Security tests
docker-compose run --rm backend pytest -m security

# Full test suite with coverage
docker-compose run --rm backend pytest --cov=app
```

### Frontend Tests
```bash
cd config\docker

# Unit tests
docker-compose run --rm frontend npm test

# Coverage report
docker-compose run --rm frontend npm run test:coverage

# Type checking
docker-compose run --rm frontend npm run type-check
```

### End-to-End Tests
```bash
# From project root
npm run test:headed    # Run with browser visible
npm run test:debug     # Run in debug mode
```

## 📖 Documentation

- **[Architecture Guide](docs/architecture/Zero-Knowledge-Arch.md)** - System architecture and design
- **[Hybrid Setup Guide](docs/HYBRID_SETUP.md)** - Development environment setup
- **[Local Setup Guide](docs/LOCAL_SETUP.md)** - Local development configuration
- **[Project Structure](docs/PROJECT_STRUCTURE.md)** - Detailed project organization
- **[API Documentation](http://localhost:8002/docs)** - Interactive API documentation (when running)
- **[Testing Guide](docs/testing/RUN_TESTS.md)** - Comprehensive testing instructions

## 🚀 Deployment

### Production Deployment
```bash
# Build and start production environment
scripts\prod\start-prod.bat

# Access production application
https://localhost:8443  # HTTPS with SSL
http://localhost:8080   # HTTP redirect to HTTPS
```

### Environment Configuration
- **Local**: `config/environments/.env.local`
- **Docker Dev**: `config/environments/.env.docker`
- **Production**: `config/environments/.env.production`

## 🛠️ Code Quality

### Backend (Python)
```bash
cd config\docker

# Formatting
docker-compose run --rm backend black .
docker-compose run --rm backend isort .

# Linting
docker-compose run --rm backend ruff check .

# Type checking
docker-compose run --rm backend mypy app

# Security scanning
docker-compose run --rm backend bandit -r app
docker-compose run --rm backend safety check
```

### Frontend (TypeScript)
```bash
cd config\docker

# Linting
docker-compose run --rm frontend npm run lint

# Formatting
docker-compose run --rm frontend npm run format

# Type checking
docker-compose run --rm frontend npm run type-check
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests to ensure quality (`scripts\test-all.bat`)
4. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 🐛 Issues & Support

- **Bug Reports**: Create an issue with detailed reproduction steps
- **Feature Requests**: Describe the use case and expected behavior
- **Security Issues**: Please report privately to the maintainers

---

**DocSafe** - Secure by design, Zero-knowledge by default.