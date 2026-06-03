from sqlmodel import SQLModel, create_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine
import os

# Import all models to ensure SQLModel has registered them before create_all is called
from app.models import *

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
    pool_recycle=1800,       # Recycle connections every 30 min
    pool_pre_ping=False,     # Disabled - aiomysql ping() requires reconnect arg
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
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
    await migrate_system_configs()
    await migrate_notice_board()

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
        "is_fleet": "BOOLEAN DEFAULT FALSE",
        "vehicle_type": "VARCHAR(255) DEFAULT 'utility'",
        "fuel_type": "VARCHAR(255) DEFAULT 'petrol'",
        "fuel_capacity": "FLOAT DEFAULT 0.0",
        "seating_capacity": "INT DEFAULT 0",
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
            
            print("Vehicles table migration checked/applied.")
            
            # Make driver_id nullable in fleet_trips
            try:
                print("Disabling foreign key checks for schema alter...")
                await conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
                await conn.execute(text("ALTER TABLE fleet_trips MODIFY driver_id CHAR(36) NULL;"))
                print("Successfully made driver_id nullable.")
            except Exception as e:
                print("Error making driver_id nullable:", e)
            finally:
                try:
                    await conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
                except:
                    pass

            # Check columns for fleet_trips
            def get_trip_cols(connection):
                from sqlalchemy import inspect
                inspector = inspect(connection)
                return [c['name'] for c in inspector.get_columns('fleet_trips')]
            
            trip_cols = await conn.run_sync(get_trip_cols)
            if "trip_lead_name" not in trip_cols:
                print("Adding trip_lead_name column to fleet_trips...")
                await conn.execute(text("ALTER TABLE fleet_trips ADD COLUMN trip_lead_name VARCHAR(255) NULL"))
            if "trip_lead_contact" not in trip_cols:
                print("Adding trip_lead_contact column to fleet_trips...")
                await conn.execute(text("ALTER TABLE fleet_trips ADD COLUMN trip_lead_contact VARCHAR(255) NULL"))
            if "expected_return" not in trip_cols:
                print("Adding expected_return column to fleet_trips...")
                await conn.execute(text("ALTER TABLE fleet_trips ADD COLUMN expected_return DATETIME NULL"))
            print("fleet_trips table migration checked/applied.")

            # Check columns for fleet_passenger_manifest
            def get_passenger_cols(connection):
                from sqlalchemy import inspect
                inspector = inspect(connection)
                return [c['name'] for c in inspector.get_columns('fleet_passenger_manifest')]
            
            pass_cols = await conn.run_sync(get_passenger_cols)
            if "admission_number" not in pass_cols:
                print("Adding admission_number column to fleet_passenger_manifest...")
                await conn.execute(text("ALTER TABLE fleet_passenger_manifest ADD COLUMN admission_number VARCHAR(255) NULL"))
            if "emergency_contact_phone" not in pass_cols:
                print("Adding emergency_contact_phone column to fleet_passenger_manifest...")
                await conn.execute(text("ALTER TABLE fleet_passenger_manifest ADD COLUMN emergency_contact_phone VARCHAR(255) NULL"))
            if "added_via_scan" not in pass_cols:
                print("Adding added_via_scan column to fleet_passenger_manifest...")
                await conn.execute(text("ALTER TABLE fleet_passenger_manifest ADD COLUMN added_via_scan BOOLEAN DEFAULT FALSE"))
            print("fleet_passenger_manifest table migration checked/applied.")
            
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
                import uuid
                print("Seeding default External Sync API Key...")
                new_id = uuid.uuid4().hex
                await conn.execute(text(
                    "INSERT INTO system_configs (`id`, `key`, `value`, `category`, `is_encrypted`) "
                    f"VALUES ('{new_id}', 'external_sync_api_key', 'SmartCampusSync2026', 'api', 0)"
                ))
                print("External Sync API Key seeded.")
            else:
                print("External Sync API Key already exists.")
    except Exception as e:
        print(f"External sync migration skipped/failed: {e}")

async def migrate_system_configs():
    """Manual migration to ensure value in system_configs is of type TEXT."""
    print("Checking system_configs table schema...")
    try:
        async with engine.begin() as conn:
            # Modify column to Text so it doesn't truncate long JSON strings
            await conn.execute(text("ALTER TABLE system_configs MODIFY COLUMN value TEXT"))
            print("System Configs value column changed to TEXT successfully.")
    except Exception as e:
        print(f"System Configs migration skipped/failed: {e}")

async def migrate_notice_board():
    """Manual migration to create the notice_board table if not exists."""
    print("Checking notice_board table...")
    try:
        async with engine.begin() as conn:
            # Create notice_board table if it does not exist
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS notice_board (
                    id VARCHAR(36) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    attachment_url VARCHAR(255) DEFAULT NULL,
                    author_id VARCHAR(36) NOT NULL,
                    author_name VARCHAR(255) NOT NULL,
                    author_role VARCHAR(100) NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """))
            print("Notice board table checked/created successfully.")
    except Exception as e:
        print(f"Notice board table migration skipped/failed: {e}")
