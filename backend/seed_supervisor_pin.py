
import asyncio
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database import engine
from app.models import SystemConfig

async def seed():
    async with AsyncSession(engine) as s:
        stmt = select(SystemConfig).where(SystemConfig.key == "supervisor_pin")
        config = (await s.exec(stmt)).first()
        if not config:
            new_config = SystemConfig(
                key="supervisor_pin",
                value="1234", # Default PIN
                category="security",
                is_encrypted=False
            )
            s.add(new_config)
            await s.commit()
            print("Seeded default supervisor_pin: 1234")
        else:
            print(f"supervisor_pin already exists: {config.value}")

if __name__ == "__main__":
    asyncio.run(seed())
