import asyncio
import os
from sqlalchemy import text
from app.database import engine

async def force_schema():
    print("--- Forcing Schema Update ---")
    async with engine.begin() as conn:
        # Check Information Schema
        # Assuming DB name is 'gatepass' or derived from connection. 
        # But easier to just try ALTER IGNORE or catch duplicate
        
        columns = ["profile_image", "admission_date", "expiry_date"]
        types = ["VARCHAR(512)", "DATE", "DATE"]
        
        for col, col_type in zip(columns, types):
            try:
                print(f"Checking {col}...")
                await conn.execute(text(f"SELECT {col} FROM users LIMIT 1"))
                print(f"✓ {col} exists")
            except Exception as e:
                # Likely column missing
                print(f"! {col} missing ({str(e).split(']')[0]}). Adding...")
                try:
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                    print(f"✓ Added {col}")
                except Exception as add_e:
                    print(f"X Failed to add {col}: {add_e}")

    print("--- Done ---")

if __name__ == "__main__":
    import sys
    # Win32 SelectLoop fix
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    if "backend" not in os.getcwd():
        os.chdir("backend")
        
    asyncio.run(force_schema())
