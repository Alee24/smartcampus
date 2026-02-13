import asyncio
from app.database import engine, init_db
from app.models import User, Role
from app.auth import get_password_hash
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker

async def seed_admin():
    print("--- 🚀 Admin Account Seeder 🚀 ---")
    
    try:
        # 0. Initialize Database
        print("1. Initializing database tables (create_all)...")
        await init_db()
        print("✅ Database tables checked/created.")
        
        # 1. Create Session
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        
        async with async_session() as session:
            # 2. Ensure SuperAdmin role exists
            print("2. Checking for SuperAdmin role...")
            role_stmt = select(Role).where(Role.name == "SuperAdmin")
            role_result = await session.exec(role_stmt)
            role = role_result.first()
            
            if not role:
                role = Role(name="SuperAdmin", description="System Administrator")
                session.add(role)
                await session.commit()
                await session.refresh(role)
                print("   - Created SuperAdmin role.")
            else:
                print("   - SuperAdmin role already exists.")

            # 3. Create/Update Admin User
            email = "smartcampus@kkdes.co.ke"
            password = "smartcampus"
            print(f"3. Seeding admin account: {email}...")
            
            user_stmt = select(User).where(User.email == email)
            user_result = await session.exec(user_stmt)
            user = user_result.first()
            
            if not user:
                user = User(
                    admission_number="ADMIN_ROOT",
                    full_name="System Administrator",
                    email=email,
                    hashed_password=get_password_hash(password),
                    role_id=role.id,
                    status="active"
                )
                session.add(user)
                print("   - Creating new admin user...")
            else:
                print("   - User exists, updating password...")
                user.hashed_password = get_password_hash(password)
                session.add(user)
            
            await session.commit()
            print(f"--- 🏁 SUCCESS: Admin account is ready! 🏁 ---")
            print(f"User: {email}")
            print(f"Pass: {password}")

    except Exception as e:
        print(f"❌ SEEDER ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(seed_admin())
