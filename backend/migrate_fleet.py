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
            
        # 2b. Set is_fleet = True for existing fleet vehicles based on their type
        try:
            print("Setting is_fleet=True for actual fleet vehicles...")
            await conn.execute(text("UPDATE vehicles SET is_fleet = 1 WHERE vehicle_type IN ('bus', 'shuttle', 'field', 'utility')"))
        except Exception as e:
            print("Error updating is_fleet flag:", e)
            
        # 3. Fix fleet_trips driver_id
        try:
            print("Disabling foreign key checks for schema alter...")
            await conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            
            # Modify column to be nullable
            await conn.execute(text("ALTER TABLE fleet_trips MODIFY driver_id CHAR(36) NULL;"))
            print("Successfully made driver_id nullable.")
            
            print("Re-enabling foreign key checks...")
            await conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
            print("Fixed fleet_trips schema successfully!")
        except Exception as e:
            # Ensure they are re-enabled in case of failure
            try:
                await conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
            except Exception:
                pass
            print("fleet_trips error:", e)

        # 4. Add trip_lead_name and trip_lead_contact to fleet_trips
        try:
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
        except Exception as e:
            print("Error migrating fleet_trips table columns:", e)

        # 5. Add admission_number and emergency_contact_phone to fleet_passenger_manifest
        try:
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
        except Exception as e:
            print("Error migrating fleet_passenger_manifest table columns:", e)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(fix_schema())
