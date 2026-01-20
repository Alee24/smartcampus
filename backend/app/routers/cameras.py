from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_session
from app.models import Camera, CameraAnalytics, Classroom, ClassSession
from app.auth import get_current_user, User
import uuid
import asyncio
import cv2
import numpy as np
from urllib.parse import quote

router = APIRouter()

# ==================== HIKVISION INTEGRATION ====================

def build_hikvision_rtsp_url(ip: str, port: int, username: str, password: str, channel: int = 1, stream: int = 1) -> str:
    """
    Build Hikvision RTSP URL
    stream: 1 = main stream (high quality), 2 = sub stream (lower quality)
    """
    # URL encode credentials
    user_enc = quote(username)
    pass_enc = quote(password)
    
    # Hikvision RTSP format
    return f"rtsp://{user_enc}:{pass_enc}@{ip}:{port}/Streaming/Channels/{channel}0{stream}"

def build_dahua_rtsp_url(ip: str, port: int, username: str, password: str, channel: int = 1) -> str:
    """Build Dahua RTSP URL"""
    user_enc = quote(username)
    pass_enc = quote(password)
    return f"rtsp://{user_enc}:{pass_enc}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype=0"

def build_generic_rtsp_url(ip: str, port: int, username: str = None, password: str = None) -> str:
    """Build generic RTSP URL"""
    if username and password:
        user_enc = quote(username)
        pass_enc = quote(password)
        return f"rtsp://{user_enc}:{pass_enc}@{ip}:{port}/stream"
    return f"rtsp://{ip}:{port}/stream"

async def test_camera_connection(camera: Camera) -> dict:
    """Test camera connectivity with detailed error reporting"""
    try:
        # Build RTSP URL based on brand
        if camera.rtsp_url:
            rtsp_url = camera.rtsp_url
        elif camera.camera_brand == "hikvision":
            rtsp_url = build_hikvision_rtsp_url(
                camera.ip_address, 
                camera.port, 
                camera.username or "admin", 
                camera.password or "12345"
            )
        elif camera.camera_brand == "dahua":
            rtsp_url = build_dahua_rtsp_url(
                camera.ip_address,
                camera.port,
                camera.username or "admin",
                camera.password or "admin"
            )
        else:
            rtsp_url = build_generic_rtsp_url(
                camera.ip_address,
                camera.port,
                camera.username,
                camera.password
            )
        
        # Force FFmpeg to use TCP (Better reliability over networks)
        import os
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
        
        # Try to open video stream with timeout
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)  # 5 second timeout
        
        # Fallback for Hikvision: Try Substream (102) if Main (101) fails
        if not cap.isOpened() and camera.camera_brand == 'hikvision' and "Channels/101" in rtsp_url:
            print(f"Main stream failed for {camera.ip_address}, trying substream...")
            sub_url = rtsp_url.replace("Channels/101", "Channels/102")
            cap = cv2.VideoCapture(sub_url, cv2.CAP_FFMPEG)
            if cap.isOpened():
                rtsp_url = sub_url
        
        if cap.isOpened():
            ret, frame = cap.read()
            cap.release()
            
            if ret:
                return {
                    "status": "online",
                    "message": "Camera connected successfully",
                    "rtsp_url": rtsp_url,
                    "frame_captured": True
                }
            else:
                return {
                    "status": "error",
                    "message": "Connected but failed to decode frame. Check codec settings.",
                    "rtsp_url": rtsp_url
                }
        else:
            # Mask password for display
            masked_url = rtsp_url
            if camera.password:
                masked_url = masked_url.replace(quote(camera.password), "****")
            
            return {
                "status": "offline",
                "message": f"Cannot connect to camera. Check IP ({camera.ip_address}), port ({camera.port}), username, and password. URL: {masked_url}",
                "rtsp_url": rtsp_url
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Connection error: {str(e)}"
        }

# ==================== CAMERA CRUD ====================

