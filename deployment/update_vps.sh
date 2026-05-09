#!/bin/bash

# Smart Campus VPS Update Script
echo "--- Updating Smart Campus System ---"

# 0. Check connectivity
if ! ping -c 1 github.com &> /dev/null; then
    echo "ERROR: Cannot reach github.com. Check VPS internet connection."
    exit 1
fi

# 1. Pull latest code
echo "Pulling latest changes from git..."
git pull origin main

# 2. Reset containers to fix 'ContainerConfig' or state issues
echo "Stopping existing services..."
sudo docker-compose -f docker-compose.prod.yml down

# 3. Rebuild and restart containers
echo "Rebuilding and restarting services..."
sudo docker-compose -f docker-compose.prod.yml up -d --build

# 4. Clean up
echo "Cleaning up unused Docker resources..."
sudo docker image prune -f

# 5. Confirm status
sudo docker-compose -f docker-compose.prod.yml ps

echo "--- Update Complete! ---"
