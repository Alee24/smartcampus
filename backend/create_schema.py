import sqlalchemy
from sqlalchemy import create_engine, text

# Connection string without database selected
# Using pymysql which is likely installed given the error message
db_url = "mysql+pymysql://root:@127.0.0.1:3306" 

print(f"Connecting to {db_url} to create database 'gatepass'...")

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        # Commit is required for DDL statements if autocommit is not enabled
        conn.execute(text("CREATE DATABASE IF NOT EXISTS gatepass"))
        conn.commit()
    print("Database 'gatepass' created successfully (or already existed).")
except Exception as e:
    print(f"Error creating database: {e}")
