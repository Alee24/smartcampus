#!/bin/bash
# =============================================================
# Smart Campus - FAST Production Update Script
# =============================================================
# Compatible with docker-compose v1 (1.29.x) on Ubuntu VPS
# Uses stop+rm+up instead of --force-recreate to avoid
# the 'ContainerConfig' KeyError bug in v1.
# =============================================================

set -e

echo ""
echo "⚡ Smart Campus - Fast Update"
echo "================================"

COMPOSE_FILE="docker-compose.prod.yml"

# Use sudo docker-compose (v1 on this VPS)
DC="sudo docker-compose -f $COMPOSE_FILE"

# 1. Fix DNS if needed
if ! ping -c 1 -W 3 github.com &> /dev/null; then
    echo "🔧 Fixing DNS..."
    echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf > /dev/null
    echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf > /dev/null
fi

# 2. Pull latest code
echo "📥 Pulling latest code..."
git fetch origin main
git reset --hard origin/main

# 3. Build new images (uses Docker layer cache - fast!)
echo "🔨 Building updated images..."
$DC build backend frontend

# 4. Stop and remove ONLY backend & frontend (db & redis stay up)
echo "🔄 Replacing backend & frontend containers..."
$DC stop backend frontend 2>/dev/null || true
$DC rm -f backend frontend 2>/dev/null || true

# 5. Start fresh containers with new images
$DC up -d

# 6. Quick cleanup
echo "🧹 Cleaning up old images..."
sudo docker image prune -f --filter "dangling=true" 2>/dev/null || true

# 7. Verify
echo ""
echo "✅ Status:"
$DC ps

echo ""
echo "⚡ Update complete!"
echo ""
echo "If you need to fix the database/admin login, run:"
echo "  sudo docker exec -it gatepass_backend python fix_db_and_admin.py"
echo ""
