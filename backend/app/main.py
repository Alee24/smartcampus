from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles # Import StaticFiles
from app.database import init_db, get_session
from app.models import * 
from app.auth import create_access_token, get_password_hash, verify_password, verify_ldap_login, verify_google_token, get_current_user
from app.routers import dashboard, users, gate_control, attendance, admin
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from contextlib import asynccontextmanager
import os
import asyncio
import sys

# Set Windows event loop policy for compatibility with aiomysql/asyncio on Windows
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Create static directory if not exists
os.makedirs("static/profiles", exist_ok=True)

# Seed Data
async def seed_data():
    async for session in get_session():
        # Check Role
        role_stmt = select(Role).where(Role.name == "SuperAdmin")
        existing_role = (await session.exec(role_stmt)).first()
        
        if not existing_role:
            admin_role = Role(name="SuperAdmin", description="System Administrator")
            session.add(admin_role)
            await session.commit()
            await session.refresh(admin_role)
            role_id = admin_role.id
        else:
            role_id = existing_role.id
            
        # Check User
        user_stmt = select(User).where(User.email == "mettoalex@gmail.com")
        existing_user = (await session.exec(user_stmt)).first()
        
        if not existing_user:
            hashed = get_password_hash("Digital2025")
            new_user = User(
                admission_number="ADMIN001",
                full_name="Alex Metto",
                school="Administration",
                email="mettoalex@gmail.com",
                hashed_password=hashed,
                role_id=role_id,
                status="active",
                has_smartphone=True
            )
            session.add(new_user)
            await session.commit()
            print("Seeded SuperAdmin user.")

        # Check Gate
        gate_stmt = select(Gate).where(Gate.name == "Main Gate")
        existing_gate = (await session.exec(gate_stmt)).first()
        
        if not existing_gate:
            main_gate = Gate(name="Main Gate", location="Main Entrance")
            session.add(main_gate)
            await session.commit()
            print("Seeded Main Gate.")

        # --- Seed Sample Users for Testing ---
        # 1. Lecturer
        lecturer_role = (await session.exec(select(Role).where(Role.name == "Lecturer"))).first()
        if not lecturer_role:
            lecturer_role = Role(name="Lecturer", description="Academic Staff")
            session.add(lecturer_role)
            await session.commit()
            await session.refresh(lecturer_role)
        
        lec_user = (await session.exec(select(User).where(User.email == "lecturer@test.com"))).first()
        if not lec_user:
            lec_user = User(
                admission_number="LEC001",
                full_name="Dr. Jane Smith",
                email="lecturer@test.com",
                hashed_password=get_password_hash("Pass123!"),
                role_id=lecturer_role.id,
                school="Science",
                status="active"
            )
            session.add(lec_user)
            print("Seeded Lecturer: lecturer@test.com / Pass123!")

        # 2. Security Guard
        guard_role = (await session.exec(select(Role).where(Role.name == "Security"))).first()
        if not guard_role:
            guard_role = Role(name="Security", description="Gate & Patrol")
            session.add(guard_role)
            await session.commit()
            await session.refresh(guard_role)

        guard_user = (await session.exec(select(User).where(User.email == "guard@test.com"))).first()
        if not guard_user:
            guard_user = User(
                admission_number="SEC001",
                full_name="Officer Bob Jones",
                email="guard@test.com",
                hashed_password=get_password_hash("Pass123!"),
                role_id=guard_role.id,
                school="Security Dept",
                status="active"
            )
            session.add(guard_user)
            print("Seeded Guard: guard@test.com")

        # 3. Guardian (Parent)
        guardian_role = (await session.exec(select(Role).where(Role.name == "Guardian"))).first()
        if not guardian_role:
            guardian_role = Role(name="Guardian", description="Parent or Guardian")
            session.add(guardian_role)
            await session.commit()
            await session.refresh(guardian_role)

        guardian_user = (await session.exec(select(User).where(User.email == "parent@test.com"))).first()
        if not guardian_user:
            guardian_user = User(
                admission_number="PAR001", # Internal ID for parent
                full_name="Parent Smith",
                first_name="Parent", 
                last_name="Smith",
                phone_number="+254700000000",
                email="parent@test.com",
                hashed_password=get_password_hash("Parent123!"),
                role_id=guardian_role.id,
                school="N/A",
                status="active"
            )
            session.add(guardian_user)
            await session.commit()
            await session.refresh(guardian_user)
            print("Seeded Guardian: parent@test.com / Parent123!")

            # Link a student to this guardian (Optional, if student exists)
            # Find a student (e.g., student from bulk upload or create one)
            # For now, let's update our simulated student if we had one, or created one.

            print("Seeded Guard: guard@test.com / Pass123!")

        # 3. Student
        student_role = (await session.exec(select(Role).where(Role.name == "Student"))).first()
        if not student_role:
            student_role = Role(name="Student", description="Regular Student")
            session.add(student_role)
            await session.commit()
            await session.refresh(student_role)

        stud_user = (await session.exec(select(User).where(User.admission_number == "STD001"))).first()
        if not stud_user:
            stud_user = User(
                admission_number="STD001",
                full_name="Alice Student",
                email="student@test.com",
                hashed_password=get_password_hash("Pass123!"),
                role_id=student_role.id,
                school="Engineering",
                status="active"
            )
            session.add(stud_user)
            print("Seeded Student: STD001 / Pass123!")
        
        # 4. Sample Classrooms for QR Code Generation
        sample_rooms = [
            {"room_code": "LH1", "room_name": "Lecture Hall 1", "building": "Main Building", "floor": "Ground Floor", "capacity": 150},
            {"room_code": "LH2", "room_name": "Lecture Hall 2", "building": "Main Building", "floor": "First Floor", "capacity": 120},
            {"room_code": "LAB1", "room_name": "Computer Lab 1", "building": "ICT Block", "floor": "Ground Floor", "capacity": 40},
            {"room_code": "LAB2", "room_name": "Science Lab", "building": "Science Block", "floor": "Second Floor", "capacity": 30},
            {"room_code": "ROOM101", "room_name": "Tutorial Room 101", "building": "Academic Block", "floor": "First Floor", "capacity": 25}
        ]
        
        for room_data in sample_rooms:
            existing_room = (await session.exec(select(Classroom).where(Classroom.room_code == room_data["room_code"]))).first()
            if not existing_room:
                new_room = Classroom(**room_data)
                session.add(new_room)
        
        print("Seeded sample classrooms for QR generation.")
        
        await session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    # Basic Seeder
    await seed_data()
    
    # Start Scheduler
    try:
        from app.scheduler import start_scheduler
        start_scheduler()
    except Exception as e:
        print(f"Scheduler failed to start: {e}")
        
    yield
    # Shutdown
    from app.scheduler import scheduler
    try:
        if scheduler.running:
             scheduler.shutdown()
    except:
        pass

