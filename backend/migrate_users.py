import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Migrating User table...")
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN profile_image VARCHAR(255);"))
            print("Added profile_image.")
        except Exception as e:
            print(f"Skipped profile_image: {e}")

        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN admission_date DATE;"))
            print("Added admission_date.")
        except Exception as e:
            print(f"Skipped admission_date: {e}")

        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN expiry_date DATE;"))
            print("Added expiry_date.")
        except Exception as e:
            print(f"Skipped expiry_date: {e}")
            
        print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
