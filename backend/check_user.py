import asyncio
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models import User

async def check():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        statement = select(User).where(User.email == "mettoalex@gmail.com")
        result = await session.exec(statement)
        user = result.first()
        if user:
            print(f"User FOUND: {user.email} | Role: {user.role_id}")
        else:
            print("User NOT FOUND")

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check())
