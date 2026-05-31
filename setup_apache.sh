#!/bin/bash

# --- Smart Campus Apache Reverse Proxy Configurator ---
# This script sets up Apache2 on the host VPS to securely proxy 
# smartcampus.kkdes.co.ke to the isolated Docker frontend container on Port 9613.

set -e

DOMAIN="smartcampus.kkdes.co.ke"
DOCKER_PORT="9613"
CONFIG_FILE="/etc/apache2/sites-available/smartcampus.conf"

echo "=========================================================="
echo "🛡️  Configuring Apache2 Host Proxy for $DOMAIN"
echo "=========================================================="

# 1. Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script with sudo or as root."
  exit 1
fi

# 2. Check if Apache is installed
if ! command -v apache2 &> /dev/null; then
  echo "⚠️  Apache2 is not installed. Installing apache2..."
  apt-get update && apt-get install -y apache2
else
  echo "✅ Apache2 is installed."
fi

# 3. Enable required Apache modules for proxying
echo "Enabling Apache proxy modules..."
a2enmod proxy
a2enmod proxy_http
a2enmod headers
a2enmod rewrite
a2enmod ssl || true

# 4. Create the Apache configuration file
echo "Writing VirtualHost configuration to $CONFIG_FILE..."
cat << EOF > "$CONFIG_FILE"
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN

    # Increase timeout limits for massive file uploads (e.g. ZIP photo uploads)
    ProxyTimeout 3600
    Timeout 3600

    # Preserve the original Host header from the client
    ProxyPreserveHost On

    # Reverse Proxy configuration pointing to the isolated Docker frontend port
    ProxyPass / http://127.0.0.1:$DOCKER_PORT/
    ProxyPassReverse / http://127.0.0.1:$DOCKER_PORT/

    # Logging
    ErrorLog \${APACHE_LOG_DIR}/smartcampus_error.log
    CustomLog \${APACHE_LOG_DIR}/smartcampus_access.log combined
</VirtualHost>
EOF

# 5. Enable the site and restart Apache
echo "Enabling the $DOMAIN site..."
a2ensite smartcampus.conf

# Disable default site if it conflicts
if [ -f "/etc/apache2/sites-enabled/000-default.conf" ]; then
  echo "Disabling default 000-default site to avoid conflicts..."
  a2dissite 000-default || true
fi

echo "Restarting Apache2 to apply configurations..."
systemctl restart apache2

echo "=========================================================="
echo "✅ Apache Host Reverse Proxy is successfully configured!"
echo "   $DOMAIN (Port 80) -> Docker Frontend (Port $DOCKER_PORT)"
echo "=========================================================="
echo ""
echo "🔒 OPTIONAL: To easily secure this domain with Free SSL (HTTPS):"
echo "   Run the following command:"
echo "   sudo certbot --apache -d $DOMAIN"
echo "=========================================================="
