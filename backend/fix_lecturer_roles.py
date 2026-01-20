"""
Migration Script: Fix Lecturer Roles
This script identifies users who should be lecturers and updates their role.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# Database URL
DATABASE_URL = "mysql+pymysql://root:@127.0.0.1:3306/gatepass"

def fix_lecturer_roles():
    """Fix users with LEC admission numbers to have Lecturer role"""
    engine = create_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(bind=engine)
    
    with SessionLocal() as session:
        # Get Lecturer role ID
        lecturer_role = session.execute(
            text("SELECT id, name FROM roles WHERE name = 'Lecturer'")
        ).first()
        
        if not lecturer_role:
            print("❌ Lecturer role not found in database!")
            return
        
        lecturer_role_id = lecturer_role[0]
        print(f"✓ Found Lecturer role (ID: {lecturer_role_id})")
        
        # Find all users with LEC prefix
        users_to_fix = session.execute(
            text("""
                SELECT u.id, u.full_name, u.admission_number, r.name as role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.admission_number LIKE 'LEC%'
            """)
        ).fetchall()
        
        if not users_to_fix:
            print("✓ No users found with LEC prefix. Nothing to fix.")
            return
        
        print(f"\n📋 Found {len(users_to_fix)} users with LEC admission numbers:")
        
        fixed_count = 0
        for user in users_to_fix:
            user_id, full_name, admission_number, current_role = user
            print(f"  - {full_name} ({admission_number}) - Current: {current_role or 'None'}")
            
            if current_role != 'Lecturer':
                session.execute(
                    text("UPDATE users SET role_id = :role_id WHERE id = :user_id"),
                    {"role_id": lecturer_role_id, "user_id": user_id}
                )
                fixed_count += 1
        
        if fixed_count > 0:
            session.commit()
            print(f"\n✅ Successfully updated {fixed_count} users to Lecturer role!")
        else:
            print(f"\n✓ All {len(users_to_fix)} users already have correct Lecturer role.")

def main():
    print("=" * 60)
    print("LECTURER ROLE MIGRATION")
    print("=" * 60)
    print()
    
    try:
        fix_lecturer_roles()
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print()
    print("=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()
