FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for MySQL and standard libraries
RUN apt-get update && apt-get install -y \
    libmariadb-dev \
    gcc \
    curl \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure static directories exist
RUN mkdir -p static/profiles uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
