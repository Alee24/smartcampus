#!/bin/bash

# =================================================================
# Smart Campus VPS Manager & Auto-Healer
# =================================================================
# This script monitors the system health, auto-updates from git,
# and performs clean rebuilds if the system goes down.
# =================================================================

# 1. Configuration
# Get the absolute path of the project root (one level up from deployment/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"
CHECK_INTERVAL=300 # 5 minutes
HEALTH_URL="http://localhost:8080/health"
LOGIN_URL="http://localhost:8080/api/token"
ADMIN_USER="mettoalex@gmail.com"
ADMIN_PASS="Digital2025"

# Logs
LOG_FILE="$PROJECT_ROOT/deployment/manager.log"

log() {
    local message="$(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "$message"
    echo "$message" >> "$LOG_FILE"
}

# Function to perform a clean rebuild
rebuild_app() {
    log "🚀 [RECOVERY] Starting full system rebuild..."
    cd "$PROJECT_ROOT" || exit 1
    
    # a) Fix DNS (Common VPS issue)
    log "🔧 Ensuring DNS connectivity..."
    sudo rm /etc/resolv.conf 2>/dev/null
    echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf > /dev/null
    echo "nameserver 1.1.1.1" | sudo tee -a /etc/resolv.conf > /dev/null

    # b) Pull Latest Code
    log "📥 Fetching latest code from origin/main..."
    git fetch origin main
    git reset --hard origin/main
    git clean -fd
    
    # c) Teardown
    log "🧹 Cleaning up existing containers and images..."
    sudo docker-compose -f $COMPOSE_FILE down --remove-orphans
    sudo docker system prune -af # Free up disk space
    
    # d) Build and Start
    log "🏗️ Building and starting services..."
    sudo docker-compose -f $COMPOSE_FILE up -d --build
    
    # e) Wait for stabilization
    log "⏳ Waiting for database and backend to stabilize (40s)..."
    sleep 40
    
    # f) Run Migrations & Setup
    log "🗄️ Running all database migrations..."
    sudo docker exec gatepass_backend python run_all_migrations.py || log "⚠️ Migration runner failed"
    
    # g) Final check
    if verify_system; then
        log "✅ [SUCCESS] System is back online and healthy."
    else
        log "❌ [ERROR] System rebuild completed but health check still failing."
        log "📜 [DEBUG] Last 50 lines of backend logs:"
        sudo docker logs --tail 50 gatepass_backend >> "$LOG_FILE"
    fi
}

# Function to verify health and login
verify_system() {
    log "🔍 Checking system health..."
    
    # Check Health Endpoint
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 $HEALTH_URL)
    if [ "$HEALTH_STATUS" -ne 200 ]; then
        log "⚠️ Health check failed (HTTP $HEALTH_STATUS)"
        return 1
    fi
    
    # Check Login Endpoint (Verify backend + DB connectivity)
    log "🔐 Verifying login capability..."
    LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST $LOGIN_URL \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$ADMIN_USER" \
        -d "password=$ADMIN_PASS")
    
    if [ "$LOGIN_STATUS" -ne 200 ]; then
        log "⚠️ Login verification failed (HTTP $LOGIN_STATUS)"
        return 1
    fi
    
    return 0
}

# --- Main Execution ---

log "--- Initializing Smart Campus Manager ---"
cd "$PROJECT_ROOT" || exit 1

# Initial start/verify
if ! verify_system; then
    log "🚨 Initial check failed. Rebuilding system..."
    rebuild_app
fi

# Monitoring Loop
while true; do
    sleep $CHECK_INTERVAL
    log "🧐 Periodic health check..."
    if ! verify_system; then
        log "🚨 SYSTEM DOWN DETECTED! Triggering auto-recovery..."
        rebuild_app
    fi
done
