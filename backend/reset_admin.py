
import asyncio
from app.database import get_session
from app.models import User, Role
from app.auth import get_password_hash
from sqlmodel import select

async def reset_admin():
    async for session in get_session():
        email = "mettoalex@gmail.com"
        password = "Digital2025"
        
        print(f"🔄 Checking user: {email}...")
        
        # 1. Ensure SuperAdmin Role Exists
        role_stmt = select(Role).where(Role.name == "SuperAdmin")
        role = (await session.exec(role_stmt)).first()
        if not role:
            print("   Creating SuperAdmin role...")
            role = Role(name="SuperAdmin", description="System Super Administrator")
            session.add(role)
            await session.commit()
            await session.refresh(role)
        
        # 2. Check/Reset User
        stmt = select(User).where(User.email == email)
        user = (await session.exec(stmt)).first()
        
        hashed_pw = get_password_hash(password)
        
        if user:
            print(f"✅ User found. Updating password to '{password}'...")
            user.hashed_password = hashed_pw
            user.role_id = role.id
            user.status = "active"
            session.add(user)
            await session.commit()
            print("   Password updated successfully.")
        else:
            print(f"⚠️ User not found. Creating new admin...")
            new_user = User(
                email=email,
                admission_number="ADM-001",
                full_name="Alex Metto",
                school="Administration",
                role_id=role.id,
                hashed_password=hashed_pw,
                status="active"
            )
            session.add(new_user)
            await session.commit()
            print("✅ Admin user created.")

if __name__ == "__main__":
    asyncio.run(reset_admin())
