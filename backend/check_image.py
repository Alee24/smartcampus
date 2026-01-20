import asyncio
import os
import sys
from sqlmodel import select
from app.database import engine, get_session
from app.models import User

async def check_image():
    log = []
    log.append("Checking Database for Student Image...")
    
    try:
        async for session in get_session():
            stmt = select(User).where(User.admission_number == "25ZAD111307")
            result = await session.exec(stmt)
            user = result.first()
            
            if not user:
                log.append("Admission Number '25ZAD111307' not found. Searching by Name 'Alex Metto'...")
                stmt = select(User).where(User.full_name == "Alex Metto")
                result = await session.exec(stmt)
                user = result.first()
            
            if user:
                log.append(f"User Found: {user.full_name} (ID: {user.id})")
                log.append(f"Admission Number: {user.admission_number}")
                log.append(f"Profile Image DB Value: {user.profile_image}")
                
                if user.profile_image:
                    fs_path = user.profile_image.lstrip("/")
                    # If it starts with static/profiles, fine.
                    # backend is CWD.
                    if os.path.exists(fs_path):
                         log.append(f"SUCCESS: File exists on disk at '{fs_path}'")
                         log.append(f"File Size: {os.path.getsize(fs_path)} bytes")
                    else:
                         log.append(f"ERROR: File NOT FOUND on disk at '{fs_path}'")
                else:
                    log.append("WARNING: 'profile_image' column is NULL.")
            else:
                log.append("User 'Alex Metto' or '25ZAD111307' NOT FOUND in database.")
            
            break
            
    except Exception as e:
        log.append(f"Exception: {e}")
        
    with open("image_check_log.txt", "w") as f:
        f.write("\n".join(log))

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        asyncio.run(check_image())
    except: pass
