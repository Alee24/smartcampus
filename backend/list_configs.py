
import asyncio
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database import engine
from app.models import SystemConfig

async def check():
    async with AsyncSession(engine) as s:
        configs = (await s.exec(select(SystemConfig))).all()
        print([c.key for c in configs])

if __name__ == "__main__":
    asyncio.run(check())
