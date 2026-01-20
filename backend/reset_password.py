import asyncio
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import select
from app.database import engine
from app.models import User
from app.auth import get_password_hash

async def main():
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    try:
        async with async_session() as session:
            print("Searching for user STD001...")
            # Use where clause strictly
            statement = select(User).where(User.admission_number == "STD001")
            result = await session.exec(statement)
            user = result.first()
            
            if user:
                print(f"User found! ID: {user.id}")
                user.hashed_password = get_password_hash("Digital2025")
                session.add(user)
                await session.commit()
                print("✅ Password reset successfully to 'Digital2025'.")
            else:
                print("❌ User 'STD001' not found.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
