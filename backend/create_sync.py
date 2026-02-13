from sqlmodel import SQLModel, create_engine, text
import sys
import os
sys.path.append(os.getcwd())

# Import all models
from app.models import (
    User, Role, Vehicle, VehicleLog, Classroom, Course, 
    StudentCourseRegistration, TimetableSlot, ClassSession, 
    AttendanceRecord, CheatingFlag, AuditLog, SystemConfig, 
    SystemActivity, Camera, CameraAnalytics, ScanLog, Visitor, 
    Event, EventVisitor, EntryLog, UserFace, UserLocationLog,
    Gate # Added Gate
)

def create_sync():
    print("Ensuring database 'gatepass_db'...")
    root_engine = create_engine("mysql+pymysql://root:@127.0.0.1:3306/")
    try:
        with root_engine.connect() as conn:
            conn.execute(text("CREATE DATABASE IF NOT EXISTS gatepass_db"))
    except: pass

    db_url = "mysql+pymysql://root:@127.0.0.1:3306/gatepass_db"
    try:
        engine = create_engine(db_url, echo=True)
        print("Creating tables (Sync) with Gate...")
        SQLModel.metadata.create_all(engine)
        print("Tables created successfully.")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    create_sync()
