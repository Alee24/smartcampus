#!/bin/bash
set -e

DOMAIN="smartcampus.ru.ac.ke"
EMAIL="mettoalex@gmail.com"

echo "🔐 [SSL CONFIGURATOR] Starting SSL setup for $DOMAIN..."

# 1. Open Ports in UFW Firewall
echo "🛡️ Opening HTTP (80) and HTTPS (443) ports in UFW..."
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true

# 2. Check if certificates already exist
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ Certificates already exist! Proceeding to enable SSL in Apache..."
else
    echo "🌐 Certificates not found. Initiating secure standalone validation..."
    
    # Stop apache temporarily to free port 80
    echo "🛑 Temporarily stopping Apache..."
    sudo systemctl stop apache2 || true
    
    # Run certbot in standalone mode
    echo "🚀 Running Certbot in standalone mode..."
    if sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos -m $EMAIL; then
        echo "🎉 Successfully obtained SSL certificates!"
    else
        echo "❌ [ERROR] Certbot failed to obtain SSL certificate."
        echo "⚠️  Please verify that your domain '$DOMAIN' resolves to this server's public IP address."
        echo "⚠️  You can check DNS propagation at https://dnschecker.org/#A/$DOMAIN"
        echo "🔄 Restarting Apache in HTTP mode..."
        sudo systemctl start apache2 || true
        exit 1
    fi
fi

# 3. Copy the SSL Configuration to Apache
echo "🔧 Configuring Apache with SSL settings..."
sudo cp deployment/apache_vps_ssl.conf /etc/apache2/sites-available/smartcampus.conf

# 4. Enable SSL module and restart Apache
echo "🔄 Enabling Apache SSL modules and restarting..."
sudo a2enmod ssl || true
sudo a2enmod rewrite || true
sudo a2enmod proxy || true
sudo a2enmod proxy_http || true
sudo a2ensite smartcampus.conf || true
sudo a2dissite 000-default.conf || true

sudo systemctl restart apache2
echo "🚀 [SUCCESS] SSL setup is complete! Your app is now running securely at https://$DOMAIN"
