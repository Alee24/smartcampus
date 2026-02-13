import asyncio
import os
from sqlmodel import select, Session
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker

# Import app components
from app.database import engine, init_db
from app.models import User, Role
from app.auth import get_password_hash, verify_password

async def diagnostic_seed():
    print("==========================================")
    print("   🛡️ SMART CAMPUS ADMIN RECOVERY 🛡️   ")
    print("==========================================")
    
    try:
        # 1. Initialize DB
        print("\n[1/4] Initializing Database Schema...")
        await init_db()
        print("✅ Database tables confirmed.")

        # 2. Setup Session
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        
        async with async_session() as session:
            # 3. Handle Role
            print("\n[2/4] Ensuring 'SuperAdmin' role exists...")
            role_stmt = select(Role).where(Role.name == "SuperAdmin")
            role_result = await session.exec(role_stmt)
            role = role_result.first()
            
            if not role:
                print("   - Creating missing SuperAdmin role...")
                role = Role(name="SuperAdmin", description="System Administrator")
                session.add(role)
                await session.commit()
                await session.refresh(role)
            print(f"✅ Role ID: {role.id}")

            # 4. Handle User
            email = "smartcampus@kkdes.co.ke"
            password = "smartcampus"
            print(f"\n[3/4] Forcefully resetting Admin: {email}...")
            
            user_stmt = select(User).where(User.email == email)
            user_result = await session.exec(user_stmt)
            user = user_result.first()
            
            hashed_pw = get_password_hash(password)
            
            if not user:
                print("   - User not found. Creating new...")
                user = User(
                    admission_number="ROOT_ADMIN",
                    full_name="System Administrator",
                    school="Administration",
                    email=email,
                    hashed_password=hashed_pw,
                    role_id=role.id,
                    status="active",
                    has_smartphone=True
                )
                session.add(user)
            else:
                print("   - User found. Overwriting password and status...")
                user.hashed_password = hashed_pw
                user.status = "active"
                user.role_id = role.id # Ensure it has the right role
                session.add(user)
            
            await session.commit()
            print("✅ Database commit successful.")

            # 5. Diagnostic Verification
            print("\n[4/4] Running Diagnostic Verification...")
            # Re-fetch to be absolutely sure
            user_check = (await session.exec(select(User).where(User.email == email))).first()
            
            if not user_check:
                print("❌ ERROR: User still not found in database after commit!")
                return

            is_valid = verify_password(password, user_check.hashed_password)
            if is_valid:
                print("✅ PASSWORD VERIFICATION: SUCCESS (Local)")
            else:
                print("❌ PASSWORD VERIFICATION: FAILED (Hashing Mismatch!)")
                print(f"   Debug - Plain: {password}")
                print(f"   Debug - Hashed: {user_check.hashed_password}")

            print("\n==========================================")
            print("         🚀 LOGIN INSTRUCTIONS 🚀        ")
            print("==========================================")
            print(f"  URL: https://smartcampus.kkdes.co.ke")
            print(f"  EMAIL: {email}")
            print(f"  PASSWORD: {password}")
            print("==========================================")

    except Exception as e:
        print(f"\n❌ FATAL ERROR DURING SEEDING: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(diagnostic_seed())
