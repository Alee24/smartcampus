import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Migrating User table (Phase 2)...")
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN first_name VARCHAR(255);"))
            print("Added first_name.")
        except Exception as e:
            print(f"Skipped first_name: {e}")

        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN last_name VARCHAR(255);"))
            print("Added last_name.")
        except Exception as e:
            print(f"Skipped last_name: {e}")

        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR(255);"))
            print("Added phone_number.")
        except Exception as e:
            print(f"Skipped phone_number: {e}")

        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN guardian_id CHAR(36);")) # UUID stores as char(36) usually or binary. Using string for safety in MySQL/SQLite common setups
            # Note: If PostgreSQL, use UUID type. SQLModel UUID is usually CHAR(36) in MySQL.
            print("Added guardian_id.")
        except Exception as e:
            print(f"Skipped guardian_id: {e}")
            
        print("Migration V2 complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
