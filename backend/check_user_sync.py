from sqlalchemy import create_engine, text
from app.auth import get_password_hash
from uuid import uuid4

def create_admin():
    db_url = "mysql+pymysql://root:@127.0.0.1:3306/gatepass_db"
    engine = create_engine(db_url)
    print("Connected to DB...")
    with engine.connect() as conn:
        # 1. Ensure Role Exists
        res = conn.execute(text("SELECT id FROM roles WHERE name='admin'"))
        role_row = res.first()
        if not role_row:
            print("Creating 'admin' role...")
            role_id = uuid4().hex
            conn.execute(text("INSERT INTO roles (id, name, description) VALUES (:id, 'admin', 'System Administrator')"), {"id": role_id})
            conn.commit()
        else:
            role_id = role_row[0]
            print(f"Found 'admin' role: {role_id}")

        # 2. Ensure User Exists
        res = conn.execute(text("SELECT id FROM users WHERE email='mettoalex@gmail.com'"))
        user_row = res.first()
        
        pwd = get_password_hash("Digital2025")
        
        if user_row:
            print("User exists. Resetting password...")
            conn.execute(text("UPDATE users SET hashed_password=:p, role_id=:rid, status='active' WHERE email='mettoalex@gmail.com'"), {"p": pwd, "rid": role_id})
            conn.commit()
            print("✅ Password reset to 'Digital2025'.")
        else:
            print("Creating user 'mettoalex@gmail.com'...")
            user_id = uuid4().hex
            # Using raw SQL to avoid model validation complexity in script
            conn.execute(text("""
                INSERT INTO users (
                    id, email, hashed_password, full_name, 
                    admission_number, school, role_id, 
                    status, has_smartphone, created_at
                ) VALUES (
                    :id, 'mettoalex@gmail.com', :p, 'Metto Alex', 
                    'ADMIN-001', 'System', :rid, 
                    'active', 1, NOW()
                )
            """), {"id": user_id, "p": pwd, "rid": role_id})
            conn.commit()
            print("✅ User created successfully.")

if __name__ == "__main__":
    create_admin()
