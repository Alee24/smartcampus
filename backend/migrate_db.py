import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Migrating database...")
        try:
            await conn.execute(text("ALTER TABLE courses ADD COLUMN room_number VARCHAR(255);"))
            print("Added room_number to courses.")
        except Exception as e:
            print(f"Skipped courses: {e}")

        try:
            await conn.execute(text("ALTER TABLE class_sessions ADD COLUMN room_unique_number VARCHAR(255);"))
            print("Added room_unique_number to class_sessions.")
        except Exception as e:
            print(f"Skipped class_sessions: {e}")

        try:
            await conn.execute(text("ALTER TABLE attendance_records ADD COLUMN connection_type VARCHAR(50);"))
            print("Added connection_type to attendance_records.")
        except Exception as e:
            print(f"Skipped attendance_records (connection_type): {e}")

        try:
            await conn.execute(text("ALTER TABLE attendance_records ADD COLUMN connection_name VARCHAR(255);"))
            print("Added connection_name to attendance_records.")
        except Exception as e:
            print(f"Skipped attendance_records (connection_name): {e}")

        try:
            await conn.execute(text("ALTER TABLE attendance_records ADD COLUMN metadata_info TEXT;"))
            print("Added metadata_info to attendance_records.")
        except Exception as e:
            print(f"Skipped attendance_records (metadata_info): {e}")
            
        print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
