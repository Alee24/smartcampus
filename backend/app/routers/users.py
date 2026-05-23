from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Form, BackgroundTasks
from datetime import datetime
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import AsyncSession as SAAsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text as sa_text
from typing import List, Optional
from app.database import get_session, engine
from app.models import User, Role, SystemConfig, EntryLog
from app.auth import get_current_user, get_password_hash
from app.utils.audit import log_action
import csv
import codecs
import io
import json
import uuid as uuid_lib
import asyncio
from app.utils.ldap import LDAPClient

router = APIRouter()

# In-memory job store for bulk upload status
_upload_jobs: dict = {}


# Dependency to check if user is admin
async def get_current_admin_user(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # Fetch role name
    role = await session.get(Role, current_user.role_id)
    if not role or role.name not in ["SuperAdmin", "Security"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

@router.get("")
async def get_all_users(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all users with their roles"""
    # Outer join ensures users display even if role link is broken
    query = select(User, Role).outerjoin(Role, User.role_id == Role.id).order_by(User.created_at.desc())
    results = await session.exec(query)
    
    users_list = []
    for user, role in results.all():
        u_dict = user.dict(exclude={"hashed_password"})
        u_dict["role"] = role.name if role else "Unknown" # Handle missing role
        users_list.append(u_dict)
        
    return users_list

@router.get("/search")
async def search_users(q: str, session: AsyncSession = Depends(get_session)):
    """Autocomplete search for users by admission number or name"""
    if len(q) < 2: return []
    # Search by admission number (case insensitive)
    query = select(User).where(User.admission_number.contains(q.upper())).limit(10)
    results = await session.exec(query)
    
    users_list = []
    for user in results.all():
        users_list.append({
            "id": str(user.id),
            "admission_number": user.admission_number,
            "full_name": user.full_name,
            "profile_image": user.profile_image,
            "school": user.school
        })
    return users_list

@router.put("/{user_id}")
async def update_user(
    request: Request,
    user_id: str,
    user_data: dict,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Update user details (admin only)"""
    from uuid import UUID
    
    try:
        user_uuid = UUID(user_id)
        user = await session.get(User, user_uuid)
    except ValueError:
        user_stmt = select(User).where(User.id == user_id)
        user = (await session.exec(user_stmt)).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update allowed fields
    if 'full_name' in user_data: user.full_name = user_data['full_name']
    if 'first_name' in user_data: user.first_name = user_data['first_name']
    if 'last_name' in user_data: user.last_name = user_data['last_name']
    if 'admission_number' in user_data: user.admission_number = user_data['admission_number']
    if 'email' in user_data: user.email = user_data['email']
    if 'school' in user_data: user.school = user_data['school']
    if 'phone_number' in user_data: user.phone_number = user_data['phone_number']
    if 'gender' in user_data: user.gender = user_data['gender']
    if 'program' in user_data: user.program = user_data['program']
    
    if 'admission_date' in user_data:
        try:
            if user_data['admission_date']:
                user.admission_date = datetime.strptime(user_data['admission_date'], '%Y-%m-%d').date()
            else:
                user.admission_date = None
        except ValueError: pass
            
    if 'status' in user_data:
        user.status = user_data['status']
            
    if 'expiry_date' in user_data:
        try:
            if user_data['expiry_date']:
                user.expiry_date = datetime.strptime(user_data['expiry_date'], '%Y-%m-%d').date()
            else:
                user.expiry_date = None
        except ValueError: pass
            
    if 'guardian_id' in user_data:
        if user_data['guardian_id']:
            try: user.guardian_id = UUID(str(user_data['guardian_id']))
            except ValueError: pass
        else:
            user.guardian_id = None
            
    if 'role' in user_data:
        role_stmt = select(Role).where(Role.name == user_data['role'])
        role = (await session.exec(role_stmt)).first()
        if role: user.role_id = role.id

    if 'profile_image' in user_data and user_data['profile_image']:
         user.profile_image = user_data['profile_image']
    
    await session.commit()
    await session.refresh(user)

    # Log the update
    await log_action(
        session=session,
        action_type="update",
        user=admin,
        table_name="users",
        record_id=str(user.id),
        description=f"Updated user {user.full_name} ({user.admission_number})",
        new_values=user_data,
        request=request
    )

    return {"message": "User updated successfully", "user": user}

@router.delete("/{user_id}")
async def delete_user(
    request: Request,
    user_id: str,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Delete a user"""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await session.delete(user)
    await session.commit()

    # Log the deletion
    await log_action(
        session=session,
        action_type="delete",
        user=admin,
        table_name="users",
        record_id=str(user_id),
        description=f"Deleted user {user.full_name} ({user.admission_number})",
        request=request
    )

    return {"status": "success", "message": "User deleted"}

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get current logged-in user information with role name"""
    # Fetch role
    role = await session.get(Role, current_user.role_id)
    
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "admission_number": current_user.admission_number,
        "school": current_user.school,
        "phone_number": current_user.phone_number,
        "gender": current_user.gender,
        "program": current_user.program,
        "profile_image": current_user.profile_image,
        "pin_setup_required": current_user.pin_setup_required,
        "role": role.name if role else "Unknown",
        "role_id": current_user.role_id
    }

@router.post("/log-access")
async def log_user_access(
    access_data: dict,
    request: Request, # Need to import Request
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    await log_action(
        session=session,
        action_type="login_metadata",
        user=current_user,
        description=f"Recorded browser metadata for {current_user.full_name}",
        new_values=access_data,
        request=request
    )
    
    # Also log to UserLocationLog for real-time tracking (Attendance Fallback)
    from app.models import UserLocationLog
    gps = access_data.get('gps', {}) or {}
    ulog = UserLocationLog(
        user_id=current_user.id,
        latitude=gps.get('lat') if isinstance(gps, dict) else None,
        longitude=gps.get('lng') if isinstance(gps, dict) else None,
        ip_address=request.client.host if request.client else "unknown",
        network_type=access_data.get('network'),
        device_info=access_data.get('device'),
        context_type="login_audit"
    )
    session.add(ulog)

    await session.commit()
    return {"status": "recorded"}

@router.post("", response_model=User)
@router.post("/create", response_model=User)
async def create_user(
    request: Request,
    new_user: dict, 
    session: AsyncSession = Depends(get_session), 
    admin: User = Depends(get_current_admin_user)
):
    # Check if user exists
    query = select(User).where((User.admission_number == new_user['admission_number']) | (User.email == new_user.get('email')))
    if new_user.get('email'):
        query = select(User).where((User.admission_number == new_user['admission_number']) | (User.email == new_user['email']))
    else:
        query = select(User).where(User.admission_number == new_user['admission_number'])

    existing = await session.exec(query)
    if existing.first():
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Get Role ID
    role_name = new_user.get('role_name', 'Student')
    role_query = select(Role).where(Role.name == role_name)
    role = (await session.exec(role_query)).first()
    if not role:
         # Auto-create role if it doesn't exist
         role = Role(name=role_name, description=f"{role_name} Role")
         session.add(role)
         await session.commit()
         await session.refresh(role)

    # Hash default password if not provided
    pwd = new_user.get('password', 'Student123') 
    hashed_pwd = get_password_hash(pwd)

    db_user = User(
        admission_number=new_user['admission_number'],
        full_name=new_user.get('full_name', f"{new_user.get('first_name', '')} {new_user.get('last_name', '')}".strip()),
        first_name=new_user.get('first_name'),
        last_name=new_user.get('last_name'),
        school=new_user.get('school', 'General'),
        email=new_user.get('email'),
        phone_number=new_user.get('phone_number'),
        gender=new_user.get('gender'),
        program=new_user.get('program'),
        hashed_password=hashed_pwd,
        role_id=role.id,
        status="active",
        has_smartphone=new_user.get('has_smartphone', False),
        admission_date=datetime.strptime(new_user['admission_date'], '%Y-%m-%d').date() if new_user.get('admission_date') else datetime.utcnow().date()
    )
    
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    
    await log_action(
        session=session,
        action_type="create",
        user=admin,
        table_name="users",
        record_id=str(db_user.id),
        description=f"Created user {db_user.full_name} ({db_user.admission_number})",
        new_values=new_user,
        request=request
    )
    
    return db_user

async def _process_bulk_upload_task(content: bytes, job_id: str):
    """
    Background task: processes the CSV and updates _upload_jobs[job_id].
    Creates its own DB session so it runs independently of the HTTP request.
    id and role_id are stored as plain VARCHAR hex strings — NO UNHEX() needed.
    """
    _upload_jobs[job_id] = {"status": "processing", "added": 0, "updated": 0, "errors": 0, "error_details": [], "total_processed": 0}

    try:
        async_session_factory = sessionmaker(engine, class_=SAAsyncSession, expire_on_commit=False)

        async with async_session_factory() as session:
            # Parse CSV
            decoded = content.decode('utf-8', errors='ignore')
            rows = list(csv.DictReader(io.StringIO(decoded)))

            if not rows:
                _upload_jobs[job_id] = {"status": "done", "added": 0, "updated": 0, "errors": 0, "error_details": ["CSV is empty"], "total_processed": 0}
                return

            # ── Get/Create Student Role ──────────────────────────────────────────
            # id is VARCHAR — read it directly, no HEX() needed
            role_res = await session.execute(sa_text("SELECT id FROM roles WHERE name='Student' LIMIT 1"))
            role_row = role_res.fetchone()
            if not role_row:
                new_role_id = uuid_lib.uuid4().hex.upper()
                await session.execute(sa_text(
                    "INSERT INTO roles (id, name, description) VALUES (:id, 'Student', 'Regular Student')"
                ), {"id": new_role_id})
                await session.commit()
                role_res = await session.execute(sa_text("SELECT id FROM roles WHERE name='Student' LIMIT 1"))
                role_row = role_res.fetchone()

            role_id_val = str(role_row[0])  # plain VARCHAR value from DB

            # ── Hash password ONCE in thread pool (non-blocking) ─────────────────
            loop = asyncio.get_event_loop()
            default_hashed_pwd = await loop.run_in_executor(None, get_password_hash, "Student123")

            # ── Load ALL existing users into memory (ONE query) ──────────────────
            # id is VARCHAR — read directly
            existing_res = await session.execute(sa_text("SELECT admission_number, id FROM users"))
            existing_map = {row[0]: str(row[1]) for row in existing_res.fetchall()}

            # ── Parse CSV rows ───────────────────────────────────────────────────
            to_insert = []
            to_update = []
            added_count = 0
            updated_count = 0
            error_count = 0
            errors = []

            for row_num, row in enumerate(rows, start=1):
                try:
                    adm_no = (row.get('admission_number') or '').strip()
                    if not adm_no:
                        error_count += 1
                        errors.append(f"Row {row_num}: Missing admission_number")
                        continue

                    f_name  = (row.get('first_name')    or '').strip()
                    l_name  = (row.get('last_name')     or '').strip()
                    full_n  = (row.get('full_name')     or '').strip() or f"{f_name} {l_name}".strip() or "Unknown"
                    email_val   = (row.get('email')         or '').strip() or None
                    phone_val   = (row.get('phone_number')  or '').strip() or None
                    school_val  = (row.get('school')        or '').strip() or "General"
                    gender_val  = (row.get('gender')        or '').strip() or None
                    program_val = (row.get('program')       or '').strip() or None
                    profile_val = (row.get('profile_image') or '').strip() or None

                    if adm_no in existing_map:
                        to_update.append({
                            "existing_id": existing_map[adm_no],
                            "full_name": full_n,
                            "first_name": f_name,
                            "last_name": l_name,
                            "phone": phone_val,
                            "school": school_val,
                            "email": email_val,
                        })
                        updated_count += 1
                    else:
                        new_id = uuid_lib.uuid4().hex.upper()
                        to_insert.append({
                            "new_id": new_id,
                            "adm": adm_no,
                            "full_name": full_n,
                            "first_name": f_name,
                            "last_name": l_name,
                            "phone": phone_val,
                            "school": school_val,
                            "email": email_val,
                            "gender": gender_val,
                            "program": program_val,
                            "pwd": default_hashed_pwd,
                            "role_id": role_id_val,
                            "profile_image": profile_val,
                        })
                        existing_map[adm_no] = new_id  # prevent CSV duplicates
                        added_count += 1

                except Exception as e:
                    error_count += 1
                    errors.append(f"Row {row_num}: {str(e)}")

            # ── Batch INSERT (plain VARCHAR ids — NO UNHEX) ──────────────────────
            batch_size = 500
            for i in range(0, len(to_insert), batch_size):
                batch = to_insert[i:i + batch_size]
                try:
                    for rec in batch:
                        await session.execute(sa_text("""
                            INSERT INTO users
                                (id, admission_number, full_name, first_name, last_name,
                                 phone_number, school, email, gender, program,
                                 hashed_password, role_id, status, profile_image)
                            VALUES
                                (:new_id, :adm, :full_name, :first_name, :last_name,
                                 :phone, :school, :email, :gender, :program,
                                 :pwd, :role_id, 'active', :profile_image)
                            ON DUPLICATE KEY UPDATE
                                full_name        = VALUES(full_name),
                                first_name       = VALUES(first_name),
                                last_name        = VALUES(last_name),
                                phone_number     = COALESCE(VALUES(phone_number), phone_number),
                                school           = VALUES(school),
                                email            = COALESCE(VALUES(email), email),
                                status           = 'active'
                        """), rec)
                    await session.commit()
                except Exception as e:
                    await session.rollback()
                    error_count += len(batch)
                    errors.append(f"Insert batch {i//batch_size+1} failed: {str(e)}")

            # ── Batch UPDATE (match by plain VARCHAR id) ─────────────────────────
            for i in range(0, len(to_update), batch_size):
                batch = to_update[i:i + batch_size]
                try:
                    for rec in batch:
                        await session.execute(sa_text("""
                            UPDATE users SET
                                full_name    = :full_name,
                                first_name   = :first_name,
                                last_name    = :last_name,
                                phone_number = COALESCE(:phone, phone_number),
                                school       = :school,
                                email        = COALESCE(:email, email),
                                status       = 'active'
                            WHERE id = :existing_id
                        """), rec)
                    await session.commit()
                except Exception as e:
                    await session.rollback()
                    error_count += len(batch)
                    errors.append(f"Update batch {i//batch_size+1} failed: {str(e)}")

            _upload_jobs[job_id] = {
                "status": "done",
                "added": added_count,
                "updated": updated_count,
                "errors": error_count,
                "error_details": errors[:50],
                "total_processed": added_count + updated_count + error_count
            }

    except Exception as e:
        _upload_jobs[job_id] = {
            "status": "failed",
            "added": 0, "updated": 0, "errors": 1,
            "error_details": [f"Critical error: {str(e)}"],
            "total_processed": 0
        }


@router.get("/upload-status/{job_id}")
async def get_upload_status(job_id: str, current_user: User = Depends(get_current_user)):
    """Poll this endpoint to get the status of a bulk upload job."""
    job = _upload_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or expired")
    return job


@router.post("/bulk-upload")
async def bulk_upload_students(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """
    Accepts CSV upload, returns immediately with a job_id.
    Processing happens in the background — poll /upload-status/{job_id} for results.
    This prevents 502 timeouts on large files.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    job_id = uuid_lib.uuid4().hex
    background_tasks.add_task(_process_bulk_upload_task, content, job_id)

    return {"status": "processing", "job_id": job_id, "message": "Upload started. Poll /api/users/upload-status/{job_id} for progress."}



@router.post("/registrations/bulk-upload")
async def bulk_upload_registrations(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    from app.models import Course, StudentCourseRegistration
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    
    # Read CSV
    content = await file.read()
    try:
        decoded_content = content.decode('utf-8')
    except UnicodeDecodeError:
        decoded_content = content.decode('latin-1')
        
    csv_reader = csv.DictReader(io.StringIO(decoded_content))
    
    count = 0
    errors = []
    batch_size = 500
    current_batch = 0
    
    for row in csv_reader:
        try:
            adm_no = row.get('admission_number')
            c_code = row.get('course_code')
            
            if not adm_no or not c_code: continue
            
            # Find Student
            student = (await session.exec(select(User).where(User.admission_number == adm_no))).first()
            if not student:
                errors.append(f"{adm_no}: Student not found")
                continue
                
            # Find Course
            course = (await session.exec(select(Course).where(Course.course_code == c_code))).first()
            if not course:
                errors.append(f"{c_code}: Course not found")
                continue
            
            # Check if already registered
            existing = await session.exec(
                select(StudentCourseRegistration).where(
                    StudentCourseRegistration.student_id == student.id,
                    StudentCourseRegistration.course_id == course.id
                )
            )
            if existing.first():
                continue # Skip duplicate
            
            # Register
            reg = StudentCourseRegistration(
                student_id=student.id,
                course_id=course.id,
                semester=row.get('semester', 'Current')
            )
            session.add(reg)
            count += 1
            current_batch += 1
            
            if current_batch >= batch_size:
                await session.commit()
                current_batch = 0
            
        except Exception as e:
            await session.rollback()
            errors.append(f"Row error: {str(e)}")
            current_batch = 0
            
    try:
        if current_batch > 0:
            await session.commit()
    except Exception as e:
        await session.rollback()
        errors.append(f"Final batch commit error: {str(e)}")
        
    return {"added": count, "errors": errors[:100]}

@router.get("/", response_model=List[User])
async def list_users(
    session: AsyncSession = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    statement = select(User).order_by(User.created_at.desc())
    results = await session.exec(statement)
    return results.all()

# Visitor Registration (Public)
@router.post("/register-visitor")
async def register_visitor(
    visitor_data: dict,
    session: AsyncSession = Depends(get_session)
):
    # Check Role
    role_query = select(Role).where(Role.name == "Visitor")
    visitor_role = (await session.exec(role_query)).first()
    
    if not visitor_role:
        visitor_role = Role(name="Visitor", description="External Visitor")
        session.add(visitor_role)
        await session.commit()
        await session.refresh(visitor_role)

    # Check exists
    email = visitor_data.get('email')
    if email:
        q = select(User).where(User.email == email)
        if (await session.exec(q)).first():
             raise HTTPException(status_code=400, detail="Email already registered")

    hashed = get_password_hash(visitor_data['password'])
    
    new_visitor = User(
        admission_number=f"VISITOR-{visitor_data.get('id_number', 'GENERIC')}", # Or generate UUID
        full_name=visitor_data['full_name'],
        school="Visitor",
        email=email,
        hashed_password=hashed,
        role_id=visitor_role.id,
        status="active"
    )
    
    session.add(new_visitor)
    await session.commit()
    return {"message": "Visitor account created successfully"}

    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return {"message": "Profile updated successfully", "user": current_user}

@router.get("/verify/{admission_number}")
async def verify_student(admission_number: str, session: AsyncSession = Depends(get_session)):
    """Public endpoint to verify student by admission number or email"""
    user = None
    
    # 1. Check if it's an email
    if "@" in admission_number:
        query = select(User).where(User.email == admission_number)
        user = (await session.exec(query)).first()
    
    # 2. Exact admission number match
    if not user:
        query = select(User).where(User.admission_number == admission_number)
        user = (await session.exec(query)).first()
    
    # 3. Suffix Match (for "last 6 digits" search)
    if not user:
        # Only try if we have something substantial (e.g. > 3 chars) to avoid matching everything ending in '1'
        if len(admission_number) >= 3:
            query = select(User).where(User.admission_number.like(f"%{admission_number}"))
            user = (await session.exec(query)).first()
 
    # 4. LDAP/AD Fallback
    if not user:
        uri = (await session.exec(select(SystemConfig).where(SystemConfig.key == "ldap_server_uri"))).first()
        bind_dn = (await session.exec(select(SystemConfig).where(SystemConfig.key == "ldap_bind_dn"))).first()
        password = (await session.exec(select(SystemConfig).where(SystemConfig.key == "ldap_bind_password"))).first()
        base_dn = (await session.exec(select(SystemConfig).where(SystemConfig.key == "ldap_base_dn"))).first()

        if uri and base_dn:
            try:
                ldap = LDAPClient(uri.value, bind_dn.value if bind_dn else "", password.value if password else "", base_dn.value)
                ldap_data = ldap.get_user_by_id(admission_number)
                if ldap_data:
                    return {
                        "ad_found": True,
                        "full_name": ldap_data["full_name"],
                        "admission_number": ldap_data["admission_number"],
                        "email": ldap_data["email"],
                        "school": ldap_data["school"],
                        "program": ldap_data["program"]
                    }
            except Exception as e:
                print(f"LDAP Check during verification failed: {e}")

    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get role information
    role = await session.get(Role, user.role_id)
    
    # Check Gate Status (In/Out)
    gate_status_query = select(EntryLog).where(EntryLog.user_id == user.id).where(EntryLog.exit_time == None).order_by(EntryLog.entry_time.desc())
    open_log = (await session.exec(gate_status_query)).first()
    gate_status = "In" if open_log else "Out"
    
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "admission_number": user.admission_number,
        "email": user.email,
        "school": user.school,
        "status": user.status,
        "profile_image": user.profile_image,
        "admission_date": user.admission_date.isoformat() if user.admission_date else None,
        "expiry_date": user.expiry_date.isoformat() if user.expiry_date else None,
        "role": role.name if role else "Unknown",
        "gate_status": gate_status
    }

@router.post("/import-ad-student")
async def import_ad_student(
    payload: dict,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    admission_number = payload.get("admission_number")
    full_name = payload.get("full_name")
    email = payload.get("email")
    school = payload.get("school", "General")
    program = payload.get("program")

    if not admission_number or not full_name:
        raise HTTPException(status_code=400, detail="Missing required fields")

    # Check if already exists
    existing = (await session.exec(select(User).where(User.admission_number == admission_number))).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists in database")

    role_stmt = select(Role).where(Role.name == "Student")
    role = (await session.exec(role_stmt)).first()
    if not role:
        role = Role(name="Student", description="Regular Student")
        session.add(role)
        await session.commit()
        await session.refresh(role)

    new_user = User(
        admission_number=admission_number,
        full_name=full_name,
        email=email,
        school=school,
        program=program,
        role_id=role.id,
        status="active",
        hashed_password="LDAP_MANAGED"
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    return {
        "status": "success", 
        "message": f"Successfully imported {full_name}", 
        "id": str(new_user.id),
        "full_name": new_user.full_name,
        "admission_number": new_user.admission_number,
        "email": new_user.email,
        "school": new_user.school,
        "status": new_user.status,
        "profile_image": new_user.profile_image,
        "role": "Student",
        "gate_status": "Out"
    }

@router.post("/verify-supervisor-pin")
async def verify_supervisor_pin(
    payload: dict,
    session: AsyncSession = Depends(get_session)
):
    pin = payload.get("pin")
    if not pin:
        raise HTTPException(status_code=400, detail="PIN is required")
        
    stmt = select(SystemConfig).where(SystemConfig.key == "supervisor_pin")
    config = (await session.exec(stmt)).first()
    if not config or config.value != pin:
        raise HTTPException(status_code=401, detail="Invalid Supervisor PIN")
        
    return {"status": "success", "message": "PIN verified"}

@router.put("/me/update-pin")
async def update_my_pin(
    pin_data: dict,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Allow user to update their security PIN"""
    new_pin = pin_data.get('pin')
    if not new_pin or not str(new_pin).isdigit() or len(str(new_pin)) != 4:
        raise HTTPException(status_code=400, detail="PIN must be 4 digits")
    
    current_user.pin = str(new_pin)
    current_user.pin_setup_required = False # PIN has been set/updated
    
    await session.commit()
    await session.refresh(current_user)
    
    return {"message": "PIN updated successfully", "pin_setup_required": False}

@router.post("/verify-pin")
async def verify_user_pin(
    pin_data: dict,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Verify user security PIN"""
    input_pin = pin_data.get('pin')
    if input_pin == current_user.pin:
        return {"status": "success"}
    raise HTTPException(status_code=401, detail="Invalid Security PIN")

@router.post("/secure-profile-image-update")
async def secure_profile_image_update(
    request: Request,
    file: UploadFile = File(...),
    user_id: str = Form(...),
    supervisor_pin: str = Form(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.pin != supervisor_pin:
        raise HTTPException(status_code=401, detail="Invalid Authorization PIN")
        
    # 2. Get Target User
    from uuid import UUID
    target_user = await session.get(User, UUID(user_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 3. Save Image
    import os
    import shutil
    import uuid
    
    os.makedirs("static/profiles", exist_ok=True)
    file_ext = file.filename.split('.')[-1].lower()
    if file_ext not in ['jpg', 'jpeg', 'png', 'webp', 'gif']:
         raise HTTPException(status_code=400, detail="Invalid image format")
         
    filename = f"{target_user.id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = f"static/profiles/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    image_url = f"/static/profiles/{filename}"
    old_image = target_user.profile_image
    target_user.profile_image = image_url
    session.add(target_user)
    
    # 4. Log to Audit Trail
    await log_action(
        session=session,
        action_type="update",
        user=current_user,
        table_name="users",
        record_id=str(target_user.id),
        description=f"Profile picture for {target_user.full_name} updated with Supervisor PIN",
        old_values={"profile_image": old_image},
        new_values={"profile_image": image_url},
        request=request
    )
    
    await session.commit()
    return {"status": "success", "image_url": image_url}

@router.post("/upload-profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    admission_number: Optional[str] = Form(None), 
    user_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Determine target user
    target_user = current_user
    
    if user_id:
        # Robust Lookup: Try UUID (Converted), then Fallback to Admission Number
        try:
            from uuid import UUID
            # Try to convert string to UUID object
            uuid_obj = UUID(user_id) 
            target_user = await session.get(User, uuid_obj)
        except Exception as e:
            print(f"UUID Lookup Error: {e}")
            target_user = None
            
        if not target_user:
            # Maybe the string *itself* works (if DB uses Char)?
            try:
                target_user = await session.get(User, user_id)
            except: pass

        if not target_user:
            # Fallback: Maybe user_id is actually an admission number?
            q = select(User).where(User.admission_number == user_id)
            target_user = (await session.exec(q)).first()
            
        if not target_user:
             raise HTTPException(status_code=404, detail=f"User not found by ID '{user_id}'")

    elif admission_number:
        q = select(User).where(User.admission_number == admission_number)
        target_user = (await session.exec(q)).first()
        if not target_user:
             raise HTTPException(status_code=404, detail="Student not found by Admission Number")

    # Ensure Directory Exists
    import os
    os.makedirs("static/profiles", exist_ok=True)

    # Determine file extension
    import shutil
    import os
    
    file_ext = file.filename.split('.')[-1].lower()
    if file_ext not in ['jpg', 'jpeg', 'png', 'webp', 'gif']:
         raise HTTPException(status_code=400, detail="Invalid image format")
    
    import uuid
    # Use unique filename to prevent browser caching issues
    filename = f"{target_user.id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = f"static/profiles/{filename}"
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")
    
    # Update User Record with URL
    # Assuming server is running on same host, we store relative path or absolute URL
    # Storing relative path is flexible
    image_url = f"/static/profiles/{filename}"
    
    target_user.profile_image = image_url
    session.add(target_user)
    try:
        await session.commit()
        await session.refresh(target_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database commit failed: {str(e)}")
    
    return {
        "status": "success", 
        "image_url": image_url,
        "user_id": str(target_user.id),
        "user_name": target_user.full_name
    }


@router.post("/{user_id}/reset-password")
async def reset_user_password(
    request: Request,
    user_id: str,
    password_data: dict,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Reset user password (admin only)"""
    from uuid import UUID
    
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Get user
    user = await session.get(User, user_uuid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get new password
    new_password = password_data.get('new_password')
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Hash and update password
    user.hashed_password = get_password_hash(new_password)
    
    await session.commit()
    
    await log_action(
        session=session,
        action_type="reset_password",
        user=admin,
        table_name="users",
        record_id=str(user.id),
        description=f"Reset password for user {user.full_name} ({user.admission_number})",
        request=request
    )
    
    return {"message": f"Password reset successfully for {user.full_name}"}

@router.get("/public-company-settings")
async def get_public_company_settings(session: AsyncSession = Depends(get_session)):
    """Get public company/university settings (Name, Logo) without auth"""
    from app.models import SystemConfig
    import json
    
    stmt = select(SystemConfig).where(SystemConfig.key == "company_settings")
    config = (await session.exec(stmt)).first()
    
    if config:
        try:
            data = json.loads(config.value)
            return {
                "company_name": data.get("company_name", "University"),
                "logo_url": data.get("logo_url", "")
            }
        except:
            pass
            
    return {"company_name": "University", "logo_url": ""}

# --- Unified User Management ---

@router.post("/create-complete", response_model=User)
async def create_user_complete(
    user_data_str: str = Form(..., description="JSON string of user data"),
    file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Atomic Create: Creates User AND Uploads Image in one transaction.
    Fixes 'User not found' race conditions.
    """
    import json
    import uuid
    from uuid import UUID
    
    # 1. Permission Check
    role = await session.get(Role, current_user.role_id)
    if not role or role.name != "SuperAdmin":
        raise HTTPException(status_code=403, detail="Only SuperAdmin can create users")

    # 2. Parse Data
    try:
        data = json.loads(user_data_str)
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON data")
        
    admission_number = data.get('admission_number')
    if not admission_number:
        raise HTTPException(status_code=400, detail="Admission Number is required")

    # 3. Check Duplicates
    q = select(User).where((User.admission_number == admission_number) | (User.email == data.get('email')))
    if (await session.exec(q)).first():
        raise HTTPException(status_code=400, detail="User with this Admission/Email already exists")

    # 4. Resolve Role
    role_name = data.get('role_name', 'Student')
    role_obj = (await session.exec(select(Role).where(Role.name == role_name))).first()
    if not role_obj:
        # Auto-create role if missing (fallback)
        role_obj = Role(name=role_name)
        session.add(role_obj)
        await session.commit()
        await session.refresh(role_obj)

    # 5. Create User Object
    # Hash password
    pwd = data.get('password', 'Student123')
    hashed = get_password_hash(pwd)
    
    # Handle Dates
    expiry = None
    if data.get('expiry_date'):
        try:
            expiry = datetime.strptime(data['expiry_date'], '%Y-%m-%d').date()
        except: pass
        
    adm_date = None
    if data.get('admission_date'):
        try:
            adm_date = datetime.strptime(data['admission_date'], '%Y-%m-%d').date()
        except: pass

    # Handle Guardian UUID
    guard_id = None
    if data.get('guardian_id'):
        try:
            guard_id = UUID(str(data['guardian_id']))
        except: pass

    new_user = User(
        admission_number=admission_number,
        full_name=data.get('full_name') or f"{data.get('first_name', '')} {data.get('last_name', '')}".strip() or "Unknown",
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        email=data.get('email'),
        phone_number=data.get('phone_number'),
        gender=data.get('gender'),
        program=data.get('program'),
        school=data.get('school', 'General'),
        role_id=role_obj.id,
        hashed_password=hashed,
        status=data.get('status', 'active'),
        expiry_date=expiry,
        admission_date=adm_date,
        guardian_id=guard_id,
        has_smartphone=data.get('has_smartphone', False)
    )
    
    session.add(new_user)
    await session.flush() # Generate ID without committing
    
    # 6. Handle Image (Atomic)
    if file:
        try:
            os.makedirs("static/profiles", exist_ok=True)
            file_ext = file.filename.split('.')[-1]
            filename = f"{new_user.id}_{uuid.uuid4().hex[:8]}.{file_ext}"
            file_path = os.path.join("static/profiles", filename)
            
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
                
            new_user.profile_image = f"/static/profiles/{filename}"
            session.add(new_user) # Update
        except Exception as e:
            print(f"Image Save Error: {e}")
            
    await session.commit()
    await session.refresh(new_user)
    return new_user

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a user by ID or Admission Number."""
    # 1. Permission
    role = await session.get(Role, current_user.role_id)
    if not role or role.name != "SuperAdmin":
         raise HTTPException(status_code=403, detail="Not authorized")

    # 2. Find User (Robust UUID/Str/Adm)
    target = None
    try:
        from uuid import UUID
        u_uuid = UUID(user_id)
        target = await session.get(User, u_uuid)
    except: pass
    
    if not target:
         try: target = await session.get(User, user_id)
         except: pass
         
    if not target:
         q = select(User).where(User.admission_number == user_id)
         target = (await session.exec(q)).first()
         
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    await session.delete(target)
    await session.commit()
    return {"status": "deleted", "user": target.full_name}
