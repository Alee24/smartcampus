from sqlmodel import SQLModel, create_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine
import os

# We use sync engine for 'create_all' and async for runtime
DATABASE_URL = os.getenv("DATABASE_URL")
# Adjust for asyncpg if needed: postgresql+asyncpg://...
# Adjust for Async MySQL: mysql+aiomysql://root:@localhost:3306/gatepass
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://") if DATABASE_URL else "mysql+aiomysql://root:@127.0.0.1:3306/gatepass"

engine = create_async_engine(ASYNC_DATABASE_URL, echo=True, future=True)

async def init_db():
    async with engine.begin() as conn:
        # await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)

async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
