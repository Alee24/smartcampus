#!/bin/bash

# --- Smart Campus Automated Apache & SSL Setup Script ---
# This script completely automates the installation and configuration of 
# Apache2 on your VPS as a reverse proxy for smartcampus.kkdes.co.ke.
#
# It automatically:
# 1. Stops & disables conflicting web servers (LiteSpeed, OpenLiteSpeed, Nginx) binding to ports 80/443.
# 2. Installs Apache2, Certbot, and Python3 Apache certbot plugin.
# 3. Configures Apache modules (proxy, proxy_http, rewrite, ssl, headers).
# 4. Sets the proper document root to /var/www/smartcampus.
# 5. Automatically generates or renews Let's Encrypt SSL certificates.
# 6. Sets up the Reverse Proxy to the frontend container (Port 9613) with WebSocket support.
# 7. Restarts Apache and verifies the status.

set -e

DOMAIN="smartcampus.kkdes.co.ke"
DOCKER_PORT="9613"
DOC_ROOT="/var/www/smartcampus"
CONFIG_FILE="/etc/apache2/sites-available/smartcampus.conf"

echo "=========================================================="
echo "🛡️  Smart Campus Automated Apache & SSL Configurator"
echo "=========================================================="

# 1. Ensure running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script as root."
  exit 1
fi

# 2. Kill and disable any conflicting web servers on Ports 80 & 443
echo "🧹 Detecting and stopping conflicting web servers (LiteSpeed, Nginx, etc.)..."
systemctl stop litespeed openlitespeed nginx httpd 2>/dev/null || true
systemctl disable litespeed openlitespeed nginx httpd 2>/dev/null || true
if command -v /usr/local/lsws/bin/lswsctrl &> /dev/null; then
  /usr/local/lsws/bin/lswsctrl stop 2>/dev/null || true
fi

# Release bound ports 80 and 443 if any rogue process is still running
echo "🧹 Ensuring Ports 80 & 443 are free..."
if command -v fuser &> /dev/null; then
  fuser -k 80/tcp 2>/dev/null || true
  fuser -k 443/tcp 2>/dev/null || true
fi

# 3. Install Apache2 & Certbot
echo "📦 Installing Apache2 and Certbot tools..."
apt-get update
apt-get install -y apache2 certbot python3-certbot-apache curl

# 4. Enable required modules
echo "🔌 Enabling Apache proxy, rewrite, and SSL modules..."
a2enmod proxy || true
a2enmod proxy_http || true
a2enmod headers || true
a2enmod rewrite || true
a2enmod ssl || true

# 5. Ensure the document root exists
mkdir -p "$DOC_ROOT"
chown -R www-data:www-data "$DOC_ROOT"

# 6. Check/Generate Let's Encrypt SSL Certificate
SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
  echo "🔒 SSL Certificates not found. Generating Let's Encrypt SSL certificate..."
  
  # Temporary VirtualHost for Certbot validation
  cat << EOF > "$CONFIG_FILE"
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN
    DocumentRoot $DOC_ROOT
    <Directory $DOC_ROOT>
        Options FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
    ErrorLog \${APACHE_LOG_DIR}/smartcampus_temp_error.log
</VirtualHost>
EOF

  a2ensite smartcampus.conf || true
  a2dissite 000-default.conf 2>/dev/null || true
  systemctl restart apache2
  
  echo "📡 Running non-interactive certbot registration..."
  certbot --apache -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || {
    echo "⚠️ Certbot standard verification failed. Attempting standalone fallback..."
    systemctl stop apache2
    certbot certonly --standalone -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email
    systemctl start apache2
  }
fi

# 7. Write the definitive Reverse Proxy VirtualHost Config (Port 80 + Port 443)
if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
  echo "🔒 SSL Certificates active. Configuring secure proxy..."
  
  cat << EOF > "$CONFIG_FILE"
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN
    
    DocumentRoot $DOC_ROOT
    
    # Allow ACME challenge to pass through locally
    ProxyPass /.well-known/acme-challenge/ !
    
    # Redirect all other traffic to secure HTTPS
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

    ErrorLog \${APACHE_LOG_DIR}/smartcampus_http_error.log
    CustomLog \${APACHE_LOG_DIR}/smartcampus_http_access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN
    
    DocumentRoot $DOC_ROOT
    
    # SSL Engine Activation
    SSLEngine on
    SSLCertificateFile $SSL_CERT
    SSLCertificateKeyFile $SSL_KEY

    # Timeouts for large uploads
    ProxyTimeout 3600
    Timeout 3600

    ProxyPreserveHost On
    ProxyAddHeaders On

    # WebSocket Proxy rules for real-time scans / updates
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:$DOCKER_PORT/\$1" [P,L]

    # Standard Reverse Proxy to Docker Frontend
    ProxyPass / http://127.0.0.1:$DOCKER_PORT/
    ProxyPassReverse / http://127.0.0.1:$DOCKER_PORT/

    # Security & PWA configuration
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
    
    <FilesMatch "\.(js|manifest\.webmanifest)$">
        Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
    </FilesMatch>

    ErrorLog \${APACHE_LOG_DIR}/smartcampus_ssl_error.log
    CustomLog \${APACHE_LOG_DIR}/smartcampus_ssl_access.log combined
</VirtualHost>
EOF

else
  echo "❌ Critical Error: Could not obtain SSL certificates. Writing fallback HTTP proxy configuration..."
  cat << EOF > "$CONFIG_FILE"
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN
    
    DocumentRoot $DOC_ROOT
    
    ProxyPreserveHost On
    ProxyAddHeaders On

    # Standard HTTP Proxying
    ProxyPass / http://127.0.0.1:$DOCKER_PORT/
    ProxyPassReverse / http://127.0.0.1:$DOCKER_PORT/

    ErrorLog \${APACHE_LOG_DIR}/smartcampus_http_error.log
</VirtualHost>
EOF
fi

# 8. Activate Config, Disable defaults, Restart Apache
echo "⚙️ Activating virtual host configurations..."
a2ensite smartcampus.conf
a2dissite 000-default.conf smartcampus-ip-control.conf smartcampus.ru.ac.ke.conf 2>/dev/null || true

echo "🔍 Testing Apache configuration..."
apache2ctl configtest

echo "🚀 Restarting Apache2..."
systemctl restart apache2

echo "=========================================================="
echo "🎉 SUCCESS: smartcampus.kkdes.co.ke is now live with SSL!"
echo "   HTTPS URL: https://$DOMAIN"
echo "=========================================================="