app = FastAPI(title="Smart Campus System", version="1.0.0", lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files
os.makedirs("uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/api/debug/reset-admin")
async def emergency_reset(session: AsyncSession = Depends(get_session)):
    user = (await session.exec(select(User).where(User.email == "mettoalex@gmail.com"))).first()
    if not user:
        return {"status": "error", "message": "Admin user mettoalex@gmail.com not found"}
    
    user.hashed_password = get_password_hash("Digital2025")
    user.status = "active"
    session.add(user)
    await session.commit()
    return {"status": "success", "message": "Password reset to Digital2025"}

# Auth Endpoint
@app.post("/api/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_session)):
    print(f"Login Attempt: {form_data.username}")
    
    # Query with eager loading of role relationship
    query = select(User).where(
        (User.email == form_data.username) | (User.admission_number == form_data.username)
    ).options(selectinload(User.role))
    
    result = await session.exec(query)
    user = result.first()
    
    if not user:
        print("Login Failed: User not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    is_valid = verify_password(form_data.password, user.hashed_password)
    print(f"User Found: {user.email}, Password Valid: {is_valid}")
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email or user.admission_number})
    
    # Get role name - fetch from database if not loaded
    role_name = "student"  # Default
    if user.role:
        role_name = user.role.name
    else:
        # Fallback: fetch role separately if not loaded
        role_query = select(Role).where(Role.id == user.role_id)
        role_result = await session.exec(role_query)
        role = role_result.first()
        if role:
            role_name = role.name
    
    print(f"User role: {role_name}")
    
    # Return user info including role
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "admission_number": user.admission_number,
            "role": role_name,
            "profile_image": user.profile_image
        }
    }

