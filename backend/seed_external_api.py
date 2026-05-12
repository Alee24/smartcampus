import asyncio
import sys
import os

# Add the current directory to sys.path to allow importing 'app'
sys.path.append(os.getcwd())

from sqlmodel import select
from app.database import engine, get_session
from app.models import SystemConfig

async def seed_api_key():
    print("Seeding External Sync API Key...")
    api_key = "SmartCampusSync2026" # This is the default key I'm setting
    
    async for session in get_session():
        stmt = select(SystemConfig).where(SystemConfig.key == "external_sync_api_key")
        existing_config = (await session.exec(stmt)).first()
        
        if not existing_config:
            new_config = SystemConfig(
                key="external_sync_api_key",
                value=api_key,
                category="api",
                is_encrypted=False
            )
            session.add(new_config)
            print(f"Created new API Key: {api_key}")
        else:
            print(f"API Key already exists. Current value: {existing_config.value}")
        
        await session.commit()
        break
    print("Seeding complete.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_api_key())
