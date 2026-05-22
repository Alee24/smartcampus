from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import SystemConfig, User, Role, Course, Classroom, TimetableSlot, ScanLog
from app.auth import get_current_user, get_password_hash
from app.utils.audit import log_action
import csv
import io
import uuid
from typing import List
from datetime import datetime
from pydantic import BaseModel

router = APIRouter()

# Dependency: Ensure Admin
async def ensure_admin(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # Fetch role name
    role = await session.get(Role, current_user.role_id)
    if not role or role.name not in ["SuperAdmin", "Admin"]:
        raise HTTPException(status_code=403, detail="Administrator access required")
    return current_user

@router.get("/")
async def get_settings(session: AsyncSession = Depends(get_session), admin: User = Depends(ensure_admin)):
    configs = (await session.exec(select(SystemConfig))).all()
    return {c.key: c.value for c in configs}

@router.post("/")
async def update_settings(
    request: Request,
    settings: dict, 
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    for key, value in settings.items():
        stmt = select(SystemConfig).where(SystemConfig.key == key)
        existing = (await session.exec(stmt)).first()
        
        if existing:
            existing.value = str(value)
            session.add(existing)
        else:
            new_config = SystemConfig(key=key, value=str(value), category="general")
            session.add(new_config)
            
    await session.commit()
    
    await log_action(
        session=session,
        action_type="update_settings",
        user=admin,
        table_name="system_configs",
        description="Updated system settings",
        new_values=settings,
        request=request
    )
    
    return {"status": "success"}

@router.get("/dashboard-config")
async def get_dashboard_config(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """Get dashboard menu configuration for all roles"""
    stmt = select(SystemConfig).where(SystemConfig.key == "dashboard_menu_config")
    config = (await session.exec(stmt)).first()
    
    if config:
        import json
        return {"config": json.loads(config.value)}
    else:
        # Return default config
        return {"config": {}}

@router.post("/dashboard-config")
async def save_dashboard_config(
    request: Request,
    payload: dict,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """Save dashboard menu configuration"""
    import json
    config_json = json.dumps(payload.get("config", {}))
    
    stmt = select(SystemConfig).where(SystemConfig.key == "dashboard_menu_config")
    existing = (await session.exec(stmt)).first()
    
    if existing:
        existing.value = config_json
        session.add(existing)
    else:
        new_config = SystemConfig(
            key="dashboard_menu_config",
            value=config_json,
            category="ui"
        )
        session.add(new_config)
    
    await session.commit()
    
    await log_action(
        session=session,
        action_type="update_dashboard_config",
        user=admin,
        table_name="system_configs",
        description="Updated dashboard menu configuration",
        new_values=payload,
        request=request
    )
    
    return {"status": "success"}

@router.get("/company-settings")
async def get_company_settings(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """Get company/university settings"""
    stmt = select(SystemConfig).where(SystemConfig.key == "company_settings")
    config = (await session.exec(stmt)).first()
    
    if config:
        import json
        return json.loads(config.value)
    else:
        # Return default config
        return {}

@router.post("/company-settings")
async def save_company_settings(
    request: Request,
    payload: dict,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """Save company/university settings"""
    import json
    config_json = json.dumps(payload)
    
    stmt = select(SystemConfig).where(SystemConfig.key == "company_settings")
    existing = (await session.exec(stmt)).first()
    
    if existing:
        existing.value = config_json
        session.add(existing)
    else:
        new_config = SystemConfig(
            key="company_settings",
            value=config_json,
            category="company"
        )
        session.add(new_config)
    
    await session.commit()
    
    try:
        await log_action(
            session=session,
            action_type="update_company_settings",
            user=admin,
            table_name="system_configs",
            description="Updated company/university settings",
            new_values={"company_name": payload.get("company_name", ""), "logo_url": payload.get("logo_url", "")},
            request=request
        )
    except Exception as e:
        print(f"Audit log warning (non-blocking): {e}")
    
    return {"status": "success"}

@router.post("/upload-logo")
async def upload_logo(
    request: Request,
    logo: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """Upload company logo"""
    import os
    import shutil
    from pathlib import Path
    
    # Validate file type
    if not logo.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/logos")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = logo.filename.split('.')[-1]
    filename = f"logo_{uuid.uuid4()}.{file_extension}"
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(logo.file, buffer)
    
    # Return URL
    logo_url = f"/uploads/logos/{filename}"
    
    await log_action(
        session=session,
        action_type="upload_logo",
        user=admin,
        table_name="system_configs",
        description=f"Uploaded new company logo: {filename}",
        new_values={"logo_url": logo_url},
        request=request
    )
    
    return {"logo_url": logo_url}

# --- Robust Bulk Uploads ---

@router.post("/bulk/lecturers")
async def bulk_upload_lecturers(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """
    Bulk upload lecturers. Supports UPSERT and batch processing.
    """
    try:
        content = await file.read()
        try:
            decoded = content.decode('utf-8-sig').splitlines()
        except UnicodeDecodeError:
            decoded = content.decode('latin-1').splitlines()

        reader = csv.DictReader(decoded)
        
        lecturer_role = (await session.exec(select(Role).where(Role.name == "Lecturer"))).first()
        if not lecturer_role:
            lecturer_role = Role(name="Lecturer", description="Lecturer Role")
            session.add(lecturer_role)
            await session.commit()
            await session.refresh(lecturer_role)
        added_count = 0
        updated_count = 0
        error_count = 0
        errors = []
        batch_size = 500
        current_batch = 0
        
        for row_num, row in enumerate(reader, start=1):
            try:
                email = (row.get('email') or '').strip()
                name = (row.get('full_name') or '').strip()
                adm = (row.get('admission_number') or '').strip()
                school = (row.get('school') or 'General').strip()
                phone_number = (row.get('phone_number') or '').strip() or None
                profile_image = (row.get('profile_image') or '').strip() or None
                
                if not email or not name:
                    error_count += 1
                    errors.append(f"Row {row_num}: Missing email or name")
                    continue
                
                # Check if exists (by email or admission number)
                query = select(User).where((User.email == email) | (User.admission_number == adm))
                existing = (await session.exec(query)).first()
                
                if existing:
                    # UPDATE - Ensure role is set to Lecturer
                    existing.full_name = name
                    existing.school = school
                    existing.role_id = lecturer_role.id
                    existing.status = "active"
                    if phone_number: existing.phone_number = phone_number
                    if profile_image: existing.profile_image = profile_image
                    session.add(existing)
                    try:
                        await session.commit()
                        updated_count += 1
                    except Exception as e:
                        await session.rollback()
                        raise Exception(f"Database error on update: {str(e)}")
                else:
                    # INSERT
                    new_user = User(
                        full_name=name,
                        email=email,
                        school=school,
                        admission_number=adm or f"LEC{uuid.uuid4().hex[:6].upper()}",
                        hashed_password=get_password_hash("Digital2025"),
                        role_id=lecturer_role.id,
                        status="active",
                        phone_number=phone_number,
                        profile_image=profile_image
                    )
                    session.add(new_user)
                    try:
                        await session.commit()
                        added_count += 1
                    except Exception as e:
                        await session.rollback()
                        raise Exception(f"Database error on insert: {str(e)}")
                    
            except Exception as e:
                error_count += 1
                errors.append(f"Row {row_num}: {str(e)}")
        
        return {
            "success": True,
            "added": added_count,
            "updated": updated_count,
            "errors": error_count,
            "error_details": errors[:100],
            "total_processed": added_count + updated_count + error_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/bulk/students")
async def bulk_upload_students(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """
    Bulk upload students. Supports UPSERT and batch processing.
    """
    try:
        content = await file.read()
        try:
            decoded = content.decode('utf-8-sig').splitlines()
        except UnicodeDecodeError:
            decoded = content.decode('latin-1').splitlines()

        reader = csv.DictReader(decoded)
        
        student_role = (await session.exec(select(Role).where(Role.name == "Student"))).first()
        if not student_role:
            student_role = Role(name="Student", description="Student Role")
            session.add(student_role)
            await session.commit()
            await session.refresh(student_role)
        
        # Pre-load all roles into a cache for quick lookup
        all_roles = (await session.exec(select(Role))).all()
        role_cache = {r.name.lower(): r for r in all_roles}
        
        added_count = 0
        updated_count = 0
        error_count = 0
        errors = []
        batch_size = 500
        current_batch = 0
        
        for row_num, row in enumerate(reader, start=1):
            try:
                adm = (row.get('admission_number') or '').strip()
                first_name = (row.get('first_name') or '').strip()
                last_name = (row.get('last_name') or '').strip()
                full_name = (row.get('full_name') or '').strip()
                email = (row.get('email') or '').strip()
                school = (row.get('school') or 'General').strip()
                gender = (row.get('gender') or '').strip() or None
                program = (row.get('program') or '').strip() or None
                status_val = (row.get('status') or 'active').strip() or 'active'
                
                phone_number = (row.get('phone_number') or '').strip() or None
                profile_image = (row.get('profile_image') or '').strip() or None
                
                # Resolve role from CSV column, default to Student
                role_name = (row.get('role') or '').strip().lower()
                resolved_role = role_cache.get(role_name) if role_name else None
                assigned_role = resolved_role or student_role
                
                # Construct full name
                if not full_name:
                    if first_name or last_name:
                        full_name = f"{first_name} {last_name}".strip()
                    else:
                        full_name = f"Student {uuid.uuid4().hex[:6].upper()}"
                
                if not adm:
                    adm = f"STD{uuid.uuid4().hex[:8].upper()}"
                
                # Check if exists (by admission number first, then email)
                existing = (await session.exec(select(User).where(User.admission_number == adm))).first()
                if not existing and email:
                    existing = (await session.exec(select(User).where(User.email == email))).first()
                
                if existing:
                    # UPDATE
                    existing.full_name = full_name
                    existing.school = school
                    existing.role_id = assigned_role.id
                    existing.status = status_val
                    if first_name: existing.first_name = first_name
                    if last_name: existing.last_name = last_name
                    if email: existing.email = email
                    if gender: existing.gender = gender
                    if program: existing.program = program
                    if phone_number: existing.phone_number = phone_number
                    if profile_image: existing.profile_image = profile_image
                    session.add(existing)
                    try:
                        await session.commit()
                        updated_count += 1
                    except Exception as e:
                        await session.rollback()
                        raise Exception(f"Database error on update: {str(e)}")
                else:
                    # INSERT
                    new_user = User(
                        full_name=full_name,
                        first_name=first_name or None,
                        last_name=last_name or None,
                        email=email or None,
                        school=school,
                        admission_number=adm,
                        hashed_password=get_password_hash("Digital2025"),
                        role_id=assigned_role.id,
                        status=status_val,
                        gender=gender,
                        program=program,
                        phone_number=phone_number,
                        profile_image=profile_image
                    )
                    session.add(new_user)
                    try:
                        await session.commit()
                        added_count += 1
                    except Exception as e:
                        await session.rollback()
                        raise Exception(f"Database error on insert: {str(e)}")
                    
            except Exception as e:
                error_count += 1
                errors.append(f"Row {row_num}: {str(e)}")
        
        return {
            "success": True,
            "added": added_count,
            "updated": updated_count,
            "errors": error_count,
            "error_details": errors[:100],
            "total_processed": added_count + updated_count + error_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/bulk/courses")
async def bulk_upload_courses(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """
    Bulk upload courses. Supports UPSERT and batch processing.
    """
    try:
        content = await file.read()
        try:
            decoded = content.decode('utf-8-sig').splitlines()
        except UnicodeDecodeError:
            decoded = content.decode('latin-1').splitlines()
        
        reader = csv.DictReader(decoded)
        
        def safe_int(val, default=0):
            if not val: return default
            try:
                return int(float(str(val).strip()))
            except (ValueError, TypeError):
                return default

        added_count = 0
        updated_count = 0
        error_count = 0
        errors = []
        batch_size = 500
        current_batch = 0
        
        for row_num, row in enumerate(reader, start=1):
            try:
                code = (row.get('course_code') or row.get('code') or '').strip()
                name = (row.get('course_name') or row.get('name') or '').strip()
                
                if not code:
                    error_count += 1
                    errors.append(f"Row {row_num}: Missing course_code")
                    continue
                
                existing = (await session.exec(select(Course).where(Course.course_code == code))).first()
                
                dept = (row.get('department') or row.get('dept') or '').strip()
                credits = safe_int(row.get('credits') or row.get('units'), 3)
                semester = (row.get('semester') or row.get('sem') or '').strip()
                
                if existing:
                    # UPDATE
                    existing.course_name = name or existing.course_name
                    existing.department = dept or existing.department
                    existing.credits = credits
                    existing.semester = semester or existing.semester
                    session.add(existing)
                    updated_count += 1
                else:
                    # INSERT
                    new_course = Course(
                        course_code=code,
                        course_name=name or code,
                        department=dept,
                        credits=credits,
                        semester=semester
                    )
                    session.add(new_course)
                    added_count += 1
                
                current_batch += 1
                if current_batch >= batch_size:
                    await session.commit()
                    current_batch = 0
                    
            except Exception as e:
                error_count += 1
                errors.append(f"Row {row_num}: {str(e)}")
        
        if current_batch > 0:
            await session.commit()
        
        return {
            "success": True,
            "added": added_count,
            "updated": updated_count,
            "errors": error_count,
            "error_details": errors[:100],
            "total_processed": added_count + updated_count + error_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Course upload failed: {str(e)}")

@router.post("/bulk/classrooms")
async def bulk_upload_classrooms(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """
    Bulk upload classrooms from CSV. Supports large files.
    - Updates existing classrooms (UPSERT logic)
    - Batch commits every 500 records
    - Treats uploaded data as source of truth
    """
    try:
        content = await file.read()
        try:
            decoded = content.decode('utf-8-sig').splitlines()
        except UnicodeDecodeError:
            decoded = content.decode('latin-1').splitlines()
        
        reader = csv.DictReader(decoded)
        
        # Helper for safe integer parsing
        def safe_int(val, default=0):
            if not val: return default
            try:
                return int(float(str(val).strip()))
            except (ValueError, TypeError):
                return default

        added_count = 0
        updated_count = 0
        error_count = 0
        errors = []
        batch_size = 500
        current_batch = 0
        
        for row_num, row in enumerate(reader, start=1):
            try:
                code = (row.get('room_code') or row.get('code') or '').strip()
                name = (row.get('room_name') or row.get('name') or '').strip()
                
                if not code:
                    error_count += 1
                    errors.append(f"Row {row_num}: Missing room_code")
                    continue
                
                # Check if classroom exists (UPSERT)
                existing = (await session.exec(select(Classroom).where(Classroom.room_code == code))).first()
                
                building = (row.get('building') or row.get('bld') or "Main").strip()
                floor_val = safe_int(row.get('floor'), 0)
                capacity_val = safe_int(row.get('capacity'), 40)
                room_type = (row.get('type') or row.get('room_type') or "lecture_hall").strip()
                
                if existing:
                    # UPDATE existing classroom
                    existing.room_name = name or existing.room_name
                    existing.building = building
                    existing.floor = floor_val
                    existing.capacity = capacity_val
                    existing.room_type = room_type
                    existing.status = "available"
                    session.add(existing)
                    updated_count += 1
                else:
                    # INSERT new classroom
                    room = Classroom(
                        room_code=code,
                        room_name=name or code,
                        building=building,
                        floor=floor_val,
                        capacity=capacity_val,
                        room_type=room_type,
                        status="available"
                    )
                    session.add(room)
                    added_count += 1
                
                current_batch += 1
                
                # Batch commit every 500 records
                if current_batch >= batch_size:
                    await session.commit()
                    current_batch = 0
                    
            except Exception as e:
                error_count += 1
                errors.append(f"Row {row_num} ({code if 'code' in locals() else 'unknown'}): {str(e)}")
        
        # Final commit
        if current_batch > 0:
            await session.commit()
        
        return {
            "success": True,
            "added": added_count,
            "updated": updated_count,
            "errors": error_count,
            "error_details": errors[:100],
            "total_processed": added_count + updated_count + error_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classroom upload failed: {str(e)}")

@router.post("/bulk/classes")
async def bulk_upload_timetable_slots(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """
    Bulk upload timetable slots (Classes).
    Robust Mode: Auto-creates missing Courses, Classrooms, and Lecturers (placeholder) to ensure upload success.
    """
    try:
        content = await file.read()
        try:
            decoded = content.decode('utf-8-sig').splitlines()
        except UnicodeDecodeError:
            decoded = content.decode('latin-1').splitlines()
        
        reader = csv.DictReader(decoded)
        
        count = 0
        errors = []
        
        # Helper for flexible time parsing
        def parse_time(t_str):
            if not t_str: return None
            t_str = t_str.strip().upper()
            formats = ['%H:%M', '%H:%M:%S', '%I:%M %p', '%I:%M%p', '%H.%M']
            for fmt in formats:
                try:
                    return datetime.strptime(t_str, fmt).time()
                except ValueError:
                    continue
            return None

        # Helper for flexible date parsing
        def parse_date(d_str):
            if not d_str: return None
            d_str = d_str.strip()
            formats = ['%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y', '%Y.%m.%d']
            for fmt in formats:
                try:
                    return datetime.strptime(d_str, fmt).date()
                except ValueError:
                    continue
            return None

        # Helper for day parsing
        def parse_day(d_raw):
            if not d_raw: return 0
            d_str = str(d_raw).strip().lower()
            if d_str.isdigit():
                return int(d_str) % 7
            
            days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
            for i, day in enumerate(days):
                if day in d_str:
                    return i
            return 0
        
        # Get Lecturer Role for auto-creation
        result = await session.exec(select(Role).where(Role.name == "Lecturer"))
        lecturer_role = result.first()
        
        for i, row in enumerate(reader):
            c_code = (row.get('course_code') or row.get('course') or '').strip()
            
            if not c_code: 
                continue
            
            # Resolve or Create Course 
            stmt = select(Course).where(Course.course_code == c_code)
            course = (await session.exec(stmt)).first()
            if not course:
                course = Course(
                    course_code=c_code,
                    course_name=row.get('course_name') or f"Auto: {c_code}",
                    credits=3,
                    department="General"
                )
                session.add(course)
                # We need to flush to establish relationship properly if reusing connection within transaction?
                # SQLModel will handle 'course=course' assignment correctly.

            # Resolve Lecturer
            l_email = (row.get('lecturer_email') or row.get('lecturer') or row.get('email') or '').strip()
            lecturer = None
            
            if l_email:
                lecturer = (await session.exec(select(User).where(User.email == l_email))).first()
                if not lecturer and lecturer_role:
                    # Auto-create Lecturer if missing
                    lecturer = User(
                        email=l_email,
                        full_name=l_email.split('@')[0], 
                        hashed_password=get_password_hash("Digital2025"),
                        role_id=lecturer_role.id,
                        status="active",
                        admission_number=f"LEC-{uuid.uuid4().hex[:6]}",
                        school="General"
                    )
                    session.add(lecturer)
            
            # Resolution: Lecturer is now optional
            if not lecturer:
                # If no lecturer is found or provided, we leave it as None (nullable)
                lecturer = None
            
            # Resolve or Create Classroom
            r_code = (row.get('classroom_code') or row.get('room') or 'TBD').strip()
            room = (await session.exec(select(Classroom).where(Classroom.room_code == r_code))).first()
            if not room:
                room = Classroom(
                    room_code=r_code,
                    room_name=r_code,
                    capacity=50,
                    status="available"
                )
                session.add(room)
            
            # Day & Time
            day_raw = row.get('day') or row.get('day_of_week')
            day = parse_day(day_raw)
            
            st = parse_time(row.get('start_time') or row.get('start'))
            et = parse_time(row.get('end_time') or row.get('end'))
            
            if not st or not et:
                 # Default time if missing? "Assume correct" -> Maybe assume 08:00-10:00?
                 # Or skip. Skipping invalid time is reasonable "skip unwanted data".
                 continue
            
            # Dates
            eff_from = parse_date(row.get('effective_from') or row.get('start_date'))
            eff_until = parse_date(row.get('effective_until') or row.get('end_date'))
                
            new_slot = TimetableSlot(
                course=course,
                lecturer=lecturer,
                classroom=room,
                day_of_week=day,
                start_time=st,
                end_time=et,
                effective_from=eff_from,
                effective_until=eff_until,
                is_active=True
            )
            session.add(new_slot)
            count += 1
            
        await session.commit()
        return {"status": "success", "count": count, "errors": errors}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Timetable upload failed: {str(e)}")

# --- Geofence Settings ---

from app.models import GeofenceSetting

@router.get("/geofence")
async def get_geofence_settings(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """Get all geofence settings"""
    settings = (await session.exec(select(GeofenceSetting))).all()
    return settings

@router.post("/geofence")
async def create_geofence_setting(
    request: Request,
    payload: dict,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """Create or update geofence setting"""
    name = payload.get("name")
    ip_range = payload.get("ip_range")
    description = payload.get("description", "")
    is_active = payload.get("is_active", True)
    
    if not name or not ip_range:
        raise HTTPException(status_code=400, detail="Name and IP range are required")
        
    stmt = select(GeofenceSetting).where(GeofenceSetting.name == name)
    existing = (await session.exec(stmt)).first()
    
    if existing:
        existing.ip_range = ip_range
        existing.description = description
        existing.is_active = is_active
        session.add(existing)
        action = "update_geofence"
    else:
        new_setting = GeofenceSetting(
            name=name,
            ip_range=ip_range,
            description=description,
            is_active=is_active
        )
        session.add(new_setting)
        action = "create_geofence"
        
    await session.commit()
    
    await log_action(
        session=session,
        action_type=action,
        user=admin,
        table_name="geofence_settings",
        description=f"{action.replace('_', ' ').title()} {name}",
        new_values=payload,
        request=request
    )
    
    return {"status": "success"}

@router.delete("/geofence/{setting_id}")
async def delete_geofence_setting(
    request: Request,
    setting_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """Delete geofence setting"""
    setting = await session.get(GeofenceSetting, setting_id)
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
        
    await session.delete(setting)
    await session.commit()
    
    await log_action(
        session=session,
        action_type="delete_geofence",
        user=admin,
        table_name="geofence_settings",
        description=f"Deleted geofence setting {setting.name}",
        request=request
    )
    
    return {"status": "success"}


@router.post("/bulk/photos")
async def bulk_upload_photos(
    zip_file: UploadFile = File(...),
    csv_file: UploadFile = File(default=None),
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """
    Bulk upload student profile photos.
    - Matches files by Admission Number (Filename = AdmissionNo)
    - OPTIONAL: CSV File mapping custom Filenames -> Admission Numbers
    """
    import zipfile
    import os
    import shutil
    import csv
    from io import StringIO
    from pathlib import Path
    
    # 0. Pre-fetch Users for fast lookup (Normalization: Upper & Stripped)
    all_users = (await session.exec(select(User))).all()
    user_map = {u.admission_number.strip().upper(): u for u in all_users if u.admission_number}
    
    # Pre-fetch Student Role for auto-creation
    student_role = (await session.exec(select(Role).where(Role.name == "Student"))).first()
    if not student_role:
        student_role = Role(name="Student", description="Regular Student")
        session.add(student_role)
        await session.commit()
        await session.refresh(student_role)
    student_role_id = student_role.id

    # 1. Parse CSV Mapping (If provided)
    mapping = {} # Suffix/Filename -> Admission Number
    if csv_file:
        try:
            content = await csv_file.read()
            csv_text = content.decode('utf-8')
            
            # Detect delimiter (handle semi-colon for Excel CSVs)
            delimiter = ','
            if ';' in csv_text and ',' not in csv_text:
                delimiter = ';'
            
            reader = csv.reader(StringIO(csv_text), delimiter=delimiter)
            rows = list(reader)
            
            if rows:
                # Find columns: Usually Col A (0) is Admission, Col B (1) is Suffix/ID
                for row in rows:
                    if len(row) >= 2:
                        adm = row[0].strip()
                        suffix = row[1].strip()
                        # Skip header rows
                        if not adm or adm.lower() in ["admission", "adm_no", "admission number", "reg_no"]:
                            continue
                        mapping[suffix.upper()] = adm
                        # Also store as lowercase just in case
                        mapping[suffix.lower()] = adm
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid CSV file: {str(e)}")

    # 2. Process ZIP
    try:
        # Stream ZIP directly from the upload file object to save disk space
        zip_ref_io = io.BytesIO(await zip_file.read())
        
        success_count = 0
        failed_count = 0
        errors = []
        
        with zipfile.ZipFile(zip_ref_io, 'r') as zip_ref:
            # 1.5. Detect CSV inside ZIP if mapping is empty
            if not mapping:
                csv_files_in_zip = [f for f in zip_ref.namelist() if f.lower().endswith('.csv') and not f.startswith('__MACOSX')]
                if csv_files_in_zip:
                    try:
                        with zip_ref.open(csv_files_in_zip[0]) as zcsv:
                            csv_text = zcsv.read().decode('utf-8')
                            delimiter = ','
                            if ';' in csv_text and ',' not in csv_text: delimiter = ';'
                            reader = csv.reader(StringIO(csv_text), delimiter=delimiter)
                            for row in reader:
                                if len(row) >= 2:
                                    adm, suffix = row[0].strip(), row[1].strip()
                                    if not adm or adm.lower() in ["admission", "adm_no", "reg_no", "id"]: continue
                                    mapping[suffix.upper()] = adm
                    except: pass

            # List files (ignoring __MACOSX and directories and the CSV itself)
            files = [f for f in zip_ref.namelist() if not f.startswith('__MACOSX') and not f.endswith('/') and not f.lower().endswith('.csv')]
            
            for file_name in files:
                if file_name.startswith('__MACOSX'): continue
                try:
                    name_only = os.path.basename(file_name)
                    if not name_only: continue
                    
                    stem = Path(name_only).stem.strip().upper()
                    user = None
                    adm_no_candidate = None
                    
                    # A. Match by CSV Mapping (Suffix/ID Match)
                    if mapping:
                        adm_no_candidate = mapping.get(name_only) or mapping.get(stem)
                        if not adm_no_candidate:
                            for m_suffix, m_adm in mapping.items():
                                if stem == m_suffix.upper() or stem.endswith(m_suffix.upper()):
                                    adm_no_candidate = m_adm
                                    break
                    
                    # B. Fallback: Match by Filename directly (Filename = Admission Number)
                    if not adm_no_candidate:
                        adm_no_candidate = stem
                    
                    if adm_no_candidate:
                        adm_no_norm = str(adm_no_candidate).strip().upper()
                        user = user_map.get(adm_no_norm)
                    

                        if user:
                            # Save Image
                            ext = os.path.splitext(name_only)[1].lower()
                            if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                                ext = '.jpg' # Fallback
                                
                            new_filename = f"profile_{user.id}_{uuid.uuid4().hex[:8]}{ext}"
                            target_path = Path("static/profiles") / new_filename
                            target_path.parent.mkdir(parents=True, exist_ok=True)
                            
                            with zip_ref.open(file_name) as source, open(target_path, "wb") as target:
                                shutil.copyfileobj(source, target)
                            
                            user.profile_image = f"/static/profiles/{new_filename}"
                            session.add(user)
                            
                            # Audit Trail Logging
                            from app.models import AuditLog
                            from datetime import datetime
                            log = AuditLog(
                                timestamp=datetime.utcnow(),
                                user_id=admin.id,
                                user_name=admin.full_name,
                                action_type="BULK_PHOTO_UPDATE",
                                table_name="users",
                                record_id=str(user.id),
                                description=f"Bulk updated profile photo for {user.full_name} via ZIP sync",
                                new_values={"profile_image": user.profile_image}
                            )
                            session.add(log)
                            success_count += 1
                            if success_count % 10 == 0:
                                print(f"Synced {success_count} photos...")
                            if success_count % 100 == 0:
                                await session.commit()
                        else:
                            failed_count += 1
                            if len(errors) < 100:
                                errors.append(f"No matching user for: {name_only}")
                except Exception as e:
                    failed_count += 1
                    errors.append(f"Error processing {file_name}: {str(e)}")
            
            print(f"Bulk photo sync complete. Success: {success_count}, Failed: {failed_count}")
            await session.commit()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk photo upload failed: {str(e)}")
            
    return {
        "status": "success", 
        "count": success_count,
        "processed": success_count + failed_count,
        "matched": success_count, 
        "failed": failed_count,
        "errors": errors
    }

@router.get("/scan-logs")
async def get_scan_logs(limit: int = 100, session: AsyncSession = Depends(get_session)):
    # Join ScanLog with User and optionally Classroom
    # ScanLog.room_code maps to Classroom.room_code
    query = (
        select(ScanLog, User, Classroom)
        .join(User, ScanLog.student_id == User.id)
        .outerjoin(Classroom, ScanLog.room_code == Classroom.room_code)
        .order_by(ScanLog.timestamp.desc())
        .limit(limit)
    )
    results = (await session.exec(query)).all()
    
    data = []
    for log, user, classroom in results:
        # Construct pleasant location string
        loc_str = log.detected_location
        if not loc_str and classroom:
            parts = []
            if classroom.room_name: parts.append(classroom.room_name)
            if classroom.building: parts.append(classroom.building)
            if parts: loc_str = ", ".join(parts)
            
        data.append({
            "id": str(log.id),
            "timestamp": log.timestamp,
            "student_name": user.full_name,
            "admission_number": user.admission_number,
            "room_code": log.room_code,
            "is_successful": log.is_successful,
        })
    return data

class LDAPTestConfig(BaseModel):
    server_uri: str
    bind_dn: str
    bind_password: str
    base_dn: str

@router.post("/test-ldap")
async def test_ldap_connection(
    config: LDAPTestConfig,
    admin: User = Depends(ensure_admin)
):
    try:
        from ldap3 import Server, Connection, ALL
        server = Server(config.server_uri, get_info=ALL)
        conn = Connection(server, user=config.bind_dn, password=config.bind_password, auto_bind=True)
        if conn.bind():
            return {"status": "success", "message": "LDAP connection successful"}
        else:
            return {"status": "error", "message": "Failed to bind to LDAP server"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/sync-ad")
async def sync_ad(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    try:
        from ldap3 import Server, Connection, ALL, SUBTREE
        configs = (await session.exec(select(SystemConfig))).all()
        config_dict = {c.key: c.value for c in configs}
        
        server_uri = config_dict.get('ldap_server_uri')
        bind_dn = config_dict.get('ldap_bind_dn')
        bind_password = config_dict.get('ldap_bind_password')
        base_dn = config_dict.get('ldap_base_dn')
        
        if not server_uri or not base_dn:
            return {"status": "error", "message": "LDAP configuration is incomplete"}
            
        server = Server(server_uri, get_info=ALL)
        conn = Connection(server, user=bind_dn, password=bind_password, auto_bind=True)
        
        search_filter = '(&(objectClass=user)(objectCategory=person))'
        # Fallback to general user/uid if AD filter doesn't match
        try:
            conn.search(base_dn, search_filter, search_scope=SUBTREE, attributes=['sAMAccountName', 'mail', 'cn'])
        except Exception:
            search_filter = '(|(sAMAccountName=*)(uid=*))'
            conn.search(base_dn, search_filter, search_scope=SUBTREE, attributes=['sAMAccountName', 'mail', 'cn', 'uid'])
        
        if not conn.entries:
            # try simpler search filter
            search_filter = '(|(sAMAccountName=*)(uid=*))'
            conn.search(base_dn, search_filter, search_scope=SUBTREE, attributes=['sAMAccountName', 'mail', 'cn', 'uid'])

        if not conn.entries:
            return {"status": "success", "message": "No users found in AD", "new_accounts_count": 0}
            
        student_role = (await session.exec(select(Role).where(Role.name == "Student"))).first()
        if not student_role:
             student_role = Role(name="Student", description="Regular Student")
             session.add(student_role)
             await session.commit()
             await session.refresh(student_role)
        role_id = student_role.id
        
        added_count = 0
        batch_size = 100
        current_batch = 0
        
        for entry in conn.entries:
            username = None
            if hasattr(entry, 'sAMAccountName') and entry.sAMAccountName:
                username = str(entry.sAMAccountName)
            elif hasattr(entry, 'uid') and entry.uid:
                username = str(entry.uid)
                
            email = str(entry.mail) if hasattr(entry, 'mail') and entry.mail else None
            full_name = str(entry.cn) if hasattr(entry, 'cn') and entry.cn else username
            
            if not username:
                continue
                
            query = select(User).where((User.admission_number == username) | ((User.email == email) if email else False))
            existing = (await session.exec(query)).first()
            
            if not existing:
                new_user = User(
                    full_name=full_name,
                    email=email if email else None,
                    admission_number=username,
                    hashed_password=get_password_hash("Digital2025"),
                    role_id=role_id,
                    status="active",
                    school="General"
                )
                session.add(new_user)
                added_count += 1
                current_batch += 1
                
                if current_batch >= batch_size:
                    await session.commit()
                    current_batch = 0
                    
        if current_batch > 0:
            await session.commit()
            
        return {"status": "success", "message": "Synchronization completed", "new_accounts_count": added_count}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

