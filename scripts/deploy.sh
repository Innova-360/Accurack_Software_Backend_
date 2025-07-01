#!/bin/bash

# ================================
# ACCURACK PRODUCTION DEPLOYMENT SCRIPT
# ================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
IMAGE_NAME="accurack-backend"
BACKUP_DIR="./backups"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f ".env" ]; then
        log_error ".env file not found!"
        log_info "Please copy .env.example to .env and configure your environment variables"
        exit 1
    fi
    log_success ".env file found"
}

# Backup current database (optional)
backup_database() {
    if [ "$1" = "--backup" ]; then
        log_info "Creating database backup..."
        mkdir -p "$BACKUP_DIR"
        BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql"
        
        # Create backup using environment variables
        source .env
        if [ -n "$DATABASE_URL" ]; then
            pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null || {
                log_warning "Backup failed (this is normal for first deployment)"
            }
        fi
    fi
}

# Pull latest code
pull_latest_code() {
    log_info "Pulling latest code from Git..."
    if git rev-parse --git-dir > /dev/null 2>&1; then
        git pull origin main || git pull origin master
        log_success "Code updated successfully"
    else
        log_warning "Not a Git repository, skipping git pull"
    fi
}

# Build and deploy
deploy() {
    log_info "Building Docker image..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache

    log_info "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" down

    log_info "Starting new containers..."
    docker-compose -f "$COMPOSE_FILE" up -d

    log_info "Waiting for application to start..."
    sleep 30

    # Health check
    log_info "Performing health check..."
    for i in {1..10}; do
        if curl -f http://localhost:4000/api/v1/health >/dev/null 2>&1; then
            log_success "Application is healthy!"
            break
        elif [ $i -eq 10 ]; then
            log_error "Health check failed after 10 attempts"
            docker-compose -f "$COMPOSE_FILE" logs --tail=50
            exit 1
        else
            log_info "Waiting for application... (attempt $i/10)"
            sleep 10
        fi
    done
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f
    docker system prune -f --volumes=false
    log_success "Cleanup completed"
}

# Show status
show_status() {
    log_info "Current deployment status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    log_info "Recent logs:"
    docker-compose -f "$COMPOSE_FILE" logs --tail=20
}

# Rollback function
rollback() {
    log_warning "Rolling back to previous version..."
    # This would require image tagging strategy
    log_error "Rollback not implemented yet. Please redeploy manually."
}

# Main deployment process
main() {
    case "${1:-deploy}" in
        "deploy")
            log_info "🚀 Starting Accurack Backend Deployment..."
            check_env_file
            backup_database "$2"
            pull_latest_code
            deploy
            cleanup
            show_status
            log_success "🎉 Deployment completed successfully!"
            ;;
        "status")
            show_status
            ;;
        "logs")
            docker-compose -f "$COMPOSE_FILE" logs -f
            ;;
        "stop")
            log_info "Stopping all containers..."
            docker-compose -f "$COMPOSE_FILE" down
            log_success "All containers stopped"
            ;;
        "restart")
            log_info "Restarting containers..."
            docker-compose -f "$COMPOSE_FILE" restart
            log_success "Containers restarted"
            ;;
        "rollback")
            rollback
            ;;
        "help"|*)
            echo "Accurack Backend Deployment Script"
            echo ""
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  deploy [--backup]  Deploy latest version (optionally backup DB)"
            echo "  status            Show current status"
            echo "  logs              Show and follow logs"
            echo "  stop              Stop all containers"
            echo "  restart           Restart containers"
            echo "  rollback          Rollback to previous version"
            echo "  help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 deploy --backup    # Deploy with database backup"
            echo "  $0 deploy             # Deploy without backup"
            echo "  $0 status             # Check deployment status"
            echo "  $0 logs               # View real-time logs"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
