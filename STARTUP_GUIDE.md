# Gatepass System Startup Guide

This guide provides complete instructions for starting the Gatepass Smart Campus System.

## 🚀 Quick Start (Recommended)

The easiest way to run the entire system (Database, Backend, Frontend, AI Services) is using Docker.

### Prerequisites
- Docker Desktop installed and running.

### Steps
1. Open a terminal in the project root.
2. Run the following command:
   ```bash
   docker-compose up --build -d
   ```
3. Wait for all containers to start.

It will start:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Face AI Service**: [http://localhost:8001/docs](http://localhost:8001/docs)

---

## 💻 Windows Developer Startup

If you are developing on Windows and want to run services locally (outside Docker), use the provided helper scripts.

### Option 1: PowerShell Launcher (New Windows)
This script stops any running instances and opens separate PowerShell windows for Backend and Frontend.

1. Right-click `start_services.ps1` and select **Run with PowerShell**.
   *OR*
2. Run from terminal:
   ```powershell
   
   ```

### Option 2: Single Terminal Runner
This script runs both Backend and Frontend in a single terminal window with color-coded logs.

1. Run from terminal:
   ```bash
   python dev_runner.py
   ```
   *(Press `Ctrl+C` to stop all services)*

---

## 🛠 Manual Setup (Step-by-Step)

If you prefer to run things manually or need to debug specific components.

### 1. Database Setup
Ensure you have **PostgreSQL** running locally on port `5432` and **Redis** on port `6379`.
- If you don't have them installed, you can just run the DB services via Docker:
  ```bash
  docker-compose up -d db redis
  ```

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create/Activate Virtual Environment (Optional but recommended):
   ```bash
   python -m venv venv
   .\venv\Scripts\Activate
   ```
3. Install Dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the Server:
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Dependencies:
   ```bash
   npm install
   ```
3. Start the Development Server:
   ```bash
   npm run dev -- --host
   ```

---

## 🔑 Default Credentials

Use these credentials to log in to the web dashboard:

- **Email**: `mettoalex@gmail.com`
- **Password**: `Digital2025`

## ❓ Troubleshooting

- **Ports in Use**: If you see errors about port 8000 or 5173 being busy, run the `kill_services.ps1` or let `dev_runner.py` clean them up.
- **Database Connection**: Ensure your `.env` file in `backend/` has the correct database credentials.
- **Docker Errors**: Ensure Docker Desktop is running. Try `docker-compose down` followed by `docker-compose up --build`.
