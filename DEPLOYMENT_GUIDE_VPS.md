# Linux VPS Deployment Guide

This guide describes how to deploy the Gatepass system on a fresh Linux VPS.

## 1. Fast Setup (Recommended)
Upload the project files to your VPS, enter the directory, and run:

```bash
chmod +x vps_setup.sh
./vps_setup.sh
```

## 2. Configuration
Edit the `.env` file to set your production passwords:

```bash
nano .env
```

## 3. Run the Application
Start the containers in detached mode:

```bash
sudo docker-compose up -d
```

## 4. Initialize Database
Run the database reset script inside the container to create tables and admin:

```bash
sudo docker exec -it gatepass_backend python reset_database.py
sudo docker exec -it gatepass_backend python update_admin_credentials.py
```

## 5. Apache Reverse Proxy
If you have Apache running on the host, copy the config from `site_config/apache_vps.conf` to `/etc/apache2/sites-available/` and enable it.

## 6. Access the App
- **Dashboard:** http://your-vps-ip (via port 80 proxy) or http://your-vps-ip:8080
- **API Docs:** http://your-vps-ip:8000/api/docs
