# Smart Campus System - Implementation Plan

## Project Overview
A production-ready Smart Campus System handling gate entry, attendance, and vehicle intelligence using AI/ML, running on a Linux VPS architecture.

## Architecture

### 1. Technology Stack
- **OS**: Ubuntu Server (Target) / Windows (Dev) -> Dockerized interactions.
- **Containerization**: Docker & Docker Compose.
- **Database**: PostgreSQL (v15+) with `pgvector` extension for face embeddings.
- **Cache**: Redis.
- **Backend**: Python (FastAPI) for high-performance Async I/O and easy AI integration.
- **Frontend**: React (Vite) + TailwindCSS for a responsive, modern UI.
- **AI Services**:
    - **Face Recognition Service**: Python (FastAPI + DeepFace/ArcFace).
    - **Vehicle Intelligence Service**: Python (YOLOv8 + OCR).
- **Reverse Proxy**: Nginx.

### 2. Microservices / Containers
1.  `db`: PostgreSQL
2.  `redis`: Redis
3.  `backend`: Main Core API
4.  `frontend`: Web App
5.  `ai-face`: Face Recognition Module
6.  `ai-vehicle`: Vehicle Intelligence Module
7.  `nginx`: Gateway

## Phase 1: Core Architecture & Setup (Current)
- [ ] Initialize Git & Project Structure.
- [ ] Create `docker-compose.yml` foundations.
- [ ] Setup PostgreSQL with `pgvector`.
- [ ] Setup Backend (FastAPI) skeleton.
- [ ] Setup Frontend (React) skeleton.

## Phase 2: Database & Authentication
- [ ] Implement encryption for passwords.
- [ ] Create Database Models (SQLAlchemy/SQLModel) matching the provided Schema.
    - Roles, Users, Gates, Logs, Vehicles, Courses, Attendance.
- [ ] Implement Auth System (JWT).
    - RBAC (Role Based Access Control).

## Phase 3: Web Dashboard (Admin/Staff/Student)
- [ ] Admin Dashboard (Stats, User Management).
- [ ] Student Dashboard (QR Code generation, History).
- [ ] Security Guard Interface (Manual Entry, Verification).

## Phase 4: AI Microservices Integration
- [ ] **Face Recognition Service**:
    - Endpoint to register face (generate embedding).
    - Endpoint to verify face (compare embedding).
- [ ] **Vehicle Service**:
    - Endpoint to process car image -> Plate, Model, Color.

## Phase 5: Specific Workflows
- [ ] Gate Entry Logic (Scan -> Verify -> Log).
- [ ] Class Attendance Logic (Session -> Scan -> AI Check -> Log).
- [ ] Student Assistant Mode.

## Phase 6: Deployment & Security
- [ ] Nginx SSL Configuration (Certbot).
- [ ] Rate Limiting.
- [ ] Audit Logging.

## User Credentials
- Test Account: mettoalex@gmail.com / Digital2025
