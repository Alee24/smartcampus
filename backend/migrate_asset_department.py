import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate_asset_department():
    async with engine.begin() as conn:
        print("🔧 Checking database columns for 'assets' table...")
        
        # Check if department column exists in assets table
        try:
            await conn.execute(text("SELECT department FROM assets LIMIT 1"))
            print("✓ 'department' column already exists in 'assets' table.")
        except Exception:
            print("! 'department' column is missing in 'assets' table. Adding it...")
            try:
                await conn.execute(text("ALTER TABLE assets ADD COLUMN department VARCHAR(255) NULL"))
                await conn.execute(text("CREATE INDEX idx_asset_department ON assets (department)"))
                print("✓ Successfully added 'department' column with index.")
            except Exception as e:
                print(f"❌ Error adding 'department' column: {e}")

        print("✅ Asset table migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate_asset_department())
