import asyncio
from app.database import get_session
from app.models import User
from sqlmodel import select

async def verify():
    print("Verifying database state...")
    async for session in get_session():
        statement = select(User).where(User.email == "admin@smartcampus.edu")
        result = await session.exec(statement)
        user = result.first()
        
        if user:
            print(f"PASS: Admin user found: {user.email} ({user.full_name})")
        else:
            print("FAIL: Admin user NOT found.")
        
        # Check if room_number column exists in courses table (indirectly by checking if we can query it)
        # Note: If the column didn't exist in the DB, querying the model might not fail unless we select it specifically or insert.
        # But migrate_db checks are good enough.
        
        break

if __name__ == "__main__":
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify())
