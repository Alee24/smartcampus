
import asyncio
from sqlalchemy import select
from app.database import engine, AsyncSession
from app.models import User

async def migrate_status():
    async with AsyncSession(engine) as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        count = 0
        for user in users:
            old_status = user.status
            # Map old lowercase or legacy statuses to new ones
            if old_status == 'active':
                user.status = 'Active'
            elif old_status == 'suspended':
                user.status = 'Suspended'
            elif old_status == 'cleared':
                user.status = 'Registered'
            elif old_status == 'Unregistered':
                user.status = 'Registered'
            
            if user.status != old_status:
                session.add(user)
                count += 1
        
        await session.commit()
        print(f"Migrated {count} users to new status format.")

if __name__ == "__main__":
    asyncio.run(migrate_status())
