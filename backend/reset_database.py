import asyncio
import pymysql
from sqlalchemy import text
from app.database import engine, DATABASE_URL
from app.auth import get_password_hash

async def reset_database():
    """Clear all data and reset admin credentials"""
    
    # First, create the database if it doesn't exist
    print("🔧 Ensuring database exists...")
    try:
        # Connect to MySQL without specifying database
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='',
            charset='utf8mb4'
        )
        cursor = connection.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS gatepass")
        cursor.execute("USE gatepass")
        connection.commit()
        cursor.close()
        connection.close()
        print("✅ Database 'gatepass' is ready!")
    except Exception as e:
        print(f"⚠️  Database creation note: {e}")
    
    async with engine.begin() as conn:
        print("\n🗑️  Clearing all database tables...")
        
        # Drop all tables in reverse order of dependencies
        tables = [
            "cheating_flags",
            "attendance_records",
            "class_sessions",
            "classes",
            "courses",
            "vehicle_logs",
            "vehicles",
            "entry_logs",
            "user_faces",
            "users",
            "gates",
            "roles",
            "system_config"
        ]
        
        for table in tables:
            try:
                await conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                print(f"   ✓ Dropped table: {table}")
            except Exception as e:
                print(f"   ⚠ Could not drop {table}: {e}")
        
        print("\n✅ Database cleared successfully!")
        print("\n🔄 Recreating tables...")
        
    # Recreate tables using SQLModel
    from app.database import init_db
    await init_db()
    print("✅ Tables recreated!")
    
    # Seed fresh admin data
    print("\n👤 Creating admin user...")
    from app.database import get_session
    from app.models import Role, User, Gate
    from sqlmodel import select
    
    async for session in get_session():
        # Create SuperAdmin role
        admin_role = Role(name="SuperAdmin", description="System Administrator")
        session.add(admin_role)
        await session.commit()
        await session.refresh(admin_role)
        
        # Create Student role
        student_role = Role(name="Student", description="Regular Student")
        session.add(student_role)
        
        # Create Lecturer role
        lecturer_role = Role(name="Lecturer", description="Academic Staff")
        session.add(lecturer_role)
        
        # Create Guardian role
        guardian_role = Role(name="Guardian", description="Parent or Guardian")
        session.add(guardian_role)
        
        # Create Security role
        security_role = Role(name="Security", description="Gate & Patrol")
        session.add(security_role)
        
        await session.commit()
        
        # Create admin user with default credentials
        hashed_password = get_password_hash("Admin123!")
        admin_user = User(
            admission_number="ADMIN001",
            full_name="System Administrator",
            first_name="System",
            last_name="Administrator",
            email="admin@smartcampus.edu",
            phone_number="+254700000000",
            hashed_password=hashed_password,
            role_id=admin_role.id,
            school="Administration",
            status="active",
            has_smartphone=True
        )
        session.add(admin_user)
        
        # Create main gate
        main_gate = Gate(name="Main Gate", location="Main Entrance")
        session.add(main_gate)
        
        await session.commit()
        
        print("\n" + "="*60)
        print("✅ DATABASE RESET COMPLETE!")
        print("="*60)
        print("\n🔑 NEW ADMIN CREDENTIALS:")
        print(f"   Email:     admin@smartcampus.edu")
        print(f"   Password:  Admin123!")
        print(f"\n   OR")
        print(f"\n   Admission: ADMIN001")
        print(f"   Password:  Admin123!")
        print("\n" + "="*60)
        print("⚠️  IMPORTANT: Change this password after first login!")
        print("="*60 + "\n")
        
        break  # Exit after first session

if __name__ == "__main__":
    asyncio.run(reset_database())
