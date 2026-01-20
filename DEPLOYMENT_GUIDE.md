# Ubuntu VPS Deployment Guide

This guide details how to deploy the Smart Campus GatePass system on a fresh Ubuntu 20.04/22.04 LTS Server.

## 1. Initial Server Setup
Connect to your VPS:
```bash
ssh root@your_server_ip
```

Update system:
```bash
apt update && apt upgrade -y
```

Create a new user (avoid running as root):
```bash
adduser gatekeeper
usermod -aG sudo gatekeeper
su - gatekeeper
```

## 2. Install Docker & Docker Compose
Install essential dependencies:
```bash
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
```

Add Docker repository:
```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Install Docker:
```bash
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io python3-pip -y
```

Install Docker Compose:
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

Verify installation:
```bash
docker --version
docker-compose --version
```

## 3. Deploy the Application
Clone the repository (or upload your files):
```bash
git clone https://github.com/your-repo/gatepass.git
cd gatepass
```

Create `.env` file (if not in repo) with secure production secrets:
```bash
nano .env
```
*Add your database passwords, secret keys, etc here.*

Run the application:
```bash
docker-compose up --build -d
```

## 4. Nginx & SSL Configuration (Production)
Install Nginx and Certbot:
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Configure Nginx Proxy (`/etc/nginx/sites-available/gatepass`):
```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/gatepass /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Setup SSL with Let's Encrypt:
```bash
sudo certbot --nginx -d your-domain.com
```

## 5. Maintenance
View logs:
```bash
docker-compose logs -f
```

Backup Database:
```bash
docker exec -t gatepass_db pg_dumpall -c -U admin > dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql
```
