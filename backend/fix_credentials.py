import asyncio
import sys
import os

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.models import User, Role
from app.auth import get_password_hash
from sqlmodel import select
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

async def main():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # 1. Ensure Role 'admin' exists
        stmt = select(Role).where(Role.name == "admin")
        result = await session.exec(stmt)
        admin_role = result.first()
        
        if not admin_role:
            print("Creating 'admin' role...")
            admin_role = Role(name="admin", description="Administrator")
            session.add(admin_role)
            await session.commit()
            await session.refresh(admin_role)
        else:
            print(f"Role 'admin' found: {admin_role.id}")

        # 2. Fix User
        email = "mettoalex@gmail.com"
        password = "Digital2025"
        hashed_pw = get_password_hash(password)
        
        stmt = select(User).where(User.email == email)
        result = await session.exec(stmt)
        user = result.first()
        
        if user:
            print(f"User {email} found. Resetting password and ensuring active status/role...")
            user.hashed_password = hashed_pw
            user.status = "active"
            user.role_id = admin_role.id
            # Fix admission number if duplicate logic allows (it is unique)
            # If admission number is not set or needs update?
            # Usually admission number is unique. If user exists, we persist it unless it conflicts.
            # We won't change admission_number if it exists.
            if not user.admission_number:
                 user.admission_number = "ADMIN001"
            
            session.add(user)
            await session.commit()
            print("User updated successfully.")
        else:
            print(f"User {email} NOT found. Creating...")
            # Check if ADMIN001 admission number is taken
            stmt_adm = select(User).where(User.admission_number == "ADMIN001")
            res_adm = await session.exec(stmt_adm)
            if res_adm.first():
                # If ADMIN001 exists but email is different, use ADMIN002?
                # or update that user?
                print("Warning: ADMIN001 exists with different email. Using ADMIN_ALEX.")
                adm_no = "ADMIN_ALEX"
            else:
                adm_no = "ADMIN001"

            new_user = User(
                email=email,
                hashed_password=hashed_pw,
                full_name="Alex Metto",
                school="Administration",
                role_id=admin_role.id,
                status="active",
                admission_number=adm_no,
                has_smartphone=True
            )
            session.add(new_user)
            await session.commit()
            print("User created successfully.")

if __name__ == "__main__":
    try:
        # Fix for Windows loop closed error
        if sys.platform == 'win32':
             asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except Exception as e:
        print(f"Error: {e}")
