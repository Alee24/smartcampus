
# Start MySQL Service (XAMPP)
# Right-click this file and select "Run with PowerShell as Administrator"

Write-Host "Starting MySQL (XAMPP)..." -ForegroundColor Cyan

try {
    # Check if already running
    $process = Get-Process mysqld -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "MySQL is already running (PID: $($process.Id))" -ForegroundColor Green
    }
    else {
        Write-Host "Launching mysqld..." -ForegroundColor Yellow
        Start-Process "C:\xampp\mysql\bin\mysqld.exe" -ArgumentList "--defaults-file=C:\xampp\mysql\bin\my.ini", "--standalone" -WindowStyle Hidden
        
        Start-Sleep -Seconds 3
        
        $process = Get-Process mysqld -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "MySQL started successfully!" -ForegroundColor Green
        }
        else {
            Write-Host "Failed to verify MySQL start. Check logs." -ForegroundColor Red
        }
    }
}
catch {
    Write-Host "`n✗ Failed to start MySQL" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`nDone."
Start-Sleep -Seconds 2
