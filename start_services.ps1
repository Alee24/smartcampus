# Smart Campus Service Restarter & Launcher

Write-Host "--- Smart Campus System Startup ---" -ForegroundColor Cyan

function Kill-Port ($port) {
    $currentEAP = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($process) {
        $pid_val = $process.OwningProcess
        Write-Host "Stopping process on port $port (PID: $pid_val)..." -ForegroundColor Yellow
        Stop-Process -Id $pid_val -Force -ErrorAction SilentlyContinue
    }
    else {
        Write-Host "Port $port is free." -ForegroundColor Green
    }
    $ErrorActionPreference = $currentEAP
}

# 1. Stop existing services
Write-Host "Cleaning up existing services..." -ForegroundColor White
Kill-Port 8000
Kill-Port 5173

Start-Sleep -Seconds 2

# 2. Start Backend
Write-Host "Starting Backend Server (Port 8000)..." -ForegroundColor Cyan
# Using --host 0.0.0.0 to allow mobile access
$backendCmd = "cd backend; python -m uvicorn app.main:app --reload --host 0.0.0.0"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# 3. Start Frontend
Write-Host "Starting Frontend Server (Port 5173)..." -ForegroundColor Cyan
# Using -- --host to allow mobile access
$frontendCmd = "cd frontend; npm run dev -- --host"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host "--- Services Started! Check the new windows. ---" -ForegroundColor Green
