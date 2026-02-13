import asyncio
from sqlmodel import select
from app.database import engine, get_session
from app.models import User
from app.auth import verify_password, get_password_hash
from app.database import sessionmaker, AsyncSession
import requests

async def debug_login():
    print("--- 1. DATABASE CHECK ---")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check by email
        statement = select(User).where(User.email == "mettoalex@gmail.com")
        results = await session.exec(statement)
        user = results.first()
        
        if not user:
            print("ERROR: User 'mettoalex@gmail.com' NOT FOUND in database.")
        else:
            print(f"User Found: {user.full_name} ({user.admission_number})")
            print(f"Stored Hash: {user.hashed_password[:10]}...")
            
            # Check Password
            password = "Digital2025"
            is_valid = verify_password(password, user.hashed_password)
            print(f"verify_password('{password}', hash) -> {is_valid}")
            
            if not is_valid:
                print("   [!] Password mismatch in DB logic.")
                # Verify if logic is broken by hashing it now
                new_hash = get_password_hash(password)
                print(f"   Expected Hash structure: {new_hash[:10]}...")
            else:
                print("   [OK] Password validation logic works internally.")

    print("\n--- 2. API CHECK (Localhost) ---")
    try:
        url = "http://localhost:8000/api/token"
        payload = {
            "username": "mettoalex@gmail.com",
            "password": "Digital2025"
        }
        print(f"POST {url} with {payload}")
        response = requests.post(url, data=payload)
        
        print(f"Status Code: {response.status_code}")
        try:
            print(f"Response: {response.json()}")
        except:
            print(f"Response Text: {response.text}")
            
    except Exception as e:
        print(f"API Request Failed: {e}")
        print("Ensure the server is running on port 8000.")

if __name__ == "__main__":
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(debug_login())
