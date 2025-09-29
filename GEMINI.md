## Project Overview

This project is a "Zero-Knowledge Document Storage Platform" called DocSafe. It is a full-stack web application with a Python/FastAPI backend and a React/TypeScript frontend. The application is designed to be secure, with client-side encryption, multi-factor authentication, and role-based access control. It uses Docker for containerization.

**Backend:**
- **Framework:** FastAPI
- **Database:** PostgreSQL with SQLAlchemy and Alembic for migrations
- **Authentication:** PyJWT, passlib, and cryptography
- **Document Processing:** `python-docx` for .docx, `openpyxl` for .xlsx, and `python-pptx` for .pptx files.

**Frontend:**
- **Framework:** React with TypeScript and Vite
- **State Management:** Zustand
- **Routing:** React Router
- **Styling:** Tailwind CSS
- **Document Previews:** `docx-preview`, `mammoth`, and `pdfjs-dist`

## Building and Running

The project uses Docker and a set of scripts for building and running the application.

**Development (Hybrid Mode):**
- Starts a local frontend and backend, with the database running in a Docker container.
- **Command:** `scripts\dev\start-dev-hybrid.bat`
- **Frontend:** http://localhost:3005
- **Backend API:** http://localhost:8002

**Production (Full Docker):**
- Runs all services in Docker containers.
- **Command:** `scripts\prod\start-prod.bat`
- **Application:** http://localhost:8080

**Testing:**
- **Backend:** `docker-compose run --rm backend pytest`
- **Frontend:** `docker-compose run --rm frontend npm test`
- **End-to-End:** `npm run test:headed`

## Development Conventions

- **Code Style:** The project uses `black`, `isort`, and `ruff` for the backend, and `prettier` and `eslint` for the frontend to maintain a consistent code style.
- **Testing:** The project has a comprehensive test suite, including unit, integration, and security tests for the backend, and unit and coverage tests for the frontend. End-to-end tests are run with Playwright.
- **Commits:** The `README.md` suggests a conventional commit format (e.g., `feat: Add amazing feature`).
- **Contributions:** The `README.md` outlines a standard fork-and-pull-request contribution workflow.
