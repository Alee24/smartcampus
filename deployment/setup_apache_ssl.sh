#!/bin/bash
# =============================================================
# Smart Campus - Apache & SSL Configuration Script
# =============================================================
# Domain: smartcampus.ru.ac.ke
# Document Root: /home/ruict/gatepass
# Proxy: Port 8080 (Docker Frontend)
# =============================================================

set -e

DOMAIN="smartcampus.ru.ac.ke"
DOC_ROOT="/home/ruict/gatepass"
EMAIL="admin@ru.ac.ke" # Change this to a valid email if needed

echo "🚀 Starting Apache & SSL Setup for $DOMAIN"
echo "=================================================="

# 1. Install Apache and Certbot if not present
echo "📦 Installing Apache and Certbot dependencies..."
sudo apt-get update
sudo apt-get install -y apache2 certbot python3-certbot-apache

# 2. Enable necessary Apache modules
echo "🔧 Enabling Apache modules (proxy, rewrite, headers)..."
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod ssl

# 3. Create Apache VirtualHost configuration
echo "📝 Creating VirtualHost configuration..."
VHOST_FILE="/etc/apache2/sites-available/$DOMAIN.conf"

sudo tee $VHOST_FILE > /dev/null <<EOF
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAdmin admin@$DOMAIN
    DocumentRoot $DOC_ROOT

    # Proxy settings for Docker Frontend (Port 8080)
    ProxyPreserveHost On
    
    # Increase timeout for large uploads
    ProxyTimeout 3600
    
    <Location />
        ProxyPass http://localhost:8080/
        ProxyPassReverse http://localhost:8080/
    </Location>

    # Logging
    ErrorLog \${APACHE_LOG_DIR}/$DOMAIN-error.log
    CustomLog \${APACHE_LOG_DIR}/$DOMAIN-access.log combined

    <Directory $DOC_ROOT>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF

# 4. Enable the new site and disable default if necessary
echo "🌐 Enabling site $DOMAIN..."
sudo a2ensite $DOMAIN.conf
# sudo a2dissite 000-default.conf # Optional: disable default site

# 5. Test configuration and restart Apache
echo "🔄 Restarting Apache..."
sudo apache2ctl configtest
sudo systemctl restart apache2

# 6. Run Certbot for SSL
echo "🔐 Obtaining SSL Certificate with Certbot..."
# --apache plugin handles the VHost modification automatically
# --non-interactive and --agree-tos for automation
# --redirect forces HTTPS
sudo certbot --apache -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect || {
    echo "⚠️ Certbot failed. This might be because the domain is not yet pointing to this server IP."
    echo "Please ensure $DOMAIN is pointed to $(curl -s https://ifconfig.me) in DNS."
}

echo "=================================================="
echo "✅ Setup Complete!"
echo "URL: https://$DOMAIN"
echo "Document Root: $DOC_ROOT"
echo "=================================================="
