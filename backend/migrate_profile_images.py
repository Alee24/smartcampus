import asyncio
import os
import sys
from sqlalchemy import text

# Add parent dir to path if running directly
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Running Profile Photo & Visitor Center Schema Migration...")
        
        # 1. Add require_profile_pic to events table
        try:
            await conn.execute(text("ALTER TABLE events ADD COLUMN require_profile_pic BOOLEAN DEFAULT FALSE;"))
            print("Successfully added require_profile_pic column to events table.")
        except Exception as e:
            print(f"Skipped require_profile_pic on events (already exists?): {e}")
            
        # 2. Add profile_image to event_visitors table
        try:
            await conn.execute(text("ALTER TABLE event_visitors ADD COLUMN profile_image TEXT NULL;"))
            print("Successfully added profile_image column to event_visitors table.")
        except Exception as e:
            print(f"Skipped profile_image on event_visitors (already exists?): {e}")

        # 3. Add profile_image to visitors table
        try:
            await conn.execute(text("ALTER TABLE visitors ADD COLUMN profile_image TEXT NULL;"))
            print("Successfully added profile_image column to visitors table.")
        except Exception as e:
            print(f"Skipped profile_image on visitors (already exists?): {e}")

        print("Migration process finished.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(migrate())
