import asyncio
import os
from sqlalchemy import text
from app.database import engine

async def migrate():
    print("Starting migration: Adding pin columns to users table...")
    async with engine.begin() as conn:
        try:
            # Add pin column if not exists
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS pin VARCHAR(10) DEFAULT '2424'"))
            print("Successfully added 'pin' column (or it already exists).")
            
            # Add pin_setup_required column if not exists
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_setup_required BOOLEAN DEFAULT TRUE"))
            print("Successfully added 'pin_setup_required' column (or it already exists).")
            
            # Update existing users who don't have a pin or pin_setup_required set
            # (In case they were added during the transition)
            await conn.execute(text("UPDATE users SET pin = '2424' WHERE pin IS NULL"))
            await conn.execute(text("UPDATE users SET pin_setup_required = TRUE WHERE pin_setup_required IS NULL"))
            
            print("Migration completed successfully.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
