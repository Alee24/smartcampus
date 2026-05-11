#!/bin/bash
# =============================================================
# Smart Campus - FAST Production Update Script
# =============================================================
# This script updates the VPS WITHOUT re-downloading base images
# or reinstalling dependencies. It uses Docker's build cache
# to only rebuild layers that actually changed (your code).
#
# Usage: cd ~/gatepass && chmod +x deployment/quick_update.sh && ./deployment/quick_update.sh
# =============================================================

set -e

echo ""
echo "⚡ Smart Campus - Fast Update"
echo "================================"

# 1. Fix DNS if needed (common VPS issue)
if ! ping -c 1 -W 3 github.com &> /dev/null; then
    echo "🔧 Fixing DNS..."
    echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf > /dev/null
    echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf > /dev/null
fi

# 2. Pull latest code
echo "📥 Pulling latest code..."
git fetch origin main
git reset --hard origin/main

# 3. Stop only the app containers (keep db & redis running for zero-downtime)
echo "🔄 Rebuilding changed services..."

# Use docker-compose v1 or v2 depending on what's installed
if command -v docker-compose &> /dev/null; then
    DC="sudo docker-compose"
else
    DC="sudo docker compose"
fi

COMPOSE_FILE="docker-compose.prod.yml"

# Rebuild ONLY backend and frontend (the services with code changes)
# This uses Docker build cache - unchanged layers are NOT re-downloaded
$DC -f $COMPOSE_FILE build --parallel backend frontend

# 4. Recreate only the changed containers (db & redis stay untouched)
echo "🚀 Restarting updated services..."
$DC -f $COMPOSE_FILE up -d --no-deps --force-recreate backend frontend

# 5. Quick cleanup (only dangling images, keeps cache)
echo "🧹 Cleaning up old layers..."
sudo docker image prune -f --filter "dangling=true" 2>/dev/null || true

# 6. Verify
echo ""
echo "✅ Status:"
$DC -f $COMPOSE_FILE ps

echo ""
echo "⚡ Update complete! Only changed code was rebuilt."
echo ""
