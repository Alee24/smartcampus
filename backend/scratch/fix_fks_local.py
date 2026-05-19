from sqlalchemy import create_engine, text

engine = create_engine("mysql+pymysql://gatepass_user:user_password@127.0.0.1:3307/gatepass_v2")

def fix():
    with engine.connect() as conn:
        with conn.begin():
            print("Disabling foreign key checks...")
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            
            print("Altering fleet_trips driver_id column...")
            conn.execute(text("ALTER TABLE fleet_trips MODIFY driver_id CHAR(32) NULL;"))
            print("Successfully made driver_id nullable!")
            
            print("Re-enabling foreign key checks...")
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))

if __name__ == "__main__":
    fix()
