from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import User
from app.routers.admin import ensure_admin
import os
import shutil
import socket
import json
import datetime

router = APIRouter()

def docker_socket_request(method: str, path: str, body: dict = None):
    socket_path = "/var/run/docker.sock"
    if not os.path.exists(socket_path):
        return None
    try:
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.connect(socket_path)
        
        req = f"{method} {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n"
        if body:
            body_str = json.dumps(body)
            req += f"Content-Type: application/json\r\nContent-Length: {len(body_str)}\r\n"
            req += "\r\n" + body_str
        else:
            req += "\r\n"
            
        s.sendall(req.encode('utf-8'))
        
        # Read response
        resp = b""
        while True:
            data = s.recv(4096)
            if not data:
                break
            resp += data
        s.close()
        
        # Parse response
        parts = resp.split(b"\r\n\r\n", 1)
        if len(parts) > 1:
            body_part = parts[1]
            header_part = parts[0].decode('utf-8', errors='ignore')
            if "Transfer-Encoding: chunked" in header_part:
                chunks = []
                idx = 0
                while idx < len(body_part):
                    line_end = body_part.find(b"\r\n", idx)
                    if line_end == -1:
                        break
                    chunk_len_str = body_part[idx:line_end]
                    chunk_len = int(chunk_len_str, 16)
                    if chunk_len == 0:
                        break
                    idx = line_end + 2
                    chunks.append(body_part[idx:idx + chunk_len])
                    idx += chunk_len + 2
                body_decoded = b"".join(chunks).decode('utf-8', errors='ignore')
            else:
                body_decoded = body_part.decode('utf-8', errors='ignore')
            return json.loads(body_decoded)
    except Exception as e:
        print(f"Docker socket error: {e}")
    return None

def get_git_version():
    git_path = "/repo/.git/logs/HEAD"
    head_ref_path = "/repo/.git/HEAD"
    
    version_info = {
        "hash": "Unknown",
        "message": "Repository not mounted or uninitialized",
        "date": "N/A",
        "author": "N/A",
        "branch": "Unknown"
    }

    # Resolve branch
    if os.path.exists(head_ref_path):
        try:
            with open(head_ref_path, "r") as f:
                content = f.read().strip()
            if content.startswith("ref: refs/heads/"):
                version_info["branch"] = content.split("ref: refs/heads/")[1].strip()
        except Exception:
            pass

    if not os.path.exists(git_path):
        return version_info
    
    try:
        with open(git_path, "r") as f:
            lines = f.readlines()
        if lines:
            last_line = lines[-1].strip()
            parts = last_line.split(" ", 4)
            if len(parts) >= 5:
                version_info["hash"] = parts[1][:7]
                rest = parts[4]
                
                email_end = rest.find(">")
                if email_end != -1:
                    version_info["author"] = rest[:email_end+1].strip()
                    rest = rest[email_end+2:]
                
                space_idx = rest.find(" ")
                if space_idx != -1:
                    ts_str = rest[:space_idx]
                    try:
                        ts = int(ts_str)
                        version_info["date"] = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")
                    except Exception:
                        pass
                    rest = rest[space_idx+1:]
                
                msg_prefix = "commit: "
                msg_idx = rest.find(msg_prefix)
                if msg_idx != -1:
                    version_info["message"] = rest[msg_idx + len(msg_prefix):]
                else:
                    version_info["message"] = rest.strip()
    except Exception as e:
        print(f"Error parsing Git logs: {e}")
        
    return version_info

