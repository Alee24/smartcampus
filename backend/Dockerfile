FROM python:3.10-slim-bookworm

WORKDIR /app



# Use pre-compiled Python wheels to bypass apt package downloads and local compilations


COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure static directories exist
RUN mkdir -p static/profiles uploads

EXPOSE 8000

# Standard worker with extended timeouts for massive bulk uploads
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--timeout-keep-alive", "3600", "--timeout-graceful-shutdown", "3600"]
