#!/bin/bash

# ==============================================================================
# Gatepass Auto Start & Restarter Script (auto start.sh)
# Optimized by Antigravity AI
# ==============================================================================
# This script automatically restarts only Gatepass-related services,
# pulls updated code from GitHub, clears port conflicts, and boots up docker.
#
# Usage:
#   ./"auto start.sh"           -> Force restart, git pull, rebuild, and start
#   ./"auto start.sh" --monitor -> Lightweight check if down, then restart if needed
# ==============================================================================

# Exit on error for safety, except during custom checks
set -e

# 1. Setup paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "Gatepass Auto Start & Restarter Suite"
echo "Working Directory: $SCRIPT_DIR"
echo "Timestamp: $(date)"
echo "=========================================================="

# 2. Check dependencies & docker command
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    DOCKER_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_CMD="docker-compose"
else
    echo "[ERROR] Docker Compose is not installed on this VPS!"
    exit 1
fi

# Detect docker-compose file (production preferred)
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

# 3. Health Check function for monitoring mode
check_health() {
    echo "Performing application health check..."
    # Check if backend (port 8000) or frontend (port 8080) is responding
    # We use curl with a 5-second timeout
    if command -v curl >/dev/null 2>&1; then
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8000/health || echo "000")
        if [ "$HTTP_STATUS" = "200" ]; then
            echo "[SUCCESS] Backend is healthy (HTTP $HTTP_STATUS)."
            return 0
        else
            echo "[WARNING] Backend health check returned status $HTTP_STATUS."
            # Also check frontend just in case
            FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8080/ || echo "000")
            if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "304" ]; then
                echo "[SUCCESS] Frontend is responding (HTTP $FRONTEND_STATUS) even if backend is slow."
                return 0
            fi
            echo "[FAILURE] Both backend and frontend checks failed!"
            return 1
        fi
    else
        # Fallback check if curl is not installed
        if nc -z localhost 8000 >/dev/null 2>&1 || nc -z localhost 8080 >/dev/null 2>&1; then
            echo "[SUCCESS] Ports are responding to TCP connections."
            return 0
        else
            echo "[FAILURE] Ports 8000 and 8080 are closed!"
            return 1
        fi
    fi
}

# 4. Main execution logic
RESTART_REQUIRED=true

if [ "$1" = "--monitor" ] || [ "$1" = "monitor" ]; then
    echo "Running in MONITOR mode..."
    if check_health; then
        echo "Smart Campus is currently running and healthy. No restart needed."
        RESTART_REQUIRED=false
    else
        echo "Smart Campus appears to be DOWN. Initiating automatic recovery restart..."
        RESTART_REQUIRED=true
    fi
fi

if [ "$RESTART_REQUIRED" = "true" ]; then
    # Disable exit-on-error temporarily to allow pulling/stopping to fail gracefully
    set +e

    # A. Pull Updated Code from GitHub
    echo "----------------------------------------------------------"
    echo "Step A: Picking up updated code from GitHub..."
    echo "----------------------------------------------------------"
    # Ensure git repo is marked safe
    git config --global --add safe.directory "$SCRIPT_DIR" >/dev/null 2>&1
    
    # Detect current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    echo "Current Git branch is: $CURRENT_BRANCH"
    
    echo "Fetching origin..."
    git fetch --all
    
    echo "Resetting local edits to prevent merge conflicts (database/media folders are safe outside git tracking)..."
    git reset --hard "origin/$CURRENT_BRANCH"
    
    echo "Pulling latest branch changes..."
    git pull origin "$CURRENT_BRANCH"
    
    # B. Stop Gatepass Services
    echo "----------------------------------------------------------"
    echo "Step B: Stopping only Gatepass-related services..."
    echo "----------------------------------------------------------"
    echo "Running down command using: $DOCKER_CMD -f $COMPOSE_FILE"
    $DOCKER_CMD -f $COMPOSE_FILE down --remove-orphans
    
    # C. Clear Ports to prevent "Address already in use" errors on VPS
    echo "----------------------------------------------------------"
    echo "Step C: Reclaiming ports and terminating stray processes..."
    echo "----------------------------------------------------------"
    # Standard Gatepass ports: 8080 (frontend), 8000 (backend), 8001 (ai-face), 3307 (MySQL proxy)
    for port in 8080 8000 8001 3307 3306; do
        echo "Checking if port $port is blocked..."
        if command -v fuser >/dev/null 2>&1; then
            sudo fuser -k ${port}/tcp >/dev/null 2>&1
        fi
        if command -v lsof >/dev/null 2>&1; then
            PID=$(sudo lsof -t -i:${port})
            if [ ! -z "$PID" ]; then
                echo "Terminating stray process $PID on port $port..."
                sudo kill -9 $PID >/dev/null 2>&1
            fi
        fi
    done

    # Re-enable exit-on-error
    set -e

    # D. Rebuild and start entire gatepass server
    echo "----------------------------------------------------------"
    echo "Step D: Rebuilding and starting the application server..."
    echo "----------------------------------------------------------"
    # Build and boot containers in detached mode
    $DOCKER_CMD -f $COMPOSE_FILE up -d --build
    
    echo "=========================================================="
    echo "Restart complete! Gatepass services are booting up."
    echo "Active Gatepass containers:"
    docker ps --filter "name=gatepass_"
    echo "=========================================================="
    echo "NOTE: Database migrations are fully automated and will run"
    echo "automatically during the backend container startup."
    echo "=========================================================="
fi
