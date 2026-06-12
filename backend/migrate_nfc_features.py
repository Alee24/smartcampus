import asyncio
import sys
import os
from sqlalchemy import text
from app.database import engine

async def migrate_nfc_features():
    print("Migrating NFC Tagging features...")
    async with engine.begin() as conn:
        columns_to_add = {
            "nfc_card_uid": "VARCHAR(255) NULL",
            "nfc_written_at": "DATETIME NULL",
            "nfc_status": "VARCHAR(255) DEFAULT 'Active'"
        }
        
        # Get existing columns
        def get_cols(connection):
            from sqlalchemy import inspect
            inspector = inspect(connection)
            return [c['name'] for c in inspector.get_columns('users')]
        
        try:
            existing_cols = await conn.run_sync(get_cols)
        except Exception as e:
            print(f"   Error inspecting columns: {e}. Will attempt direct alteration.")
            existing_cols = []
            
        for col, definition in columns_to_add.items():
            if col not in existing_cols:
                try:
                    print(f"   Adding column {col}...")
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {definition}"))
                    print(f"   Column {col} added successfully")
                except Exception as ex:
                    print(f"   Failed to add column {col}: {ex}")
            else:
                print(f"   Column {col} already exists")
                
        # Create unique index for nfc_card_uid
        try:
            print("   Creating index on nfc_card_uid...")
            await conn.execute(text("CREATE UNIQUE INDEX idx_users_nfc_card_uid ON users(nfc_card_uid)"))
            print("   Index created/verified")
        except Exception as idx_ex:
            print(f"   Index creation skipped/failed (might already exist): {idx_ex}")
                
    await engine.dispose()
    print("NFC Features Database Migration Complete.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    if "backend" not in os.getcwd() and os.path.exists("backend"):
        os.chdir("backend")
        
    asyncio.run(migrate_nfc_features())
