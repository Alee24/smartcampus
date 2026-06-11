import asyncio
import os
import sys
from sqlalchemy import text

# Add parent dir to path if running directly
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Migrating Event fields...")
        try:
            await conn.execute(text("ALTER TABLE events ADD COLUMN scan_mode VARCHAR(50) DEFAULT 'auto';"))
            print("Added scan_mode column to events.")
        except Exception as e:
            print(f"Skipped scan_mode column on events: {e}")

        try:
            await conn.execute(text("ALTER TABLE event_visitors ADD COLUMN auto_delete_24h BOOLEAN DEFAULT FALSE;"))
            print("Added auto_delete_24h column to event_visitors.")
        except Exception as e:
            print(f"Skipped auto_delete_24h column on event_visitors: {e}")
            
        print("Event migration check completed.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(migrate())
