import asyncio
import sys
from sqlalchemy import create_engine, text

# Local engine mapping to exposed port 3307
engine = create_engine("mysql+pymysql://gatepass_user:user_password@127.0.0.1:3307/gatepass_v2")

def inspect():
    with engine.connect() as conn:
        print("--- Inspecting fleet_trips structure ---")
        try:
            res = conn.execute(text("SHOW CREATE TABLE fleet_trips"))
            row = res.fetchone()
            print("Create Table:")
            print(row[1])
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    inspect()
