import asyncio
import random
from datetime import datetime, timedelta
from sqlmodel import select
from app.database import engine, get_session
from app.models import User, Vehicle, Role
from app.auth import get_password_hash
from app.database import sessionmaker, AsyncSession

async def populate_final():
    print("Final population check...")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check users
        user_count = (await session.exec(select(func.count(User.id)))).one()
        print(f"Current users: {user_count}")
        
        if user_count < 10:
            print("Adding 10 students...")
            # Fetch Student role
            role = (await session.exec(select(Role).where(Role.name == "Student"))).first()
            if not role:
                 role = Role(name="Student")
                 session.add(role)
                 await session.commit()
                 await session.refresh(role)
            
            for i in range(10):
                user = User(
                    admission_number=f"FINAL{100+i}",
                    full_name=f"Final Student {i}",
                    school="Final School",
                    email=f"final{i}@test.com",
                    hashed_password=get_password_hash("pass"),
                    role_id=role.id
                )
                session.add(user)
            await session.commit()
            print("Added 10 students.")
            
        # Check vehicles
        veh_count = (await session.exec(select(func.count(Vehicle.id)))).one()
        print(f"Current vehicles: {veh_count}")
        
        if veh_count < 5:
            print("Adding 5 vehicles...")
            for i in range(5):
                v = Vehicle(
                    plate_number=f"KZZ {100+i}X",
                    make="FinalMake",
                    model="FinalModel",
                    color="FinalColor"
                )
                session.add(v)
            await session.commit()
            print("Added 5 vehicles.")
    
    print("Done.")

from sqlalchemy import func

if __name__ == "__main__":
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(populate_final())
