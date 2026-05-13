import asyncio
import os
import sys
from sqlalchemy import text
from sqlmodel import select

# Add current directory to path
sys.path.append(os.getcwd())

from app.database import engine

async def diagnose_fleet():
    print("--- Diagnosing Fleet Registration Issue ---")
    async with engine.connect() as conn:
        # 1. Check if vehicles table exists
        try:
            res = await conn.execute(text("SHOW TABLES LIKE 'vehicles'"))
            if not res.fetchone():
                print("[ERROR] Table 'vehicles' does not exist!")
            else:
                print("[OK] Table 'vehicles' exists.")
                
                # Check columns
                res = await conn.execute(text("DESCRIBE vehicles"))
                cols = [r[0] for r in res.fetchall()]
                print(f"[INFO] Vehicles columns: {cols}")
                
                required = ['plate_number', 'vehicle_type', 'fuel_type', 'owner_id', 'status']
                for r in required:
                    if r not in cols:
                        print(f"[ERROR] Missing column: {r}")
        except Exception as e:
            print(f"[ERROR] Failed to check vehicles table: {e}")

        # 2. Check audit_logs table
        try:
            res = await conn.execute(text("SHOW TABLES LIKE 'audit_logs'"))
            if not res.fetchone():
                print("[ERROR] Table 'audit_logs' does not exist!")
            else:
                print("[OK] Table 'audit_logs' exists.")
        except Exception as e:
            print(f"[ERROR] Failed to check audit_logs table: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(diagnose_fleet())
