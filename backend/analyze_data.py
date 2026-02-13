import asyncio
from sqlmodel import select
from app.database import get_session
from app.models import User

async def analyze_data():
    print("Analyzing data...")
    async for session in get_session():
        users = (await session.exec(select(User).limit(20))).all()
        print(f"Sample Users ({len(users)}):")
        for u in users:
            print(f" - {u.admission_number} | {u.full_name} | {u.role_id}")
            
        break

if __name__ == "__main__":
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(analyze_data())
