import asyncio
from app.database import get_session
from app.models import User
from app.auth import verify_password
from sqlmodel import select

async def check_all_users():
    async for session in get_session():
        # Get all users
        result = await session.exec(select(User))
        users = result.all()
        
        print(f"\n📊 Total users in database: {len(users)}\n")
        print("="*70)
        
        for user in users:
            print(f"\n👤 User: {user.full_name}")
            print(f"   Email: {user.email}")
            print(f"   Admission: {user.admission_number}")
            print(f"   Status: {user.status}")
            print(f"   Has Password: {'Yes' if user.hashed_password else 'No'}")
            
            # Test password
            if user.email == "admin@smartcampus.edu":
                test_pass = verify_password("Admin123!", user.hashed_password)
                print(f"   Password 'Admin123!' works: {test_pass}")
            elif user.email == "mettoalex@gmail.com":
                test_pass = verify_password("Digital2025", user.hashed_password)
                print(f"   Password 'Digital2025' works: {test_pass}")
        
        print("\n" + "="*70)
        break

if __name__ == "__main__":
    asyncio.run(check_all_users())
