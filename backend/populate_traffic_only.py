import asyncio
import random
from datetime import datetime, timedelta
from sqlmodel import select, func
from app.database import engine, get_session
from app.models import User, Gate, EntryLog, Role
from app.database import sessionmaker, AsyncSession

async def populate_traffic():
    print("Populating TRAFFIC only...")
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # 1. Fetch Users
        print("Fetching users...")
        # Get random sample of 50 users
        # For MySQL random order might be slow effectively but we just need some
        users = (await session.exec(select(User).limit(100))).all()
        
        if not users:
            print("No users found! Cannot generate traffic.")
            return

        # 2. Fetch Gates
        print("Fetching gates...")
        gates = (await session.exec(select(Gate))).all()
        if not gates:
             # Create one
             gate = Gate(name="Main Gate Only", location="Front")
             session.add(gate)
             await session.commit()
             await session.refresh(gate)
             gates = [gate]
             
        # 3. Generate Traffic
        print(f"Generating traffic for {len(users)} users...")
        total_logs = 0
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7) 
        
        current_date = start_date
        while current_date <= end_date:
            daily_entries = random.randint(20, 50)
            for _ in range(daily_entries):
                user = random.choice(users)
                gate = random.choice(gates)
                
                log = EntryLog(
                    user_id=user.id,
                    gate_id=gate.id,
                    entry_time=current_date,
                    method=random.choice(["qr", "face"]),
                    status="allowed",
                    guard_id=None
                )
                session.add(log)
                total_logs += 1
            current_date += timedelta(days=1)
            
        await session.commit()
        print(f"Generated {total_logs} traffic logs successfully.")

if __name__ == "__main__":
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(populate_traffic())
