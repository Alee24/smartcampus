#!/bin/bash

# Gatepass VPS Setup Script
# Works on Ubuntu/Debian

echo "--- Updating System ---"
sudo apt update && sudo apt upgrade -y

echo "--- Installing Docker ---"
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

echo "--- Installing Docker Compose ---"
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "--- Preparing Environment ---"
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example. PLEASE UPDATE IT!"
fi

echo "--- Building Gatepass ---"
sudo docker-compose build

echo "--- Setup Complete! ---"
echo "Next step: Run 'sudo docker-compose up -d'"
