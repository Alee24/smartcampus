#!/bin/bash

# Smart Campus VPS Update Script
# Usage: ./deployment/update_vps.sh

echo "--- Updating Smart Campus System ---"

# 1. Pull latest code
echo "Pulling latest changes from git..."
git pull origin main

# 2. Rebuild and restart containers
echo "Rebuilding and restarting services..."
sudo docker-compose -f docker-compose.prod.yml up -d --build

# 3. Clean up
echo "Cleaning up unused Docker resources..."
sudo docker image prune -f

# 4. Confirm status
sudo docker-compose -f docker-compose.prod.yml ps

echo "--- Update Complete! ---"
