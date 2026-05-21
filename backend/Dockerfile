FROM python:3.10-slim-bookworm

WORKDIR /app

# Bypass Fastly CDN (deb.debian.org) routing issues by using a direct mirror
RUN sed -i 's/deb.debian.org/ftp.us.debian.org/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || sed -i 's/deb.debian.org/ftp.us.debian.org/g' /etc/apt/sources.list 2>/dev/null || true

# Install system dependencies for MySQL and standard libraries
RUN (apt-get update || apt-get update --fix-missing) && apt-get install -y --no-install-recommends \
    libmariadb-dev \
    gcc \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure static directories exist
RUN mkdir -p static/profiles uploads

EXPOSE 8000

# Standard worker with extended timeouts for massive bulk uploads
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--timeout-keep-alive", "3600", "--timeout-graceful-shutdown", "3600"]
