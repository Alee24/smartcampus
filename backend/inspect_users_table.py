import asyncio
import os
from sqlalchemy import text
from app.database import engine

async def inspect_table():
    print("--- Inspecting Users Table ---")
    async with engine.begin() as conn:
        result = await conn.execute(text("DESCRIBE users"))
        rows = result.fetchall()
        print(f"{'Field':<20} {'Type':<20} {'Null':<10}")
        print("-" * 50)
        for row in rows:
            # row is typically (Field, Type, Null, Key, Default, Extra)
            print(f"{row[0]:<20} {row[1]:<20} {row[2]:<10}")

if __name__ == "__main__":
    if "backend" not in os.getcwd():
        os.chdir("backend")
    
    # Win32 fix
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(inspect_table())
