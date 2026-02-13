from sqlmodel import Session, select, create_engine
from app.models import User, Role, Gate, EntryLog, Vehicle, VehicleLog
from app.auth import get_password_hash
import random
from datetime import datetime, timedelta
import sys
import os
sys.path.append(os.getcwd())

def populate_sync():
    print("Populating DB (Sync)...")
    db_url = "mysql+pymysql://root:@127.0.0.1:3306/gatepass_db"
    engine = create_engine(db_url)
    
    with Session(engine) as session:
        # 1. Roles
        roles = {}
        for r_name in ["Student", "Lecturer", "Security", "Visitor", "SuperAdmin", "admin"]:
             # Check exist
             res = session.exec(select(Role).where(Role.name == r_name)).first()
             if not res:
                 role = Role(name=r_name)
                 session.add(role)
                 session.commit()
                 session.refresh(role)
                 roles[r_name] = role
             else:
                 roles[r_name] = res

        # 2. Admin User
        admin_role = roles.get("admin") or roles.get("SuperAdmin")
        res = session.exec(select(User).where(User.email == "mettoalex@gmail.com")).first()
        if not res:
             admin = User(
                 admission_number="ADMIN001",
                 full_name="Admin User",
                 email="mettoalex@gmail.com",
                 hashed_password=get_password_hash("Digital2025"),
                 role_id=admin_role.id,
                 school="Admin",
                 status="active"
             )
             session.add(admin)
             session.commit()
             print("Admin Created.")
        else:
             print("Admin already exists.")
        
        # 3. Gates
        gates = []
        for g in ["Main Gate", "Back Gate"]:
            res = session.exec(select(Gate).where(Gate.name == g)).first()
            if not res:
                gt = Gate(name=g)
                session.add(gt)
                session.commit()
                session.refresh(gt)
                gates.append(gt)
            else:
                gates.append(res)

        # 4. Vehicles
        print("Creating Vehicles...")
        for i in range(8): # 8 Vehicles to match screenshot expectation
             plate = f"KCA {random.randint(200, 999)} {random.choice(['X', 'Y', 'Z'])}"
             # Check
             v = session.exec(select(Vehicle).where(Vehicle.plate_number == plate)).first()
             if not v:
                 v = Vehicle(
                     plate_number=plate, 
                     make="Toyota", 
                     model="Premio", 
                     color="Silver",
                     driver_name=f"Driver {i}",
                     driver_contact="0700000000",
                     driver_id_number=f"ID{1000+i}"
                 )
                 session.add(v)
                 session.commit()
                 session.refresh(v)
                 
                 # Create Log (Active inside)
                 log = VehicleLog(
                    vehicle_id=v.id,
                    gate_id=gates[0].id,
                    entry_time=datetime.utcnow() - timedelta(minutes=random.randint(10, 120)),
                    exit_time=None # PARKED
                 )
                 session.add(log)
                 session.commit()
                 print(f"Vehicle {plate} parked.")

    print("Populate Sync Done.")

if __name__ == "__main__":
    populate_sync()
