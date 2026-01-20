import asyncio
from app.database import engine
from app.models import SQLModel, ScanLog # Import ScanLog explicitly to ensure registration
from sqlalchemy import text

async def create_tables():
    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        print("Tables created.")

if __name__ == "__main__":
    asyncio.run(create_tables())
