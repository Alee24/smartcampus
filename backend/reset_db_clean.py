import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.database import engine, init_db
from sqlalchemy import text

async def clean_reset():
    print("🚀 Starting ultra-resilient database reset...")
    async with engine.begin() as conn:
        # 1. Disable Foreign Key Checks
        print("Disabling foreign key checks...")
        await conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        
        # 2. Get list of all tables
        print("Fetching all tables in database...")
        result = await conn.execute(text("SHOW TABLES;"))
        tables = [row[0] for row in result.fetchall()]
        
        # 3. Drop all tables
        if tables:
            print(f"Found {len(tables)} tables: {', '.join(tables)}")
            for table in tables:
                print(f"Dropping table: {table}...")
                await conn.execute(text(f"DROP TABLE IF EXISTS `{table}`;"))
            print("All existing tables dropped successfully!")
        else:
            print("No existing tables found.")
            
        # 4. Re-enable Foreign Key Checks
        print("Re-enabling foreign key checks...")
        await conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        
    print("\nRecreating all tables from latest SQLModel schemas...")
    await init_db()
    print("Database tables recreated successfully!")
    print("\n" + "="*50)
    print("CLEAN RESET COMPLETE! Ready for seeding.")
    print("="*50 + "\n")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(clean_reset())
