import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.database import engine
from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession

async def fix_schema():
    print("Fixing fleet tables schema...")
    async with engine.begin() as conn:
        try:
            # Make driver_id optional
            await conn.execute(text("ALTER TABLE fleet_trips MODIFY driver_id CHAR(32) NULL;"))
            print("Fixed fleet_trips")
        except Exception as e:
            print("fleet_trips error:", e)
            
        try:
            await conn.execute(text("ALTER TABLE fleet_fuel_logs MODIFY driver_id CHAR(32) NULL;"))
            print("Fixed fleet_fuel_logs")
        except Exception as e:
            print("fleet_fuel_logs error:", e)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(fix_schema())
