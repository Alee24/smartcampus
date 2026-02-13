import asyncio
import sys
import os

# Ensure we can import 'app'
sys.path.append(os.getcwd())

from app.database import engine
from app.models import User
from sqlmodel import select
from app.auth import get_password_hash
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

async def main():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print("Checking for user 'mettoalex@gmail.com'...")
        statement = select(User).where(User.email == "mettoalex@gmail.com")
        results = await session.exec(statement)
        user = results.first()
        
        if user:
            print(f"User FOUND. ID: {user.id}, Role: {user.role}")
            # Reset password to ensure it matches user expectation
            new_hash = get_password_hash("Digital2025")
            user.hashed_password = new_hash
            session.add(user)
            await session.commit()
            print("✅ Password successfully reset to 'Digital2025'.")
        else:
            print("❌ User NOT found. Creating new admin user...")
            new_user = User(
                email="mettoalex@gmail.com",
                hashed_password=get_password_hash("Digital2025"),
                full_name="Metto Alex",
                role="admin",
                is_active=True
            )
            session.add(new_user)
            await session.commit()
            print("✅ User 'mettoalex@gmail.com' created with password 'Digital2025'.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Error: {e}")
