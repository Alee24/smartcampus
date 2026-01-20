# Start MySQL Service
# Right-click this file and select "Run with PowerShell as Administrator"

Write-Host "Starting MySQL80 service..." -ForegroundColor Cyan

try {
    Start-Service MySQL80
    Write-Host "MySQL80 started successfully!" -ForegroundColor Green
    
    # Verify it's running
    $service = Get-Service MySQL80
    Write-Host "`nService Status: $($service.Status)" -ForegroundColor Yellow
    
    if ($service.Status -eq "Running") {
        Write-Host "`n✓ MySQL is now running!" -ForegroundColor Green
        Write-Host "You can now login to the Smart Campus system." -ForegroundColor White
    }
}
catch {
    Write-Host "`n✗ Failed to start MySQL80" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nPlease run this script as Administrator:" -ForegroundColor Yellow
    Write-Host "Right-click → Run with PowerShell (Administrator)" -ForegroundColor Yellow
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
