import asyncio
from sqlmodel import select, func
from app.database import get_session
from app.models import User, Vehicle, EntryLog, VehicleLog

async def verify_population():
    print("Verifying population data...")
    try:
        async for session in get_session():
            # Count Users
            user_count = (await session.exec(select(func.count(User.id)))).one()
            print(f"Users Count: {user_count}")
            
            # Count Vehicles
            vehicle_count = (await session.exec(select(func.count(Vehicle.id)))).one()
            print(f"Vehicles Count: {vehicle_count}")
            
            # Count Entry Logs
            entry_log_count = (await session.exec(select(func.count(EntryLog.id)))).one()
            print(f"Entry Logs Count: {entry_log_count}")
            
            # Count Vehicle Logs
            vehicle_log_count = (await session.exec(select(func.count(VehicleLog.id)))).one()
            print(f"Vehicle Logs Count: {vehicle_log_count}")
            
            if user_count >= 50:
                print("PASS: Users populated.")
            else:
                print("FAIL: User count too low.")
                
            if vehicle_count >= 10:
                print("PASS: Vehicles populated.")
            else:
                print("FAIL: Vehicle count too low.")

            break
            
    except Exception as e:
        print(f"Verification Error: {e}")

if __name__ == "__main__":
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify_population())
