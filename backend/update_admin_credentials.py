import asyncio
from sqlmodel import select
from app.database import engine, get_session
from app.models import User, Role
from app.auth import get_password_hash
from app.database import sessionmaker, AsyncSession

async def update_admin():
    print("Updating Admin Credentials...")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Find the current admin (likely ADMIN001 or admin@smartcampus.edu)
        statement = select(User).where(User.admission_number == "ADMIN001")
        results = await session.exec(statement)
        admin = results.first()
        
        if not admin:
            # Try finding by old email
            statement = select(User).where(User.email == "admin@smartcampus.edu")
            results = await session.exec(statement)
            admin = results.first()
            
        if admin:
            print(f"Found Admin: {admin.full_name} ({admin.email})")
            
            # Update credentials
            admin.email = "mettoalex@gmail.com"
            admin.hashed_password = get_password_hash("Digital2025")
            
            session.add(admin)
            await session.commit()
            await session.refresh(admin)
            
            print(f"SUCCESS: Updated Admin to {admin.email}")
        else:
            print("ERROR: Admin user not found. Creating a new one...")
            
            # Find SuperAdmin role
            role = (await session.exec(select(Role).where(Role.name == "SuperAdmin"))).first()
            if not role:
                 role = Role(name="SuperAdmin")
                 session.add(role)
                 await session.commit()
                 
            new_admin = User(
                admission_number="ADMIN001",
                full_name="Admin User",
                email="mettoalex@gmail.com",
                hashed_password=get_password_hash("Digital2025"),
                school="Administration",
                role_id=role.id,
                status="active"
            )
            session.add(new_admin)
            await session.commit()
            print("SUCCESS: Created new Admin mettoalex@gmail.com")

if __name__ == "__main__":
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(update_admin())
