from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles # Import StaticFiles
from app.database import init_db, get_session
from app.models import * 
from app.auth import create_access_token, get_password_hash, verify_password, verify_ldap_login, verify_google_token, get_current_user
from app.utils.audit import log_action
from app.routers import dashboard, users, gate_control, attendance, admin, external_sync
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
async def seed_data(session: AsyncSession):
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
        
    # Check Primary User (mettoalex@gmail.com)
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
        print("Seeded SuperAdmin user: mettoalex@gmail.com")

    # Check SmartCampus Admin User (Requested: smartcampus@kkdes.co.ke)
    sc_stmt = select(User).where(User.email == "smartcampus@kkdes.co.ke")
    sc_user = (await session.exec(sc_stmt)).first()
    
    if not sc_user:
        hashed_sc = get_password_hash("smartcampus")
        new_sc = User(
            admission_number="ADMIN002",
            full_name="Smart Campus Admin",
            school="Administration",
            email="smartcampus@kkdes.co.ke",
            hashed_password=hashed_sc,
            role_id=role_id,
            status="active",
            has_smartphone=True
        )
        session.add(new_sc)
        await session.commit()
        print("Seeded Admin user: smartcampus@kkdes.co.ke")

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
    
    lec_user = (await session.exec(select(User).where((User.admission_number == "LEC001") | (User.email == "lecturer@test.com")))).first()
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

    guard_user = (await session.exec(select(User).where((User.email == "guard@test.com") | (User.admission_number == "SEC001")))).first()
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

    # 2b. Official Security Admin (Requested)
    official_security = (await session.exec(select(User).where(User.email == "security@ru.ac.ke"))).first()
    if not official_security:
        official_security = User(
            admission_number="SEC-ADMIN-01",
            full_name="Security Operations Center",
            email="security@ru.ac.ke",
            hashed_password=get_password_hash("Security@2050"),
            role_id=guard_role.id,
            school="Security Dept",
            status="active"
        )
        session.add(official_security)
        await session.commit()
        print("Seeded Official Security: security@ru.ac.ke / Security@2050")

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

    # 3. Student
    student_role = (await session.exec(select(Role).where(Role.name == "Student"))).first()
    if not student_role:
        student_role = Role(name="Student", description="Regular Student")
        session.add(student_role)
        await session.commit()
        await session.refresh(student_role)

    # 4. Fleet Manager
    fleet_manager_role = (await session.exec(select(Role).where(Role.name == "FleetManager"))).first()
    if not fleet_manager_role:
        fleet_manager_role = Role(name="FleetManager", description="Fleet Operations Manager")
        session.add(fleet_manager_role)
        await session.commit()
        await session.refresh(fleet_manager_role)

    # 5. Driver
    driver_role = (await session.exec(select(Role).where(Role.name == "Driver"))).first()
    if not driver_role:
        driver_role = Role(name="Driver", description="Vehicle Driver")
        session.add(driver_role)
        await session.commit()
        await session.refresh(driver_role)

    stud_user = (await session.exec(select(User).where((User.admission_number == "STD001") | (User.email == "student@test.com")))).first()
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

    # Seed Company Settings
    import json
    settings_stmt = select(SystemConfig).where(SystemConfig.key == "company_settings")
    existing_settings = (await session.exec(settings_stmt)).first()
    
    settings_value = json.dumps({
        "company_name": "Riara University",
        "tagline": "Excellence in Education",
        "email": "info@riarauniversity.ac.ke",
        "phone": "+254 700 000 000",
        "whatsapp": "+254 700 000 000",
        "website": "https://riarauniversity.ac.ke",
        "address": "Limuru Road, Nairobi, Kenya",
        "facebook": "",
        "twitter": "",
        "instagram": "",
        "linkedin": "",
        "youtube": "",
        "logo_url": "/static/university_logo.png"
    })
    
    if not existing_settings:
        new_settings = SystemConfig(
            key="company_settings",
            value=settings_value,
            category="general"
        )
        session.add(new_settings)
        print("Seeded Company Settings.")
    else:
        print("Company Settings already present. Skipping seeding to prevent overwriting user changes.")

    await session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - Retry logic for DB connection
    max_retries = 10
    retry_delay = 5
    db_ok = False
    for i in range(max_retries):
        try:
            print(f"Initializing database (Attempt {i+1}/{max_retries})...")
            await init_db()
            print("Database initialized successfully.")
            db_ok = True
            break
        except Exception as e:
            print(f"Database initialization failed: {e}")
            if i < max_retries - 1:
                await asyncio.sleep(retry_delay)
    
    if db_ok:
        try:
            from app.database import get_session
            async for session in get_session():
                await seed_data(session)
                break
        except Exception as e:
            print(f"Seed data failed: {e}")
    
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

