import asyncio
from app.database import get_session
from app.models import User, Role
from app.auth import get_password_hash
from sqlmodel import select

async def fix_admin():
    print("Connecting to database...")
    async for session in get_session():  
        # 1. Check User
        stmt = select(User).where(User.email == "mettoalex@gmail.com")
        result = await session.exec(stmt)
        user = result.first()
        
        if user:
            print(f"User found: {user.full_name}")
            # Reset Password
            new_hash = get_password_hash("Digital2025")
            user.hashed_password = new_hash
            user.status = "active"
            session.add(user)
            await session.commit()
            print("Password reset to: Digital2025")
        else:
            print("User NOT found! Creating default admin...")
            # Create Role if missing
            role_stmt = select(Role).where(Role.name == "SuperAdmin")
            role = (await session.exec(role_stmt)).first()
            if not role:
                 role = Role(name="SuperAdmin", description="System Admin")
                 session.add(role)
                 await session.commit()
                 await session.refresh(role)
            
            # Create User
            hashed = get_password_hash("Digital2025")
            new_user = User(
                admission_number="ADMIN001",
                full_name="Alex Metto",
                school="Administration",
                email="mettoalex@gmail.com",
                hashed_password=hashed,
                role_id=role.id,
                status="active",
                has_smartphone=True
            )
            session.add(new_user)
            await session.commit()
            print("Admin user created: mettoalex@gmail.com / Digital2025")

if __name__ == "__main__":
    asyncio.run(fix_admin())
