"""
Comprehensive DB Fix & Admin Reset Script
Run inside the backend container:
  docker exec -it gatepass_backend python fix_db_and_admin.py
"""
import asyncio
from sqlalchemy import text
from sqlmodel import select
from app.database import engine
from app.models import User, Role, SQLModel
from app.auth import get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

# All columns that may be missing from the 'users' table
USER_COLUMNS = [
    ("profile_image", "VARCHAR(500) DEFAULT NULL"),
    ("admission_date", "DATE DEFAULT NULL"),
    ("expiry_date", "DATE DEFAULT NULL"),
    ("first_name", "VARCHAR(255) DEFAULT NULL"),
    ("last_name", "VARCHAR(255) DEFAULT NULL"),
    ("phone_number", "VARCHAR(50) DEFAULT NULL"),
    ("gender", "VARCHAR(20) DEFAULT NULL"),
    ("program", "VARCHAR(255) DEFAULT NULL"),
    ("guardian_id", "CHAR(32) DEFAULT NULL"),
    ("pin", "VARCHAR(50) DEFAULT '2424'"),
    ("pin_setup_required", "TINYINT(1) DEFAULT 1"),
]

# Columns for other tables that may be missing
OTHER_COLUMNS = [
    ("entry_logs", "entry_time", "DATETIME DEFAULT NULL"),
    ("gate_scan_logs", "timestamp", "DATETIME DEFAULT NULL"),
    ("vehicle_logs", "entry_time", "DATETIME DEFAULT NULL"),
    ("system_activities", "timestamp", "DATETIME DEFAULT NULL"),
]

async def fix_database():
    print("=" * 60)
    print("  Smart Campus - Database Fix & Admin Reset")
    print("=" * 60)
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with engine.begin() as conn:
        # Step 1: Create any missing tables
        print("\n📦 Step 1: Creating missing tables...")
        await conn.run_sync(SQLModel.metadata.create_all)
        print("   ✅ All tables ensured.")
        
        # Step 2: Add missing columns to users table
        print("\n🔧 Step 2: Adding missing columns to 'users'...")
        for col_name, col_def in USER_COLUMNS:
            try:
                await conn.execute(text(
                    f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"
                ))
                print(f"   ✅ Added: users.{col_name}")
            except Exception as e:
                if "Duplicate column" in str(e):
                    print(f"   ⏭️  Skipped (exists): users.{col_name}")
                else:
                    print(f"   ⚠️  users.{col_name}: {e}")

        # Step 3: Add indexes to timestamp columns
        print("\n📊 Step 3: Adding performance indexes...")
        index_targets = [
            ("idx_entry_logs_entry_time", "entry_logs", "entry_time"),
            ("idx_gate_scan_logs_timestamp", "gate_scan_logs", "timestamp"),
            ("idx_vehicle_logs_entry_time", "vehicle_logs", "entry_time"),
            ("idx_system_activities_timestamp", "system_activities", "timestamp"),
            ("idx_audit_logs_timestamp", "audit_logs", "timestamp"),
            ("idx_audit_logs_action_type", "audit_logs", "action_type"),
        ]
        for idx_name, table, col in index_targets:
            try:
                await conn.execute(text(
                    f"CREATE INDEX {idx_name} ON {table}({col})"
                ))
                print(f"   ✅ Created index: {idx_name}")
            except Exception as e:
                if "Duplicate" in str(e) or "exists" in str(e):
                    print(f"   ⏭️  Skipped (exists): {idx_name}")
                else:
                    print(f"   ⚠️  {idx_name}: {e}")

    # Step 4: Reset admin user
    print("\n👤 Step 4: Resetting admin credentials...")
    async with async_session() as session:
        # Find existing admin
        result = await session.exec(
            select(User).where(
                (User.admission_number == "ADMIN001") | 
                (User.email == "mettoalex@gmail.com") |
                (User.email == "admin@smartcampus.edu")
            )
        )
        admin = result.first()
        
        # Ensure SuperAdmin role exists
        role_result = await session.exec(select(Role).where(Role.name == "SuperAdmin"))
        role = role_result.first()
        if not role:
            role = Role(name="SuperAdmin", description="Full system access")
            session.add(role)
            await session.commit()
            await session.refresh(role)
            print("   ✅ Created SuperAdmin role")
        
        if admin:
            admin.email = "mettoalex@gmail.com"
            admin.hashed_password = get_password_hash("Digital2025")
            admin.status = "Active"
            admin.role_id = role.id
            session.add(admin)
            await session.commit()
            print(f"   ✅ Updated existing admin: {admin.full_name}")
        else:
            new_admin = User(
                admission_number="ADMIN001",
                full_name="System Administrator",
                email="mettoalex@gmail.com",
                hashed_password=get_password_hash("Digital2025"),
                school="Administration",
                role_id=role.id,
                status="Active",
                pin="2424",
                pin_setup_required=False,
            )
            session.add(new_admin)
            await session.commit()
            print("   ✅ Created new admin user")
        
    print("\n" + "=" * 60)
    print("  ✅ ALL DONE!")
    print("  Login: mettoalex@gmail.com / Digital2025")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(fix_database())