import ipaddress

async def is_ip_allowed(ip_address: str, session: AsyncSession) -> bool:
    """Check if an IP address is allowed based on geofence settings."""
    # 1. Check if geofencing is enabled (global toggle)
    stmt = select(SystemConfig).where(SystemConfig.key == "enable_geofencing")
    config = (await session.exec(stmt)).first()
    if not config or config.value.lower() != "true":
        return True # Geofencing disabled
        
    # 2. Get active geofence settings
    stmt = select(GeofenceSetting).where(GeofenceSetting.is_active == True)
    settings = (await session.exec(stmt)).all()
    
    if not settings:
        # If enabled but no rules, we block all for security (Whitelist mode)
        return False 

    try:
        user_ip = ipaddress.ip_address(ip_address)
    except ValueError:
        return False # Invalid IP
        
    for setting in settings:
        # Range can be "192.168.1.0/24" or "192.168.1.1, 192.168.1.2"
        ranges = [r.strip() for r in setting.ip_range.split(",")]
        for r in ranges:
            try:
                if "/" in r:
                    if user_ip in ipaddress.ip_network(r):
                        return True
                else:
                    if user_ip == ipaddress.ip_address(r):
                        return True
            except:
                continue
                
    return False

# Auth Endpoint
from fastapi import Request
@app.post("/api/token")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_session)):
    try:
        # --- Geofence Check ---
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
            
        allowed = await is_ip_allowed(client_ip, session)
        if not allowed:
            print(f"Login Blocked: IP {client_ip} not in geofence whitelist.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Your IP address ({client_ip}) is not authorized to access this system. Please connect to the University Wi-Fi.",
            )
        # ----------------------

        print(f"Login Attempt (LDAP First): {form_data.username}")
        
        # 1. Attempt LDAP verification first
        ldap_user = None
        try:
            ldap_user = await verify_ldap_login(form_data.username, form_data.password, session)
        except Exception as e:
            print(f"LDAP login check error: {e}")
            
        user = None
        
        if ldap_user:
            print(f"LDAP Login Success for {form_data.username}")
            ldap_email = ldap_user.get("email")
            ldap_cn = ldap_user.get("name")
            
            # Check if local user exists via email or admission_number
            query = select(User).where(
                (User.email == ldap_email) | (User.admission_number == form_data.username)
            ).options(selectinload(User.role))
            result = await session.exec(query)
            user = result.first()
            
            if not user:
                print(f"Local user not found for LDAP login. Auto-provisioning {form_data.username}...")
                
                # Fetch detailed attributes if possible using LDAPClient
                from app.utils.ldap import LDAPClient
                configs = (await session.exec(select(SystemConfig))).all()
                config_dict = {c.key: c.value for c in configs}
                uri = config_dict.get('ldap_server_uri')
                bind_dn = config_dict.get('ldap_bind_dn')
                bind_password = config_dict.get('ldap_bind_password')
                base_dn = config_dict.get('ldap_base_dn')
                
                ldap_details = None
                if uri and base_dn:
                    try:
                        ldap_client = LDAPClient(uri, bind_dn if bind_dn else "", bind_password if bind_password else "", base_dn)
                        ldap_details = ldap_client.get_user_by_id(form_data.username)
                    except Exception as client_err:
                        print(f"Could not fetch full LDAP details: {client_err}")
                
                full_name = ldap_details.get("full_name") if ldap_details else ldap_cn or form_data.username
                email = ldap_details.get("email") if ldap_details else ldap_email or f"{form_data.username}@university.ac.ke"
                school = ldap_details.get("school") if ldap_details else "General"
                program = ldap_details.get("program") if ldap_details else None
                phone_number = ldap_details.get("phone_number") if ldap_details else None
                
                # Fetch default Student role
                role_stmt = select(Role).where(Role.name == "Student")
                role = (await session.exec(role_stmt)).first()
                if not role:
                    role = Role(name="Student", description="Regular Student")
                    session.add(role)
                    await session.commit()
                    await session.refresh(role)
                
                user = User(
                    admission_number=form_data.username,
                    full_name=full_name,
                    email=email,
                    school=school,
                    program=program,
                    phone_number=phone_number,
                    role_id=role.id,
                    status="active",
                    hashed_password="LDAP_MANAGED"
                )
                session.add(user)
                await session.commit()
                
                # Re-query user to get eager relationships
                query = select(User).where(User.id == user.id).options(selectinload(User.role))
                result = await session.exec(query)
                user = result.first()
                print(f"Auto-provisioned local user {user.full_name}")
        else:
            # 2. LDAP verification failed or wasn't configured: fallback to local database authentication
            print(f"LDAP auth failed or not configured for {form_data.username}. Falling back to local DB auth.")
            query = select(User).where(
                (User.email == form_data.username) | (User.admission_number == form_data.username)
            ).options(selectinload(User.role))
            
            result = await session.exec(query)
            user = result.first()
            
            if not user:
                print(f"Login Failed: User {form_data.username} not found locally or via LDAP")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect username or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
                
            is_valid = verify_password(form_data.password, user.hashed_password)
            
            if not is_valid:
                print(f"Login Failed: Password incorrect locally for {form_data.username}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect username or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        
        # Get role name
        role_name = user.role.name if user.role else "student"
        
        # Create token
        access_token = create_access_token(data={"sub": user.email or user.admission_number})
        
        # Log the successful login
        try:
            await log_action(
                session=session,
                action_type="login",
                user=user,
                description=f"User {user.full_name} logged in from {role_name} panel",
                new_values={"role": role_name},
                request=request
            )
        except Exception as log_err:
            print(f"Non-critical error logging login: {log_err}")

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
    except HTTPException:
        raise
    except Exception as e:
        print(f"CRITICAL LOGIN ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.post("/api/auth/register")
async def register(
    request: Request,
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
        
        # Log the creation
        await log_action(
            session=session,
            action_type="create",
            user=current_user,
            table_name="users",
            record_id=str(new_user.id),
            description=f"Created new user {new_user.full_name} ({new_user.admission_number})",
            new_values=user_data,
            request=request
        )
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
    
    await log_action(
        session=session,
        action_type="login_google",
        user=user,
        description=f"User {user.full_name} logged in via Google SSO",
        request=request
    )
    
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
    
    await log_action(
        session=session,
        action_type="login_ldap",
        user=user,
        description=f"User {user.full_name} logged in via LDAP",
        request=request
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(gate_control.router, prefix="/api/gate", tags=["gate"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

# Import and include fleet router
from app.routers import fleet
app.include_router(fleet.router, prefix="/api/fleet", tags=["fleet"])

# Import and include notifications router
from app.routers import notifications
app.include_router(notifications.router, prefix="/api", tags=["notifications"])

# Import and include timetable router
from app.routers import timetable
app.include_router(timetable.router, prefix="/api/timetable", tags=["timetable"])



# Import and include events router
from app.routers import events
app.include_router(events.router)

# Import and include reports router
from app.routers import reports
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

# Import and include audit router
from app.routers import audit
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(external_sync.router, prefix="/api/external-sync", tags=["external_sync"])

@app.get("/")
async def root():
    return {"message": "Smart Campus System API verified running"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "environment": "production-ready"}

# --- Demo Mode Endpoints ---

@app.get("/api/public/config")
async def get_public_config(session: AsyncSession = Depends(get_session)):
    """
    Publicly accessible configuration (e.g., for Login page).
    """
    stmt = select(SystemConfig).where(SystemConfig.key == "demo_mode")
    config = (await session.exec(stmt)).first()
    
    is_demo = False
    if config and config.value.lower() == "true":
        is_demo = True
        
    return {
        "demo_mode": is_demo,
        "system_name": "Smart Campus"
    }

class DemoLoginRequest(BaseModel):
    role: str # admin, lecturer, security, student, guardian

@app.post("/api/auth/demo-login")
async def demo_login(req: DemoLoginRequest, request: Request, session: AsyncSession = Depends(get_session)):
    """
    Passwordless login for Demo Mode.
    ONLY works if 'demo_mode' system config is set to 'true'.
    """
    # 1. Check if Demo Mode is enabled
    stmt = select(SystemConfig).where(SystemConfig.key == "demo_mode")
    config = (await session.exec(stmt)).first()
    
    if not config or config.value.lower() != "true":
        raise HTTPException(status_code=403, detail="Demo mode is not enabled")
    
    # 2. Select Target User based on Role
    email_map = {
        "admin": "smartcampus@kkdes.co.ke",
        "lecturer": "lecturer@test.com",
        "security": "guard@test.com",
        "student": "student@test.com",
        "guardian": "parent@test.com"
    }
    
    target_email = email_map.get(req.role)
    if not target_email:
        raise HTTPException(status_code=400, detail="Invalid demo role")
        
    # 3. Find User
    user = (await session.exec(select(User).where(User.email == target_email))).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Demo user for {req.role} not found (Seed data missing?)")

    # 4. Generate Token (Bypass password check)
    access_token = create_access_token(data={"sub": user.email or user.admission_number})
    
    # Get role name
    role_name = "student"
    role = await session.get(Role, user.role_id)
    if role:
        role_name = role.name
    
    await log_action(
        session=session,
        action_type="login_demo",
        user=user,
        description=f"User {user.full_name} logged in via Demo Mode ({req.role})",
        request=request
    )
    
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
