import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate_indexes():
    print("Starting index migration...")
    
    # Indexes to add: table, index_name, column
    indexes = [
        ("entry_logs", "ix_entry_logs_entry_time", "entry_time"),
        ("gate_scan_logs", "ix_gate_scan_logs_timestamp", "timestamp"),
        ("vehicle_logs", "ix_vehicle_logs_entry_time", "entry_time"),
        ("system_activities", "ix_system_activities_timestamp", "timestamp")
    ]
    
    try:
        async with engine.begin() as conn:
            for table, idx_name, col in indexes:
                try:
                    print(f"Creating index {idx_name} on {table}({col})...")
                    # In MySQL, to avoid duplicate index errors safely without complex checks,
                    # we can catch the exception. Or we can check if it exists.
                    # MySQL doesn't have CREATE INDEX IF NOT EXISTS before 8.0 natively in a simple way,
                    # so we just try and catch.
                    await conn.execute(text(f"CREATE INDEX {idx_name} ON {table}({col})"))
                    print(f"Index {idx_name} created.")
                except Exception as e:
                    if "Duplicate key name" in str(e):
                        print(f"Index {idx_name} already exists. Skipping.")
                    else:
                        print(f"Error creating index {idx_name}: {e}")
            
            print("Index migration completed.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    asyncio.run(migrate_indexes())
