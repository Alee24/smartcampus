from sqlalchemy import create_engine, text
import sys

def nuke_db():
    print("Connecting to MySQL Root to recreate database...")
    # Connect without DB selected
    engine = create_engine("mysql+pymysql://root:@127.0.0.1:3306/")
    try:
        with engine.connect() as conn:
            # Force close connections? Difficult in simple script.
            # Assuming valid env.
            print("Dropping database 'gatepass'...")
            conn.execute(text("DROP DATABASE IF EXISTS gatepass"))
            print("Creating database 'gatepass'...")
            conn.execute(text("CREATE DATABASE gatepass"))
            print("Database Recreated successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    nuke_db()
