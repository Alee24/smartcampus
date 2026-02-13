import asyncio
from sqlalchemy import text
from app.database import engine

async def fix_table():
    print("Starting DB Fix...")
    async with engine.begin() as conn:
        try:
            # Add gate_id column
            print("Attempting to add gate_id column...")
            await conn.execute(text("ALTER TABLE visitors ADD COLUMN gate_id CHAR(36) NULL;"))
            print("Success: Added gate_id column")
        except Exception as e:
            print(f"Note: gate_id might already exist or error: {e}")

        try:
            # Add visitor_type column
            print("Attempting to add visitor_type column...")
            await conn.execute(text("ALTER TABLE visitors ADD COLUMN visitor_type VARCHAR(50) DEFAULT 'visitor';"))
            print("Success: Added visitor_type column")
        except Exception as e:
             print(f"Note: visitor_type might already exist or error: {e}")
    
    print("DB Fix Complete.")

if __name__ == "__main__":
    asyncio.run(fix_table())
