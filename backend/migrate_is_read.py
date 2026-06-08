import asyncio
import os
from sqlalchemy import text
from app.database import engine

async def migrate():
    print("Starting migration...")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE incident_reports ADD COLUMN is_read BOOLEAN DEFAULT FALSE;"))
            print("Added is_read to incident_reports")
        except Exception as e:
            print(f"Column might already exist on incident_reports: {e}")
            
        try:
            await conn.execute(text("ALTER TABLE lost_and_found_items ADD COLUMN is_read BOOLEAN DEFAULT FALSE;"))
            print("Added is_read to lost_and_found_items")
        except Exception as e:
            print(f"Column might already exist on lost_and_found_items: {e}")
            
    print("Migration finished.")

if __name__ == "__main__":
    asyncio.run(migrate())
