
import asyncio
import aiomysql
import os

async def create_database():
    try:
        print("Connecting to MySQL server...")
        # Connect without specifying a db to create one
        conn = await aiomysql.connect(host='127.0.0.1', port=3306,
                                      user='root', password='')
        cursor = await conn.cursor()
        
        print("Creating database 'gatepass_db' if it doesn't exist...")
        await cursor.execute("CREATE DATABASE IF NOT EXISTS gatepass_db")
        print("Database created (or already exists).")
        
        await cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error creating database: {e}")

if __name__ == "__main__":
    asyncio.run(create_database())
