#!/bin/bash

# Smart Campus Production Rebuild Script
# This script performs a clean rebuild while fixing common VPS DNS and container state issues.

echo "🚀 Starting Full Production Rebuild..."

# 1. Fix DNS (Bypass 'server misbehaving' error)
echo "🔧 Checking and fixing DNS connectivity..."
sudo systemctl stop systemd-resolved 2>/dev/null
sudo systemctl disable systemd-resolved 2>/dev/null
sudo rm /etc/resolv.conf 2>/dev/null
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf > /dev/null
echo "nameserver 1.1.1.1" | sudo tee -a /etc/resolv.conf > /dev/null

# 2. Pull Latest Code
echo "📥 Fetching latest code from GitHub..."
git reset --hard HEAD
git pull origin main

# 3. Complete Teardown
echo "🧹 Cleaning up existing containers and images..."
sudo docker-compose -f docker-compose.prod.yml down --remove-orphans
sudo docker system prune -af # Delete all unused images and build cache

# 4. Fresh Rebuild
echo "🏗️ Building and starting services (this may take a few minutes)..."
sudo docker-compose -f docker-compose.prod.yml up -d --build --force-recreate

# 5. Verify Health
echo "✅ Verifying service status..."
sudo docker-compose -f docker-compose.prod.yml ps

echo "--- ✨ Rebuild Complete! ---"
echo "Your app is now running with the latest code."
