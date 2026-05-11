import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Using host port 3307 to connect from local machine
ASYNC_DATABASE_URL = "mysql+aiomysql://gatepass_user:user_password@127.0.0.1:3307/gatepass_v2"
engine = create_async_engine(ASYNC_DATABASE_URL)

async def check_schema():
    async with engine.connect() as conn:
        print("--- system_configs ---")
        result = await conn.execute(text("DESCRIBE system_configs"))
        for row in result:
            print(row)
        
        print("\n--- audit_logs ---")
        result = await conn.execute(text("DESCRIBE audit_logs"))
        for row in result:
            print(row)

if __name__ == "__main__":
    asyncio.run(check_schema())
