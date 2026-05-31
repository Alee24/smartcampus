#!/bin/bash

# --- Smart Campus Apache Reverse Proxy Configurator ---
# This script sets up Apache2 on the host VPS to securely proxy 
# smartcampus.kkdes.co.ke to the isolated Docker frontend container on Port 9613.
# It automatically supports both HTTP and secure HTTPS with Let's Encrypt certificates.

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

# 3. Enable required Apache modules for proxying and SSL
echo "Enabling Apache proxy, rewrite, and SSL modules..."
a2enmod proxy || true
a2enmod proxy_http || true
a2enmod headers || true
a2enmod rewrite || true
a2enmod ssl || true

# 4. Ensure Webroot directory exists for Certbot ACME challenge
mkdir -p /var/www/html
chown -R www-data:www-data /var/www/html

# 5. Clean up any existing Certbot-generated virtual hosts that might conflict
if [ -f "/etc/apache2/sites-enabled/smartcampus-le-ssl.conf" ]; then
  echo "🧹 Cleaning up conflicting Certbot-generated SSL configuration link..."
  rm -f "/etc/apache2/sites-enabled/smartcampus-le-ssl.conf"
fi
if [ -f "/etc/apache2/sites-available/smartcampus-le-ssl.conf" ]; then
  echo "🧹 Removing conflicting Certbot-generated SSL configuration file..."
  rm -f "/etc/apache2/sites-available/smartcampus-le-ssl.conf"
fi

# 6. Check if Let's Encrypt SSL certificates exist
SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
  echo "🔒 SSL Certificates found!"
  echo "   Cert: $SSL_CERT"
  echo "   Key:  $SSL_KEY"
  echo "✍️ Writing dual HTTP (Port 80) and HTTPS (Port 443) VirtualHost configuration..."
  
  cat << EOF > "$CONFIG_FILE"
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN

    DocumentRoot /var/www/html

    # Allow Let's Encrypt HTTP ACME challenges to pass through cleanly
    ProxyPass /.well-known/acme-challenge/ !

    # Automatically redirect all other HTTP requests to HTTPS
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge
    RewriteRule ^(.*)$ https://%{HTTP_HOST}\$1 [R=301,L]

    # Logging
    ErrorLog \${APACHE_LOG_DIR}/smartcampus_error.log
    CustomLog \${APACHE_LOG_DIR}/smartcampus_access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN

    # Enable SSL Engine
    SSLEngine on
    SSLCertificateFile $SSL_CERT
    SSLCertificateKeyFile $SSL_KEY

    # Increase timeout limits for massive file uploads (e.g. ZIP photo uploads)
    ProxyTimeout 3600
    Timeout 3600

    # Preserve the original Host header from the client
    ProxyPreserveHost On

    # Reverse Proxy configuration pointing to the isolated Docker frontend port
    ProxyPass / http://127.0.0.1:$DOCKER_PORT/
    ProxyPassReverse / http://127.0.0.1:$DOCKER_PORT/

    # Logging
    ErrorLog \${APACHE_LOG_DIR}/smartcampus_ssl_error.log
    CustomLog \${APACHE_LOG_DIR}/smartcampus_ssl_access.log combined
</VirtualHost>
EOF

else
  echo "⚠️ SSL Certificates not found yet."
  echo "✍️ Writing HTTP (Port 80) VirtualHost configuration with ACME challenge bypass..."
  
  cat << EOF > "$CONFIG_FILE"
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN

    DocumentRoot /var/www/html

    # Allow Let's Encrypt HTTP ACME challenges to bypass the reverse proxy
    ProxyPass /.well-known/acme-challenge/ !

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
fi

# 7. Enable the site and restart Apache
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
if [ -f "$SSL_CERT" ]; then
  echo "   Secure Link: https://$DOMAIN"
else
  echo "   Link: http://$DOMAIN"
  echo "   👉 Run 'sudo certbot certonly --webroot -w /var/www/html -d $DOMAIN' to generate SSL."
fi
echo "=========================================================="
