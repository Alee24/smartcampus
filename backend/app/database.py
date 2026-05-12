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
engine = create_async_engine(
    ASYNC_DATABASE_URL, 
    echo=DEBUG_MODE, 
    future=True,
    pool_recycle=3600,
    pool_pre_ping=True
)

async def init_db():
    async with engine.begin() as conn:
        # await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    
    # Run manual migrations for existing tables
    await migrate_users()
    await migrate_fleet()
    await migrate_audit_logs()
    await migrate_external_sync()

async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session

from sqlalchemy import text
async def migrate_users():
    """Manual migration to add columns for extended user profiles."""
    print("Checking users table schema...")
    new_cols = {
        "gender": "VARCHAR(255)",
        "program": "VARCHAR(255)",
        "first_name": "VARCHAR(255)",
        "last_name": "VARCHAR(255)",
        "phone_number": "VARCHAR(255)",
        "pin": "VARCHAR(255)",
        "pin_setup_required": "BOOLEAN DEFAULT TRUE"
    }
    
    try:
        async with engine.begin() as conn:
            def get_cols(connection):
                from sqlalchemy import inspect
                inspector = inspect(connection)
                return [c['name'] for c in inspector.get_columns('users')]
            
            columns = await conn.run_sync(get_cols)
            
            for col, type_ in new_cols.items():
                if col not in columns:
                    print(f"Adding column {col} to users table...")
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {type_}"))
            
            print("User profile migration checked/applied.")
    except Exception as e:
        print(f"User migration skipped/failed: {e}")

async def migrate_fleet():
    """Manual migration to add columns for Fleet Management if they don't exist."""
    print("Checking vehicles table schema...")
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
        "current_odometer": "FLOAT DEFAULT 0.0",
        "owner_id": "CHAR(36) REFERENCES users(id)"
    }
    
    try:
        async with engine.begin() as conn:
            # Check columns
            def get_cols(connection):
                from sqlalchemy import inspect
                inspector = inspect(connection)
                return [c['name'] for c in inspector.get_columns('vehicles')]
            
            columns = await conn.run_sync(get_cols)
            
            for col, type_ in new_vehicle_cols.items():
                if col not in columns:
                    print(f"Adding column {col} to vehicles table...")
                    await conn.execute(text(f"ALTER TABLE vehicles ADD COLUMN {col} {type_}"))
            
            print("Fleet migration checked/applied.")
    except Exception as e:
        print(f"Fleet migration skipped/failed: {e}")

async def migrate_audit_logs():
    """Manual migration to upgrade audit_logs table schema."""
    print("Checking audit_logs table schema...")
    new_cols = {
        "user_name": "VARCHAR(255)",
        "action_type": "VARCHAR(255)",
        "table_name": "VARCHAR(255)",
        "record_id": "VARCHAR(255)",
        "old_values": "JSON",
        "new_values": "JSON",
        "ip_address": "VARCHAR(255)",
        "user_agent": "VARCHAR(255)",
        "description": "TEXT"
    }
    
    try:
        async with engine.begin() as conn:
            def get_cols(connection):
                from sqlalchemy import inspect
                inspector = inspect(connection)
                if not inspector.has_table('audit_logs'): return []
                return [c['name'] for c in inspector.get_columns('audit_logs')]
            
            columns = await conn.run_sync(get_cols)
            if not columns: return
            
            for col, type_ in new_cols.items():
                if col not in columns:
                    print(f"Adding column {col} to audit_logs table...")
                    await conn.execute(text(f"ALTER TABLE audit_logs ADD COLUMN {col} {type_}"))
            
            # Handle rename of 'action' to 'action_type' if needed, but adding new is safer
            print("Audit log migration checked/applied.")
    except Exception as e:
        print(f"Audit log migration skipped/failed: {e}")

async def migrate_external_sync():
    """Manual migration to seed the external sync API key."""
    print("Checking external sync configuration...")
    try:
        from app.models import SystemConfig
        async with engine.begin() as conn:
            # Check if config exists
            stmt = text("SELECT * FROM system_configs WHERE `key` = 'external_sync_api_key'")
            res = await conn.execute(stmt)
            config = res.fetchone()
            
            if not config:
                print("Seeding default External Sync API Key...")
                await conn.execute(text(
                    "INSERT INTO system_configs (`id`, `key`, `value`, `category`, `is_encrypted`) "
                    "VALUES (UUID(), 'external_sync_api_key', 'SmartCampusSync2026', 'api', 0)"
                ))
                print("External Sync API Key seeded.")
            else:
                print("External Sync API Key already exists.")
    except Exception as e:
        print(f"External sync migration skipped/failed: {e}")
