#!/bin/bash

# =================================================================
# Smart Campus Manager Service Installer
# =================================================================
# This script installs the vps_manager.sh as a systemd service
# ensuring it runs on startup and stays active.
# =================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="gatepass-manager"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"

echo "🛠️ Installing Smart Campus Manager Service..."
echo "📍 Project Root: $PROJECT_ROOT"

# Ensure script is executable
chmod +x "$PROJECT_ROOT/deployment/vps_manager.sh"

# Create systemd service file
cat <<EOF | sudo tee $SERVICE_FILE > /dev/null
[Unit]
Description=Smart Campus VPS Manager & Health Monitor
After=network.target docker.service apache2.service

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_ROOT
ExecStart=/bin/bash $PROJECT_ROOT/deployment/vps_manager.sh
Restart=always
RestartSec=30
StandardOutput=append:$PROJECT_ROOT/deployment/manager.log
StandardError=append:$PROJECT_ROOT/deployment/manager.log

[Install]
WantedBy=multi-user.target
EOF

# Reload and Start
echo "🔄 Reloading systemd and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

echo "✅ Service '$SERVICE_NAME' installed and started."
echo "📜 You can check logs at: $PROJECT_ROOT/deployment/manager.log"
echo "📊 Check status: sudo systemctl status $SERVICE_NAME"
