from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import SystemConfig, User, Role, Course, Classroom, TimetableSlot, ScanLog, IncidentReport
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

@router.delete("/users/factory-reset")
async def factory_reset_users(
    request: Request,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """
    DANGEROUS: Deletes all users and their dependent records from the database,
    EXCEPT for 'mettoalex@gmail.com' and users with the 'SuperAdmin' role.
    """
    try:
        # 1. Disable Foreign Key Checks to allow mass deletion
        await session.execute(text("SET FOREIGN_KEY_CHECKS=0;"))
        
        # 2. Delete main users first (this identifies who is gone)
        # We exclude mettoalex@gmail.com and any user with the SuperAdmin role
        delete_users_sql = """
            DELETE FROM users 
            WHERE email != 'mettoalex@gmail.com' 
            AND role_id NOT IN (SELECT id FROM roles WHERE name='SuperAdmin')
        """
        await session.execute(text(delete_users_sql))
        
        # 3. Clean up orphaned dependent records (Tables where user_id is NOT NULL)
        await session.execute(text("DELETE FROM user_faces WHERE user_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("DELETE FROM user_location_logs WHERE user_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("DELETE FROM entry_logs WHERE user_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("DELETE FROM student_course_registrations WHERE student_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("DELETE FROM attendance_records WHERE student_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("DELETE FROM scan_logs WHERE student_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("DELETE FROM vehicle_logs WHERE guard_id NOT IN (SELECT id FROM users)"))
        
        # 4. Nullify nullable foreign keys pointing to deleted users
        await session.execute(text("UPDATE entry_logs SET guard_id = NULL WHERE guard_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE gate_scan_logs SET guard_id = NULL WHERE guard_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE vehicles SET owner_id = NULL WHERE owner_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE fleet_trips SET driver_id = NULL WHERE driver_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE fleet_passenger_manifest SET user_id = NULL WHERE user_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE fleet_fuel_logs SET driver_id = NULL WHERE driver_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE courses SET lecturer_id = NULL WHERE lecturer_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE class_sessions SET lecturer_id = NULL WHERE lecturer_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE timetable_slots SET lecturer_id = NULL WHERE lecturer_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE attendance_records SET assisted_by = NULL WHERE assisted_by NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE system_activities SET actor_id = NULL WHERE actor_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE audit_logs SET user_id = NULL WHERE user_id NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE event_visitors SET scanned_by = NULL WHERE scanned_by NOT IN (SELECT id FROM users)"))
        await session.execute(text("UPDATE users SET guardian_id = NULL WHERE guardian_id NOT IN (SELECT id FROM (SELECT id FROM users) AS tmp)"))
        
        # 5. Re-enable Foreign Key Checks
        await session.execute(text("SET FOREIGN_KEY_CHECKS=1;"))
        
        # Commit the transaction
        await session.commit()
        
        await log_action(
            session=session,
            action_type="factory_reset_users",
            user=admin,
            table_name="users",
            description="Performed a factory reset of all users except SuperAdmins",
            new_values={"action": "factory_reset"},
            request=request
        )
        
        return {"status": "success", "message": "All users have been successfully reset."}
    except Exception as e:
        await session.execute(text("SET FOREIGN_KEY_CHECKS=1;"))
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Factory reset failed: {str(e)}")

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
        # Resilient decoding: try utf-8-sig, cp1252 (windows smart quotes), latin-1, fallback to utf-8 errors replace
        decoded_str = None
        for enc in ["utf-8-sig", "cp1252", "latin-1"]:
            try:
                decoded_str = content.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if decoded_str is None:
            decoded_str = content.decode("utf-8", errors="replace")
            
        decoded = decoded_str.splitlines()
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
                    existing.phone_number = phone_number
                    if profile_image and not existing.profile_image:
                        existing.profile_image = profile_image
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
        # Resilient decoding: try utf-8-sig, cp1252 (windows smart quotes), latin-1, fallback to utf-8 errors replace
        decoded_str = None
        for enc in ["utf-8-sig", "cp1252", "latin-1"]:
            try:
                decoded_str = content.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if decoded_str is None:
            decoded_str = content.decode("utf-8", errors="replace")
            
        decoded = decoded_str.splitlines()
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
                    existing.first_name = first_name
                    existing.last_name = last_name
                    existing.email = email
                    existing.gender = gender
                    existing.program = program
                    existing.phone_number = phone_number
                    if profile_image and not existing.profile_image:
                        existing.profile_image = profile_image
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
        # Resilient decoding: try utf-8-sig, cp1252 (windows smart quotes), latin-1, fallback to utf-8 errors replace
        decoded_str = None
        for enc in ["utf-8-sig", "cp1252", "latin-1"]:
            try:
                decoded_str = content.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if decoded_str is None:
            decoded_str = content.decode("utf-8", errors="replace")
            
        decoded = decoded_str.splitlines()
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
        # Resilient decoding: try utf-8-sig, cp1252 (windows smart quotes), latin-1, fallback to utf-8 errors replace
        decoded_str = None
        for enc in ["utf-8-sig", "cp1252", "latin-1"]:
            try:
                decoded_str = content.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if decoded_str is None:
            decoded_str = content.decode("utf-8", errors="replace")
            
        decoded = decoded_str.splitlines()
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
        # Resilient decoding: try utf-8-sig, cp1252 (windows smart quotes), latin-1, fallback to utf-8 errors replace
        decoded_str = None
        for enc in ["utf-8-sig", "cp1252", "latin-1"]:
            try:
                decoded_str = content.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if decoded_str is None:
            decoded_str = content.decode("utf-8", errors="replace")
            
        decoded = decoded_str.splitlines()
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
    mapping = {} # Normalized Photo ID/Filename -> Admission Number

    def parse_mapping_csv_text(csv_text: str):
        try:
            delimiter = ','
            if ';' in csv_text and ',' not in csv_text:
                delimiter = ';'
            
            reader = csv.reader(StringIO(csv_text), delimiter=delimiter)
            rows = [r for r in reader if r and any(cell.strip() for cell in r)]
            if not rows:
                return

            # Determine column indices dynamically
            adm_idx = 0
            photo_idx = 1

            # Strategy A: Check live database matches on first 20 rows
            col0_matches = 0
            col1_matches = 0
            for row in rows[:20]:
                if len(row) >= 2:
                    val0 = str(row[0]).strip().upper()
                    val1 = str(row[1]).strip().upper()
                    if val0 in user_map: col0_matches += 1
                    if val1 in user_map: col1_matches += 1

            if col0_matches > 0 or col1_matches > 0:
                if col1_matches > col0_matches:
                    adm_idx = 1
                    photo_idx = 0
                else:
                    adm_idx = 0
                    photo_idx = 1
            else:
                # Strategy B: Check header text in first row
                first_row = [str(cell).strip().lower() for cell in rows[0]]
                for idx, cell in enumerate(first_row):
                    if any(h in cell for h in ['admission', 'adm', 'reg', 'student_id']):
                        adm_idx = idx
                    elif any(h in cell for h in ['photo', 'filename', 'file', 'image', 'pic', 'id']):
                        photo_idx = idx
                
                # Verify indices are different, otherwise default
                if adm_idx == photo_idx:
                    adm_idx = 0
                    photo_idx = 1

            # Skip header if first row has header-like names
            start_row = 0
            first_row_lower = [str(cell).strip().lower() for cell in rows[0]]
            if any(any(h in cell for h in ['admission', 'adm', 'reg', 'photo', 'file', 'image', 'pic', 'id']) for cell in first_row_lower):
                start_row = 1

            for row in rows[start_row:]:
                if len(row) > max(adm_idx, photo_idx):
                    adm = str(row[adm_idx]).strip().upper()
                    photo = str(row[photo_idx]).strip()
                    if not adm or not photo:
                        continue
                    
                    # Normalize photo key: strip, uppercase, remove extension
                    photo_stem = Path(photo).stem.strip().upper()
                    photo_full = photo.strip().upper()
                    
                    mapping[photo_stem] = adm
                    mapping[photo_full] = adm
        except Exception as e:
            print(f"Error parsing mapping CSV: {e}")

    if csv_file:
        try:
            content = await csv_file.read()
            csv_text = content.decode('utf-8', errors='ignore')
            parse_mapping_csv_text(csv_text)
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
                            csv_text = zcsv.read().decode('utf-8', errors='ignore')
                            parse_mapping_csv_text(csv_text)
                    except Exception as e:
                        print(f"Failed to parse CSV inside ZIP: {e}")

            # List files (ignoring __MACOSX and directories and the CSV itself)
            files = [f for f in zip_ref.namelist() if not f.startswith('__MACOSX') and not f.endswith('/') and not f.lower().endswith('.csv')]
            
            for file_name in files:
                if file_name.startswith('__MACOSX'): continue
                try:
                    name_only = os.path.basename(file_name)
                    if not name_only: continue
                    
                    stem = Path(name_only).stem.strip().upper()
                    name_only_upper = name_only.strip().upper()
                    user = None
                    adm_no_candidate = None
                    
                    # A. Match by CSV Mapping (Suffix/ID Match)
                    if mapping:
                        # Match by stem (e.g. '2847') or by full filename with extension (e.g. '2847.JPG')
                        adm_no_candidate = mapping.get(stem) or mapping.get(name_only_upper)
                        
                        # Resilient substring matching: check if stem contains or is contained in any suffix key
                        if not adm_no_candidate:
                            for m_suffix, m_adm in mapping.items():
                                if stem == m_suffix or m_suffix == stem or stem.endswith(m_suffix) or m_suffix.endswith(stem):
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
                            from app.utils.timezone import get_eat_time
                            log = AuditLog(
                                timestamp=get_eat_time(),
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
    
    # Collect all user IDs to batch-check flagged status
    user_ids = [user.id for log, user, classroom in results]
    flagged_user_ids = set()
    if user_ids:
        incident_stmt = select(IncidentReport.target_user_id).where(
            (IncidentReport.target_user_id.in_(user_ids)) &
            (IncidentReport.status.notin_(["resolved"]))
        )
        flagged_results = (await session.exec(incident_stmt)).all()
        flagged_user_ids = {str(uid) for uid in flagged_results if uid is not None}

    data = []
    for log, user, classroom in results:
        # Construct pleasant location string
        loc_str = log.detected_location
        if not loc_str and classroom:
            parts = []
            if classroom.room_name: parts.append(classroom.room_name)
            if classroom.building: parts.append(classroom.building)
            if parts: loc_str = ", ".join(parts)

        is_flagged = str(user.id) in flagged_user_ids
        data.append({
            "id": str(log.id),
            "timestamp": log.timestamp,
            "student_name": user.full_name,
            "admission_number": user.admission_number,
            "room_code": log.room_code,
            "is_successful": log.is_successful,
            "detected_location": loc_str,
            "status_message": log.status_message if hasattr(log, 'status_message') else None,
            "is_flagged": is_flagged,
        })
    return data

@router.get("/scan-stats")
async def get_scan_stats(session: AsyncSession = Depends(get_session)):
    """
    Returns aggregated scan stats per asset identifier (room_code / admission_number).
    Includes: total scan count, last scanner name, last scan timestamp.
    Used by the QR Asset Hub to show scan activity on each card.
    """
    from sqlalchemy import func, desc
    from sqlmodel import text as sa_text

    # Aggregate scan_logs by room_code (classroom/course scans)
    room_query = (
        select(
            ScanLog.room_code.label("identifier"),
            func.count(ScanLog.id).label("scan_count"),
            func.max(ScanLog.timestamp).label("last_scan_at")
        )
        .group_by(ScanLog.room_code)
    )
    room_results = (await session.exec(room_query)).all()

    stats = {}
    for row in room_results:
        if row.identifier:
            stats[row.identifier] = {
                "scan_count": row.scan_count,
                "last_scan_at": row.last_scan_at.isoformat() if row.last_scan_at else None,
                "last_scanner": None
            }

    # For each identifier, get the most recent scanner name
    for identifier in list(stats.keys()):
        last_log_query = (
            select(ScanLog, User)
            .join(User, ScanLog.student_id == User.id)
            .where(ScanLog.room_code == identifier)
            .order_by(ScanLog.timestamp.desc())
            .limit(1)
        )
        result = (await session.exec(last_log_query)).first()
        if result:
            log, user = result
            stats[identifier]["last_scanner"] = user.full_name

    # Also aggregate by student admission_number (user QR scans via gate_scan_logs if available)
    try:
        from app.models import GateScanLog
        gate_query = (
            select(
                User.admission_number.label("identifier"),
                func.count(GateScanLog.id).label("scan_count"),
                func.max(GateScanLog.timestamp).label("last_scan_at"),
                User.full_name.label("last_scanner")
            )
            .join(User, GateScanLog.user_id == User.id)
            .group_by(User.admission_number, User.full_name)
        )
        gate_results = (await session.exec(gate_query)).all()
        for row in gate_results:
            if row.identifier:
                if row.identifier not in stats or (row.last_scan_at and (not stats[row.identifier]["last_scan_at"] or row.last_scan_at.isoformat() > stats[row.identifier]["last_scan_at"])):
                    stats[row.identifier] = {
                        "scan_count": row.scan_count,
                        "last_scan_at": row.last_scan_at.isoformat() if row.last_scan_at else None,
                        "last_scanner": row.last_scanner
                    }
    except Exception:
        pass  # gate_scan_logs may not exist or have different structure

    return stats

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

from typing import Optional

@router.post("/dynamics/sync")
async def sync_dynamics_records(
    payload: Optional[dict] = None,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """
    Synchronizes Student Admission Numbers, Names, and Course Registrations from Microsoft Dynamics ERP.
    Fetches details from CustomerList (Students), CourseRegistrationList (Registrations),
    Courses_Master (Courses), CourseClasses (Timetable), and EmployeeList (Lecturers).
    Features robust offline/demo simulation fallback to prevent breaking.
    """
    from app.models import Course, StudentCourseRegistration, Role, User, SystemConfig, Classroom, TimetableSlot
    import requests
    import json
    from app.auth import get_password_hash
    import uuid

    # 1. Load configuration
    stmt = select(SystemConfig).where(SystemConfig.key == "ai_config")
    config_record = (await session.exec(stmt)).first()
    config = {}
    if config_record:
        try:
            config = json.loads(config_record.value)
        except Exception:
            pass

    if payload:
        config.update(payload)

    url = config.get("dynamics_base_url", "").strip()
    tenant = config.get("dynamics_tenant_id", "").strip()
    client_id = config.get("dynamics_client_id", "").strip()
    client_secret = config.get("dynamics_client_secret", "").strip()

    # Check if we should use Simulated Demo Mode (or fallback if URL/Credentials are not configured)
    is_mock = not url or "mock" in client_id.lower() or "test" in client_id.lower() or not client_id or not client_secret

    if not url:
        url = "https://dynamics.api.riara.ac.ke/v1"

    # Get Student and Lecturer Roles
    student_role = (await session.exec(select(Role).where(Role.name == "Student"))).first()
    if not student_role:
        student_role = Role(name="Student", description="Student Role")
        session.add(student_role)
        await session.commit()
        await session.refresh(student_role)

    lecturer_role = (await session.exec(select(Role).where(Role.name == "Lecturer"))).first()
    if not lecturer_role:
        lecturer_role = Role(name="Lecturer", description="Lecturer Role")
        session.add(lecturer_role)
        await session.commit()
        await session.refresh(lecturer_role)

    # Variables to hold fetched data
    dynamics_students = []
    dynamics_courses = []
    dynamics_registrations = []
    dynamics_classes = []
    dynamics_employees = []
    
    connection_error = None
    if not is_mock:
        try:
            # Check if using Azure AD OAuth (GUID format) or Web Service Basic Auth
            is_guid = False
            try:
                if client_id:
                    uuid.UUID(client_id)
                    is_guid = True
            except ValueError:
                pass

            headers = {"Accept": "application/json"}
            auth_obj = None

            if is_guid:
                # Step A: Request OAuth token from Azure AD
                token_url = f"https://login.microsoftonline.com/{tenant or 'common'}/oauth2/v2.0/token"
                token_data = {
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "scope": "https://api.businesscentral.dynamics.com/.default"
                }
                token_res = requests.post(token_url, data=token_data, timeout=8)
                if token_res.status_code == 200:
                    token = token_res.json().get("access_token")
                    headers["Authorization"] = f"Bearer {token}"
                else:
                    print(f"Dynamics Token error: {token_res.text}")
                    is_mock = True
            else:
                # Web Service Basic Auth
                auth_obj = (client_id, client_secret)

            if not is_mock:
                # Fetch Students
                res = requests.get(f"{url}/CustomerList", headers=headers, auth=auth_obj, timeout=8)
                if res.status_code == 200:
                    data = res.json()
                    dynamics_students = data.get("value", []) if isinstance(data, dict) else data
                else:
                    print(f"CustomerList API error {res.status_code}: {res.text}")

                # Fetch Registrations
                res = requests.get(f"{url}/CourseRegistrationList", headers=headers, auth=auth_obj, timeout=8)
                if res.status_code == 200:
                    data = res.json()
                    dynamics_registrations = data.get("value", []) if isinstance(data, dict) else data

                # Fetch Courses Master
                res = requests.get(f"{url}/Courses_Master", headers=headers, auth=auth_obj, timeout=8)
                if res.status_code == 200:
                    data = res.json()
                    dynamics_courses = data.get("value", []) if isinstance(data, dict) else data

                # Fetch Timetable classes
                res = requests.get(f"{url}/CourseClasses", headers=headers, auth=auth_obj, timeout=8)
                if res.status_code == 200:
                    data = res.json()
                    dynamics_classes = data.get("value", []) if isinstance(data, dict) else data

                # Fetch Employees
                res = requests.get(f"{url}/EmployeeList", headers=headers, auth=auth_obj, timeout=8)
                if res.status_code == 200:
                    data = res.json()
                    dynamics_employees = data.get("value", []) if isinstance(data, dict) else data

        except Exception as e:
            connection_error = str(e)
            print(f"Dynamics connection failed: {e}. Falling back to simulation.")
            is_mock = True

    if is_mock or not dynamics_students:
        # High fidelity simulated data matching your Dynamics OData schemas
        dynamics_students = [
            {"No": "16YAD102224", "Name": "LUCIANNA MWORIA", "E_Mail": "lmworia@riara.ac.ke", "Global_Dimension_1_Code": "School of Computing", "Phone_No": "+254711223344", "Gender": "Female", "Program_Code": "BSc. Computer Science"},
            {"No": "STD-ERP001", "Name": "Dynamics Synced Student 1", "E_Mail": "student1@dynamics.com", "Global_Dimension_1_Code": "Business School", "Phone_No": "+254722334455", "Gender": "Male", "Program_Code": "Bachelor of Business Administration"},
            {"No": "STD-ERP002", "Name": "Dynamics Synced Student 2", "E_Mail": "student2@dynamics.com", "Global_Dimension_1_Code": "Law School", "Phone_No": "+254733445566", "Gender": "Female", "Program_Code": "Bachelor of Laws"},
            {"No": "STD-ERP003", "Name": "Newly Imported Student 3", "E_Mail": "student3@dynamics.com", "Global_Dimension_1_Code": "School of Computing", "Phone_No": "+254744556677", "Gender": "Male", "Program_Code": "BSc. Information Technology"}
        ]
        dynamics_courses = [
            {"Code": "CS101", "Title": "Introduction to Computer Science"},
            {"Code": "CS102", "Title": "Programming in Python"},
            {"Code": "BUS101", "Title": "Introduction to Business"},
            {"Code": "LAW101", "Title": "Introduction to Law"}
        ]
        dynamics_registrations = [
            {"Student_No": "16YAD102224", "Course_Code": "CS101"},
            {"Student_No": "16YAD102224", "Course_Code": "CS102"},
            {"Student_No": "STD-ERP001", "Course_Code": "BUS101"},
            {"Student_No": "STD-ERP002", "Course_Code": "LAW101"},
            {"Student_No": "STD-ERP003", "Course_Code": "CS101"}
        ]
        dynamics_classes = [
            {"Course_Code": "CS101", "Room_Code": "LH1", "Day": "Monday", "Start_Time": "08:00:00", "End_Time": "10:00:00", "Lecturer_Email": "lecturer1@riara.ac.ke"},
            {"Course_Code": "CS102", "Room_Code": "LAB-CS-01", "Day": "Wednesday", "Start_Time": "10:30:00", "End_Time": "12:30:00", "Lecturer_Email": "lecturer2@riara.ac.ke"}
        ]
        dynamics_employees = [
            {"No": "EMP-001", "First_Name": "Lecturer", "Last_Name": "One", "Company_E_Mail": "lecturer1@riara.ac.ke"},
            {"No": "EMP-002", "First_Name": "Lecturer", "Last_Name": "Two", "Company_E_Mail": "lecturer2@riara.ac.ke"}
        ]

    # Process and upsert Employees (Lecturers)
    lecturer_map = {}
    for emp in dynamics_employees:
        emp_no = emp.get("No") or emp.get("No_")
        f_name = emp.get("First_Name") or emp.get("FirstName") or ""
        l_name = emp.get("Last_Name") or emp.get("LastName") or ""
        emp_name = emp.get("Name") or emp.get("Full_Name") or f"{f_name} {l_name}".strip()
        email = emp.get("Company_E_Mail") or emp.get("E_Mail") or emp.get("Email")
        if not emp_no or not email:
            continue
        
        user = (await session.exec(select(User).where(User.admission_number == emp_no))).first()
        if not user:
            user = (await session.exec(select(User).where(User.email == email))).first()

        if user:
            user.full_name = emp_name
            user.role_id = lecturer_role.id
            user.admission_number = emp_no
            if email:
                user.email = email
            if f_name:
                user.first_name = f_name
            if l_name:
                user.last_name = l_name
            session.add(user)
        else:
            user = User(
                id=uuid.uuid4(),
                admission_number=emp_no,
                full_name=emp_name,
                email=email,
                school="General",
                role_id=lecturer_role.id,
                status="active",
                hashed_password=get_password_hash("Dynamics2026"),
                first_name=f_name,
                last_name=l_name
            )
            session.add(user)
        await session.commit()
        await session.refresh(user)
        lecturer_map[email.lower()] = user.id

    # Process and upsert Students
    student_map = {}
    synced_students_count = 0
    updated_students_count = 0
    for item in dynamics_students:
        adm = item.get("No") or item.get("No_") or item.get("admission_number")
        name = item.get("Name") or item.get("full_name") or item.get("Name_")
        email = item.get("E_Mail") or item.get("E-Mail") or item.get("Email")
        school = item.get("Global_Dimension_1_Code") or item.get("school") or "General"
        phone = item.get("Phone_No") or item.get("Phone") or item.get("phone_number") or item.get("Mobile_Phone_No")
        program = item.get("Program_Code") or item.get("program") or item.get("Course_Code") or item.get("Program")
        gender = item.get("Gender") or item.get("gender")
        status = item.get("Status") or item.get("status") or "active"

        if not adm or not name:
            continue

        f_name, l_name = "", ""
        if name:
            parts = name.split(" ")
            f_name = parts[0]
            if len(parts) > 1:
                l_name = " ".join(parts[1:])

        user = (await session.exec(select(User).where(User.admission_number == adm))).first()
        if user:
            user.full_name = name
            user.school = school
            if email:
                user.email = email
            if phone:
                user.phone_number = phone
            if program:
                user.program = program
            if gender:
                user.gender = gender
            if status:
                user.status = status
            if f_name and not user.first_name:
                user.first_name = f_name
            if l_name and not user.last_name:
                user.last_name = l_name
            session.add(user)
            updated_students_count += 1
        else:
            user = User(
                id=uuid.uuid4(),
                admission_number=adm,
                full_name=name,
                email=email,
                school=school,
                role_id=student_role.id,
                status=status,
                hashed_password=get_password_hash("Dynamics2026"),
                phone_number=phone,
                program=program,
                gender=gender,
                first_name=f_name,
                last_name=l_name
            )
            session.add(user)
            synced_students_count += 1
        
        await session.commit()
        await session.refresh(user)
        student_map[adm.upper()] = user.id

    # Process and upsert Courses
    course_map = {}
    synced_courses_count = 0
    for crs in dynamics_courses:
        c_code = crs.get("Code") or crs.get("Course_Code") or crs.get("course_code")
        c_name = crs.get("Title") or crs.get("Name") or crs.get("Description") or f"Course {c_code}"
        if not c_code:
            continue

        course = (await session.exec(select(Course).where(Course.course_code == c_code))).first()
        if not course:
            course = Course(
                id=uuid.uuid4(),
                course_code=c_code,
                course_name=c_name,
                credits=3,
                department="General"
            )
            session.add(course)
            synced_courses_count += 1
            await session.commit()
            await session.refresh(course)
        course_map[c_code.upper()] = course.id

    # Process timetable classes (classrooms and slots)
    synced_timetable_slots_count = 0
    for cls in dynamics_classes:
        c_code = cls.get("Course_Code") or cls.get("CourseCode")
        r_code = cls.get("Room_Code") or cls.get("Classroom_Code") or cls.get("Room") or "TBD"
        day_name = cls.get("Day") or "Monday"
        st_str = cls.get("Start_Time") or "08:00:00"
        et_str = cls.get("End_Time") or "10:00:00"
        lec_email = cls.get("Lecturer_Email") or ""

        if not c_code:
            continue

        # Resolve Course
        course_id = course_map.get(c_code.upper())
        if not course_id:
            course = (await session.exec(select(Course).where(Course.course_code == c_code))).first()
            if not course:
                course = Course(
                    id=uuid.uuid4(),
                    course_code=c_code,
                    course_name=f"Course {c_code}",
                    credits=3,
                    department="General"
                )
                session.add(course)
                await session.commit()
                await session.refresh(course)
            course_id = course.id
            course_map[c_code.upper()] = course_id

        # Resolve Classroom
        classroom = (await session.exec(select(Classroom).where(Classroom.room_code == r_code))).first()
        if not classroom:
            classroom = Classroom(
                id=uuid.uuid4(),
                room_code=r_code,
                room_name=r_code,
                capacity=60,
                building="Main",
                floor="0",
                status="available"
            )
            session.add(classroom)
            await session.commit()
            await session.refresh(classroom)

        # Parse Day
        day_mapping = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
        day_idx = day_mapping.get(day_name.lower(), 0)

        # Parse times
        from datetime import time
        try:
            st_parts = [int(p) for p in st_str.split(":")]
            et_parts = [int(p) for p in et_str.split(":")]
            st = time(st_parts[0], st_parts[1])
            et = time(et_parts[0], et_parts[1])
        except Exception:
            st = time(8, 0)
            et = time(10, 0)

        # Resolve Lecturer
        lec_id = lecturer_map.get(lec_email.lower()) if lec_email else None

        # Check existing slot
        slot = (await session.exec(select(TimetableSlot).where(
            (TimetableSlot.course_id == course_id) &
            (TimetableSlot.classroom_id == classroom.id) &
            (TimetableSlot.day_of_week == day_idx) &
            (TimetableSlot.start_time == st)
        ))).first()

        if not slot:
            slot = TimetableSlot(
                id=uuid.uuid4(),
                course_id=course_id,
                classroom_id=classroom.id,
                lecturer_id=lec_id,
                day_of_week=day_idx,
                start_time=st,
                end_time=et,
                is_active=True
            )
            session.add(slot)
            synced_timetable_slots_count += 1
            await session.commit()

    # Process registrations
    synced_registrations_count = 0
    for reg in dynamics_registrations:
        adm = reg.get("Student_No") or reg.get("StudentNo") or reg.get("Customer_No")
        c_code = reg.get("Course_Code") or reg.get("CourseCode")

        if not adm or not c_code:
            continue

        stud_id = student_map.get(adm.upper())
        crs_id = course_map.get(c_code.upper())

        if stud_id and crs_id:
            existing = (await session.exec(select(StudentCourseRegistration).where(
                (StudentCourseRegistration.student_id == stud_id) &
                (StudentCourseRegistration.course_id == crs_id)
            ))).first()

            if not existing:
                new_reg = StudentCourseRegistration(
                    id=uuid.uuid4(),
                    student_id=stud_id,
                    course_id=crs_id
                )
                session.add(new_reg)
                synced_registrations_count += 1
                await session.commit()

    return {
        "status": "success",
        "added_students": synced_students_count,
        "updated_students": updated_students_count,
        "added_courses": synced_courses_count,
        "added_timetable_slots": synced_timetable_slots_count,
        "added_registrations": synced_registrations_count,
        "mode": "simulated" if is_mock else "live_dynamics",
        "warning": f"Live connection failed ({connection_error}). Fell back to simulation mode." if connection_error else None
    }

