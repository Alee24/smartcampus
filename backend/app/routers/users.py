from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Form, BackgroundTasks
from datetime import datetime
from app.utils.timezone import get_eat_time
from sqlmodel import select, or_
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import AsyncSession as SAAsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text as sa_text
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_session, engine
from app.models import User, Role, SystemConfig, EntryLog, IncidentReport
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
    # Allow SuperAdmin, Admin, and Management to manage users
    allowed_roles = ["SuperAdmin", "Admin", "Security Lead", "Management"]
    if not role or role.name not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not authorized - Admin or SuperAdmin role required")
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
    """Autocomplete search for users, vehicles, visitors and event guests"""
    if len(q) < 2: return []
    clean_q = q.replace(" ", "").upper()
    from sqlalchemy import func
    from app.models import Visitor, Vehicle, EventVisitor
    
    # 1. Search Users
    user_query = select(User).where(or_(
        User.admission_number.contains(q.upper()),
        User.full_name.contains(q)
    )).limit(10)
    user_results = await session.exec(user_query)
    
    output = []
    for user in user_results.all():
        output.append({
            "id": str(user.id),
            "admission_number": user.admission_number,
            "full_name": user.full_name,
            "profile_image": user.profile_image,
            "school": user.school,
            "category": "user"
        })
        
    # 2. Search Vehicles
    vehicle_query = select(Vehicle).where(or_(
        func.replace(Vehicle.plate_number, ' ', '').contains(clean_q),
        Vehicle.driver_name.contains(q)
    )).limit(5)
    vehicle_results = await session.exec(vehicle_query)
    for v in vehicle_results.all():
        output.append({
            "id": str(v.id),
            "admission_number": v.plate_number,
            "full_name": f"Vehicle: {v.make or ''} {v.model or ''} (Driver: {v.driver_name or 'N/A'})".strip(),
            "profile_image": "https://cdn-icons-png.flaticon.com/512/3202/3202926.png",
            "school": "Vehicle Operations",
            "category": "vehicle"
        })
        
    # 3. Search Visitors
    visitor_query = select(Visitor).where(or_(
        Visitor.id_number.contains(q),
        Visitor.first_name.contains(q),
        Visitor.last_name.contains(q)
    )).limit(5)
    visitor_results = await session.exec(visitor_query)
    for vis in visitor_results.all():
        output.append({
            "id": str(vis.id),
            "admission_number": vis.id_number,
            "full_name": f"Visitor: {vis.first_name} {vis.last_name}",
            "profile_image": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            "school": "Visitor Center",
            "category": "visitor"
        })
        
    # 4. Search Event Guests
    event_visitor_query = select(EventVisitor).where(or_(
        EventVisitor.visitor_identifier.contains(q),
        EventVisitor.visitor_name.contains(q)
    )).limit(5)
    event_visitor_results = await session.exec(event_visitor_query)
    for ev in event_visitor_results.all():
         output.append({
             "id": str(ev.id),
             "admission_number": ev.visitor_identifier,
             "full_name": f"Event Guest: {ev.visitor_name}",
             "profile_image": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
             "school": "Event Guest",
             "category": "event_guest"
         })
         
    return output[:15]

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
        "role_id": current_user.role_id,
        "status": current_user.status
    }

