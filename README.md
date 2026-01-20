# Smart Campus GatePass System

A production-ready, AI-powered Smart Campus System for gate entry, attendance, and vehicle intelligence.

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend dev)
- Python 3.10+ (for local backend dev)

### Quick Start (Docker)
1. **Build and Run Services**:
   ```bash
   docker-compose up --build -d
   ```
   This will start:
   - **PostgreSQL** (Port 5432): Main DB with `pgvector`.
   - **Redis** (Port 6379): Cache.
   - **Backend API** (Port 8000): FastApi Core.
   - **Frontend** (Port 5173): React Dashboard.
   - **Face AI Service** (Port 8001): DeepFace Service.

2. **Access the Application**:
   - Frontend Dashboard: [http://localhost:5173](http://localhost:5173)
   - Backend Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
   - Face AI Service Docs: [http://localhost:8001/docs](http://localhost:8001/docs)

### 🔑 Test Credentials
- **Email**: `mettoalex@gmail.com`
- **Password**: `Digital2025`

## 🏗 Architecture
- **Backend**: FastAPI, SQLModel, PostgreSQL (pgvector).
- **Frontend**: React, TailwindCSS, Framer Motion.
- **AI**: DeepFace (Face Rec), YOLOv8 (Vehicle - Planned).
- **Infrastructure**: Docker Compose, Nginx (Planned for Prod).

## 🛠 Development
To run frontend locally:
```bash
cd frontend
npm install
npm run dev
```

To run backend locally:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
