# Deploying Smart Campus on Ubuntu VPS

This guide outlines the steps to deploy the Smart Campus application on your live Ubuntu server. The system is containerized with Docker for easy setup and scalability.

## Prerequisites

-   A VPS running **Ubuntu** (22.04 or newer recommended).
-   **Docker** and **Docker Compose** installed.
-   A **Domain Name** (e.g., `smartcampus.yourdomain.com`) pointing to your VPS IP.

## 1. Project Setup

Clone your code to the server (or upload the files):

```bash
cd /opt
git clone <your-repo-url> gatepass
cd gatepass
```

## 2. Configuration

Create or update your environment variables if needed. Most defaults are pre-configured in `docker-compose.yml`.

> [!IMPORTANT]
> Change the `SECRET_KEY` in `docker-compose.yml` before deploying to a live server.

## 3. Deployment Command

Run the following command to build and start all services in detached mode:

```bash
docker compose up -d --build
```

This will:
1.  Launch **MySQL** (Database)
2.  Launch **Redis** (Cache/Session)
3.  Build and start the **Python Backend** (FastAPI)
4.  Build and start the **AI Face Service**
5.  Build the **React Frontend** and serve it via **Nginx** on Port 80.

## 4. Verification

Check the container status:

```bash
docker compose ps
```

Verify backend logs for successful database initialization:

```bash
docker compose logs -f backend
```

## 5. Domain & SSL (Recommended)

To enable HTTPS, you can use **Certbot** with Nginx. Since Nginx is running in Docker, the easiest way is to use a Reverse Proxy on the Host or an automated SSL container like `nginx-proxy-manager`.

### Simple Host-side Nginx Proxy (Optional)
If you have Nginx installed on the Ubuntu host, you can proxy to the Docker container:

```nginx
server {
    listen 80;
    server_name smartcampus.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

-   **Database Connection Issues**: The backend has a 10-attempt retry logic. If it fails, ensure the `gatepass_db` container is running.
-   **AI Service Memory**: DeepFace requires significant RAM (2GB+). If the container crashes, check your VPS memory limits.
-   **Static Files**: Profile images and uploads are persisted in `./backend/static` and `./backend/uploads` respectively.

---
Developed by **KKDES** | Optimized by **Antigravity AI**