class UserUpdateMe(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    gender: Optional[str] = None
    password: Optional[str] = None

@router.put("/me")
async def update_current_user_info(
    update_data: UserUpdateMe,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Update current logged-in user information"""
    old_values = {}
    new_values = {}

    if update_data.first_name is not None:
        old_values["first_name"] = current_user.first_name
        current_user.first_name = update_data.first_name
        new_values["first_name"] = update_data.first_name

    if update_data.last_name is not None:
        old_values["last_name"] = current_user.last_name
        current_user.last_name = update_data.last_name
        new_values["last_name"] = update_data.last_name

    # Auto-compile or explicitly set full_name
    if update_data.full_name is not None:
        old_values["full_name"] = current_user.full_name
        current_user.full_name = update_data.full_name
        new_values["full_name"] = update_data.full_name
    elif update_data.first_name is not None or update_data.last_name is not None:
        old_values["full_name"] = current_user.full_name
        f_name = current_user.first_name or ""
        l_name = current_user.last_name or ""
        current_user.full_name = f"{f_name} {l_name}".strip() or current_user.full_name
        new_values["full_name"] = current_user.full_name

    if update_data.email is not None:
        # Check email uniqueness if changed
        if update_data.email != current_user.email:
            existing = await session.exec(select(User).where(User.email == update_data.email))
            if existing.first():
                raise HTTPException(status_code=400, detail="Email already in use")
        old_values["email"] = current_user.email
        current_user.email = update_data.email
        new_values["email"] = update_data.email

    if update_data.phone_number is not None:
        old_values["phone_number"] = current_user.phone_number
        current_user.phone_number = update_data.phone_number
        new_values["phone_number"] = update_data.phone_number

    if update_data.gender is not None:
        old_values["gender"] = current_user.gender
        current_user.gender = update_data.gender
        new_values["gender"] = update_data.gender

    if update_data.password is not None and len(update_data.password.strip()) >= 6:
        current_user.hashed_password = get_password_hash(update_data.password)
        new_values["password"] = "[CHANGED]"

    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    await log_action(
        session=session,
        action_type="update_profile",
        user=current_user,
        table_name="users",
        record_id=str(current_user.id),
        description=f"Updated profile information",
        old_values=old_values,
        new_values=new_values,
        request=request
    )

    return {"message": "Profile updated successfully", "user": current_user}

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
        admission_date=datetime.strptime(new_user['admission_date'], '%Y-%m-%d').date() if new_user.get('admission_date') else get_eat_time().date()
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
            # Parse CSV (Resilient decoding: try utf-8-sig, cp1252, latin-1)
            decoded = None
            for enc in ["utf-8-sig", "cp1252", "latin-1"]:
                try:
                    decoded = content.decode(enc)
                    break
                except UnicodeDecodeError:
                    continue
            if decoded is None:
                decoded = content.decode("utf-8", errors="replace")
                
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
            existing_res = await session.execute(sa_text("SELECT admission_number, id, profile_image FROM users"))
            existing_map = {row[0]: (str(row[1]), row[2]) for row in existing_res.fetchall()}

            # ── Parse CSV rows ───────────────────────────────────────────────────
            to_insert = []
            to_update = []
            added_count = 0
            updated_count = 0
            error_count = 0
            errors = []

            for row_num, row in enumerate(rows, start=1):
                try:
                    # Create a helper dict with lowercase stripped keys
                    raw_map = {str(k).strip().lower(): v for k, v in row.items() if k is not None}

                    # Find admission number with multiple fallbacks
                    adm_no = ""
                    for key in ['admission_number', 'admission', 'adm', 'adm_no', 'reg_no', 'registration_number', 'reg_number', 'student_id', 'id']:
                        if key in raw_map:
                            val = str(raw_map[key] or '').strip()
                            if val:
                                adm_no = val
                                break
                    
                    if not adm_no:
                        error_count += 1
                        errors.append(f"Row {row_num}: Missing admission number column or value")
                        continue

                    # Find name/full_name
                    full_n = ""
                    for key in ['full_name', 'name', 'fullname', 'student_name', 'user_name']:
                        if key in raw_map:
                            val = str(raw_map[key] or '').strip()
                            if val:
                                full_n = val
                                break

                    f_name = ""
                    for key in ['first_name', 'firstname', 'fname']:
                        if key in raw_map:
                            f_name = str(raw_map[key] or '').strip()
                            break

                    l_name = ""
                    for key in ['last_name', 'lastname', 'lname']:
                        if key in raw_map:
                            l_name = str(raw_map[key] or '').strip()
                            break

                    if not full_n:
                        if f_name or l_name:
                            full_n = f"{f_name} {l_name}".strip()
                        else:
                            full_n = "Unknown Student"

                    # If full_name is present but first_name/last_name are empty, split full_name to fill them
                    if full_n and not f_name and not l_name:
                        parts = full_n.split(None, 1)
                        if len(parts) == 2:
                            f_name, l_name = parts[0], parts[1]
                        else:
                            f_name = full_n

                    # Other optional fields
                    email_val = None
                    for key in ['email', 'email_address', 'mail']:
                        if key in raw_map:
                            email_val = str(raw_map[key] or '').strip() or None
                            break

                    phone_val = None
                    for key in ['phone_number', 'phone', 'phone_no', 'telephone', 'mobile']:
                        if key in raw_map:
                            phone_val = str(raw_map[key] or '').strip() or None
                            break

                    school_val = "General"
                    for key in ['school', 'department', 'dept', 'faculty']:
                        if key in raw_map:
                            school_val = str(raw_map[key] or '').strip() or "General"
                            break

                    gender_val = None
                    for key in ['gender', 'sex']:
                        if key in raw_map:
                            gender_val = str(raw_map[key] or '').strip() or None
                            break

                    program_val = None
                    for key in ['program', 'course', 'degree']:
                        if key in raw_map:
                            program_val = str(raw_map[key] or '').strip() or None
                            break

                    validity_val = None
                    for key in ['validity', 'expiry_date', 'expiry']:
                        if key in raw_map:
                            validity_val = str(raw_map[key] or '').strip() or None
                            break

                    from app.routers.admin import parse_validity_date
                    expiry_date = parse_validity_date(validity_val) if validity_val else None

                    profile_val = None
                    for key in ['profile_image', 'profile_pic', 'image', 'photo']:
                        if key in raw_map:
                            profile_val = str(raw_map[key] or '').strip() or None
                            break

                    if adm_no in existing_map:
                        existing_id, existing_img = existing_map[adm_no]
                        to_update.append({
                            "existing_id": existing_id,
                            "full_name": full_n,
                            "first_name": f_name,
                            "last_name": l_name,
                            "phone": phone_val,
                            "school": school_val,
                            "email": email_val,
                            "gender": gender_val,
                            "program": program_val,
                            "expiry_date": expiry_date,
                            "profile_image": existing_img or profile_val
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
                            "expiry_date": expiry_date,
                            "pwd": default_hashed_pwd,
                            "role_id": role_id_val,
                            "profile_image": profile_val,
                            "created_at": get_eat_time(),
                        })
                        existing_map[adm_no] = (new_id, profile_val)  # prevent CSV duplicates
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
                                  phone_number, school, email, gender, program, expiry_date,
                                  hashed_password, role_id, status, profile_image,
                                  has_smartphone, pin, pin_setup_required, created_at)
                             VALUES
                                 (:new_id, :adm, :full_name, :first_name, :last_name,
                                  :phone, :school, :email, :gender, :program, :expiry_date,
                                  :pwd, :role_id, 'active', :profile_image,
                                  0, '2424', 1, :created_at)
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
                                 full_name     = :full_name,
                                 first_name    = :first_name,
                                 last_name     = :last_name,
                                 phone_number  = :phone,
                                 school        = :school,
                                 email         = :email,
                                 gender        = :gender,
                                 program       = :program,
                                 expiry_date   = :expiry_date,
                                 profile_image = :profile_image,
                                 status        = 'active'
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
    decoded_content = None
    for enc in ["utf-8-sig", "cp1252", "latin-1"]:
        try:
            decoded_content = content.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if decoded_content is None:
        decoded_content = content.decode("utf-8", errors="replace")
        
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

    # 2.5 Visitor ID / Passport prefix match
    if not user:
        query = select(User).where(User.admission_number == f"VISITOR-{admission_number}")
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
        # Fallback: check Visitor table
        from app.models import Visitor
        visitor_query = select(Visitor).where(Visitor.id_number == admission_number).order_by(Visitor.time_in.desc())
        visitor = (await session.exec(visitor_query)).first()
        if visitor:
            last_stay_minutes = None
            if visitor.plate_number:
                last_visitor = (await session.exec(
                    select(Visitor)
                    .where(Visitor.plate_number == visitor.plate_number)
                    .where(Visitor.status == "checked_out")
                    .where(Visitor.time_out != None)
                    .order_by(Visitor.time_out.desc())
                )).first()
                if last_visitor and last_visitor.time_in and last_visitor.time_out:
                    duration = last_visitor.time_out - last_visitor.time_in
                    last_stay_minutes = int(duration.total_seconds() / 60)
            elif visitor.id_number:
                last_visitor = (await session.exec(
                    select(Visitor)
                    .where(Visitor.id_number == visitor.id_number)
                    .where(Visitor.status == "checked_out")
                    .where(Visitor.time_out != None)
                    .order_by(Visitor.time_out.desc())
                )).first()
                if last_visitor and last_visitor.time_in and last_visitor.time_out:
                    duration = last_visitor.time_out - last_visitor.time_in
                    last_stay_minutes = int(duration.total_seconds() / 60)

            return {
                "id": str(visitor.id),
                "full_name": f"{visitor.first_name} {visitor.last_name}".strip(),
                "admission_number": visitor.id_number,
                "phone_number": visitor.phone_number,
                "email": None,
                "school": "Visitor",
                "status": "Active",
                "role": "Visitor",
                "gate_status": "In" if visitor.status == "checked_in" else "Out",
                "found_in_visitor_logs": True,
                "visit_details": visitor.visit_details,
                
                # New fields for visitor card details:
                "first_name": visitor.first_name,
                "last_name": visitor.last_name,
                "visitor_type": visitor.visitor_type,
                "time_in": visitor.time_in.isoformat() if visitor.time_in else None,
                "time_out": visitor.time_out.isoformat() if visitor.time_out else None,
                "plate_number": visitor.plate_number,
                "passengers": visitor.passengers,
                "dropoff_name": visitor.dropoff_name,
                "dropoff_admission_number": visitor.dropoff_admission_number,
                "check_in_student": visitor.check_in_student,
                "last_stay_minutes": last_stay_minutes
            }
            
        # Fallback 2: check EventVisitor table
        from app.models import EventVisitor, Event
        event_visitor_query = select(EventVisitor).where(EventVisitor.visitor_identifier == admission_number).order_by(EventVisitor.entry_time.desc())
        event_visitor = (await session.exec(event_visitor_query)).first()
        if event_visitor:
            event_obj = await session.get(Event, event_visitor.event_id)
            event_name = event_obj.name if event_obj else "Event"
            return {
                "id": str(event_visitor.id),
                "full_name": event_visitor.visitor_name,
                "admission_number": event_visitor.visitor_identifier,
                "phone_number": event_visitor.phone_number,
                "email": event_visitor.email,
                "school": "Event Guest",
                "status": "Active",
                "role": "Event Guest",
                "gate_status": "In" if event_visitor.status == "checked_in" else "Out",
                "visit_details": f"Attending Event: {event_name}",
                "found_in_event_visitors": True,
                
                # New fields:
                "event_name": event_name,
                "visitor_name": event_visitor.visitor_name,
                "visitor_identifier": event_visitor.visitor_identifier,
                "time_in": event_visitor.entry_time.isoformat() if event_visitor.entry_time else None
            }
            
        # Fallback 3: check Vehicle table (by plate number)
        from app.models import Vehicle, VehicleLog
        clean_plate = admission_number.replace(" ", "").upper()
        from sqlalchemy import func
        vehicle = (await session.exec(
            select(Vehicle).where(func.replace(Vehicle.plate_number, ' ', '') == clean_plate)
        )).first()
        if vehicle:
            # Check check-in status (is_checked_in)
            active_log = (await session.exec(
                select(VehicleLog)
                .where(VehicleLog.vehicle_id == vehicle.id)
                .where(VehicleLog.exit_time == None)
                .order_by(VehicleLog.entry_time.desc())
            )).first()
            gate_status = "In" if active_log else "Out"

            # Query last completed log
            last_checkout_log = (await session.exec(
                select(VehicleLog)
                .where(VehicleLog.vehicle_id == vehicle.id)
                .where(VehicleLog.exit_time != None)
                .order_by(VehicleLog.exit_time.desc())
            )).first()
            
            last_stay_minutes = None
            if last_checkout_log and last_checkout_log.entry_time and last_checkout_log.exit_time:
                duration = last_checkout_log.exit_time - last_checkout_log.entry_time
                last_stay_minutes = int(duration.total_seconds() / 60)
            
            return {
                "id": str(vehicle.id),
                "full_name": f"Vehicle: {vehicle.make or ''} {vehicle.model or ''}".strip() or "Vehicle",
                "admission_number": vehicle.plate_number,
                "phone_number": vehicle.driver_contact or "N/A",
                "email": None,
                "school": "Vehicle Operations",
                "status": "Active",
                "role": "Vehicle",
                "gate_status": gate_status,
                "visit_details": f"Driver: {vehicle.driver_name or 'N/A'} | Plate: {vehicle.plate_number}",
                "found_in_vehicles": True,
                
                # New fields:
                "plate_number": vehicle.plate_number,
                "make": vehicle.make,
                "model": vehicle.model,
                "color": vehicle.color,
                "vehicle_type": vehicle.vehicle_type,
                "driver_name": vehicle.driver_name,
                "driver_contact": vehicle.driver_contact,
                "driver_id_number": vehicle.driver_id_number,
                "entry_time": active_log.entry_time.isoformat() if active_log else None,
                "passengers": active_log.detected_passengers if active_log else 1,
                "purpose": active_log.purpose if active_log else None,
                "destination": active_log.destination if active_log else None,
                "last_stay_minutes": last_stay_minutes
            }
        raise HTTPException(status_code=404, detail="Student/Visitor/Guest/Vehicle not found")
    
    # Get role information
    role = await session.get(Role, user.role_id)
    
    # Check Gate Status (In/Out)
    gate_status_query = select(EntryLog).where(EntryLog.user_id == user.id).where(EntryLog.exit_time == None).order_by(EntryLog.entry_time.desc())
    open_log = (await session.exec(gate_status_query)).first()
    gate_status = "In" if open_log else "Out"

    # Check if student is flagged in incident reports (any unresolved incident)
    incident_query = select(IncidentReport).where(IncidentReport.target_user_id == user.id).where(IncidentReport.status != "resolved")
    active_incidents = (await session.exec(incident_query)).all()
    user_status = "Flagged" if active_incidents else user.status
    
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "admission_number": user.admission_number,
        "email": user.email,
        "school": user.school,
        "status": user_status,
        "profile_image": user.profile_image,
        "admission_date": user.admission_date.isoformat() if user.admission_date else None,
        "expiry_date": user.expiry_date.isoformat() if user.expiry_date else None,
        "role": role.name if role else "Unknown",
        "gate_status": gate_status,
        "phone_number": user.phone_number
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
    supervisor_pin: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
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
    file_ext = file.filename.split('.')[-1].lower()
    if file_ext not in ['jpg', 'jpeg', 'png', 'webp', 'gif']:
         raise HTTPException(status_code=400, detail="Invalid image format")
    
    import uuid
    from PIL import Image
    # Use unique WebP filename to prevent browser caching issues and optimize size
    filename = f"{target_user.id}_{uuid.uuid4().hex[:8]}.webp"
    file_path = f"static/profiles/{filename}"
    
    # Save/Compress using Pillow to WebP with max 512px dimensions
    try:
        # Load image and process
        with Image.open(file.file) as img:
            # Resize if either dimension exceeds 512px
            max_size = 512
            if img.width > max_size or img.height > max_size:
                img.thumbnail((max_size, max_size), Image.LANCZOS)
            
            # Save as optimized WebP
            img.save(file_path, "WEBP", quality=75, method=6)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process and compress image: {str(e)}")
    
    # Clean up the old profile image file physically if it existed
    if target_user.profile_image and target_user.profile_image.startswith("/static/profiles/"):
        old_file_path = target_user.profile_image.lstrip("/")
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except Exception as e:
                print(f"Error removing old image file {old_file_path}: {e}")

    # Update User Record with URL
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


@router.post("/remove-profile-image")
async def remove_profile_image(
    user_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    target_user = current_user
    if user_id:
        try:
            from uuid import UUID
            uuid_obj = UUID(user_id)
            target_user = await session.get(User, uuid_obj)
        except Exception:
            target_user = None
        if not target_user:
            try:
                target_user = await session.get(User, user_id)
            except: pass
        if not target_user:
            q = select(User).where(User.admission_number == user_id)
            target_user = (await session.exec(q)).first()
        if not target_user:
            raise HTTPException(status_code=404, detail=f"User not found by ID '{user_id}'")
            
    # Delete file physically if it exists and is local
    import os
    if target_user.profile_image and target_user.profile_image.startswith("/static/profiles/"):
        file_path = target_user.profile_image.lstrip("/")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error removing file {file_path}: {e}")

    target_user.profile_image = None
    session.add(target_user)
    try:
        await session.commit()
        await session.refresh(target_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database commit failed: {str(e)}")
    return {"status": "success", "message": "Profile image removed successfully"}




@router.post("/{user_id}/rotate-profile-image")
async def rotate_profile_image(
    user_id: str,
    direction: str = Form("clockwise"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    from PIL import Image
    import os
    import uuid
    from uuid import UUID

    # 1. Get user
    try:
        user_uuid = UUID(user_id)
        target_user = await session.get(User, user_uuid)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Check if user has local profile image
    if not target_user.profile_image or not target_user.profile_image.startswith("/static/profiles/"):
        raise HTTPException(status_code=400, detail="User does not have a local profile image to rotate")

    file_path = target_user.profile_image.lstrip("/")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Profile image file not found on server")

    # 3. Rotate image and save to new filename as WebP to prevent caching and optimize size
    try:
        new_filename = f"{target_user.id}_{uuid.uuid4().hex[:8]}.webp"
        new_file_path = f"static/profiles/{new_filename}"

        with Image.open(file_path) as img:
            if direction == "counter-clockwise":
                rotated_img = img.transpose(Image.ROTATE_90)
            else:
                rotated_img = img.transpose(Image.ROTATE_270)
            
            # Save as WebP
            rotated_img.save(new_file_path, "WEBP", quality=75, method=6)

        # 4. Remove old file
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error removing old file {file_path}: {e}")

        # 5. Update DB
        image_url = f"/static/profiles/{new_filename}"
        target_user.profile_image = image_url
        session.add(target_user)
        await session.commit()
        await session.refresh(target_user)

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to rotate image: {str(e)}")

    return {"status": "success", "image_url": image_url}





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
    """Get public company/university settings (Name, Logo, Colors) without auth"""
    from app.models import SystemConfig
    import json
    
    stmt = select(SystemConfig).where(SystemConfig.key == "company_settings")
    config = (await session.exec(stmt)).first()
    
    if config:
        try:
            data = json.loads(config.value)
            return {
                "company_name": data.get("company_name", "University"),
                "logo_url": data.get("logo_url", ""),
                "primary_color": data.get("primary_color", "#2563eb"),
                "secondary_color": data.get("secondary_color", "#0284c7"),
                "accent_color": data.get("accent_color", "#10b981"),
                "text_color": data.get("text_color", "")
            }
        except:
            pass
            
    return {
        "company_name": "University",
        "logo_url": "",
        "primary_color": "#2563eb",
        "secondary_color": "#0284c7",
        "accent_color": "#10b981",
        "text_color": ""
    }


class AdminPinRequest(BaseModel):
    pin: str

@router.post("/verify-admin-pin")
async def verify_admin_pin(
    payload: AdminPinRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Checks if the entered pin matches the pin of any active Admin/SuperAdmin/Security Lead user
    """
    from app.models import Role, User
    
    # 1. Fetch Admin, SuperAdmin, and Security Lead roles
    roles_stmt = select(Role).where(Role.name.in_(["Admin", "SuperAdmin", "Security Lead"]))
    roles = (await session.exec(roles_stmt)).all()
    if not roles:
        raise HTTPException(status_code=400, detail="Administrative roles not initialized")
        
    role_ids = [role.id for role in roles]
    
    # 2. Check if there exists an active user with one of these roles and this pin
    user_stmt = select(User).where(
        User.role_id.in_(role_ids),
        User.pin == payload.pin,
        User.status == "Active"
    )
    user = (await session.exec(user_stmt)).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid administrator PIN")
        
    return {"status": "success", "message": "PIN verified successfully"}


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


@router.post("/compress-all-images")
async def compress_all_images(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    from PIL import Image
    import os
    import uuid
    from pathlib import Path

    # 1. Fetch all users from the database
    query = select(User).where(User.profile_image != None)
    results = await session.exec(query)
    users = results.all()

    total_scanned = 0
    total_compressed = 0
    original_total_size = 0
    new_total_size = 0
    errors = []

    os.makedirs("static/profiles", exist_ok=True)

    for user in users:
        # Check if local profile picture
        if not user.profile_image or not user.profile_image.startswith("/static/profiles/"):
            continue
        
        total_scanned += 1
        file_path = user.profile_image.lstrip("/")
        
        if not os.path.exists(file_path):
            errors.append(f"File not found on disk for {user.full_name}: {file_path}")
            continue

        try:
            # Check original size
            orig_size = os.path.getsize(file_path)
            original_total_size += orig_size

            # Open image
            with Image.open(file_path) as img:
                # 2. Resize if necessary. Max dimension 512px.
                max_size = 512
                if img.width > max_size or img.height > max_size:
                    img.thumbnail((max_size, max_size), Image.LANCZOS)

                # Generate new unique WebP filename to bypass cache
                new_filename = f"{user.id}_{uuid.uuid4().hex[:8]}.webp"
                new_file_path = f"static/profiles/{new_filename}"

                # Save as optimized WebP
                img.save(new_file_path, "WEBP", quality=75, method=6)
            
            # Check new size
            new_size = os.path.getsize(new_file_path)
            new_total_size += new_size

            # 3. Clean up the old file
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error removing old image file {file_path}: {e}")

            # 4. Update user profile image URL in DB
            user.profile_image = f"/static/profiles/{new_filename}"
            session.add(user)
            total_compressed += 1

        except Exception as e:
            errors.append(f"Failed to compress image for {user.full_name}: {str(e)}")

    if total_compressed > 0:
        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise HTTPException(status_code=500, detail=f"Database update failed during compression: {str(e)}")

    # Calculate statistics
    saved_bytes = original_total_size - new_total_size
    saved_mb = round(saved_bytes / (1024 * 1024), 2)
    original_mb = round(original_total_size / (1024 * 1024), 2)
    new_mb = round(new_total_size / (1024 * 1024), 2)
    reduction_pct = round((saved_bytes / original_total_size * 100), 1) if original_total_size > 0 else 0

    return {
        "status": "success",
        "total_scanned": total_scanned,
        "total_compressed": total_compressed,
        "original_size_mb": original_mb,
        "new_size_mb": new_mb,
        "saved_size_mb": saved_mb,
        "reduction_percentage": reduction_pct,
        "errors": errors
    }


def _generate_qrs_zip_sync(users_data: list, zip_path: str):
    import zipfile
    import qrcode
    import io
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for val in users_data:
            if not val:
                continue
            # sanitize name for filename
            safe_filename = "".join(c for c in val if c.isalnum() or c in ('-', '_', '.')).strip()
            if not safe_filename:
                continue
            
            filename = f"{safe_filename}.png"
            
            # Generate QR code
            qr = qrcode.QRCode(version=1, box_size=10, border=4)
            qr.add_data(val)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            
            zip_file.writestr(filename, img_byte_arr.getvalue())


@router.get("/download-qrs-zip")
async def download_qrs_zip(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    import os
    import asyncio
    import uuid
    from fastapi.responses import FileResponse
    from app.models import Role, User
    
    # 1. Fetch visitor role if any
    visitor_role = (await session.exec(select(Role).where(Role.name == "Visitor"))).first()
    
    # 2. Query all users (excluding visitors, and ensuring admission number is not empty)
    query = select(User).where(User.admission_number != None).where(User.admission_number != "")
    if visitor_role:
        query = query.where(User.role_id != visitor_role.id)
        
    results = await session.exec(query)
    users = results.all()
    
    # Extract admission numbers
    user_codes = [user.admission_number.strip() for user in users if user.admission_number.strip()]
    
    if not user_codes:
        raise HTTPException(status_code=400, detail="No student or staff records with admission numbers found.")
        
    # Create static/downloads directory if not exists
    os.makedirs("static/downloads", exist_ok=True)
    
    # Unique zip file name
    zip_filename = f"qrs_archive_{uuid.uuid4().hex[:8]}.zip"
    zip_path = os.path.join("static/downloads", zip_filename)
    
    # 3. Offload CPU-bound zip generation to background threadpool
    await asyncio.to_thread(_generate_qrs_zip_sync, user_codes, zip_path)
    
    # 4. Return FileResponse
    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename="student_staff_qrs.zip"
    )


class NFCAssignRequest(BaseModel):
    nfc_card_uid: str
    nfc_status: Optional[str] = "Active"

@router.get("/nfc/{nfc_card_uid}")
async def get_user_by_nfc(
    nfc_card_uid: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """Find a user by NFC tag UID"""
    query = select(User).where(User.nfc_card_uid == nfc_card_uid)
    result = await session.exec(query)
    user = result.first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No user found with NFC Card UID {nfc_card_uid}")
    
    # Get role
    role = await session.get(Role, user.role_id)
    u_dict = user.dict(exclude={"hashed_password"})
    u_dict["role"] = role.name if role else "Unknown"
    return u_dict

@router.post("/{user_id}/nfc")
async def assign_nfc_tag(
    user_id: uuid_lib.UUID,
    payload: NFCAssignRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """Assign an NFC tag to a user"""
    # 1. Fetch user to assign
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    nfc_uid = payload.nfc_card_uid.strip()
    if not nfc_uid:
        raise HTTPException(status_code=400, detail="NFC Card UID cannot be empty")
        
    # 2. Check if this NFC UID is already assigned to a DIFFERENT user
    conflict_query = select(User).where(User.nfc_card_uid == nfc_uid).where(User.id != user_id)
    conflict_res = await session.exec(conflict_query)
    conflict_user = conflict_res.first()
    if conflict_user:
        raise HTTPException(
            status_code=400, 
            detail=f"This NFC tag is already assigned to {conflict_user.full_name} ({conflict_user.admission_number})"
        )
        
    # 3. Update user
    user.nfc_card_uid = nfc_uid
    user.nfc_written_at = get_eat_time()
    user.nfc_status = payload.nfc_status or "Active"
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    # Audit logging
    await log_action(
        session=session,
        action_type="nfc_assign",
        user=current_user,
        table_name="users",
        record_id=str(user.id),
        description=f"Assigned NFC tag {nfc_uid} to user {user.full_name} ({user.admission_number})",
        request=None
    )
    
    return {"status": "success", "message": "NFC tag assigned successfully", "user": user.dict(exclude={"hashed_password"})}

@router.delete("/{user_id}/nfc")
async def revoke_nfc_tag(
    user_id: uuid_lib.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """Revoke NFC tag of a user"""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    old_uid = user.nfc_card_uid
    user.nfc_card_uid = None
    user.nfc_written_at = None
    user.nfc_status = None
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    # Audit logging
    await log_action(
        session=session,
        action_type="nfc_revoke",
        user=current_user,
        table_name="users",
        record_id=str(user.id),
        description=f"Revoked NFC tag {old_uid} from user {user.full_name} ({user.admission_number})",
        request=None
    )
    
    return {"status": "success", "message": "NFC tag revoked successfully"}


@router.get("/{user_id}/logs")
async def get_user_entry_logs(
    user_id: uuid_lib.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """Get all check-in/check-out entry logs for a user, sorted by entry_time descending"""
    from app.models import EntryLog, Gate
    # Query logs
    query = select(EntryLog).where(EntryLog.user_id == user_id).order_by(EntryLog.entry_time.desc())
    logs = (await session.exec(query)).all()
    
    results = []
    for log in logs:
        gate = await session.get(Gate, log.gate_id)
        exit_gate = await session.get(Gate, log.exit_gate_id) if log.exit_gate_id else None
        
        duration_minutes = None
        if log.entry_time and log.exit_time:
            duration_minutes = round((log.exit_time - log.entry_time).total_seconds() / 60, 1)
        elif log.entry_time:
            duration_minutes = round((get_eat_time() - log.entry_time).total_seconds() / 60, 1) # Active stay duration

        results.append({
            "id": str(log.id),
            "entry_time": log.entry_time.isoformat() if log.entry_time else None,
            "exit_time": log.exit_time.isoformat() if log.exit_time else None,
            "method": log.method,
            "status": log.status,
            "gate_name": gate.name if gate else "Main Gate",
            "exit_gate_name": exit_gate.name if exit_gate else None,
            "duration_minutes": duration_minutes
        })
    return results

class EmailVisitorIDRequest(BaseModel):
    email: str
    visitor_name: str
    pdf_base64: str

@router.post("/email-visitor-id")
async def email_visitor_id(
    payload: EmailVisitorIDRequest,
    current_user: User = Depends(get_current_user)
):
    import base64
    import tempfile
    import os
    
    try:
        pdf_data = payload.pdf_base64
        if "," in pdf_data:
            pdf_data = pdf_data.split(",")[1]
        
        file_content = base64.b64decode(pdf_data)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
            
        from app.email_utils import send_attendance_email
        
        body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #7A1975; margin: 0; font-size: 24px;">Smart Campus</h1>
                <p style="color: #718096; margin: 4px 0 0 0; font-size: 14px;">Digital ID Copy</p>
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
            <h3 style="color: #2d3748; margin-top: 0; margin-bottom: 12px;">Hello {payload.visitor_name},</h3>
            <p style="color: #4a5568; line-height: 1.6; font-size: 15px;">
                Please find your Smart Campus ID card attached to this email as a PDF document.
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;" />
            <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">
                This is an automated safety notification from the Smart Campus Gateway Pass System.<br/>
                Please do not reply directly to this email.
            </p>
        </div>
        """
        
        await send_attendance_email(
            recipients=[payload.email],
            subject=f"Smart Campus ID - {payload.visitor_name}",
            body=body,
            attachments=[tmp_path]
        )
        
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
            
        return {"status": "success", "message": "ID card emailed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to email ID card: {str(e)}")



