import os
from sqlalchemy import create_engine, text

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+aiomysql://gatepass_user:user_password@db:3306/gatepass_v2")
# Convert to synchronous for raw SQLAlchemy
SYNC_DATABASE_URL = DATABASE_URL.replace("aiomysql", "pymysql")

engine = create_engine(SYNC_DATABASE_URL)

def cleanup_junk_users():
    # Junk criteria: full_name == admission_number, school == 'General', and has junk prefix
    # OR admission_number starts with IMG_, DSCN, etc.
    
    junk_prefixes = ("IMG_", "DSCN", "DSC_", "PHOTO", "PROFILE", "STUDENT_PHOTO")
    
    query = text("""
        DELETE FROM users 
        WHERE (full_name = admission_number AND school = 'General')
        OR (admission_number LIKE 'IMG_%')
        OR (admission_number LIKE 'DSCN%')
        OR (admission_number LIKE 'DSC_%')
        OR (admission_number LIKE 'PHOTO%')
        OR (admission_number LIKE 'PROFILE%')
    """)
    
    count_query = text("""
        SELECT COUNT(*) FROM users 
        WHERE (full_name = admission_number AND school = 'General')
        OR (admission_number LIKE 'IMG_%')
        OR (admission_number LIKE 'DSCN%')
        OR (admission_number LIKE 'DSC_%')
        OR (admission_number LIKE 'PHOTO%')
        OR (admission_number LIKE 'PROFILE%')
    """)

    with engine.connect() as conn:
        # Count first
        result = conn.execute(count_query)
        count = result.scalar()
        
        if count == 0:
            print("No junk users found to delete.")
            return

        print(f"Found {count} junk users. Deleting now...")
        
        # Delete
        conn.execute(query)
        conn.commit()
        print(f"Successfully deleted {count} junk user records.")

if __name__ == "__main__":
    cleanup_junk_users()
