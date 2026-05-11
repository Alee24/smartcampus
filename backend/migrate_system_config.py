
import asyncio
from sqlalchemy import text
from app.database import engine

async def comprehensive_migration():
    print("Running comprehensive schema migration...")
    try:
        async with engine.begin() as conn:
            # Helper to check if column exists and get its type
            def get_table_info(connection, table_name):
                from sqlalchemy import inspect
                inspector = inspect(connection)
                if not inspector.has_table(table_name):
                    return None
                return inspector.get_columns(table_name)

            # 1. SystemConfig.value -> LONGTEXT
            print("Upgrading system_configs.value...")
            await conn.execute(text("ALTER TABLE system_configs MODIFY COLUMN value LONGTEXT"))
            
            # 2. SystemActivity.description -> TEXT
            print("Upgrading system_activities.description...")
            await conn.execute(text("ALTER TABLE system_activities MODIFY COLUMN description TEXT"))
            
            # 3. GateScanLog.details -> TEXT
            print("Upgrading gate_scan_logs.details...")
            await conn.execute(text("ALTER TABLE gate_scan_logs MODIFY COLUMN details TEXT"))
            
            # 4. FleetTrip.notes -> TEXT
            print("Upgrading fleet_trips.notes...")
            await conn.execute(text("ALTER TABLE fleet_trips MODIFY COLUMN notes TEXT"))
            
            # 5. AuditLog.description -> TEXT (if not already)
            print("Upgrading audit_logs.description...")
            await conn.execute(text("ALTER TABLE audit_logs MODIFY COLUMN description TEXT"))
            
            print("Comprehensive migration successful.")
                    
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    asyncio.run(comprehensive_migration())
