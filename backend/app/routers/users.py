from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Form
from datetime import datetime
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from app.database import get_session
from app.models import User, Role
from app.auth import get_current_user, get_password_hash
import csv
import codecs
import io

router = APIRouter()

# Dependency to check if user is admin
async def get_current_admin_user(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # Fetch role name
    role = await session.get(Role, current_user.role_id)
    if not role or role.name != "SuperAdmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

@router.get("")
async def get_all_users(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all users with their roles"""
    # Outer join ensures users display even if role link is broken
    query = select(User, Role).outerjoin(Role, User.role_id == Role.id)
    results = await session.exec(query)
    
    users_list = []
    for user, role in results.all():
        u_dict = user.dict(exclude={"hashed_password"})
        u_dict["role"] = role.name if role else "Unknown" # Handle missing role
        users_list.append(u_dict)
        
    return users_list

@router.put("/{user_id}")
async def update_user(
    user_id: str,
    user_data: dict,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Update user details"""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields
    for key, value in user_data.items():
        if hasattr(user, key) and key not in ['id', 'hashed_password', 'role']:
            setattr(user, key, value)
            
    # Handle Role update if role name provided
    if 'role' in user_data:
        role_stmt = select(Role).where(Role.name == user_data['role'])
        role = (await session.exec(role_stmt)).first()
        if role:
            user.role_id = role.id

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

@router.delete("/{user_id}")
async def delete_user(
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
        "profile_image": current_user.profile_image,
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
    from app.models import AuditLog
    import json
    
    # Extract IP
    client_ip = request.client.host
    # If behind proxy (Docker/Nginx), headers might be needed, but host is fine for now
    
    # Store metadata
    metadata = {
        "gps": access_data.get('gps'),
        "network": access_data.get('network'), # Type: wifi/4g etc
        "ip": client_ip,
        "device": access_data.get('device')
    }
    
    log = AuditLog(
        user_id=current_user.id,
        action="LOGIN_METADATA",
        timestamp=datetime.utcnow(),
        details=json.dumps(metadata) # We need to update AuditLog model to support details or store in action?
        # AuditLog structure: user_id, action, timestamp. 
        # Action is string. We can append metadata to action string or add column.
        # User said "record".
        # Let's format action string: f"LOGIN: IP={client_ip} | LOC={gps}"
    )
    # Re-eval AuditLog model: 
    # class AuditLog(UUIDModel, table=True):
    #    user_id: Optional[UUID]
    #    action: str
    
    # I'll modify action string to contain JSON if no details column.
    log.action = f"LOGIN_METADATA: {json.dumps(metadata)}"
    
    session.add(log)
    
    # Also log to UserLocationLog for real-time tracking (Attendance Fallback)
    from app.models import UserLocationLog
    gps = access_data.get('gps', {}) or {}
    ulog = UserLocationLog(
        user_id=current_user.id,
        latitude=gps.get('lat') if isinstance(gps, dict) else None,
        longitude=gps.get('lng') if isinstance(gps, dict) else None,
        ip_address=client_ip,
        network_type=access_data.get('network'),
        device_info=access_data.get('device'),
        context_type="login_audit"
    )
    session.add(ulog)

    await session.commit()
    return {"status": "recorded"}

@router.post("/create", response_model=User)
async def create_user(
    new_user: dict, 
    session: AsyncSession = Depends(get_session), 
    admin: User = Depends(get_current_admin_user)
):
    # Check if user exists
    query = select(User).where((User.admission_number == new_user['admission_number']) | (User.email == new_user.get('email')))
    existing = await session.exec(query)
    if existing.first():
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Get Role ID
    role_query = select(Role).where(Role.name == new_user['role_name'])
    role = (await session.exec(role_query)).first()
    if not role:
         raise HTTPException(status_code=400, detail="Invalid Role")

    # Hash default password if not provided
    pwd = new_user.get('password', 'Student123') # Default password for bulk/admin creation
    hashed_pwd = get_password_hash(pwd)

    db_user = User(
        admission_number=new_user['admission_number'],
        full_name=new_user.get('full_name', f"{new_user.get('first_name', '')} {new_user.get('last_name', '')}".strip()),
        first_name=new_user.get('first_name'),
        last_name=new_user.get('last_name'),
        school=new_user['school'],
        email=new_user.get('email'),
        phone_number=new_user.get('phone_number'),
        hashed_password=hashed_pwd,
        role_id=role.id,
        status="active",
        has_smartphone=new_user.get('has_smartphone', False),
        admission_date=datetime.strptime(new_user['admission_date'], '%Y-%m-%d').date() if new_user.get('admission_date') else None
    )
    
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user

@router.post("/bulk-upload")
async def bulk_upload_students(
    file: UploadFile = File(...), 
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """
    Bulk upload users from CSV. Supports large files (10,000+ records).
    - Updates existing users (UPSERT logic)
    - Batch commits every 500 records
    - School field is optional (defaults to 'General')
    - Treats uploaded data as source of truth
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    
    # Read CSV
    content = await file.read()
    try:
        decoded_content = content.decode('utf-8')
    except UnicodeDecodeError:
        decoded_content = content.decode('latin-1')
        
    csv_reader = csv.DictReader(io.StringIO(decoded_content))
    
    # Get Student Role
    role_query = select(Role).where(Role.name == "Student")
    student_role = (await session.exec(role_query)).first()
    
    if not student_role:
        student_role = Role(name="Student", description="Regular Student")
        session.add(student_role)
        await session.commit()
        await session.refresh(student_role)
    
    added_count = 0
    updated_count = 0
    error_count = 0
    errors = []
    batch_size = 500
    current_batch = 0
    
    for row_num, row in enumerate(csv_reader, start=1):
        try:
            # Get admission number (required)
            adm_no = row.get('admission_number', '').strip()
            if not adm_no:
                error_count += 1
                errors.append(f"Row {row_num}: Missing admission_number")
                continue
            
            # Build full name
            f_name = row.get('first_name', '').strip()
            l_name = row.get('last_name', '').strip()
            full_n = row.get('full_name', '').strip()
            if not full_n and (f_name or l_name):
                full_n = f"{f_name} {l_name}".strip()
            if not full_n:
                full_n = "Unknown"
            
            # Clean optional fields
            email_val = row.get('email', '').strip() or None
            phone_val = row.get('phone_number', '').strip() or None
            school_val = row.get('school', '').strip() or "General"  # Default if missing
            
            # Check if user exists (UPSERT logic)
            exists_q = select(User).where(User.admission_number == adm_no)
            existing_user = (await session.exec(exists_q)).first()
            
            if existing_user:
                # UPDATE existing user (treat uploaded data as source of truth)
                existing_user.full_name = full_n
                existing_user.first_name = f_name or existing_user.first_name
                existing_user.last_name = l_name or existing_user.last_name
                existing_user.phone_number = phone_val or existing_user.phone_number
                existing_user.school = school_val
                existing_user.email = email_val or existing_user.email
                existing_user.status = "active"  # Reactivate if was inactive
                session.add(existing_user)
                updated_count += 1
            else:
                # INSERT new user
                hashed = get_password_hash("Student123")
                new_student = User(
                    admission_number=adm_no,
                    full_name=full_n,
                    first_name=f_name,
                    last_name=l_name,
                    phone_number=phone_val,
                    school=school_val,
                    email=email_val,
                    hashed_password=hashed,
                    role_id=student_role.id,
                    status="active"
                )
                session.add(new_student)
                added_count += 1
            
            current_batch += 1
            
            # Batch commit every 500 records to avoid timeout
            if current_batch >= batch_size:
                await session.commit()
                current_batch = 0
                
        except Exception as e:
            error_count += 1
            errors.append(f"Row {row_num} ({adm_no if 'adm_no' in locals() else 'unknown'}): {str(e)}")
            # Continue processing other records
    
    # Final commit for remaining records
    if current_batch > 0:
        await session.commit()
    
    return {
        "success": True,
        "added": added_count,
        "updated": updated_count,
        "errors": error_count,
        "error_details": errors[:100],  # Limit error list to first 100
        "total_processed": added_count + updated_count + error_count
    }

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
    
    # Cache for performance
    # In a large system, we might query db row by row or fetch all.
    # For now, let's fetch on demand or optimistically.
    
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
            
        except Exception as e:
            errors.append(f"Row error: {str(e)}")
            
    await session.commit()
    return {"added": count, "errors": errors}

@router.get("/", response_model=List[User])
async def list_users(
    session: AsyncSession = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    statement = select(User)
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
            # col.like('%value') is 'endswith'
            query = select(User).where(User.admission_number.like(f"%{admission_number}"))
            user = (await session.exec(query)).first()

    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get role information
    role = await session.get(Role, user.role_id)
    
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
        "role": role.name if role else "Unknown"
    }

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
    if file_ext not in ['jpg', 'jpeg', 'png', 'webp']:
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

@router.put("/{user_id}")
async def update_user(
    user_id: str,
    user_data: dict,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Update user details (admin only)"""
    from uuid import UUID
    
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Get user
    user = await session.get(User, user_uuid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update allowed fields
    if 'full_name' in user_data:
        user.full_name = user_data['full_name']
    if 'first_name' in user_data:
        user.first_name = user_data['first_name']
    if 'last_name' in user_data:
        user.last_name = user_data['last_name']
    if 'admission_number' in user_data:
        user.admission_number = user_data['admission_number']
    if 'email' in user_data:
        user.email = user_data['email']
    if 'school' in user_data:
        user.school = user_data['school']
    if 'phone_number' in user_data:
        user.phone_number = user_data['phone_number']
    if 'admission_date' in user_data:
        # Expect YYYY-MM-DD
        try:
            if user_data['admission_date']:
                user.admission_date = datetime.strptime(user_data['admission_date'], '%Y-%m-%d').date()
            else:
                user.admission_date = None
        except ValueError:
            pass # Ignore invalid date format for now or raise error
            
    if 'status' in user_data:
        # Validate status
        valid_statuses = ['active', 'suspended', 'deceased', 'graduated', 'notice']
        if user_data['status'] in valid_statuses:
            user.status = user_data['status']
            
    if 'expiry_date' in user_data:
        try:
            if user_data['expiry_date']:
                user.expiry_date = datetime.strptime(user_data['expiry_date'], '%Y-%m-%d').date()
            else:
                user.expiry_date = None
        except ValueError:
            pass
            
    if 'guardian_id' in user_data:
        if user_data['guardian_id']:
            try:
                user.guardian_id = UUID(str(user_data['guardian_id']))
            except ValueError:
                pass # Ignore invalid UUID
        else:
            user.guardian_id = None
            
    if 'profile_image' in user_data and user_data['profile_image']:
         user.profile_image = user_data['profile_image']
    
    await session.commit()
    await session.refresh(user)
    
    return {"message": "User updated successfully", "user": user}

@router.post("/{user_id}/reset-password")
async def reset_user_password(
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
