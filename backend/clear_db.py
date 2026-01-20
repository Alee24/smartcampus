import asyncio
import traceback
from sqlmodel import select, delete
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models import User, EntryLog, Vehicle, VehicleLog, ClassSession, Class, Course, AttendanceRecord

# Configuration
ADMIN_EMAIL = "mettoalex@gmail.com"

async def clear_database_except_admin():
    print(f"Clearing database EXCEPT user '{ADMIN_EMAIL}'...")
    try:
        async_session_factory = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async with async_session_factory() as session:
            # 1. Identify Admin User
            res = await session.exec(select(User).where(User.email == ADMIN_EMAIL))
            admin_user = res.first()
            
            if not admin_user:
                print(f"WARNING: Admin user '{ADMIN_EMAIL}' not found. Aborting to avoid total data loss.")
                return

            print(f"Found Admin User ID: {admin_user.id}")

            # 2. Delete Dependent Data first (Logs, Attendance)
            print("Deleting Entry Logs...")
            await session.exec(delete(EntryLog))
            
            print("Deleting Vehicle Logs...")
            await session.exec(delete(VehicleLog))
            
            print("Deleting Vehicles...")
            await session.exec(delete(Vehicle)) # Vehicles are usually standalone or linked to logs/users

            print("Deleting Attendance Records...")
            await session.exec(delete(AttendanceRecord))
            
            print("Deleting Class Sessions...")
            await session.exec(delete(ClassSession))
            
            print("Deleting Classes...")
            await session.exec(delete(Class))
            
            print("Deleting Courses...")
            await session.exec(delete(Course))


            # 3. Delete Users EXCEPT Admin
            print("Deleting Users (except Admin)...")
            statement = delete(User).where(User.id != admin_user.id)
            result = await session.exec(statement)
            
            await session.commit()
            print("Database cleared successfully (Admin preserved).")

    except Exception:
        print("Detailed Error Occurred:")
        traceback.print_exc()
    
    finally:
        await engine.dispose()

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(clear_database_except_admin())
