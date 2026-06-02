import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.database import engine
from sqlalchemy import text

async def run_migration():
    print("Running passenger added_via_scan migration...")
    try:
        async with engine.begin() as conn:
            def get_cols(connection):
                from sqlalchemy import inspect
                inspector = inspect(connection)
                return [c['name'] for c in inspector.get_columns('fleet_passenger_manifest')]
            
            columns = await conn.run_sync(get_cols)
            if "added_via_scan" not in columns:
                print("Adding added_via_scan column to fleet_passenger_manifest table...")
                await conn.execute(text("ALTER TABLE fleet_passenger_manifest ADD COLUMN added_via_scan BOOLEAN DEFAULT FALSE"))
                print("Column added successfully!")
            else:
                print("Column added_via_scan already exists in fleet_passenger_manifest.")
    except Exception as e:
        print("Migration failed:", e)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migration())
