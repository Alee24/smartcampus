
# Script to fix synchronization issues and reset login
Write-Host "--- Fixing Sync & Login Issues ---" -ForegroundColor Cyan

# 1. Backend Fixes
Write-Host "1. Resetting Database State..." -ForegroundColor Yellow
cd backend
python migrate_db.py
if ($LASTEXITCODE -ne 0) { Write-Host "Migration Warning (Safe to ignore if minor)"; }

Write-Host "2. Enforcing Admin Credentials..." -ForegroundColor Yellow
python reset_admin.py --quiet

cd ..

Write-Host "--- DONE! ---" -ForegroundColor Green
Write-Host "Try logging in now." -ForegroundColor White
Write-Host "Email: mettoalex@gmail.com" -ForegroundColor Cyan
Write-Host "Pass:  Digital2025" -ForegroundColor Cyan
