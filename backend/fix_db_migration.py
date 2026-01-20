import asyncio
import os
from sqlalchemy import text
from app.database import engine
from app.models import SQLModel

async def fix_database():
    print("--- Checking Database Schema ---")
    async with engine.begin() as conn:
        # 1. Check if 'qr_code' column exists in 'classrooms' table
        try:
            # Inspection is tricky with async, so we'll try to select the column
            await conn.execute(text("SELECT qr_code FROM classrooms LIMIT 1"))
            print("✓ 'qr_code' column exists in 'classrooms'")
        except Exception:
            print("! 'qr_code' column missing in 'classrooms'. Adding it...")
            try:
                # Add the column
                # Note: SQLite vs PostgreSQL/MySQL syntax. Assuming generic SQL or specific if needed.
                # For SQLite: ALTER TABLE classrooms ADD COLUMN qr_code TEXT;
                # For MySQL: ALTER TABLE classrooms ADD COLUMN qr_code TEXT;
                await conn.execute(text("ALTER TABLE classrooms ADD COLUMN qr_code TEXT"))
                print("✓ Added 'qr_code' column to 'classrooms'")
            except Exception as e:
                print(f"Error adding column: {e}")

        # 2. Check if 'system_config' table exists
        # We can try to create all tables again to ensure new ones are created
        # SQLModel.metadata.create_all only creates MISSING tables
        print("--- Ensuring all tables exist ---")
        await conn.run_sync(SQLModel.metadata.create_all)
        print("✓ Tables verified")

    print("--- Migration Complete ---")

if __name__ == "__main__":
    # Ensure current directory is backend
    if not os.path.exists("app"):
        print("Please run this script from the 'backend' directory")
    else:
        asyncio.run(fix_database())
