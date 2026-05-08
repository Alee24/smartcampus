from sqlmodel import SQLModel, create_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine
import os

# We use sync engine for 'create_all' and async for runtime
DATABASE_URL = os.getenv("DATABASE_URL")
# Adjust for asyncpg if needed: postgresql+asyncpg://...
# Adjust for Async MySQL: mysql+aiomysql://root:@localhost:3306/gatepass
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://") if DATABASE_URL else "mysql+aiomysql://root:@127.0.0.1:3306/gatepass_v2"
# Engine configuration
DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() == "true"
engine = create_async_engine(ASYNC_DATABASE_URL, echo=DEBUG_MODE, future=True)

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

from sqlalchemy import text
async def migrate_fleet():
    """Manual migration to add columns for Fleet Management if they don't exist."""
    new_vehicle_cols = {
        "vehicle_type": "VARCHAR(255) DEFAULT 'utility'",
        "fuel_type": "VARCHAR(255) DEFAULT 'petrol'",
        "fuel_capacity": "FLOAT DEFAULT 0.0",
        "engine_number": "VARCHAR(255)",
        "chassis_number": "VARCHAR(255)",
        "year": "INT",
        "status": "VARCHAR(255) DEFAULT 'active'",
        "insurance_expiry": "DATE",
        "last_service_date": "DATE",
        "next_service_odometer": "FLOAT",
        "current_odometer": "FLOAT DEFAULT 0.0"
    }
    
    async with engine.begin() as conn:
        # Check columns
        from sqlalchemy import inspect
        def get_cols(connection):
            inspector = inspect(connection)
            return [c['name'] for c in inspector.get_columns('vehicles')]
        
        columns = await conn.run_sync(get_cols)
        
        for col, type_ in new_vehicle_cols.items():
            if col not in columns:
                print(f"Adding column {col} to vehicles table...")
                await conn.execute(text(f"ALTER TABLE vehicles ADD COLUMN {col} {type_}"))
        
        print("Fleet migration checked/applied.")
