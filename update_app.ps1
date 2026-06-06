# Smart Campus System - Consolidated Application Update Script
Write-Host "🚀 Starting Smart Campus Application Update..." -ForegroundColor Cyan

# 1. Pull latest code changes
Write-Host "📦 Pulling latest changes from Git..." -ForegroundColor Yellow
git checkout no-ai
git pull origin no-ai

# 2. Build the frontend docker image
Write-Host "🛠️ Rebuilding frontend Docker image..." -ForegroundColor Yellow
docker-compose build frontend

# 3. Bring up the containers
Write-Host "🚢 Starting Docker containers..." -ForegroundColor Yellow
docker-compose up -d

# 4. Run database migrations inside the backend container
Write-Host "🔧 Running database migrations..." -ForegroundColor Yellow
docker exec gatepass_backend python migrate_security_features.py

# 5. Restart backend to initialize newly seeded test accounts
Write-Host "🔄 Restarting backend service..." -ForegroundColor Yellow
docker restart gatepass_backend

Write-Host "✅ Application successfully updated and restarted!" -ForegroundColor Green
