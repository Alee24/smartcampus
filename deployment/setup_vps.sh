#!/bin/bash

# Smart Campus VPS Installation Script
# Target: Ubuntu Server / Debian
# Domain: smartcampus.ru.ac.ke

set -e

DOMAIN="smartcampus.ru.ac.ke"
EMAIL="mettoalex@gmail.com"

echo "--- Starting Smart Campus Installation ---"

# 1. Update & Install Dependencies
echo "Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release apache2 libapache2-mod-proxy-html xml2util certbot python3-certbot-apache

# 2. Install Docker
if ! command -v docker &> /dev/null
then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# 3. Install Docker Compose
if ! command -v docker-compose &> /dev/null
then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 4. Configure Apache
echo "Configuring Apache Reverse Proxy..."
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_balancer
sudo a2enmod lbmethod_byrequests
sudo a2enmod rewrite
sudo a2enmod ssl

sudo cp deployment/apache_vps.conf /etc/apache2/sites-available/smartcampus.conf
sudo a2ensite smartcampus.conf
sudo a2dissite 000-default.conf
sudo systemctl restart apache2

# 5. Prepare Environment
echo "Setting up production environment..."
if [ ! -f .env ]; then
    echo "DATABASE_URL=mysql+aiomysql://gatepass_user:user_password@db:3306/gatepass_v2" > .env
    echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env
    echo "ALGORITHM=HS256" >> .env
    echo "DEBUG_MODE=False" >> .env
    echo "PRODUCTION=True" >> .env
fi

# 6. Adjustments handled by docker-compose.prod.yml
# No manual file modification needed

# 7. Start Services
echo "Building and starting Docker containers..."
sudo docker-compose -f docker-compose.prod.yml pull || true
sudo docker-compose -f docker-compose.prod.yml up -d --build

# 8. SSL Setup
echo "Obtaining SSL certificate..."
# Note: This requires the domain to be pointed to this VPS IP
sudo certbot --apache -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect || echo "SSL Setup failed. Ensure domain is pointed to this server."

echo "--- Installation Complete! ---"
echo "Visit: https://$DOMAIN"
