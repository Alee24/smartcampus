import os
import asyncio
from sqlmodel import Session, create_engine, select
from app.models import User, Role
from app.core.config import settings

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+aiomysql://gatepass_user:user_password@db:3306/gatepass_v2")
# Convert to synchronous for simple script
SYNC_DATABASE_URL = DATABASE_URL.replace("+aiomysql", "")
engine = create_engine(SYNC_DATABASE_URL)

def cleanup_junk_users():
    with Session(engine) as session:
        # 1. Identify junk users
        # Logic: Auto-created users have full_name equal to admission_number and school is 'General'
        # Also target common camera prefixes
        statement = select(User).where(
            (User.full_name == User.admission_number) & (User.school == "General")
        )
        junk_users = session.exec(statement).all()
        
        # 2. Filtering for common camera/photo junk prefixes
        to_delete = []
        for u in junk_users:
            adm = u.admission_number.upper()
            if adm.startswith(("IMG_", "DSCN", "DSC_", "PHOTO", "STUDENT_PHOTO", "PROFILE")):
                to_delete.append(u)
            elif len(adm) < 4: # Very short IDs that might be junk
                to_delete.append(u)
        
        count = len(to_delete)
        if count == 0:
            print("No junk users found to delete.")
            return

        print(f"Found {count} junk users. Examples: {[u.admission_number for u in to_delete[:5]]}")
        
        # 3. Delete them
        for u in to_delete:
            session.delete(u)
        
        session.commit()
        print(f"Successfully deleted {count} junk user records.")

if __name__ == "__main__":
    cleanup_junk_users()
