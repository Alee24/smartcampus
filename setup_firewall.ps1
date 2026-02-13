# Setup Firewall Rules for Smart Campus System
# Right-click this file and select "Run with PowerShell as Administrator"

Write-Host "Setting up Windows Firewall rules for Smart Campus..." -ForegroundColor Cyan

try {
    # Check if rules already exist and remove them
    Write-Host "Removing old rules (if any)..." -ForegroundColor Yellow
    netsh advfirewall firewall delete rule name="Smart Campus Backend" 2>$null
    netsh advfirewall firewall delete rule name="Smart Campus Frontend" 2>$null
    
    # Add new rules
    Write-Host "`nAdding firewall rule for Backend (Port 8000)..." -ForegroundColor Cyan
    netsh advfirewall firewall add rule name="Smart Campus Backend" dir=in action=allow protocol=TCP localport=8000
    
    Write-Host "Adding firewall rule for Frontend (Port 5173)..." -ForegroundColor Cyan
    netsh advfirewall firewall add rule name="Smart Campus Frontend" dir=in action=allow protocol=TCP localport=5173
    
    Write-Host "`n✓ Firewall rules added successfully!" -ForegroundColor Green
    Write-Host "`nYour servers are now accessible on the network at:" -ForegroundColor White
    Write-Host "  Backend:  http://192.168.1.140:8000" -ForegroundColor Yellow
    Write-Host "  Frontend: http://192.168.1.140:5173" -ForegroundColor Yellow
}
catch {
    Write-Host "`n✗ Failed to add firewall rules" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nPlease run this script as Administrator:" -ForegroundColor Yellow
    Write-Host "Right-click -> Run with PowerShell (Administrator)" -ForegroundColor Yellow
}

Write-Host "`nDone."
Start-Sleep -Seconds 3
