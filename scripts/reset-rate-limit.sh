#!/bin/bash

# SecureVault Rate Limit Reset Script
# This script resets login rate limits for users by clearing Redis keys
# Usage: ./reset-rate-limit.sh [username]

set -e  # Exit on any error

# Configuration
REDIS_PASSWORD="redis_password"
DOCKER_COMPOSE_FILE="docker-compose.yml"
REDIS_CONTAINER="securevault_redis"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [username]"
    echo ""
    echo "Examples:"
    echo "  $0 arahuman           # Reset rate limit for specific user"
    echo "  $0                    # Interactive mode - will prompt for username"
    echo "  $0 --list             # List all current rate limit keys"
    echo "  $0 --clear-all        # Clear all login rate limits"
    echo "  $0 --help             # Show this help message"
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
            print_error "Docker Compose not found. Please install Docker Compose."
            exit 1
        else
            # Use 'docker compose' instead of 'docker-compose'
            DOCKER_COMPOSE_CMD="docker compose"
        fi
    else
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
}

# Function to check if Redis container is running
check_redis_container() {
    if ! $DOCKER_COMPOSE_CMD ps | grep -q "$REDIS_CONTAINER.*Up"; then
        print_error "Redis container '$REDIS_CONTAINER' is not running."
        print_status "Starting Redis container..."
        $DOCKER_COMPOSE_CMD up -d redis
        sleep 3
    fi
}

# Function to execute Redis command
execute_redis_cmd() {
    local cmd="$1"
    $DOCKER_COMPOSE_CMD exec -T redis redis-cli -a "$REDIS_PASSWORD" $cmd 2>/dev/null
}

# Function to list all rate limit keys
list_rate_limit_keys() {
    print_status "Listing all login rate limit keys..."
    local keys=$(execute_redis_cmd "KEYS login:*")
    
    if [ -z "$keys" ] || [ "$keys" = "(empty array)" ]; then
        print_success "No rate limit keys found."
    else
        echo "$keys" | while read -r key; do
            if [ ! -z "$key" ]; then
                local ttl=$(execute_redis_cmd "TTL $key")
                local count=$(execute_redis_cmd "ZCARD $key")
                echo "  • $key (TTL: ${ttl}s, Count: $count)"
            fi
        done
    fi
}

# Function to clear all rate limit keys
clear_all_rate_limits() {
    print_warning "This will clear ALL login rate limits for ALL users."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Clearing all login rate limits..."
        local keys=$(execute_redis_cmd "KEYS login:*")
        
        if [ -z "$keys" ] || [ "$keys" = "(empty array)" ]; then
            print_success "No rate limit keys to clear."
        else
            local deleted=$(execute_redis_cmd "DEL $keys")
            print_success "Cleared $deleted rate limit keys."
        fi
    else
        print_status "Operation cancelled."
    fi
}

# Function to reset rate limit for specific user
reset_user_rate_limit() {
    local username="$1"
    local rate_limit_key="login:$username"
    
    print_status "Checking rate limit for user: $username"
    
    # Check if key exists
    local exists=$(execute_redis_cmd "EXISTS $rate_limit_key")
    
    if [ "$exists" = "0" ]; then
        print_success "No rate limit found for user '$username'."
        return 0
    fi
    
    # Get current info
    local ttl=$(execute_redis_cmd "TTL $rate_limit_key")
    local count=$(execute_redis_cmd "ZCARD $rate_limit_key")
    
    print_status "Current rate limit: $count attempts (TTL: ${ttl}s)"
    
    # Delete the key
    local deleted=$(execute_redis_cmd "DEL $rate_limit_key")
    
    if [ "$deleted" = "1" ]; then
        print_success "Rate limit cleared for user '$username'."
        print_status "User can now attempt to login again."
    else
        print_error "Failed to clear rate limit for user '$username'."
        exit 1
    fi
}

# Function to test login after reset
test_login() {
    local username="$1"
    
    read -p "Would you like to test login for '$username'? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Testing login endpoint..."
        
        # Try a dummy login to see if rate limit is cleared
        local response=$(curl -s -X POST http://localhost:8002/api/auth/login \
            -H "Content-Type: application/json" \
            -d "{\"username\": \"$username\", \"password\": \"dummy_password\"}" \
            --connect-timeout 5 --max-time 10)
        
        if echo "$response" | grep -q "Too many login attempts"; then
            print_error "Rate limit still active!"
        elif echo "$response" | grep -q "Invalid username or password"; then
            print_success "Rate limit cleared! (Got expected auth error instead of rate limit)"
        else
            print_warning "Unexpected response: $response"
        fi
    fi
}

# Main script logic
main() {
    # Check if help is requested
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_usage
        exit 0
    fi
    
    print_status "SecureVault Rate Limit Reset Tool"
    print_status "================================="
    
    # Check prerequisites
    check_docker_compose
    check_redis_container
    
    # Handle different modes
    case "$1" in
        "--list")
            list_rate_limit_keys
            ;;
        "--clear-all")
            clear_all_rate_limits
            ;;
        "")
            # Interactive mode
            echo
            read -p "Enter username to reset rate limit: " username
            if [ -z "$username" ]; then
                print_error "Username cannot be empty."
                exit 1
            fi
            reset_user_rate_limit "$username"
            test_login "$username"
            ;;
        *)
            # Direct username provided
            reset_user_rate_limit "$1"
            test_login "$1"
            ;;
    esac
    
    echo
    print_success "Script completed successfully!"
}

# Run main function with all arguments
main "$@"