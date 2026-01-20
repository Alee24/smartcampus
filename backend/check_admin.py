import asyncio
from app.database import get_session
from app.models import User
from sqlmodel import select

async def check_admin():
    async for session in get_session():
        # Check for admin user
        result = await session.exec(select(User).where(User.email == "admin@smartcampus.edu"))
        admin = result.first()
        
        if admin:
            print("\n✅ Admin user found!")
            print(f"   Email: {admin.email}")
            print(f"   Admission: {admin.admission_number}")
            print(f"   Name: {admin.full_name}")
            print(f"   Status: {admin.status}")
        else:
            print("\n❌ Admin user not found!")
        
        # Also check the original admin
        result2 = await session.exec(select(User).where(User.email == "mettoalex@gmail.com"))
        admin2 = result2.first()
        
        if admin2:
            print("\n✅ Original admin (mettoalex@gmail.com) also exists!")
        
        break

if __name__ == "__main__":
    asyncio.run(check_admin())
