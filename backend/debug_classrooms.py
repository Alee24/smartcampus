import asyncio
import os
from sqlmodel import select, func
from app.database import engine, get_session
from app.models import Classroom, AttendanceRecord, User
from datetime import datetime, timedelta

async def debug_classrooms():
    print("--- Debugging Classrooms Endpoint Logic ---")
    
    async for session in get_session():
        # 1. Fetch Classrooms
        try:
            print("Fetching classrooms...")
            classrooms = (await session.exec(select(Classroom))).all()
            print(f"✓ Found {len(classrooms)} classrooms in DB")
            
            if not classrooms:
                print("! No classrooms found. Exiting.")
                return
            
            # Print first classroom to verify data
            first = classrooms[0]
            print(f"Sample Classroom: {first.room_code} - {first.room_name}")
            
        except Exception as e:
            print(f"❌ Error fetching classrooms: {e}")
            return

        # 2. Check Attendance Logic
        print("\nChecking Attendance Logic for first classroom...")
        try:
            room = classrooms[0]
            
            # Check Last Attendance
            print("Querying last attendance...")
            last_attendance_query = select(AttendanceRecord).where(
                AttendanceRecord.room_code == room.room_code
            ).order_by(AttendanceRecord.scan_time.desc()).limit(1)
            
            last_attendance_result = await session.exec(last_attendance_query)
            last_attendance = last_attendance_result.first()
            print(f"✓ Last attendance query success. Result: {last_attendance}")

            # Check Scans Today
            print("Querying scans today...")
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            scans_today_query = select(func.count(AttendanceRecord.id)).where(
                (AttendanceRecord.room_code == room.room_code) &
                (AttendanceRecord.scan_time >= today_start)
            )
            scans_today = (await session.exec(scans_today_query)).one()
            print(f"✓ Scans today query success. Result: {scans_today}")
            
        except Exception as e:
            print(f"❌ Error in Attendance logic: {e}")
            # This logic failing means the endpoint will fail 500
            
        break

if __name__ == "__main__":
    if not os.path.exists("app"):
        print("Please run from backend directory")
    else:
        asyncio.run(debug_classrooms())