@app.post("/api/auth/register")
async def register(
    user_data: dict, 
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Register a new user (Admin function via AddUserModal).
    Supports new fields: guardian_id, expiry_date, etc.
    SECURED: Only SuperAdmin can create users.
    """
    # 0. Check Permissions
    # Fetch role name
    admin_role = await session.get(Role, current_user.role_id)
    if not admin_role or admin_role.name != "SuperAdmin":
        raise HTTPException(status_code=403, detail="Not authorized to create users")

    # 1. Validation
    if not user_data.get('admission_number') or not user_data.get('password'):
        raise HTTPException(status_code=400, detail="Admission Number and Password are required")

    q = select(User).where((User.email == user_data.get('email')) | (User.admission_number == user_data['admission_number']))
    # Note: query by email only if email provided
    if user_data.get('email'):
         q = select(User).where((User.email == user_data['email']) | (User.admission_number == user_data['admission_number']))
    else:
         q = select(User).where(User.admission_number == user_data['admission_number'])
         
    if (await session.exec(q)).first():
        raise HTTPException(status_code=400, detail="User with this Admission Number or Email already exists")
    
    # 2. Get Role
    role_id = None
    if 'role_id' in user_data and user_data['role_id']:
        role_id = user_data['role_id']
    elif 'role_name' in user_data and user_data['role_name']:
        role = (await session.exec(select(Role).where(Role.name == user_data['role_name']))).first()
        if role: role_id = role.id
    
    if not role_id:
        # Default to Student
        role = (await session.exec(select(Role).where(Role.name == "Student"))).first()
        if not role: 
             # Auto-create role if missing
             role = Role(name="Student", description="Student Role")
             session.add(role); await session.commit(); await session.refresh(role)
        role_id = role.id

    # 3. Create User
    hashed = get_password_hash(user_data['password'])
    
    # Handle conversions
    from uuid import UUID
    guardian_id = None
    if user_data.get('guardian_id'):
        try: guardian_id = UUID(str(user_data['guardian_id']))
        except: pass
        
    from datetime import datetime
    expiry_date = None
    if user_data.get('expiry_date'):
        try: expiry_date = datetime.strptime(user_data['expiry_date'], '%Y-%m-%d').date()
        except: pass
        
    admission_date = datetime.utcnow().date()
    if user_data.get('admission_date'):
        try: admission_date = datetime.strptime(user_data['admission_date'], '%Y-%m-%d').date()
        except: pass

    full_name_str = user_data.get('full_name')
    if not full_name_str:
        full_name_str = f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip()
    if not full_name_str: full_name_str = "Unknown"

    new_user = User(
        admission_number=user_data['admission_number'],
        first_name=user_data.get('first_name'),
        last_name=user_data.get('last_name'),
        full_name=full_name_str,
        email=user_data.get('email') or None, # Ensure empty string becomes None
        school=user_data.get('school', 'General'),
        phone_number=user_data.get('phone_number'),
        hashed_password=hashed,
        role_id=role_id,
        status=user_data.get('status', 'active'),
        guardian_id=guardian_id,
        expiry_date=expiry_date,
        admission_date=admission_date,
        has_smartphone=user_data.get('has_smartphone', False)
    )

    session.add(new_user)
    try:
        await session.commit()
        await session.refresh(new_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Creation Error: {str(e)}")
    
    return new_user

class SSOLoginRequest(BaseModel):
    token: str # For Google ID Token

class LDAPLoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/google")
async def google_login(req: SSOLoginRequest, session: AsyncSession = Depends(get_session)):
    user_info = await verify_google_token(req.token, session)
    if not user_info:
        raise HTTPException(status_code=400, detail="Invalid Google Token")
    
    email = user_info['email']
    user = (await session.exec(select(User).where(User.email == email))).first()

    if not user:
        # Auto-provision or reject? For now reject if not in system
        # raise HTTPException(status_code=400, detail="User not found in system")
        # Let's auto-provision as Student if not exists?
        # For security, best to check if email exists.
         raise HTTPException(status_code=400, detail=f"User {email} not registered in Smart Campus")

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/ldap")
async def ldap_login(req: LDAPLoginRequest, session: AsyncSession = Depends(get_session)):
    ldap_user = await verify_ldap_login(req.username, req.password, session)
    if not ldap_user:
        raise HTTPException(status_code=400, detail="Invalid LDAP Credentials")
    
    # Check if local user exists via email or admission no (username)
    email = ldap_user.get("email")
    stmt = select(User).where((User.email == email) | (User.admission_number == req.username))
    user = (await session.exec(stmt)).first()
    
    if not user:
         # Optionally auto-create user based on LDAP info
         raise HTTPException(status_code=400, detail="LDAP User not mapped to local account")

    access_token = create_access_token(data={"sub": user.email or user.admission_number})
    return {"access_token": access_token, "token_type": "bearer"}

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(gate_control.router, prefix="/api/gate", tags=["gate"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

# Import and include notifications router
from app.routers import notifications
app.include_router(notifications.router, prefix="/api", tags=["notifications"])

# Import and include timetable router
from app.routers import timetable
app.include_router(timetable.router, prefix="/api/timetable", tags=["timetable"])

# Import and include camera router
from app.routers import cameras
app.include_router(cameras.router, prefix="/api/cameras", tags=["cameras"])

# Import and include AI router
from app.routers import ai
app.include_router(ai.router, prefix="/api/admin", tags=["ai"])

# Import and include events router
from app.routers import events
app.include_router(events.router)

# Import and include reports router
from app.routers import reports
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

@app.get("/")
async def root():
    return {"message": "Smart Campus System API verified running"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "environment": "production-ready"}
