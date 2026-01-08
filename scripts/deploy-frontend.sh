#!/bin/bash
#
# Frontend Deployment Script for babmoa (Next.js 14 Standalone)
#
# Usage:
#   ./scripts/deploy-frontend.sh [options]
#
# Options:
#   --dry-run    Build only, do not deploy to server
#   --help       Show this help message
#
# Requirements:
#   - Node.js LTS installed locally
#   - SSH access to deployment server
#   - rsync installed locally
#

set -euo pipefail

# =============================================================================
# CONFIGURATION - Modify these values for your environment
# =============================================================================

# SSH Configuration
SSH_HOST="${SSH_HOST:-125.190.25.48}"
SSH_USER="${SSH_USER:-ksh}"
SSH_PORT="${SSH_PORT:-2222}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"

# Deployment paths
DEPLOY_DIR="/home/ksh/srv/babmoa"
LOCAL_CLIENT_DIR="packages/client"

# Standalone directory path (monorepo uses nested path)
# Will be set dynamically based on build output
STANDALONE_DIR=""

# PM2 process name
PM2_PROCESS_NAME="babmoa-fe"

# Port for frontend
FRONTEND_PORT="3002"

# =============================================================================
# COLORS AND HELPERS
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# FUNCTIONS
# =============================================================================

show_help() {
    cat << EOF
Frontend Deployment Script for babmoa (Next.js 14 Standalone)

Usage:
  ./scripts/deploy-frontend.sh [options]

Options:
  --dry-run    Build only, do not deploy to server
  --help       Show this help message

Environment Variables:
  SSH_HOST     Server hostname or IP (default: your-server-ip)
  SSH_USER     SSH username (default: your-username)
  SSH_PORT     SSH port (default: 22)
  SSH_KEY      Path to SSH private key (default: ~/.ssh/id_rsa)

Examples:
  # Deploy to server
  ./scripts/deploy-frontend.sh

  # Build only (dry run)
  ./scripts/deploy-frontend.sh --dry-run

  # Deploy with custom SSH settings
  SSH_HOST=192.168.0.100 SSH_USER=admin ./scripts/deploy-frontend.sh
EOF
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if we're in the project root
    if [[ ! -d "$LOCAL_CLIENT_DIR" ]]; then
        log_error "Cannot find $LOCAL_CLIENT_DIR directory. Please run this script from the project root."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi
    
    # Check rsync (only for actual deployment)
    if [[ "$DRY_RUN" == "false" ]]; then
        if ! command -v rsync &> /dev/null; then
            log_error "rsync is not installed."
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed."
}

build_frontend() {
    log_info "Building frontend..."
    
    cd "$LOCAL_CLIENT_DIR"
    
    # Run build
    if ! npm run build; then
        log_error "Build failed! Aborting deployment."
        exit 1
    fi
    
    # Find standalone server.js (handle monorepo nested paths)
    if [[ -f ".next/standalone/server.js" ]]; then
        STANDALONE_DIR=".next/standalone"
    elif [[ -f ".next/standalone/packages/client/server.js" ]]; then
        STANDALONE_DIR=".next/standalone/packages/client"
        log_info "Detected monorepo structure, using nested standalone path"
    else
        log_error "Standalone build output not found (server.js)."
        log_error "Make sure 'output: standalone' is set in next.config.ts"
        exit 1
    fi
    
    # Verify static directory exists
    if [[ ! -d ".next/static" ]]; then
        log_error "Static directory not found (.next/static)."
        exit 1
    fi
    
    # Verify public directory exists
    if [[ ! -d "public" ]]; then
        log_warn "Public directory not found. Continuing without public assets."
    fi
    
    cd - > /dev/null
    
    log_success "Build completed successfully."
    log_info "Standalone directory: ${LOCAL_CLIENT_DIR}/${STANDALONE_DIR}"
}