@router.get("/cameras")
async def get_cameras(
    classroom_id: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all cameras, optionally filtered by classroom"""
    query = select(Camera)
    
    if classroom_id:
        query = query.where(Camera.classroom_id == uuid.UUID(classroom_id))
    
    result = await session.exec(query)
    cameras = result.all()
    
    # Enrich with classroom info
    enriched = []
    for cam in cameras:
        cam_dict = cam.dict()
        if cam.classroom_id:
            classroom = await session.get(Classroom, cam.classroom_id)
            cam_dict['classroom_name'] = classroom.room_name if classroom else None
            cam_dict['room_code'] = classroom.room_code if classroom else None
        enriched.append(cam_dict)
    
    return enriched

@router.get("/cameras/{camera_id}")
async def get_camera(
    camera_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get a single camera by ID"""
    camera = await session.get(Camera, uuid.UUID(camera_id))
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    # Enrich with classroom info
    cam_dict = camera.dict()
    if camera.classroom_id:
        classroom = await session.get(Classroom, camera.classroom_id)
        cam_dict['classroom_name'] = classroom.room_name if classroom else None
        cam_dict['room_code'] = classroom.room_code if classroom else None
    
    return cam_dict

@router.post("/cameras")
async def create_camera(
    camera_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new camera"""
    # Build camera object
    camera = Camera(
        camera_name=camera_data['camera_name'],
        camera_code=camera_data['camera_code'],
        ip_address=camera_data['ip_address'],
        port=camera_data.get('port', 554),
        username=camera_data.get('username'),
        password=camera_data.get('password'),
        camera_brand=camera_data.get('camera_brand', 'hikvision'),
        protocol=camera_data.get('protocol', 'rtsp'),
        rtsp_url=camera_data.get('rtsp_url'),
        classroom_id=uuid.UUID(camera_data['classroom_id']) if camera_data.get('classroom_id') else None,
        location_description=camera_data.get('location_description'),
        enable_people_counting=camera_data.get('enable_people_counting', True),
        enable_face_detection=camera_data.get('enable_face_detection', False),
        enable_motion_detection=camera_data.get('enable_motion_detection', True),
        enable_object_detection=camera_data.get('object_detection', False)
    )

    # Test connectivity before saving (unless skip_validation is True)
    skip_validation = camera_data.get('skip_validation', False)
    
    if not skip_validation:
        test_result = await test_camera_connection(camera)
        if test_result.get('status') != 'online':
            # Log failure for audit
            from app.models import SystemActivity
            log = SystemActivity(
                actor_id=current_user.id,
                action_type="CAMERA_CREATE_FAIL",
                entity="CAMERA",
                entity_id=camera.camera_code,
                description=test_result.get('message'),
                metadata={"rtsp_url": test_result.get('rtsp_url')},
                ip_address=camera.ip_address,
                timestamp=datetime.utcnow()
            )
            session.add(log)
            await session.flush()
            raise HTTPException(status_code=400, detail=f"Camera connection failed: {test_result.get('message')}. Set 'skip_validation' to true to add anyway.")

    # Save camera
    try:
        session.add(camera)
        await session.commit()
        await session.refresh(camera)
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    return camera

@router.put("/cameras/{camera_id}")
async def update_camera(
    camera_id: str,
    camera_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update camera configuration"""
    camera = await session.get(Camera, uuid.UUID(camera_id))
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    for key, value in camera_data.items():
        if hasattr(camera, key) and key not in ['id']:
            if key == 'classroom_id' and value:
                setattr(camera, key, uuid.UUID(value))
            else:
                setattr(camera, key, value)
    
    await session.commit()
    await session.refresh(camera)
    
    return camera

@router.delete("/cameras/{camera_id}")
async def delete_camera(
    camera_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a camera"""
    camera = await session.get(Camera, uuid.UUID(camera_id))
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    await session.delete(camera)
    await session.commit()
    
    return {"message": "Camera deleted successfully"}

@router.post("/cameras/{camera_id}/test")
async def test_camera(camera_id: str, session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Test connectivity of a specific camera and return detailed status, logging failures."""
    cam = await session.get(Camera, uuid.UUID(camera_id))
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    result = await test_camera_connection(cam)
    
    # Update camera status fields
    cam.status = result.get('status')
    cam.last_seen = datetime.utcnow() if result.get('status') == 'online' else cam.last_seen
    cam.last_error = result.get('message') if result.get('status') != 'online' else None
    
    # Log failures to SystemActivity for audit
    if result.get('status') != 'online':
        from app.models import SystemActivity
        log = SystemActivity(
            actor_id=current_user.id,
            action_type="CAMERA_TEST_FAIL",
            entity="CAMERA",
            entity_id=str(cam.id),
            description=result.get('message'),
            metadata={"rtsp_url": result.get('rtsp_url')},
            ip_address=cam.ip_address,
            timestamp=datetime.utcnow()
        )
        session.add(log)
    
    await session.commit()
    return result

# ==================== AI ANALYTICS ====================

@router.get("/cameras/{camera_id}/analytics")
async def get_camera_analytics(
    camera_id: str,
    hours: int = 24,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get analytics for a specific camera"""
    since = datetime.utcnow() - timedelta(hours=hours)
    
    result = await session.exec(
        select(CameraAnalytics)
        .where(CameraAnalytics.camera_id == uuid.UUID(camera_id))
        .where(CameraAnalytics.timestamp >= since)
        .order_by(CameraAnalytics.timestamp.desc())
    )
    
    return result.all()

@router.get("/analytics/room/{classroom_id}")
async def get_room_analytics(
    classroom_id: str,
    hours: int = 24,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get aggregated analytics for a room"""
    since = datetime.utcnow() - timedelta(hours=hours)
    
    # Get all cameras in this room
    cameras_result = await session.exec(
        select(Camera).where(Camera.classroom_id == uuid.UUID(classroom_id))
    )
    cameras = cameras_result.all()
    
    if not cameras:
        return {"message": "No cameras found in this room"}
    
    # Get analytics for all cameras
    all_analytics = []
    for camera in cameras:
        analytics_result = await session.exec(
            select(CameraAnalytics)
            .where(CameraAnalytics.camera_id == camera.id)
            .where(CameraAnalytics.timestamp >= since)
            .order_by(CameraAnalytics.timestamp.desc())
        )
        all_analytics.extend(analytics_result.all())
    
    # Calculate aggregated statistics
    if not all_analytics:
        return {"message": "No analytics data available"}
    
    avg_people = sum(a.people_count for a in all_analytics if a.people_count) / len([a for a in all_analytics if a.people_count]) if any(a.people_count for a in all_analytics) else 0
    max_people = max((a.people_count for a in all_analytics if a.people_count), default=0)
    alerts = [a for a in all_analytics if a.is_alert]
    
    return {
        "classroom_id": classroom_id,
        "period_hours": hours,
        "total_readings": len(all_analytics),
        "average_occupancy": round(avg_people, 1),
        "peak_occupancy": max_people,
        "alerts_count": len(alerts),
        "recent_analytics": [a.dict() for a in all_analytics[:20]]
    }

@router.post("/analytics/generate")
async def generate_analytics(
    data: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger analytics generation (for testing)"""
    camera_id = data.get('camera_id')
    
    camera = await session.get(Camera, uuid.UUID(camera_id))
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    # In production, this would process actual video feed
    # For now, generate mock analytics
    analytics = CameraAnalytics(
        camera_id=camera.id,
        people_count=data.get('people_count', 0),
        occupancy_percentage=data.get('occupancy_percentage', 0),
        motion_level=data.get('motion_level', 'medium'),
        activity_score=data.get('activity_score', 50.0),
        detected_objects=data.get('detected_objects', {})
    )
    
    session.add(analytics)
    await session.commit()
    await session.refresh(analytics)
    
    return analytics

# ==================== DASHBOARD STATS ====================

@router.get("/dashboard/stats")
async def get_camera_dashboard_stats(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get overall camera system statistics"""
    # Count cameras by status
    cameras_result = await session.exec(select(Camera))
    cameras = cameras_result.all()
    
    online = len([c for c in cameras if c.status == 'online'])
    offline = len([c for c in cameras if c.status == 'offline'])
    error = len([c for c in cameras if c.status == 'error'])
    
    # Recent analytics
    recent_analytics = await session.exec(
        select(CameraAnalytics)
        .where(CameraAnalytics.timestamp >= datetime.utcnow() - timedelta(hours=1))
    )
    recent = recent_analytics.all()
    
    # Alerts
    alerts = [a for a in recent if a.is_alert]
    
    return {
        "total_cameras": len(cameras),
        "online": online,
        "offline": offline,
        "error": error,
        "recent_analytics_count": len(recent),
        "active_alerts": len(alerts),
        "alerts": [a.dict() for a in alerts[:10]]
    }

# ==================== CAMERA BRANDS ====================

@router.get("/brands")
async def get_supported_brands():
    """Get list of supported camera brands with configuration templates"""
    return {
        "brands": [
            {
                "id": "hikvision",
                "name": "Hikvision",
                "default_port": 554,
                "default_username": "admin",
                "protocol": "rtsp",
                "notes": "Most popular IP camera brand. Supports RTSP streaming."
            },
            {
                "id": "dahua",
                "name": "Dahua",
                "default_port": 554,
                "default_username": "admin",
                "protocol": "rtsp",
                "notes": "Second largest IP camera manufacturer."
            },
            {
                "id": "axis",
                "name": "Axis Communications",
                "default_port": 554,
                "default_username": "root",
                "protocol": "rtsp",
                "notes": "Premium Swedish brand with excellent quality."
            },
            {
                "id": "generic",
                "name": "Generic RTSP Camera",
                "default_port": 554,
                "default_username": "admin",
                "protocol": "rtsp",
                "notes": "For any RTSP-compatible IP camera."
            }
        ]
    }

# ==================== NETWORK SCANNER ====================

@router.post("/scan-network")
async def scan_network_for_cameras(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Scans the local network for potential IP cameras.
    Checks ports: 554 (RTSP), 8000 (Hikvision), 80 (HTTP).
    """
    import socket
    import asyncio
    
    # 1. Determine Local Subnet
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
    except:
        local_ip = "192.168.1.1"
    finally:
        s.close()
        
    subnet = ".".join(local_ip.split(".")[:3]) # e.g., 192.168.1
    
    found_devices = []
    
    async def check_ip(ip):
        # We look for RTSP (554) or Hikvision (8000)
        ports_to_check = [554, 8000, 80]
        
        for port in ports_to_check:
            try:
                # Use asyncio.open_connection for non-blocking connect
                conn = asyncio.open_connection(ip, port)
                reader, writer = await asyncio.wait_for(conn, timeout=0.2)
                writer.close()
                await writer.wait_closed()
                
                # If we get here, port is open
                brand = "Generic"
                if port == 8000: brand = "Hikvision (Likely)"
                if port == 554: brand = "RTSP Camera"
                
                # Get Hostname
                try:
                    hostname = socket.gethostbyaddr(ip)[0]
                except:
                    hostname = ip
                
                return {
                    "ip": ip,
                    "port": port,
                    "brand": brand,
                    "name": hostname,
                    "status": "online"
                }
            except:
                continue
        return None

    # Scan 1-254 (Batching to avoid OS limits)
    tasks = []
    for i in range(1, 255):
        ip = f"{subnet}.{i}"
        if ip == local_ip: continue
        tasks.append(check_ip(ip))
    
    # Run in batches of 50
    batch_size = 50
    for i in range(0, len(tasks), batch_size):
        batch = tasks[i:i+batch_size]
        results = await asyncio.gather(*batch)
        for res in results:
            if res:
                # Deduplicate if multiple ports found on same IP (simple logic: take first)
                if not any(d['ip'] == res['ip'] for d in found_devices):
                    found_devices.append(res)
                    
    return {
        "network": f"{subnet}.0/24",
        "found_count": len(found_devices),
        "devices": found_devices
    }
