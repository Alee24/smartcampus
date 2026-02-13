FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .

RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get clean

COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
