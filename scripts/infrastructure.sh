#!/bin/bash

# SecureVault Infrastructure Management Script
# This script provides utilities for managing the Docker infrastructure

set -e

PROJECT_NAME="securevault"
COMPOSE_FILE="docker-compose.yml"
COMPOSE_PROD_FILE="docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker and docker-compose are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

# Create necessary directories
create_directories() {
    log_info "Creating data directories..."
    mkdir -p data/files data/backups data/temp data/ssl
    log_success "Data directories created"
}

# Start the development environment
start_dev() {
    log_info "Starting development environment..."
    check_dependencies
    create_directories
    
    docker-compose -f $COMPOSE_FILE up --build -d
    
    log_success "Development environment started"
    log_info "Services will be available at:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend API: http://localhost:8000"
    echo "  - Backend Docs: http://localhost:8000/docs"
    echo "  - Nginx Proxy: http://localhost:80"
    echo "  - Database: localhost:5430"
    echo "  - Redis: localhost:6379"
}

# Start the production environment
start_prod() {
    log_info "Starting production environment..."
    check_dependencies
    create_directories
    
    if [ ! -f ".env" ]; then
        log_error ".env file not found. Please create it from .env.example"
        exit 1
    fi
    
    docker-compose -f $COMPOSE_PROD_FILE up --build -d
    
    log_success "Production environment started"
}

# Stop all services
stop() {
    log_info "Stopping services..."
    docker-compose -f $COMPOSE_FILE down
    docker-compose -f $COMPOSE_PROD_FILE down 2>/dev/null || true
    log_success "Services stopped"
}

# Check health of all services
health_check() {
    log_info "Checking service health..."
    
    services=("db" "redis" "backend" "frontend" "nginx")
    
    for service in "${services[@]}"; do
        if container_id=$(docker-compose ps -q $service 2>/dev/null) && [ -n "$container_id" ]; then
            health_status=$(docker inspect --format='{{.State.Health.Status}}' $container_id 2>/dev/null || echo "no-healthcheck")
            
            case $health_status in
                "healthy")
                    log_success "$service: healthy"
                    ;;
                "unhealthy")
                    log_error "$service: unhealthy"
                    ;;
                "starting")
                    log_warning "$service: starting"
                    ;;
                "no-healthcheck")
                    log_warning "$service: no health check configured"
                    ;;
                *)
                    log_warning "$service: unknown status ($health_status)"
                    ;;
            esac
        else
            log_error "$service: not running"
        fi
    done
}

# View logs for all services or a specific service
logs() {
    local service=${1:-}
    if [ -n "$service" ]; then
        log_info "Showing logs for $service..."
        docker-compose logs -f $service
    else
        log_info "Showing logs for all services..."
        docker-compose logs -f
    fi
}

# Clean up everything (containers, volumes, networks)
clean() {
    log_warning "This will remove all containers, volumes, and networks!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up..."
        docker-compose -f $COMPOSE_FILE down -v --remove-orphans
        docker-compose -f $COMPOSE_PROD_FILE down -v --remove-orphans 2>/dev/null || true
        docker system prune -f
        log_success "Cleanup completed"
    else
        log_info "Cleanup cancelled"
    fi
}

# Backup database
backup_db() {
    log_info "Creating database backup..."
    
    if ! docker-compose ps db | grep -q "Up"; then
        log_error "Database container is not running"
        exit 1
    fi
    
    backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose exec -T db pg_dump -U securevault_user securevault > "data/backups/$backup_file"
    
    log_success "Database backup created: data/backups/$backup_file"
}

# Restore database from backup
restore_db() {
    local backup_file=${1:-}
    
    if [ -z "$backup_file" ]; then
        log_error "Please specify a backup file"
        echo "Usage: $0 restore-db <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_warning "This will replace the current database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Restoring database from $backup_file..."
        docker-compose exec -T db psql -U securevault_user securevault < "$backup_file"
        log_success "Database restored"
    else
        log_info "Restore cancelled"
    fi
}

# Show usage information
usage() {
    echo "SecureVault Infrastructure Management"
    echo
    echo "Usage: $0 <command> [options]"
    echo
    echo "Commands:"
    echo "  start-dev           Start development environment"
    echo "  start-prod          Start production environment"
    echo "  stop               Stop all services"
    echo "  restart-dev        Restart development environment"
    echo "  restart-prod       Restart production environment"
    echo "  health             Check health of all services"
    echo "  logs [service]     Show logs (optionally for specific service)"
    echo "  clean              Clean up all containers, volumes, and networks"
    echo "  backup-db          Create database backup"
    echo "  restore-db <file>  Restore database from backup file"
    echo "  help               Show this help message"
    echo
    echo "Examples:"
    echo "  $0 start-dev"
    echo "  $0 logs backend"
    echo "  $0 backup-db"
    echo "  $0 restore-db data/backups/backup_20231120_143022.sql"
}

# Main command handling
case ${1:-} in
    "start-dev")
        start_dev
        ;;
    "start-prod")
        start_prod
        ;;
    "stop")
        stop
        ;;
    "restart-dev")
        stop
        start_dev
        ;;
    "restart-prod")
        stop
        start_prod
        ;;
    "health")
        health_check
        ;;
    "logs")
        logs $2
        ;;
    "clean")
        clean
        ;;
    "backup-db")
        backup_db
        ;;
    "restore-db")
        restore_db $2
        ;;
    "help"|"-h"|"--help")
        usage
        ;;
    *)
        log_error "Unknown command: ${1:-}"
        echo
        usage
        exit 1
        ;;
esac