@router.get("/health")
async def get_system_health(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    # 1. RAM Usage
    ram_total = 0
    ram_available = 0
    try:
        with open("/proc/meminfo", "r") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    ram_total = int(line.split()[1]) * 1024
                elif line.startswith("MemAvailable:"):
                    ram_available = int(line.split()[1]) * 1024
    except Exception:
        pass
    
    ram_used = ram_total - ram_available
    ram_percent = (ram_used / ram_total * 100) if ram_total > 0 else 0

    # 2. Disk Usage
    total, used, free = shutil.disk_usage("/")
    disk_percent = (used / total * 100) if total > 0 else 0

    # 3. CPU Usage (Load average)
    cpu_load = [0.0, 0.0, 0.0]
    try:
        with open("/proc/loadavg", "r") as f:
            cpu_load = [float(x) for x in f.read().split()[:3]]
    except Exception:
        pass
        
    cpu_cores = os.cpu_count() or 1
    cpu_percent = (cpu_load[0] / cpu_cores * 100)
    if cpu_percent > 100:
        cpu_percent = 100.0

    # 4. Uptime
    uptime = 0.0
    try:
        with open("/proc/uptime", "r") as f:
            uptime = float(f.read().split()[0])
    except Exception:
        pass

    # 5. Git Version
    git_info = get_git_version()

    # 6. Docker Container Statuses
    docker_containers = []
    containers_raw = docker_socket_request("GET", "/containers/json?all=true")
    if containers_raw:
        for c in containers_raw:
            names = c.get("Names", [])
            name = names[0] if names else "Unknown"
            if name.startswith("/"):
                name = name[1:]
            if "gatepass" in name:
                docker_containers.append({
                    "name": name,
                    "state": c.get("State", "unknown"),
                    "status": c.get("Status", "unknown")
                })

    return {
        "version": git_info,
        "health": {
            "cpu": {
                "percent": round(cpu_percent, 1),
                "load_1m": cpu_load[0],
                "load_5m": cpu_load[1],
                "load_15m": cpu_load[2],
                "cores": cpu_cores
            },
            "ram": {
                "percent": round(ram_percent, 1),
                "total_gb": round(ram_total / (1024**3), 2),
                "used_gb": round(ram_used / (1024**3), 2)
            },
            "disk": {
                "percent": round(disk_percent, 1),
                "total_gb": round(total / (1024**3), 2),
                "used_gb": round(used / (1024**3), 2)
            },
            "uptime_seconds": round(uptime)
        },
        "containers": docker_containers
    }

@router.post("/update")
async def trigger_system_update(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    hostname = os.getenv("HOSTNAME")
    if not hostname:
        raise HTTPException(status_code=400, detail="Unable to retrieve container hostname")
        
    container_info = docker_socket_request("GET", f"/containers/{hostname}/json")
    if not container_info:
        raise HTTPException(status_code=500, detail="Cannot connect to Docker socket")

    host_repo_path = None
    if "Mounts" in container_info:
        for mount in container_info["Mounts"]:
            if mount.get("Destination") == "/repo":
                host_repo_path = mount.get("Source")
                break
                
    if not host_repo_path and "Mounts" in container_info:
        for mount in container_info["Mounts"]:
            if mount.get("Destination") == "/app/static":
                source = mount.get("Source")
                if source:
                    host_repo_path = os.path.dirname(os.path.dirname(source))
                    break

    if not host_repo_path:
        raise HTTPException(status_code=500, detail="Host repository path could not be resolved from mounts")

    # Get current branch
    branch = "no-ai"
    head_ref_path = "/repo/.git/HEAD"
    if os.path.exists(head_ref_path):
        try:
            with open(head_ref_path, "r") as f:
                content = f.read().strip()
            if content.startswith("ref: refs/heads/"):
                branch = content.split("ref: refs/heads/")[1].strip()
        except Exception:
            pass

    # 1. Pull docker image to ensure we have the docker CLI runner
    docker_socket_request("POST", "/images/create?fromImage=docker&tag=cli")

    # 2. Create the temporary standalone updater container
    create_body = {
        "Image": "docker:cli",
        "Cmd": [
            "sh", "-c",
            f"apk add --no-cache git && cd /repo && git clean -fd && git reset --hard && git pull origin {branch} && DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker compose down && DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker compose up -d --build"
        ],
        "HostConfig": {
            "Binds": [
                "/var/run/docker.sock:/var/run/docker.sock",
                f"{host_repo_path}:/repo"
            ],
            "NetworkMode": "host"
        }
    }
    
    create_res = docker_socket_request("POST", "/containers/create", create_body)
    if not create_res or "Id" not in create_res:
        raise HTTPException(status_code=500, detail=f"Failed to create update container: {create_res}")
        
    container_id = create_res["Id"]
    
    # 3. Start the container
    start_res = docker_socket_request("POST", f"/containers/{container_id}/start")
    
    return {
        "status": "success",
        "message": f"Update container started on branch '{branch}' using host path '{host_repo_path}'. The application is rebuilding in the background.",
        "container_id": container_id
    }