deploy_to_server() {
    log_info "Deploying to server ${SSH_USER}@${SSH_HOST}:${DEPLOY_DIR}..."
    
    SSH_CMD="ssh -p ${SSH_PORT} -i ${SSH_KEY}"
    
    # Step 1: Clear existing files in deploy directory (keep directory itself)
    log_info "Clearing existing files on server..."
    ${SSH_CMD} ${SSH_USER}@${SSH_HOST} "find ${DEPLOY_DIR} -mindepth 1 -delete 2>/dev/null || true; mkdir -p ${DEPLOY_DIR}"
    
    # Step 2: Copy standalone node_modules (from standalone root)
    log_info "Copying node_modules..."
    rsync -avz --progress \
        -e "ssh -p ${SSH_PORT} -i ${SSH_KEY}" \
        "${LOCAL_CLIENT_DIR}/.next/standalone/node_modules" \
        "${SSH_USER}@${SSH_HOST}:${DEPLOY_DIR}/"
    
    # Step 3: Copy standalone build (server.js, .next, etc from nested path for monorepo)
    log_info "Copying standalone build from ${STANDALONE_DIR}..."
    rsync -avz --progress \
        -e "ssh -p ${SSH_PORT} -i ${SSH_KEY}" \
        "${LOCAL_CLIENT_DIR}/${STANDALONE_DIR}/" \
        "${SSH_USER}@${SSH_HOST}:${DEPLOY_DIR}/"
    
    # Step 3: Copy static files (required for CSS/JS assets)
    # Ensure .next directory exists on server
    ${SSH_CMD} ${SSH_USER}@${SSH_HOST} "mkdir -p ${DEPLOY_DIR}/.next"
    
    log_info "Copying static assets..."
    rsync -avz --progress \
        -e "ssh -p ${SSH_PORT} -i ${SSH_KEY}" \
        "${LOCAL_CLIENT_DIR}/.next/static" \
        "${SSH_USER}@${SSH_HOST}:${DEPLOY_DIR}/.next/"
    
    # Step 4: Copy public directory if exists
    if [[ -d "${LOCAL_CLIENT_DIR}/public" ]]; then
        log_info "Copying public assets..."
        rsync -avz --progress \
            -e "ssh -p ${SSH_PORT} -i ${SSH_KEY}" \
            "${LOCAL_CLIENT_DIR}/public/" \
            "${SSH_USER}@${SSH_HOST}:${DEPLOY_DIR}/public/"
    fi
    
    log_success "Files deployed successfully."
}

restart_server() {
    log_info "Restarting server process..."
    
    SSH_CMD="ssh -p ${SSH_PORT} -i ${SSH_KEY}"
    
    # Check if PM2 is available
    if ${SSH_CMD} ${SSH_USER}@${SSH_HOST} "command -v pm2" &> /dev/null; then
        log_info "Using PM2 to manage process..."
        
        # Check if process exists
        if ${SSH_CMD} ${SSH_USER}@${SSH_HOST} "pm2 describe ${PM2_PROCESS_NAME}" &> /dev/null; then
            # Reload existing process
            ${SSH_CMD} ${SSH_USER}@${SSH_HOST} "pm2 reload ${PM2_PROCESS_NAME}"
            log_success "PM2 process reloaded."
        else
            # Start new process with PORT environment variable
            ${SSH_CMD} ${SSH_USER}@${SSH_HOST} "cd ${DEPLOY_DIR} && PORT=${FRONTEND_PORT} pm2 start server.js --name ${PM2_PROCESS_NAME}"
            log_success "PM2 process started."
        fi
    else
        log_warn "PM2 not found on server."
        log_info "Please restart the server process manually:"
        echo "  ssh ${SSH_USER}@${SSH_HOST} -p ${SSH_PORT}"
        echo "  cd ${DEPLOY_DIR}"
        echo "  node server.js"
    fi
}

# =============================================================================
# MAIN
# =============================================================================

DRY_RUN="false"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $arg"
            show_help
            exit 1
            ;;
    esac
done

echo ""
echo "========================================"
echo "  Frontend Deployment Script"
echo "========================================"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
    log_warn "DRY RUN MODE - Will only build, not deploy"
fi

# Execute deployment steps
check_prerequisites
build_frontend

if [[ "$DRY_RUN" == "false" ]]; then
    deploy_to_server
    restart_server
    
    echo ""
    log_success "Deployment completed!"
    echo ""
    echo "Server should be accessible at: http://${SSH_HOST}:${FRONTEND_PORT}"
    echo "Check server logs: ssh ${SSH_USER}@${SSH_HOST} -p ${SSH_PORT} 'pm2 logs ${PM2_PROCESS_NAME}'"
else
    echo ""
    log_success "Dry run completed!"
    echo ""
    echo "Build artifacts ready at:"
    echo "  - ${LOCAL_CLIENT_DIR}/.next/standalone/"
    echo "  - ${LOCAL_CLIENT_DIR}/.next/static/"
    echo "  - ${LOCAL_CLIENT_DIR}/public/"
fi
