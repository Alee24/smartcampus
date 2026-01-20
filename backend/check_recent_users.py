import asyncio
import os
from sqlalchemy import text
from app.database import engine

async def check_recent():
    print("--- Checking 5 Most Recent Users ---")
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT full_name, admission_number, profile_image, created_at, id FROM users ORDER BY created_at DESC LIMIT 5"))
        rows = result.fetchall()
        for row in rows:
            print(f"User: {row[0]} | Adm: {row[1]} | Img: {row[2]} | ID: {row[4]}")

if __name__ == "__main__":
    if "backend" not in os.getcwd():
        os.chdir("backend")
    # Win32 fix
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(check_recent())
