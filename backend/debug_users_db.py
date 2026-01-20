import urllib.request
import json
import os

def check_api():
    url = "http://127.0.0.1:8000/api/users/"
    print(f"Fetching {url}...")
    try:
        # Create a request with a dummy token if needed, but list_users is usually secured?
        # Step 5452 showed `current_user: User = Depends(get_current_user)`.
        # So we NEED A TOKEN.
        # I'll try to login first? Or just bypassing auth for debug?
        # I can't easily login without credentials.
        # But wait, user said "Only Admin Remains". This implies they are logged in.
        
        # If I can't authenticate, I can't curl.
        # But I can inspect the DB directly.
        pass
    except Exception as e:
        print(f"Error: {e}")

# Alternative: Run a script that imports 'app' and runs the query using the same session logic.
import asyncio
from sqlalchemy import select
from app.database import engine
from app.models import User

async def debug_query():
    print("--- Debugging DB Query ---")
    async with engine.connect() as conn:
        # Check raw count
        from sqlalchemy import text
        res = await conn.execute(text("SELECT count(*) FROM users"))
        print(f"Total Users in DB: {res.scalar()}")
        
        # Check if they have status 'active'
        res = await conn.execute(text("SELECT full_name, status, role_id FROM users"))
        for row in res:
             print(f"User: {row[0]}, Status: {row[1]}, Role: {row[2]}")

if __name__ == "__main__":
    if "backend" not in os.getcwd():
         try: os.chdir("backend")
         except: pass
    
    # Win32 loop fix
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(debug_query())
