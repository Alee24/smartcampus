import asyncio
import os
from sqlalchemy import text
from app.database import engine

async def update_schema():
    print("--- Checking Users Table Schema ---")
    async with engine.begin() as conn:
        # Check profile_image
        try:
            await conn.execute(text("SELECT profile_image FROM users LIMIT 1"))
            print("✓ 'profile_image' exists")
        except Exception:
            print("! 'profile_image' missing. Adding...")
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN profile_image VARCHAR(512)"))
                print("✓ Added 'profile_image'")
            except Exception as e:
                print(f"Error adding profile_image: {e}")

        # Check admission_date
        try:
            await conn.execute(text("SELECT admission_date FROM users LIMIT 1"))
            print("✓ 'admission_date' exists")
        except Exception:
            print("! 'admission_date' missing. Adding...")
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN admission_date DATE"))
                print("✓ Added 'admission_date'")
            except Exception as e:
                print(f"Error adding admission_date: {e}")

        # Check expiry_date
        try:
            await conn.execute(text("SELECT expiry_date FROM users LIMIT 1"))
            print("✓ 'expiry_date' exists")
        except Exception:
            print("! 'expiry_date' missing. Adding...")
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN expiry_date DATE"))
                print("✓ Added 'expiry_date'")
            except Exception as e:
                print(f"Error adding expiry_date: {e}")

    print("--- Schema Update Complete ---")

if __name__ == "__main__":
    if "backend" not in os.getcwd():
        os.chdir("backend") # Ensure we are in backend or relative path works
        if not os.path.exists("app"):
             # Try going one level deeper if we were in root
             if os.path.exists("backend/app"):
                 os.chdir("backend")

    asyncio.run(update_schema())
