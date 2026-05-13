import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.database import engine
from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession

async def fix_schema():
    print("Ensuring fleet tables and columns exist...")
    async with engine.begin() as conn:
        # 1. Create tables if they don't exist (using the metadata)
        from app.models import SQLModel
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # 2. Manual column additions for existing tables
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
            "owner_id": "CHAR(36)"
        }
        
        try:
            def get_cols(connection):
                from sqlalchemy import inspect
                inspector = inspect(connection)
                return [c['name'] for c in inspector.get_columns('vehicles')]
            
            columns = await conn.run_sync(get_cols)
            
            for col, type_ in new_vehicle_cols.items():
                if col not in columns:
                    print(f"Adding column {col} to vehicles table...")
                    await conn.execute(text(f"ALTER TABLE vehicles ADD COLUMN {col} {type_}"))
        except Exception as e:
            print("Error migrating vehicles table:", e)

        # 3. Fix fleet_trips driver_id
        try:
            await conn.execute(text("ALTER TABLE fleet_trips MODIFY driver_id CHAR(36) NULL;"))
            print("Fixed fleet_trips")
        except Exception as e:
            print("fleet_trips error:", e)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(fix_schema())
