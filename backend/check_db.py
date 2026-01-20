"""
Quick diagnostic script to check database contents
Run with: python check_db.py
"""
from sqlmodel import create_engine, Session, select, func
from app.models import User, Classroom, Course, TimetableSlot
import os

# Get database URL from environment or use default
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:Digital2025@localhost:3306/gatepass")

def check_database():
    engine = create_engine(DATABASE_URL, echo=False)
    
    with Session(engine) as session:
        # Count users
        user_count = session.exec(select(func.count(User.id))).one()
        active_users = session.exec(select(func.count(User.id)).where(User.status == "active")).one()
        
        # Count classrooms
        classroom_count = session.exec(select(func.count(Classroom.id))).one()
        
        # Count courses
        course_count = session.exec(select(func.count(Course.id))).one()
        
        # Count timetable slots
        slot_count = session.exec(select(func.count(TimetableSlot.id))).one()
        
        print("=" * 50)
        print("DATABASE CONTENTS")
        print("=" * 50)
        print(f"Total Users: {user_count}")
        print(f"Active Users: {active_users}")
        print(f"Classrooms: {classroom_count}")
        print(f"Courses: {course_count}")
        print(f"Timetable Slots: {slot_count}")
        print("=" * 50)
        
        # Sample some users
        users = session.exec(select(User).limit(5)).all()
        print("\nSample Users:")
        for u in users:
            print(f"  - {u.admission_number}: {u.full_name} ({u.status})")
        
        # Sample classrooms
        rooms = session.exec(select(Classroom).limit(5)).all()
        print("\nSample Classrooms:")
        for r in rooms:
            print(f"  - {r.room_code}: {r.room_name} ({r.building})")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    check_database()
