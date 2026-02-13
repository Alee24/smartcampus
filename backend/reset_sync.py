from sqlalchemy import create_engine, text
import sys

def reset_sync():
    # Helper to clean corrupted tables via Sync Driver
    db_url = "mysql+pymysql://root:@127.0.0.1:3306/gatepass"
    try:
        engine = create_engine(db_url)
        print("Connected to DB (Sync)...")
        
        with engine.connect() as conn:
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            conn.commit()
            
            tables = [
                "roles", "users", "vehicles", "vehicle_logs", "entry_logs", 
                "classrooms", "courses", "student_course_registrations", 
                "timetable_slots", "class_sessions", "events", "event_visitors", 
                "user_faces", "attendance_records", "cheating_flags", "audit_logs",
                "system_configs", "system_activities", "cameras", "camera_analytics",
                "scan_logs", "visitors", "alembic_version", 
                "user_location_logs" # Added this
            ]
            
            for t in tables:
                try:
                    conn.execute(text(f"DROP TABLE IF EXISTS {t}"))
                    conn.commit()
                    print(f"Dropped {t}")
                except Exception as e:
                    print(f"Error dropping {t}: {e}")
                    
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
            conn.commit()
            print("Finished Dropping.")
            
    except Exception as e:
        print(f"Fatal Error: {e}")

if __name__ == "__main__":
    reset_sync()
