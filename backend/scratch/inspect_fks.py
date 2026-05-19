import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.getcwd())
from app.database import engine

async def inspect():
    async with engine.connect() as conn:
        print("--- Inspecting fleet_trips structure ---")
        try:
            res = await conn.execute(text("SHOW CREATE TABLE fleet_trips"))
            row = res.fetchone()
            print("Create Table:")
            print(row[1])
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(inspect())
