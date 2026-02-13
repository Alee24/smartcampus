import asyncio
from app.database import get_session
from app.models import User, Role
from app.auth import get_password_hash
from sqlmodel import select

async def seed_admin():
    print("--- Admin Account Seeder ---")
    async for session in get_session():
        # 1. Ensure SuperAdmin role exists
        role_stmt = select(Role).where(Role.name == "SuperAdmin")
        role = (await session.exec(role_stmt)).first()
        if not role:
            role = Role(name="SuperAdmin", description="System Administrator")
            session.add(role)
            await session.commit()
            await session.refresh(role)
            print("Created SuperAdmin role.")

        # 2. Ensure Requested Admin User exists
        email = "smartcampus@kkdes.co.ke"
        password = "smartcampus"
        user_stmt = select(User).where(User.email == email)
        user = (await session.exec(user_stmt)).first()
        
        if not user:
            user = User(
                admission_number="ADMIN_ROOT",
                full_name="System Administrator",
                email=email,
                hashed_password=get_password_hash(password),
                role_id=role.id,
                status="active"
            )
            session.add(user)
            await session.commit()
            print(f"SUCCESS: Admin account created!")
            print(f"Email: {email}")
            print(f"Password: {password}")
        else:
            # Update password anyway to ensure it matches
            user.hashed_password = get_password_hash(password)
            session.add(user)
            await session.commit()
            print(f"INFO: Admin account already exists. Password updated to: {password}")

if __name__ == "__main__":
    asyncio.run(seed_admin())
