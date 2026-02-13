import asyncio
import sys
import os
sys.path.append(os.getcwd())
from app.database import init_db, engine
from sqlmodel import text

async def reset_db():
    print("Aggressively dropping all tables (With Explicit Commits)...")
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            await conn.commit()
            
            tables = [
                "roles", "users", "vehicles", "vehicle_logs", "entry_logs", 
                "classrooms", "courses", "student_course_registrations", 
                "timetable_slots", "class_sessions", "events", "event_visitors", 
                "user_faces", "attendance_records", "cheating_flags", "audit_logs",
                "system_configs", "system_activities", "cameras", "camera_analytics",
                "scan_logs", "visitors", "alembic_version"
            ]
            
            for t in tables:
                print(f"Dropping {t}...")
                try:
                    await conn.execute(text(f"DROP TABLE IF EXISTS {t}"))
                    await conn.commit() # Commit each drop immediately
                except Exception as e:
                    print(f"Sub-error dropping {t}: {e}")
                    
            await conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
            await conn.commit()
            
        print("Done dropping. tables gone.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(reset_db())
