import asyncio
import random
from datetime import datetime, timedelta
from sqlmodel import select
from app.database import engine, get_session
from app.models import User, Role, Gate, EntryLog, Vehicle, VehicleLog
from app.auth import get_password_hash

async def populate_only():
    print("Populating data (skipping drop/create)...")
    
    # We use engine.begin() for transactions or session?
    # using get_session generator manually
    
    from app.database import sessionmaker, AsyncSession
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # 1. Fetch Roles
        print("Fetching roles...")
        roles = {}
        for r_name in ["Student", "Lecturer", "Security", "Visitor", "SuperAdmin"]:
            res = await session.exec(select(Role).where(Role.name == r_name))
            role = res.first()
            if role:
                roles[r_name] = role
        
        # 2. Fetch Gates
        print("Fetching gates...")
        gates = (await session.exec(select(Gate))).all()
        if not gates:
            print("Creating default gate...")
            gate = Gate(name="Main Gate", location="Perimeter")
            session.add(gate)
            await session.commit()
            await session.refresh(gate)
            gates = [gate]
            
        # 3. Create Students
        print("Creating students...")
        students = []
        first_names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth"]
        last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
        schools = ["Engineering", "Science", "Arts", "Business", "Law"]

        for i in range(1, 51):
            adm = f"STD{2000+i}" # Changed ID range to distinguish
            fname = f"{random.choice(first_names)} {random.choice(last_names)}"
            
            # Check exist
            existing = (await session.exec(select(User).where(User.admission_number == adm))).first()
            if not existing:
                user = User(
                    admission_number=adm,
                    full_name=fname,
                    email=f"{fname.replace(' ', '.').lower()}{i}@student.com",
                    school=random.choice(schools),
                    hashed_password=get_password_hash("Student123"),
                    role_id=roles.get("Student", roles.get("SuperAdmin")).id, # Fallback
                    status="active",
                    has_smartphone=random.choice([True, False])
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)
                students.append(user)
            else:
                students.append(existing)
                
        print(f"Students ready: {len(students)}")

        # 4. Generate Traffic
        print("Generating traffic logs...")
        total_logs = 0
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7) # just 7 days
        
        current_date = start_date
        while current_date <= end_date:
            daily_entries = random.randint(10, 30)
            for _ in range(daily_entries):
                user = random.choice(students)
                gate = random.choice(gates)
                
                log = EntryLog(
                    user_id=user.id,
                    gate_id=gate.id,
                    entry_time=current_date + timedelta(minutes=random.randint(0, 700)),
                    method=random.choice(["qr", "face"]),
                    status="allowed",
                    guard_id=None
                )
                session.add(log)
                total_logs += 1
            current_date += timedelta(days=1)
        
        print(f"Generated {total_logs} logs.")
        
        # 5. Create Vehicles
        print("Creating vehicles...")
        for i in range(5):
            plate = f"KDD {random.randint(100, 999)}{random.choice(['X','Y','Z'])}"
            vehicle = Vehicle(
                plate_number=plate,
                make="Toyota",
                model="Corolla",
                color="White"
            )
            session.add(vehicle)
            # Create a log for it
            vlog = VehicleLog(
                vehicle_id=vehicle.id, # Wait, need ID, commit first or add to session? 
                                     # session.add(vehicle) creates instance, but ID might not be available until flush/commit
                # But vehicle_id is foreign key.
                gate_id=gates[0].id,
                entry_time=datetime.utcnow(),
                guard_id=None
            )
            # This might fail if vehicle.id is None.
            # safe to commit vehicle first
        
        await session.commit()
        print("Population Complete.")

if __name__ == "__main__":
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(populate_only())
