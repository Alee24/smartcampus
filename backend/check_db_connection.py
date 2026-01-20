import asyncio
import sys
import os
from sqlmodel import select
from app.database import engine, get_session
from app.models import User
from app.auth import verify_password, get_password_hash

async def check_connection():
    output = []
    try:
        output.append("Checking Database Connection...")
        
        # Test connection
        async with engine.connect() as conn:
            pass
        output.append("Connection Successful!")
            
        async for session in get_session():
            output.append("Checking for Admin User (mettoalex@gmail.com)...")
            
            statement = select(User).where(User.email == "mettoalex@gmail.com")
            result = await session.exec(statement)
            user = result.first()
            
            if user:
                output.append(f"User Found: {user.full_name} (ID: {user.id})")
                
                # Verify Password
                test_pass = "Digital2025"
                try:
                    is_valid = verify_password(test_pass, user.hashed_password)
                    output.append(f"Password '{test_pass}' Valid? {is_valid}")
                except Exception as e:
                    output.append(f"Verification Error: {e}")
                    is_valid = False
                
                if not is_valid:
                    output.append("PASSWORD MISMATCH DETECTED. RESETTING PASSWORD...")
                    new_hash = get_password_hash(test_pass)
                    user.hashed_password = new_hash
                    session.add(user)
                    await session.commit()
                    output.append(f"Password forcefully reset to '{test_pass}'")
                else:
                    output.append("Password is CORRECT in Database.")
                    
            else:
                output.append("User 'mettoalex@gmail.com' NOT FOUND in database.")
                
            break
            
    except Exception as e:
        output.append(f"Database Error: {e}")
        import traceback
        output.append(traceback.format_exc())
    
    with open("db_status.txt", "w") as f:
        f.write("\n".join(output))

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        asyncio.run(check_connection())
    except:
        pass
