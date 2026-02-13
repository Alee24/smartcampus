from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, UploadFile, File, Form
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, col
from sqlalchemy import func
from app.database import get_session
from app.models import Course, ClassSession, AttendanceRecord, User, TimetableSlot, Classroom, ScanLog
from app.auth import get_current_user
from datetime import datetime, date, timedelta
import uuid
import json
from typing import List

router = APIRouter()

# --- Helpers ---
async def send_email_report(session_id: uuid.UUID, db_session: AsyncSession):
    # Fetch session and attendance
    session_ent = await db_session.get(ClassSession, session_id)
    if not session_ent: return
    
    attendance = (await db_session.exec(select(AttendanceRecord).where(AttendanceRecord.session_id == session_id))).all()
    
    total_present = len([a for a in attendance if a.status == "present"])
    flagged = len([a for a in attendance if "flagged" in a.status or a.status == "flagged"])
    
    print(f"--- EMAIL REPORT ---")
    print(f"Session {session_id} ended.")
    print(f"Present: {total_present}, Flagged: {flagged}")
    print(f"Sending email to lecturer...")
    print(f"--------------------")

# --- Courses ---
# --- Courses ---
@router.get("/courses", response_model=List[Course])
async def list_courses(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List courses. If User is Student, only show registered courses."""
    from app.models import Role, StudentCourseRegistration
    
    role = await session.get(Role, current_user.role_id)
    
    if role and role.name == "Student":
        # Filter by registration
        query = select(Course).join(StudentCourseRegistration).where(
            StudentCourseRegistration.student_id == current_user.id
        )
        return (await session.exec(query)).all()
    else:
        # Admin / Lecturer: Return ALL courses for now (or could filter by lecturer_id)
        return (await session.exec(select(Course))).all()

# --- Live Session Management ---
@router.post("/sessions/start")
async def start_session(
    data: dict, 
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Start a live class session for attendance tracking"""
    # Data: course_id, duration_minutes (default 120)
    course_id = data.get('course_id')
    if not course_id:
        raise HTTPException(status_code=400, detail="course_id is required")
        
    duration = data.get('duration_minutes', 120)
    start_time = datetime.now()
    end_time = start_time + timedelta(minutes=duration)
    
    # Generate unique codes
    room_unique = str(uuid.uuid4().int)[:6] 
    
    # Try to find a matching timetable slot for today
    today_slot = await session.exec(
        select(TimetableSlot).where(
            TimetableSlot.course_id == uuid.UUID(course_id),
            TimetableSlot.day_of_week == start_time.weekday()
        )
    )
    slot = today_slot.first()
    
    # Get course to find default lecturer/classroom if no slot
    course = await session.get(Course, uuid.UUID(course_id))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    new_session = ClassSession(
        course_id=uuid.UUID(course_id),
        timetable_slot_id=slot.id if slot else None,
        session_date=start_time.date(),
        start_time=start_time.time(),
        end_time=end_time.time(),
        qr_code=str(uuid.uuid4()), # Secret token
        room_unique_number=room_unique,
        classroom_id=slot.classroom_id if slot else course.classroom_id,
        lecturer_id=current_user.id, # The person who starts it is the lecturer
        status="ongoing",
        active=True
    )

    # Deactivate other active sessions for this lecturer to prevent confusion
    existing_sessions = await session.exec(
        select(ClassSession).where(
            ClassSession.lecturer_id == current_user.id,
            ClassSession.active == True
        )
    )
    for s in existing_sessions:
        s.active = False
        s.status = "completed"
        session.add(s)
    
    session.add(new_session)
    await session.commit()
    await session.refresh(new_session)
    return new_session

@router.post("/sessions/activate-all")
async def activate_all_classes(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Activate ALL classrooms for the day.
    1. Activates scheduled classes from Timetable.
    2. Activates 'Open Study' sessions for any room without a schedule to ensure GLOBAL system availability.
    """
    today = date.today()
    now = datetime.now()
    day_of_week = now.weekday()
    
    activated_count = 0
    already_active = 0

    # 1. Fetch ALL Classrooms
    classrooms = (await session.exec(select(Classroom))).all()
    
    # 2. Fetch/Prepare default course for "Open Study" (create if missing)
    # We need a generic course to link "Open Study" sessions to.
    open_course = (await session.exec(select(Course).where(Course.course_code == "OPEN_ACCESS"))).first()
    if not open_course:
        open_course = Course(
            course_name="Open Study / Ad-hoc",
            course_code="OPEN_ACCESS",
            department="General",
            credits=0,
            lecturer_id=current_user.id # Assign to admin activating it
        )
        session.add(open_course)
        await session.commit()
        await session.refresh(open_course)

    # 3. Iterate all rooms and ensure they have an active session
    for room in classrooms:
        # Check if room already has an active session
        existing_session = (await session.exec(
            select(ClassSession).where(
                ClassSession.classroom_id == room.id,
                ClassSession.active == True,
                ClassSession.session_date == today
            )
        )).first()

        if existing_session:
            already_active += 1
            continue

        # Check for a specific timetable slot for this room right now/today
        # (Simplification: If multiple slots exist, we pick the first one matching today)
        slot_query = (
            select(TimetableSlot)
            .where(
                TimetableSlot.classroom_id == room.id,
                TimetableSlot.day_of_week == day_of_week,
                TimetableSlot.is_active == True
            )
        )
        slot = (await session.exec(slot_query)).first()

        new_session = ClassSession(
            course_id=slot.course_id if slot else open_course.id,
            timetable_slot_id=slot.id if slot else None,
            session_date=today,
            start_time=slot.start_time if slot else time(6, 0), # Default 6 AM
            end_time=slot.end_time if slot else time(22, 0),    # Default 10 PM
            qr_code=str(uuid.uuid4()),
            room_unique_number=str(uuid.uuid4().int)[:6],
            classroom_id=room.id,
            lecturer_id=slot.lecturer_id if slot else current_user.id,
            status="ongoing",
            active=True
        )
        session.add(new_session)
        activated_count += 1
    
    await session.commit()
    
    return {
        "status": "success",
        "message": f"Activated {activated_count} rooms (Total Acting: {already_active + activated_count})",
        "activated": activated_count,
        "already_active": already_active,
        "total_rooms": len(classrooms)
    }


@router.get("/sessions/active", response_model=ClassSession)
async def get_my_active_session(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Recover the active session for the current lecturer"""
    query = select(ClassSession).where(
        ClassSession.lecturer_id == current_user.id,
        ClassSession.active == True,
        ClassSession.session_date == date.today()
    ).order_by(ClassSession.start_time.desc())
    return (await session.exec(query)).first()

@router.post("/mark")
async def mark_attendance(
    request: Request,
    file: UploadFile = File(...),
    session_id: str = Form(...),
    qr_content: str = Form(...),
    metadata: str = Form(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    try:
        from PIL import Image
        import io

        # Capture Client IP
        client_ip = request.client.host
        # If behind proxy (Nginx/Docker), you might need request.headers.get("X-Forwarded-For")
        client_ip = request.client.host if request.client else "unknown"
        
        # 1. Fetch live session
        try:
            class_session = await session.get(ClassSession, uuid.UUID(session_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Session ID format")
            
        if not class_session or not class_session.active:
            raise HTTPException(status_code=404, detail="Active session not found")
            
        # 2. Check QR Token
        if class_session.qr_code != qr_content:
            raise HTTPException(status_code=400, detail="Invalid QR Code")
            
        # 3. Prevent duplicate attendance
        existing = await session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.session_id == class_session.id,
                AttendanceRecord.student_id == current_user.id
            )
        )
        if existing.first():
            raise HTTPException(status_code=400, detail="Attendance already marked")
            
        # 4. Anti-Cheating Logic (Photo Metadata + Environment)
        status = "present"
        meta = {}
        try:
            meta = json.loads(metadata)
        except: pass

        # Check A: Photo Metadata (EXIF)
        img_bytes = await file.read()
        try:
            image = Image.open(io.BytesIO(img_bytes))
            exif = image._getexif()
            
            if exif:
                # Extract interesting tags (MsgID 306=DateTime, 271=Make, 272=Model)
                meta['camera_make'] = exif.get(271, 'Unknown')
                meta['camera_model'] = exif.get(272, 'Unknown') 
                meta['photo_date'] = exif.get(306, 'Unknown')
                # meta['exif_raw'] = str(exif) # Debug only, too large
            else:
                status = "flagged_no_metadata"
                meta['camera_error'] = "No EXIF found (Screenshot/Downloaded?)"
                
        except Exception as e:
            status = "flagged_corrupt_image"
            meta['camera_error'] = f"Corrupt Image: {str(e)}"

        # Check B: Geolocation (Browser)
        geo = meta.get('geolocation')
        if geo == 'denied' or not geo:
            status = "flagged_no_location"

        # Check C: Network Type
        conn_info = meta.get('connection')
        if isinstance(conn_info, dict):
            conn_type = conn_info.get('type')
            if conn_type == 'cellular':
                status = "flagged_mobile_data"

        # Prepare for Save
        meta['ip_address'] = client_ip
        
        # Save the image evidence
        # Ensure directory exists
        import os
        os.makedirs("static/evidence", exist_ok=True)
        filename = f"{session_id}_{current_user.id}.jpg"
        path = f"static/evidence/{filename}"
        with open(path, "wb") as f: f.write(img_bytes)
        meta['evidence_url'] = f"/static/evidence/{filename}"

        record = AttendanceRecord(
            session_id=class_session.id,
            student_id=current_user.id,
            status=status,
            scan_time=datetime.now(),
            live_image=meta.get('evidence_url'), # Explicitly save path to column
            connection_type=meta.get('connection', {}).get('type', 'unknown') if isinstance(meta.get('connection'), dict) else 'unknown',
            metadata_info=json.dumps(meta)
        )
        
        session.add(record)
        await session.commit()
        await session.refresh(record)
        
        return {"status": "success", "record_status": status}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Debug Error: {str(e)}")

@router.get("/sessions/{session_id}/live")
async def get_live_attendance(
    session_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get real-time list of attendees for the lecturer view"""
    results = await session.exec(
        select(AttendanceRecord, User)
        .join(User, AttendanceRecord.student_id == User.id)
        .where(AttendanceRecord.session_id == uuid.UUID(session_id))
        .order_by(AttendanceRecord.scan_time.desc())
    )
    
    attendance_data = []
    ips = []
    
    # First pass: Collect data
    from app.models import UserLocationLog
    for record, user in results:
        meta = {}
        if record.metadata_info:
            try: meta = json.loads(record.metadata_info)
            except: pass
        
        ip = meta.get('ip_address', 'unknown')
        conn = record.connection_type or meta.get('connection', {}).get('type', 'unknown') if isinstance(meta.get('connection'), dict) else 'unknown'

        # Fallback to UserLocationLog if data is missing
        if ip == 'unknown' or conn == 'unknown':
            # Find most recent location log for this user
            recent_log = (await session.exec(
                select(UserLocationLog)
                .where(UserLocationLog.user_id == user.id)
                .order_by(UserLocationLog.timestamp.desc())
                .limit(1)
            )).first()
            
            if recent_log:
                if ip == 'unknown': ip = recent_log.ip_address or 'unknown'
                if conn == 'unknown': conn = recent_log.network_type or 'unknown'

        ips.append(ip)
        
        attendance_data.append({
            "name": user.full_name,
            "admission_number": user.admission_number,
            "time": record.scan_time.isoformat(),
            "status": record.status,
            "connection": conn,
            "ip": ip,
            "location": meta.get('geolocation', {}),
            "camera_info": {
                "make": meta.get('camera_make'),
                "model": meta.get('camera_model'),
                "date": meta.get('photo_date'),
                "error": meta.get('camera_error')
            },
            "evidence_url": record.live_image or meta.get('evidence_url'),
            "device": {
                "user_agent": meta.get('userAgent'),
                "screen": meta.get('screen')
            },
            "ai_flag": None # Placeholder
        })

    # AI IP Clustering Logic
    from collections import Counter
    session_analysis = {"mode": "Unknown", "dominant_ip": None}
    
    if len(ips) > 2:
        counts = Counter(ips)
        dominant_ip, freq = counts.most_common(1)[0]
        ratio = freq / len(ips)
        
        if ratio > 0.5:
            # Physical Class detected (Majority on same IP)
            session_analysis["mode"] = "Physical Class"
            session_analysis["dominant_ip"] = dominant_ip
            
            # Flag outliers
            for item in attendance_data:
                if item['ip'] != dominant_ip and item['ip'] != 'unknown':
                    item['ai_flag'] = "Suspicious IP Limit (VPN/Data)"
                    # Override status for display if it was clean
                    if item['status'] == 'present':
                        item['status'] = "flagged_ip_mismatch"
        else:
            # High variance
            session_analysis["mode"] = "Online / Distributed"
            
    return {"attendees": attendance_data, "analysis": session_analysis}

@router.post("/sessions/{session_id}/end")
async def end_session(
    session_id: str,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Lecturer ends the session and triggers a report"""
    class_session = await session.get(ClassSession, uuid.UUID(session_id))
    if not class_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    class_session.active = False
    class_session.status = "completed"
    
    await session.commit()
    
    # Trigger background report
    background_tasks.add_task(send_email_report, class_session.id, session)
    
    return {"status": "session ended", "report_pending": True}

@router.post("/scan-room")
async def scan_room_qr(
    request: Request,
    file: UploadFile = File(...),
    qr_content: str = Form(...), # Room Code
    metadata: str = Form(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    from app.models import UserLocationLog, Classroom, ClassSession, AttendanceRecord
    import json
    
    # 1. Parse Metadata
    meta = {}
    try: meta = json.loads(metadata)
    except: pass
    
    client_ip = request.client.host
    if not meta.get('ip_address') or meta.get('ip_address') == 'unknown':
        meta['ip_address'] = client_ip
        
    # 2. Log Location/Device Data (Always refresh)
    lat = None
    lng = None
    if isinstance(meta.get('geolocation'), dict):
        lat = meta['geolocation'].get('lat')
        lng = meta['geolocation'].get('lng')

    log = UserLocationLog(
        user_id=current_user.id,
        latitude=lat,
        longitude=lng,
        ip_address=client_ip,
        scanned_code=qr_content,
        network_type=meta.get('connection', {}).get('type') if isinstance(meta.get('connection'), dict) else None,
        device_info=meta,
        context_type="room_scan"
    )
    session.add(log)
    
    # 3. Find Classroom
    room = (await session.exec(select(Classroom).where(Classroom.room_code == qr_content))).first()
    
    if not room:
         await session.commit()
         return {"status": "start_log_only", "message": "Location recorded (Unknown Room)"}

    # 4. Find Active Session in Room
    now_time = datetime.now().time()
    today = date.today()
    
    query = select(ClassSession).where(
        ClassSession.classroom_id == room.id,
        ClassSession.session_date == today,
        ClassSession.start_time <= now_time,
        ClassSession.end_time >= now_time,
        ClassSession.active == True 
    )
    active_session = (await session.exec(query)).first()
    
    if not active_session:
        await session.commit()
        return {"status": "room_entry", "message": f"Welcome to {room.room_name}. No class currently active."}
        
    # 5. Mark Attendance
    existing = await session.exec(select(AttendanceRecord).where(
        AttendanceRecord.session_id == active_session.id,
        AttendanceRecord.student_id == current_user.id
    ))
    if existing.first():
        await session.commit()
        return {"status": "success", "message": f"Already marked present for {active_session.id} (Refreshed Data)", "record_status": "present"}

    import os
    os.makedirs("static/evidence", exist_ok=True)
    filename = f"{active_session.id}_{current_user.id}_room.jpg"
    path = f"static/evidence/{filename}"
    content = await file.read()
    with open(path, "wb") as f: f.write(content)
    
    record = AttendanceRecord(
        session_id=active_session.id,
        student_id=current_user.id,
        status="present",
        live_image=f"/static/evidence/{filename}",
        connection_type=meta.get('connection', {}).get('type') if isinstance(meta.get('connection'), dict) else "unknown",
        metadata_info=json.dumps(meta)
    )
    session.add(record)
    
    # 6. Add to ScanLog for Real-time Dashboard
    scan_log = ScanLog(
        timestamp=datetime.now(),
        student_id=current_user.id,
        room_code=qr_content, 
        is_successful=True,
        status_message="Room Scan: Present",
        class_session_id=active_session.id,
        detected_location=f"{lat},{lng}" if lat and lng else None
    )
    session.add(scan_log)

    await session.commit()
    
    return {"status": "success", "record_status": "present", "message": "Attendance Marked via Room Scan"}

@router.get("/live-monitor")
async def get_live_monitor(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get all active sessions for today, sorted by latest attendance activity.
    Real-time dashboard feed.
    """
    today = date.today()
    
    statement = (
        select(
            ClassSession,
            User,
            Course,
            Classroom,
            func.count(ScanLog.id).label("student_count"),
            func.max(ScanLog.timestamp).label("last_activity")
        )
        .join(User, ClassSession.lecturer_id == User.id)
        .join(Course, ClassSession.course_id == Course.id)
        .outerjoin(Classroom, ClassSession.classroom_id == Classroom.id)
        .outerjoin(ScanLog, (ScanLog.class_session_id == ClassSession.id) & (ScanLog.is_successful == True))
        .where(ClassSession.active == True, ClassSession.session_date == today)
        .group_by(ClassSession.id, User.id, Course.id, Classroom.id)
        .order_by(func.max(ScanLog.timestamp).desc().nullslast())
    )
    
    results = await session.exec(statement)
    data = []
    for sess, lecturer, course, classroom, count, last_act in results:
        data.append({
            "session_id": str(sess.id),
            "course": course.course_name if course else "Unknown",
            "course_code": course.course_code if course else "N/A",
            "room": classroom.room_code if classroom else "N/A",
            "room_name": classroom.room_name if classroom else "Unknown",
            "lecturer": lecturer.full_name,
            "students": count,
            "last_activity": last_act.isoformat() if last_act else None,
            "start_time": sess.start_time.isoformat(),
            "end_time": sess.end_time.isoformat(),
            "status": sess.status
        })
        
    return data

@router.get("/room-qr-list")
async def get_room_qr_list(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get all classrooms for generating permanent room QR codes.
    Returns room code, name, building, and floor info.
    Includes 'qr_content' with the Server's LAN IP for network scanning.
    """
    # Detect Local LAN IP
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        # Fallback attempts
        try:
             local_ip = socket.gethostbyname(socket.gethostname())
        except:
             local_ip = "localhost"

    statement = select(Classroom).order_by(Classroom.building, Classroom.floor, Classroom.room_code)
    results = await session.exec(statement)
    classrooms = results.all()
    
    # Fetch all active timetable slots for schedule summary
    from app.models import TimetableSlot, Course, StudentCourseRegistration
    
    # 1. Get Course Registration Counts for sorting
    reg_stm = select(StudentCourseRegistration.course_id, func.count()).group_by(StudentCourseRegistration.course_id)
    reg_results = (await session.exec(reg_stm)).all()
    course_counts = {cid: count for cid, count in reg_results}

    # 2. Get Active Slots
    slots_query = select(TimetableSlot, Course).join(Course, TimetableSlot.course_id == Course.id).where(TimetableSlot.is_active == True)
    slots_results = (await session.exec(slots_query)).all()
    
    # Group by classroom
    days_map = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    room_schedules = {}
    
    for slot, course in slots_results:
        if slot.classroom_id not in room_schedules:
            room_schedules[slot.classroom_id] = []
            
        # Get registration count (default 0)
        count = course_counts.get(course.id, 0)
        
        # Format: Mon 08:00 • CS101
        time_str = slot.start_time.strftime("%H:%M")
        entry = f"{days_map[slot.day_of_week]} {time_str} • {course.course_code}"
        
        # Store metadata for sorting
        room_schedules[slot.classroom_id].append({"count": count, "text": entry})
        
    # Sort schedules by registered count (Highest -> Lowest)
    final_schedules = {}
    for rid, entries in room_schedules.items():
         entries.sort(key=lambda x: x["count"], reverse=True)
         final_schedules[rid] = [x["text"] for x in entries]

    return [
        {
            "room_code": room.room_code,
            "room_name": room.room_name or room.room_code,
            "building": room.building or "Main Building",
            "floor": room.floor or "Ground Floor",
            "capacity": room.capacity,
            "qr_content": f"/?room={room.room_code}",
            "schedule": final_schedules.get(room.id, [])
        }
        for room in classrooms
    ]

from fastapi.responses import Response

@router.get("/courses/{course_id}/reports")
async def get_course_reports(
    course_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all past sessions for a course with attendance counts."""
    query = (
        select(ClassSession, func.count(AttendanceRecord.id), Classroom.room_code)
        .outerjoin(AttendanceRecord, ClassSession.id == AttendanceRecord.session_id)
        .outerjoin(Classroom, ClassSession.classroom_id == Classroom.id)
        .where(ClassSession.course_id == course_id)
        .group_by(ClassSession.id, Classroom.room_code)
        .order_by(ClassSession.session_date.desc(), ClassSession.start_time.desc())
    )
    
    results = await session.exec(query)
    data = []
    for sess, count, room_code in results.all():
        data.append({
            "session_id": sess.id,
            "date": sess.session_date,
            "start_time": sess.start_time,
            "end_time": sess.end_time,
            "attendance_count": count,
            "room_code": room_code or "Unknown"
        })
    return data

@router.get("/reports/{session_id}/download")
async def download_session_report(
    session_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Download CSV report for a specific session."""
    import csv 
    import io
    
    # Fetch Session Details (Room, Course)
    sess_query = (
        select(ClassSession, Course, Classroom)
        .join(Course, ClassSession.course_id == Course.id)
        .outerjoin(Classroom, ClassSession.classroom_id == Classroom.id)
        .where(ClassSession.id == session_id)
    )
    sess_result = (await session.exec(sess_query)).first()
    
    if not sess_result:
        raise HTTPException(status_code=404, detail="Session not found")
        
    class_session, course, classroom = sess_result
    room_code = classroom.room_code if classroom else (class_session.room_unique_number or "Unknown")
    
    # Fetch data
    att_query = (
        select(AttendanceRecord, User)
        .join(User, AttendanceRecord.student_id == User.id)
        .where(AttendanceRecord.session_id == session_id)
        .order_by(AttendanceRecord.scan_time)
    )
    results = await session.exec(att_query)
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    # Header requested: ADMISSION NUMBER, ROOM, CLASS, TIME (and Name/Date useful too)
    writer.writerow(["Admission Number", "Student Name", "Course", "Room", "Date", "Time Scanned", "Status"])
    
    for record, student in results.all():
        writer.writerow([
            student.admission_number,
            student.full_name,
            f"{course.course_name} ({course.course_code})",
            room_code,
            class_session.session_date,
            record.scan_time.strftime("%H:%M:%S") if record.scan_time else "-",
            record.status
        ])
        
    output.seek(0)
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{course.course_code}_{class_session.session_date}.csv"}
    )

@router.get("/courses/{course_id}/reports/weekly-download")
async def download_weekly_report(
    course_id: uuid.UUID,
    start_date: date, # User provides the start of the week (or any date in the week)
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Download combined CSV for all sessions in a specific week."""
    import csv 
    import io
    
    # Calculate week range (Mon-Sun)
    start_of_week = start_date - timedelta(days=start_date.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    
    # Fetch All Sessions in this week
    query = (
        select(ClassSession, Course, Classroom)
        .join(Course, ClassSession.course_id == Course.id)
        .outerjoin(Classroom, ClassSession.classroom_id == Classroom.id)
        .where(ClassSession.course_id == course_id)
        .where(ClassSession.session_date >= start_of_week)
        .where(ClassSession.session_date <= end_of_week)
        .order_by(ClassSession.session_date, ClassSession.start_time)
    )
    
    sessions_in_week = (await session.exec(query)).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Admission Number", "Student Name", "Course", "Room", "Time Scanned", "Status"])
    
    if not sessions_in_week:
         return Response(content="No sessions found for this week.", media_type="text/plain")

    course_code = sessions_in_week[0][1].course_code
    
    for class_session, course, classroom in sessions_in_week:
        room_code = classroom.room_code if classroom else (class_session.room_unique_number or "Unknown")
        
        # Get Attendance
        att_query = (
            select(AttendanceRecord, User)
            .join(User, AttendanceRecord.student_id == User.id)
            .where(AttendanceRecord.session_id == class_session.id)
            .order_by(AttendanceRecord.scan_time)
        )
        att_results = (await session.exec(att_query)).all()
        
        for record, student in att_results:
            writer.writerow([
                class_session.session_date,
                student.admission_number,
                student.full_name,
                course.course_code,
                room_code,
                record.scan_time.strftime("%H:%M:%S") if record.scan_time else "-",
                record.status
            ])

    output.seek(0)
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=Weekly_Attendance_{course_code}_{start_of_week}.csv"}
    )

@router.get("/reports/{session_id}/details")
async def get_session_details(
    session_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get list of scans for a session (JSON)."""
    # Fetch data
    att_query = (
        select(AttendanceRecord, User)
        .join(User, AttendanceRecord.student_id == User.id)
        .where(AttendanceRecord.session_id == session_id)
        .order_by(AttendanceRecord.scan_time)
    )
    results = await session.exec(att_query)
    
    data = []
    for record, student in results.all():
        data.append({
            "student_name": student.full_name,
            "admission_number": student.admission_number,
            "scan_time": record.scan_time.strftime("%H:%M:%S") if record.scan_time else "-",
            "status": record.status
        })
    return data

@router.get("/attendance-logs")
async def get_all_attendance_logs(
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive attendance logs with all details:
    - Student info (name, admission number)
    - Course info (name, code)
    - Classroom (room code, name)
    - Session date and time
    - Scan timestamp
    """
    query = (
        select(AttendanceRecord, User, ClassSession, Course, Classroom)
        .join(User, AttendanceRecord.student_id == User.id)
        .join(ClassSession, AttendanceRecord.session_id == ClassSession.id)
        .join(Course, ClassSession.course_id == Course.id)
        .outerjoin(Classroom, ClassSession.classroom_id == Classroom.id)
        .order_by(AttendanceRecord.scan_time.desc())
        .limit(limit)
    )
    
    results = await session.exec(query)
    logs = []
    
    for record, student, class_session, course, classroom in results.all():
        logs.append({
            "id": str(record.id),
            "student": {
                "name": student.full_name,
                "admission_number": student.admission_number,
                "school": student.school
            },
            "course": {
                "name": course.course_name,
                "code": course.course_code
            },
            "classroom": {
                "code": classroom.room_code if classroom else "N/A",
                "name": classroom.room_name if classroom else "Unknown"
            },
            "session": {
                "date": class_session.session_date.isoformat(),
                "start_time": class_session.start_time.isoformat(),
                "end_time": class_session.end_time.isoformat()
            },
            "scan_time": record.scan_time.isoformat() if record.scan_time else None,
            "status": record.status,
            "connection_type": record.connection_type
        })
    
    return {"total": len(logs), "logs": logs}
