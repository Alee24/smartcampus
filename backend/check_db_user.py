
import asyncio
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from app.models import User, Role

ASYNC_DATABASE_URL = "mysql+aiomysql://root:@127.0.0.1:3306/gatepass_v2"
engine = create_async_engine(ASYNC_DATABASE_URL)

async def check_user():
    async with AsyncSession(engine) as session:
        # Check Roles
        roles = (await session.exec(select(Role))).all()
        print(f"Roles: {[r.name for r in roles]}")
        
        # Check User
        stmt = select(User).where(User.email == "mettoalex@gmail.com")
        user = (await session.exec(stmt)).first()
        if user:
            print(f"User found: {user.full_name}, Email: {user.email}, Role ID: {user.role_id}")
            # Check role
            role = await session.get(Role, user.role_id)
            print(f"Role: {role.name if role else 'None'}")
        else:
            print("User NOT found")

if __name__ == "__main__":
    asyncio.run(check_user())
