#!/bin/bash
set -e

DOMAIN="smartcampus.ru.ac.ke"

echo "🔐 [SELF-SIGNED SSL] Generating SSL certificates for internal/LAN use..."

# 1. Ensure private key and certificate directories exist
sudo mkdir -p /etc/ssl/private
sudo mkdir -p /etc/ssl/certs

# 2. Generate the self-signed key and certificate
echo "🔑 Generating 2048-bit RSA key and certificate..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/smartcampus-selfsigned.key \
  -out /etc/ssl/certs/smartcampus-selfsigned.crt \
  -subj "/C=KE/L=Nairobi/O=Riara University/CN=$DOMAIN"

echo "✅ Generated key and certificate successfully!"

# 3. Copy the Apache configuration
echo "🔧 Configuring Apache for self-signed SSL proxy..."
sudo cp deployment/apache_vps_self_signed.conf /etc/apache2/sites-available/smartcampus.conf

# 4. Enable required modules and restart
echo "🔄 Enabling modules and reloading Apache..."
sudo a2enmod ssl || true
sudo a2enmod rewrite || true
sudo a2enmod proxy || true
sudo a2enmod proxy_http || true
sudo a2ensite smartcampus.conf || true
sudo a2dissite 000-default.conf || true

sudo systemctl restart apache2
echo "🚀 [SUCCESS] Self-signed SSL configuration complete! Apache restarted."
echo "🌐 You can now access your site internally at https://$DOMAIN (ignore browser warnings) or via http://172.16.3.170:8080"
