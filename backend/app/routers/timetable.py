from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import date, time, datetime, timedelta
from app.database import get_session
from app.models import Classroom, Course, TimetableSlot, ClassSession, User
from app.auth import get_current_user
from app.logging_utils import log_system_activity
import uuid

router = APIRouter()

# ==================== CLASSROOMS ====================

@router.get("/classrooms")
async def get_classrooms(session: AsyncSession = Depends(get_session)):
    """Get all classrooms"""
    result = await session.exec(select(Classroom))
    return result.all()

@router.post("/classrooms")
async def create_classroom(
    classroom_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new classroom"""
    classroom = Classroom(
        room_code=classroom_data['room_code'],
        room_name=classroom_data['room_name'],
        building=classroom_data.get('building'),
        floor=classroom_data.get('floor'),
        capacity=classroom_data.get('capacity', 0),
        room_type=classroom_data.get('room_type', 'lecture_hall'),
        amenities=classroom_data.get('amenities', {}),
        status=classroom_data.get('status', 'available')
    )
    
    session.add(classroom)
    await session.commit()
    await session.refresh(classroom)
    
    return classroom

@router.put("/classrooms/{classroom_id}")
async def update_classroom(
    classroom_id: str,
    classroom_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update classroom details"""
    classroom = await session.get(Classroom, uuid.UUID(classroom_id))
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    for key, value in classroom_data.items():
        if hasattr(classroom, key):
            setattr(classroom, key, value)
    
    await session.commit()
    await session.refresh(classroom)
    
    return classroom



@router.get("/classrooms/{classroom_id}/activity")
async def get_classroom_activity(
    classroom_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get recent activity and last class for a specific classroom"""
    from app.models import AttendanceRecord
    
    try:
        cid = uuid.UUID(classroom_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    # 1. Recent 3 Scans
    scan_stmt = (
        select(AttendanceRecord, User)
        .join(ClassSession, AttendanceRecord.session_id == ClassSession.id)
        .join(User, AttendanceRecord.student_id == User.id)
        .where(ClassSession.classroom_id == cid)
        .order_by(AttendanceRecord.scan_time.desc())
        .limit(3)
    )
    scans = (await session.exec(scan_stmt)).all()
    
    recent_scans = []
    for rec, student in scans:
        recent_scans.append({
            "name": student.full_name,
            "reg_no": student.admission_number,
            "time": rec.scan_time.strftime("%H:%M:%S"),
            "date": rec.scan_time.strftime("%Y-%m-%d"),
            "image": rec.live_image or ""
        })
        
    # 2. Last Class
    class_stmt = (
        select(ClassSession, Course)
        .join(Course, ClassSession.course_id == Course.id)
        .where(ClassSession.classroom_id == cid)
        .order_by(ClassSession.session_date.desc(), ClassSession.end_time.desc())
        .limit(1)
    )
    last_class_res = (await session.exec(class_stmt)).first()
    
    last_class_info = None
    if last_class_res:
        sess, course = last_class_res
        last_class_info = {
            "name": course.course_name,
            "code": course.course_code,
            "time": f"{sess.start_time.strftime('%H:%M')} - {sess.end_time.strftime('%H:%M')}",
            "date": sess.session_date.strftime("%Y-%m-%d")
        }
        
    return {
        "recent_scans": recent_scans,
        "last_class": last_class_info
    }


@router.get("/classrooms-detailed")
async def get_classrooms_detailed(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all classrooms with detailed activity information"""
    from app.models import AttendanceRecord, SystemActivity, ScanLog
    from sqlmodel import func
    
    try:
        # Get all classrooms
        classrooms_result = await session.exec(select(Classroom))
        classrooms = classrooms_result.all()
        
        # Get recent activity (last 2 hours)
        # 2. Batch: Scans Today & Last Activity (Optimized)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        recent_threshold = datetime.utcnow() - timedelta(minutes=10) # 10 mins considered "Active"
        
        # Scans Today Map
        count_stmt = (
            select(ClassSession.classroom_id, func.count(AttendanceRecord.id))
            .join(ClassSession, AttendanceRecord.session_id == ClassSession.id)
            .where(AttendanceRecord.scan_time >= today_start)
            .group_by(ClassSession.classroom_id)
        )
        count_map = {r[0]: r[1] for r in (await session.exec(count_stmt)).all() if r[0]}
        
        # Last Activity Map (AttendanceRecords)
        max_time_stmt = (
            select(ClassSession.classroom_id, func.max(AttendanceRecord.scan_time))
            .join(ClassSession, AttendanceRecord.session_id == ClassSession.id)
            .group_by(ClassSession.classroom_id)
        )
        time_map = {r[0]: r[1] for r in (await session.exec(max_time_stmt)).all() if r[0]}
        
        # System Activity Map (Unified Triggers: Scans, Failures, etc.)
        sys_act_stmt = (
            select(SystemActivity.entity_id, func.max(SystemActivity.timestamp))
            .where(
                (SystemActivity.timestamp >= recent_threshold) & 
                (SystemActivity.entity_type == "ATTENDANCE")
            )
            .group_by(SystemActivity.entity_id)
        )
        try:
            sys_act_results = (await session.exec(sys_act_stmt)).all()
            active_entity_ids = {r[0]: r[1] for r in sys_act_results if r[0]}
        except Exception as e:
            # print(f"SystemActivity query failed: {e}")
            active_entity_ids = {}

        # ScanLog Activity Map (Real-time scans, even failed ones)
        scan_log_stmt = (
             select(ScanLog.room_code, func.max(ScanLog.timestamp))
             .where(ScanLog.timestamp >= recent_threshold)
             .group_by(ScanLog.room_code)
        )
        scan_log_results = (await session.exec(scan_log_stmt)).all()
        
        # Map room_code -> timestamp
        classroom_code_map = {c.room_code: c.id for c in classrooms}
        scan_log_map = {}
        for code, ts in scan_log_results:
             if code in classroom_code_map:
                 scan_log_map[classroom_code_map[code]] = ts

        detailed_classrooms = []
        active_rooms = []
        
        for room in classrooms:
            last_time = time_map.get(room.id)
            scans = count_map.get(room.id, 0)
            
            # Check Unified Activity
            sys_last_time = active_entity_ids.get(str(room.id))
            scan_last_time = scan_log_map.get(room.id)

            is_active = False
            
            # Determine latest activity time
            latest_activity = last_time
            if sys_last_time and (not latest_activity or sys_last_time > latest_activity):
                latest_activity = sys_last_time
            if scan_last_time and (not latest_activity or scan_last_time > latest_activity):
                latest_activity = scan_last_time

            # Update last_attendance if recent activity found
            if latest_activity and latest_activity >= recent_threshold:
                 is_active = True
                 last_time = latest_activity
            
            # Ensure last_attendance reflects the very latest scan if available
            if scan_last_time and (not last_time or scan_last_time > last_time):
                last_time = scan_last_time

            data = {
                "id": room.id,
                "room_code": room.room_code,
                "room_name": room.room_name,
                "building": room.building,
                "floor": room.floor,
                "capacity": room.capacity,
                "qr_code": room.qr_code,
                "last_attendance": last_time.isoformat() if last_time else None,
                "total_scans_today": scans,
                "is_active": is_active,
                "last_student_adm": None,
                "current_class": None
            }
            
            if is_active:
                active_rooms.append(data)
            else:
                detailed_classrooms.append(data)
                
        # Fetch Details for Active Rooms
        for room_data in active_rooms:
             try:
                 # Try to find successful attendance info first
                 dtl_query = (
                    select(AttendanceRecord, User, Course)
                    .join(ClassSession, AttendanceRecord.session_id == ClassSession.id)
                    .join(User, AttendanceRecord.student_id == User.id)
                    .join(Course, ClassSession.course_id == Course.id)
                    .where(ClassSession.classroom_id == room_data['id'])
                    .order_by(AttendanceRecord.scan_time.desc())
                    .limit(1)
                 )
                 res = (await session.exec(dtl_query)).first()
                 if res:
                     _, student, course = res
                     room_data['last_student_adm'] = student.admission_number
                     room_data['current_class'] = f"{course.course_code}: {course.course_name}"
                 else:
                     # Fallback to ScanLog for user info if no successful attendance
                     scan_query = (
                         select(ScanLog)
                         .where(ScanLog.room_code == room_data['room_code'])
                         .order_by(ScanLog.timestamp.desc())
                         .limit(1)
                     )
                     last_scan = (await session.exec(scan_query)).first()
                     if last_scan:
                         # Get student name if possible
                         student = await session.get(User, last_scan.student_id)
                         room_data['last_student_adm'] = student.admission_number if student else "Unknown"
                         room_data['current_class'] = last_scan.status_message or "Scan Activity"

                 detailed_classrooms.append(room_data)
             except Exception:
                 detailed_classrooms.append(room_data)
        
        # Calculate stats
        stats = {
            "total": len(detailed_classrooms),
            "active": sum(1 for r in detailed_classrooms if r["is_active"]),
            "inactive": sum(1 for r in detailed_classrooms if not r["is_active"]),
            "with_qr": sum(1 for r in detailed_classrooms if r["qr_code"])
        }
        
        return {
            "classrooms": detailed_classrooms,
            "stats": stats
        }
    except Exception as e:
        import traceback
        print(f"Critical error in classrooms-detailed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch classrooms: {str(e)}")

@router.put("/classrooms/{classroom_id}")
async def update_classroom(
    classroom_id: str,
    update_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update classroom details"""
    try:
        # Get the classroom
        classroom = await session.get(Classroom, classroom_id)
        if not classroom:
            raise HTTPException(status_code=404, detail="Classroom not found")
        
        # Update fields if provided
        if "room_name" in update_data and update_data["room_name"]:
            classroom.room_name = update_data["room_name"]
        if "building" in update_data and update_data["building"]:
            classroom.building = update_data["building"]
        if "floor" in update_data and update_data["floor"]:
            classroom.floor = update_data["floor"]
        if "capacity" in update_data and update_data["capacity"]:
            classroom.capacity = int(update_data["capacity"])
        
        session.add(classroom)
        await session.commit()
        await session.refresh(classroom)
        
        return {
            "message": "Classroom updated successfully",
            "classroom": {
                "id": str(classroom.id),
                "room_code": classroom.room_code,
                "room_name": classroom.room_name,
                "building": classroom.building,
                "floor": classroom.floor,
                "capacity": classroom.capacity
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating classroom: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update classroom: {str(e)}")

@router.post("/generate-all-qr")
async def generate_all_qr_codes(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Switch to Dynamic QR Codes.
    This endpoint now CLEARS the static 'qr_code' field from the database,
    as the frontend now generates QR codes dynamically using the browser's current URL.
    """
    
    # Get all classrooms
    classrooms_result = await session.exec(select(Classroom))
    classrooms = classrooms_result.all()
    
    if not classrooms:
        raise HTTPException(status_code=404, detail="No classrooms found in database")

    generated_count = 0
    
    for room in classrooms:
        # Clear the static QR code image to save space and prevent stale IPs
        # The frontend now generates this on the fly.
        room.qr_code = None
        session.add(room)
        generated_count += 1
    
    await session.commit()
    
    return {
        "success": True,
        "generated": generated_count,
        "message": f"Successfully switched {generated_count} classrooms to Dynamic QR Codes (Static images cleared)"
    }

@router.post("/deactivate-all")
async def deactivate_all_classrooms(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Deactivate all classrooms by removing their QR codes."""
    classrooms_result = await session.exec(select(Classroom))
    classrooms = classrooms_result.all()
    
    count = 0
    for room in classrooms:
        room.qr_code = None
        session.add(room)
        count += 1
        
    await session.commit()
    return {"success": True, "deactivated": count, "message": "All classrooms deactivated"}

from pydantic import BaseModel

class VerifyScanRequest(BaseModel):
    room_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    metadata: Optional[dict] = None

@router.post("/verify-scan")
async def verify_classroom_scan(
    scan_data: VerifyScanRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Smart Verification with robust logging (ScanLog).
    1. Log Attempt.
    2. Identify classroom.
    3. Check for ACTIVE Class Session.
    4. Verify Registration.
    5. Mark attendance.
    """
    from app.models import AttendanceRecord, ScanLog, StudentCourseRegistration
    
    # 0. Initialize Log
    scan_log = ScanLog(
        student_id=current_user.id,
        room_code=scan_data.room_code,
        timestamp=datetime.utcnow(),
        is_successful=False,
        status_message="Initializing"
    )
    session.add(scan_log)

    # 1. Find Classroom
    room_query = select(Classroom).where(Classroom.room_code == scan_data.room_code)
    room_result = await session.exec(room_query)
    room = room_result.first()
    
    if not room:
        scan_log.status_message = "Invalid Room Code"
        await session.commit()
        # "Record no matter what" - Return recorded state instead of Error
        return {"success": False, "message": "Unknown Room Code (Logged)"}
        
    # 2. Determine Current Context
    now = datetime.now()
    today_date = now.date()
    current_time = now.time()
    day_of_week = now.weekday() # 0=Monday
    
    # 3. Find Active Session
    # Check ClassSession (Specific)
    session_query = select(ClassSession).where(
        (ClassSession.classroom_id == room.id) &
        (ClassSession.session_date == today_date) &
        (ClassSession.start_time <= current_time) &
        (ClassSession.end_time >= current_time)
    )
    session_result = await session.exec(session_query)
    active_session = session_result.first()
    
    # If no specific session, check TimetableSlot (Recurring) and auto-create session
    if not active_session:
        slot_query = select(TimetableSlot).where(
            (TimetableSlot.classroom_id == room.id) &
            (TimetableSlot.day_of_week == day_of_week) &
            (TimetableSlot.start_time <= current_time) &
            (TimetableSlot.end_time >= current_time) &
            (TimetableSlot.is_active == True)
        )
        slot_result = await session.exec(slot_query)
        slot = slot_result.first()
        
        if slot:
            # Auto-create session from slot
            active_session = ClassSession(
                course_id=slot.course_id,
                timetable_slot_id=slot.id,
                session_date=today_date,
                start_time=slot.start_time,
                end_time=slot.end_time,
                classroom_id=room.id,
                lecturer_id=slot.lecturer_id,
                status="ongoing",
                active=True
            )
            session.add(active_session)
            await session.commit()
            await session.refresh(active_session)
            
    if not active_session:
        scan_log.status_message = "No Class Scheduled"
        await session.commit()
        # "Don't disallow" - Return Success (Recorded)
        return {
            "success": True, 
            "message": "Scan Recorded (No Active Session)",
            "room_name": room.room_name
        }
    
    # Update log with session
    scan_log.class_session_id = active_session.id
        
    # 3.5 Verify Student Registration
    reg_query = select(StudentCourseRegistration).where(
        (StudentCourseRegistration.student_id == current_user.id) &
        (StudentCourseRegistration.course_id == active_session.course_id)
    )
    reg_result = await session.exec(reg_query)
    if not reg_result.first():
         # Fetch Course Info
        course = await session.get(Course, active_session.course_id)
        import json
        
        # Create Flagged Record ("Don't disallow")
        att_record = AttendanceRecord(
            session_id=active_session.id,
            student_id=current_user.id,
            time=datetime.utcnow(),
            status="flagged",
            verification_method="qr",
            ip_address=scan_data.metadata.get("public_ip") if scan_data.metadata else None,
            device_info=scan_data.metadata.get("userAgent") if scan_data.metadata else None,
            location_data=json.dumps(scan_data.metadata.get("geolocation")) if scan_data.metadata else None
        )
        session.add(att_record)

        scan_log.is_successful = True # It IS successful in terms of recording
        scan_log.status_message = "Flagged (Not Registered)"
        
        # Log System Activity
        log_meta = {"status": "Flagged", "course": course.course_code}
        if scan_data.metadata:
            log_meta.update(scan_data.metadata)
            
        await log_system_activity(
            session, "SCAN_SUCCESS", "ATTENDANCE", f"Flagged Entry: {course.course_code}", 
            actor_id=current_user.id, entity_id=str(room.id), 
            metadata=log_meta
        )
        
        await session.commit()

        return {
            "success": True,
            "message": f"Check-in Recorded (Flagged - Not Registered for {course.course_code})",
            "room_name": room.room_name,
            "course_name": course.course_name
        }
        
    # 4. Check for Existing Attendance
    existing_query = select(AttendanceRecord).where(
        (AttendanceRecord.session_id == active_session.id) &
        (AttendanceRecord.student_id == current_user.id)
    )
    existing_result = await session.exec(existing_query)
    if existing_result.first():
         # Fetch Course Info
        course = await session.get(Course, active_session.course_id)
        
        scan_log.is_successful = True # Access granted
        scan_log.status_message = "Duplicate Scan (Already Marked)"
        await session.commit()

        return {
            "success": True,
            "already_marked": True,
            "message": f"Already marked present for {course.course_code}",
            "course_name": course.course_name,
            "room_name": room.room_name
        }

    # 5. Mark Attendance
    record = AttendanceRecord(
        session_id=active_session.id,
        student_id=current_user.id,
        scan_time=now,
        status="present",
        connection_type="QR_SCAN_LAN"
    )
    session.add(record)
    
    # Log Success
    scan_log.is_successful = True
    scan_log.status_message = "Success: Marked Present"
    
    # Log System Activity (Success)
    course = await session.get(Course, active_session.course_id) # Fetch early for log
    
    log_meta = {"status": "Present", "course": course.course_code}
    if scan_data.metadata:
        log_meta.update(scan_data.metadata)

    await log_system_activity(
        session, "SCAN_SUCCESS", "ATTENDANCE", f"Marked Present: {course.course_code}", 
        actor_id=current_user.id, entity_id=str(room.id), 
        metadata=log_meta,
        ip_address=scan_data.metadata.get("public_ip") if scan_data.metadata else None
    )

    await session.commit()
    
    return {
        "success": True,
        "message": f"Successfully marked present for {course.course_code}",
        "course_name": course.course_name,
        "room_name": room.room_name,
        "time": now.strftime("%H:%M")
    }

# ==================== COURSES ====================

@router.get("/courses")
async def get_courses(session: AsyncSession = Depends(get_session)):
    """Get all courses with lecturer and classroom info"""
    result = await session.exec(select(Course))
    courses = result.all()
    
    # Enrich with lecturer and classroom names
    enriched = []
    for course in courses:
        course_dict = course.dict()
        
        if course.lecturer_id:
            lecturer = await session.get(User, course.lecturer_id)
            course_dict['lecturer_name'] = lecturer.full_name if lecturer else None
        
        if course.classroom_id:
            classroom = await session.get(Classroom, course.classroom_id)
            course_dict['classroom_name'] = classroom.room_name if classroom else None
            course_dict['room_code'] = classroom.room_code if classroom else None
        
        enriched.append(course_dict)
    
    return enriched

@router.post("/courses")
async def create_course(
    course_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new course"""
    course = Course(
        course_code=course_data['course_code'],
        course_name=course_data['course_name'],
        department=course_data.get('department'),
        credits=course_data.get('credits', 3),
        semester=course_data.get('semester'),
        classroom_id=uuid.UUID(course_data['classroom_id']) if course_data.get('classroom_id') else None,
        lecturer_id=uuid.UUID(course_data['lecturer_id']) if course_data.get('lecturer_id') else None
    )
    
    session.add(course)
    await session.commit()
    await session.refresh(course)
    
    return course

@router.put("/courses/{course_id}")
async def update_course(
    course_id: str,
    course_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update course details"""
    course = await session.get(Course, uuid.UUID(course_id))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    for key, value in course_data.items():
        if hasattr(course, key) and key not in ['id']:
            if key in ['classroom_id', 'lecturer_id'] and value:
                setattr(course, key, uuid.UUID(value))
            else:
                setattr(course, key, value)
    
    await session.commit()
    await session.refresh(course)
    
    return course

# ==================== TIMETABLE SLOTS ====================

@router.get("/timetable")
async def get_timetable(
    day: Optional[int] = None,
    session: AsyncSession = Depends(get_session)
):
    """Get timetable slots, optionally filtered by day"""
    query = select(TimetableSlot).where(TimetableSlot.is_active == True)
    
    if day is not None:
        query = query.where(TimetableSlot.day_of_week == day)
    
    result = await session.exec(query)
    slots = result.all()
    
    # Enrich with course, classroom, and lecturer info
    enriched = []
    for slot in slots:
        slot_dict = slot.dict()
        
        course = await session.get(Course, slot.course_id)
        classroom = await session.get(Classroom, slot.classroom_id)
        lecturer = await session.get(User, slot.lecturer_id)
        
        slot_dict['course_code'] = course.course_code if course else None
        slot_dict['course_name'] = course.course_name if course else None
        slot_dict['room_code'] = classroom.room_code if classroom else None
        slot_dict['room_name'] = classroom.room_name if classroom else None
        slot_dict['lecturer_name'] = lecturer.full_name if lecturer else None
        
        enriched.append(slot_dict)
    
    return enriched

@router.post("/timetable")
async def create_timetable_slot(
    slot_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new timetable slot"""
    # Check for conflicts
    existing = await session.exec(
        select(TimetableSlot).where(
            TimetableSlot.classroom_id == uuid.UUID(slot_data['classroom_id']),
            TimetableSlot.day_of_week == slot_data['day_of_week'],
            TimetableSlot.is_active == True
        )
    )
    
    for existing_slot in existing.all():
        # Check time overlap
        new_start = datetime.strptime(slot_data['start_time'], '%H:%M:%S').time()
        new_end = datetime.strptime(slot_data['end_time'], '%H:%M:%S').time()
        
        if (new_start < existing_slot.end_time and new_end > existing_slot.start_time):
            raise HTTPException(
                status_code=400,
                detail=f"Time conflict with existing slot in {existing_slot.classroom_id}"
            )
    
    slot = TimetableSlot(
        course_id=uuid.UUID(slot_data['course_id']),
        classroom_id=uuid.UUID(slot_data['classroom_id']),
        lecturer_id=uuid.UUID(slot_data['lecturer_id']),
        day_of_week=slot_data['day_of_week'],
        start_time=datetime.strptime(slot_data['start_time'], '%H:%M:%S').time(),
        end_time=datetime.strptime(slot_data['end_time'], '%H:%M:%S').time(),
        effective_from=datetime.strptime(slot_data['effective_from'], '%Y-%m-%d').date() if slot_data.get('effective_from') else None,
        effective_until=datetime.strptime(slot_data['effective_until'], '%Y-%m-%d').date() if slot_data.get('effective_until') else None,
        is_active=True
    )
    
    session.add(slot)
    await session.commit()
    await session.refresh(slot)
    
    return slot

@router.put("/timetable/{slot_id}")
async def update_timetable_slot(
    slot_id: str,
    slot_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update a timetable slot"""
    slot = await session.get(TimetableSlot, uuid.UUID(slot_id))
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found")
    
    # Update fields
    if 'course_id' in slot_data:
        slot.course_id = uuid.UUID(slot_data['course_id'])
    if 'classroom_id' in slot_data:
        slot.classroom_id = uuid.UUID(slot_data['classroom_id'])
    if 'lecturer_id' in slot_data:
        slot.lecturer_id = uuid.UUID(slot_data['lecturer_id'])
    if 'day_of_week' in slot_data:
        slot.day_of_week = slot_data['day_of_week']
    if 'start_time' in slot_data:
        slot.start_time = datetime.strptime(slot_data['start_time'], '%H:%M:%S').time()
    if 'end_time' in slot_data:
        slot.end_time = datetime.strptime(slot_data['end_time'], '%H:%M:%S').time()
    if 'effective_from' in slot_data and slot_data['effective_from']:
        slot.effective_from = datetime.strptime(slot_data['effective_from'], '%Y-%m-%d').date()
    if 'effective_until' in slot_data and slot_data['effective_until']:
        slot.effective_until = datetime.strptime(slot_data['effective_until'], '%Y-%m-%d').date()
    
    session.add(slot)
    await session.commit()
    await session.refresh(slot)
    
    return {
        "message": "Timetable slot updated successfully",
        "slot": slot
    }

@router.delete("/timetable/{slot_id}")
async def delete_timetable_slot(
    slot_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a timetable slot"""
    slot = await session.get(TimetableSlot, uuid.UUID(slot_id))
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found")
    
    await session.delete(slot)
    await session.commit()
    
    return {"message": "Timetable slot deleted successfully"}

# ==================== WEEKLY VIEW ====================

@router.get("/timetable/weekly")
async def get_weekly_timetable(session: AsyncSession = Depends(get_session)):
    """Get organized weekly timetable view"""
    result = await session.exec(select(TimetableSlot).where(TimetableSlot.is_active == True))
    slots = result.all()
    
    # Organize by day
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    weekly = {day: [] for day in days}
    
    for slot in slots:
        day_name = days[slot.day_of_week]
        course = await session.get(Course, slot.course_id)
        classroom = await session.get(Classroom, slot.classroom_id)
        lecturer = await session.get(User, slot.lecturer_id)
        
        weekly[day_name].append({
            'id': str(slot.id),
            'course_code': course.course_code if course else None,
            'course_name': course.course_name if course else None,
            'room_code': classroom.room_code if classroom else None,
            'room_name': classroom.room_name if classroom else None,
            'lecturer_name': lecturer.full_name if lecturer else None,
            'start_time': slot.start_time.strftime('%H:%M'),
            'end_time': slot.end_time.strftime('%H:%M')
        })
    
    # Sort each day by start time
    for day in weekly:
        weekly[day].sort(key=lambda x: x['start_time'])
    
    return weekly

# ==================== AMENITIES ====================

@router.get("/amenities/options")
async def get_amenity_options():
    """Get available amenity options"""
    return {
        "amenities": [
            {"id": "projector", "name": "Projector"},
            {"id": "speaker", "name": "Speaker System"},
            {"id": "pointer", "name": "Laser Pointer"},
            {"id": "extension", "name": "Extension Cables"},
            {"id": "tv_screen", "name": "TV Screen"},
            {"id": "whiteboard", "name": "Whiteboard"},
            {"id": "smartboard", "name": "Smart Board"},
            {"id": "ac", "name": "Air Conditioning"},
            {"id": "microphone", "name": "Microphone"},
            {"id": "computers", "name": "Computers/Lab Equipment"}
        ]
    }
