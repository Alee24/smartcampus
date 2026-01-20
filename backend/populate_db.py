import asyncio
import random
import traceback
from datetime import datetime, timedelta
from sqlmodel import select, SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models import User, Role, Gate, EntryLog, Vehicle, VehicleLog
from app.auth import get_password_hash

async def populate():
    print("Resetting database...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.drop_all)
            await conn.run_sync(SQLModel.metadata.create_all)
        
        print("Populating database with real data...")
        
        async_session_factory = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async with async_session_factory() as session:
            # 1. Ensure Roles exist
            roles = {}
            for r_name in ["Student", "Lecturer", "Security", "Visitor"]:
                res = await session.exec(select(Role).where(Role.name == r_name))
                role = res.first()
                if not role:
                    role = Role(name=r_name)
                    session.add(role)
                    await session.commit()
                    await session.refresh(role)
                roles[r_name] = role
            # 1.5 Create Specific Test Users
            # SuperAdmin
            admin_role = await session.exec(select(Role).where(Role.name == "SuperAdmin"))
            admin_role = admin_role.first()
            if not admin_role:
                admin_role = Role(name="SuperAdmin", description="System Administrator")
                session.add(admin_role)
                await session.commit()
                await session.refresh(admin_role)
                
            admin_user = User(
                admission_number="ADMIN001",
                full_name="Admin User",
                email="mettoalex@gmail.com",
                hashed_password=get_password_hash("Digital2025"),
                role_id=admin_role.id,
                school="Administration",
                status="active",
                expiry_date=datetime.utcnow().date() + timedelta(days=3650) # 10 Years
            )
            session.add(admin_user)
            
            # Test Lecturer
            lec = User(
                admission_number="LEC001", 
                full_name="Dr. Jane Smith", 
                email="lecturer@test.com", 
                hashed_password=get_password_hash("Pass123!"),
                role_id=roles["Lecturer"].id,
                school="Science",
                status="active"
            )
            session.add(lec)
            
            # Test Guard
            guard = User(
                admission_number="SEC001",
                full_name="Officer Bob Jones",
                email="guard@test.com",
                hashed_password=get_password_hash("Pass123!"),
                role_id=roles["Security"].id,
                school="Security",
                status="active"
            )
            session.add(guard)
            
            # Alice Student
            alice = User(
                admission_number="STD001",
                full_name="Alice Student",
                email="student@test.com",
                hashed_password=get_password_hash("Student123"),
                role_id=roles["Student"].id,
                school="Engineering",
                status="active",
                expiry_date=datetime.utcnow().date() + timedelta(days=365)
            )
            session.add(alice)

            await session.commit()
            print("Created Admin, Lecturer, Guard, and Alice accounts.")

            # 2. Create Gates
            gates = []
            for g_name in ["Main Gate", "Back Gate", "Side Walk"]:
                res = await session.exec(select(Gate).where(Gate.name == g_name))
                gate = res.first()
                if not gate:
                    gate = Gate(name=g_name, location="Campus Perimeter")
                    session.add(gate)
                    await session.commit()
                    await session.refresh(gate)
                gates.append(gate)

            # 3. Create 50 Students - DISABLED as per request
            students = []
            # first_names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth"]
            # last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
            # schools = ["Engineering", "Science", "Arts", "Business", "Law"]

            # for i in range(1, 51):
            #     adm = f"STD{1000+i}"
            #     res = await session.exec(select(User).where(User.admission_number == adm))
            #     existing = res.first()
            #     if not existing:
            #         fname = f"{random.choice(first_names)} {random.choice(last_names)}"
            #         user = User(
            #             admission_number=adm,
            #             full_name=fname,
            #             email=f"{fname.replace(' ', '.').lower()}{i}@student.com",
            #             school=random.choice(schools),
            #             hashed_password=get_password_hash("Student123"),
            #             role_id=roles["Student"].id,
            #             status="active",
            #             has_smartphone=random.choice([True, False])
            #         )
            #         session.add(user)
            #         await session.commit()
            #         await session.refresh(user)
            #         students.append(user)
            #     else:
            #         students.append(existing)
            
            # print(f"Ensured {len(students)} students.")

            # 4. Generate Traffic
            if len(students) > 0:
                print("Generating logs (this may take a moment)...")
                end_date = datetime.now()
                start_date = end_date - timedelta(days=30)
                
                current_date = start_date
                total_logs = 0
                
                while current_date <= end_date:
                    is_weekend = current_date.weekday() >= 5
                    daily_entries = random.randint(20, 50) if is_weekend else random.randint(100, 200)
                    
                    for _ in range(daily_entries):
                        hour = random.randint(6, 20)
                        minute = random.randint(0, 59)
                        entry_time = current_date.replace(hour=hour, minute=minute)
                        
                        user = random.choice(students)
                        gate = random.choice(gates)
                        status = "allowed"
                        if random.random() < 0.05:
                            status = "rejected"
                        
                        log = EntryLog(
                            user_id=user.id,
                            gate_id=gate.id,
                            entry_time=entry_time,
                            method=random.choice(["qr", "face", "manual"]),
                            status=status,
                            guard_id=None # Explicitly set None
                        )
                        session.add(log)
                        total_logs += 1
                    
                    current_date += timedelta(days=1)
                    
                print(f"Generated {total_logs} entry logs.")
            
            # 5. Create Vehicles
            print("Generating vehicles...")
            for i in range(10):
                plate = f"KCA {random.randint(100, 999)}{random.choice(['A','B','C'])}"
                res = await session.exec(select(Vehicle).where(Vehicle.plate_number == plate))
                existing = res.first()
                if not existing:
                    vehicle = Vehicle(
                        plate_number=plate,
                        make=random.choice(["Toyota", "Nissan", "Mazda", "Subaru"]),
                        model=random.choice(["Vitz", "Note", "Demio", "Impreza"]),
                        color=random.choice(["White", "Silver", "Black", "Blue"])
                    )
                    session.add(vehicle)
                    await session.commit()
                    await session.refresh(vehicle) # Ensure we have ID
                    
                    # Make a mock log
                    if random.random() > 0.5:
                        vlog = VehicleLog(
                            vehicle_id=vehicle.id,
                            gate_id=gates[0].id,
                            entry_time=datetime.utcnow() - timedelta(hours=random.randint(1, 4)),
                            guard_id=None
                        )
                        session.add(vlog)
                        
            await session.commit()
            print("Done populating!")
            
    except Exception:
        print("Detailed Error Occurred:")
        traceback.print_exc()
    
    finally:
        await engine.dispose()

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(populate())
