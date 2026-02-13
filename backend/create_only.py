import asyncio
import sys
import os
sys.path.append(os.getcwd())

# CRITICAL: Import all models explicitly
from app.models import (
    User, Role, Vehicle, VehicleLog, Classroom, Course, 
    StudentCourseRegistration, TimetableSlot, ClassSession, 
    AttendanceRecord, CheatingFlag, AuditLog, SystemConfig, 
    SystemActivity, Camera, CameraAnalytics, ScanLog, Visitor, 
    Event, EventVisitor, EntryLog
)
# Note: UserFace might be missing or defined in a different file? 
# If it's in models.py and I missed it, I should try to import it.
try:
    from app.models import UserFace
except ImportError:
    pass

from app.database import init_db

async def run():
    print("Creating tables (Comprehensive Models imported)...")
    await init_db()
    print("Tables created successfully.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())
