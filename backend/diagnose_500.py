import asyncio
import os
import sys
from sqlmodel import select
from sqlalchemy import text
from app.database import engine, get_session
from app.models import User, Role

async def diagnose():
    print("--- 🩺 Smart Campus Backend Diagnosis ---")
    
    # 1. Check DB Connection
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT 1"))
            print("✅ Database Connection: SUCCESS")
    except Exception as e:
        print(f"❌ Database Connection: FAILED - {e}")
        return

    async for session in get_session():
        # 2. Check Roles
        try:
            roles = (await session.exec(select(Role))).all()
            print(f"✅ Roles Table: {len(roles)} roles found")
            for r in roles:
                print(f"   - {r.name} ({r.id})")
        except Exception as e:
            print(f"❌ Roles Table Check: FAILED - {e}")

        # 3. Check Admin User
        try:
            admin_email = "mettoalex@gmail.com"
            user = (await session.exec(select(User).where(User.email == admin_email))).first()
            if user:
                print(f"✅ Admin User Found: {user.email}")
                print(f"   - Role ID: {user.role_id}")
                print(f"   - Status: {user.status}")
                
                # Check if role_id is valid
                role = await session.get(Role, user.role_id)
                if role:
                    print(f"   - Role Name: {role.name}")
                else:
                    print(f"   - ⚠ Role ID {user.role_id} DOES NOT EXIST in roles table!")
            else:
                print(f"❌ Admin User {admin_email}: NOT FOUND")
        except Exception as e:
            print(f"❌ User Table Check: FAILED - {e}")

        # 4. Check for schema mismatches
        try:
            async with engine.connect() as conn:
                def check_cols(connection):
                    from sqlalchemy import inspect
                    inspector = inspect(connection)
                    return [c['name'] for c in inspector.get_columns('users')]
                cols = await conn.run_sync(check_cols)
                print(f"✅ User Columns: {', '.join(cols)}")
        except Exception as e:
            print(f"❌ Schema Check: FAILED - {e}")
        
        break

if __name__ == "__main__":
    asyncio.run(diagnose())
