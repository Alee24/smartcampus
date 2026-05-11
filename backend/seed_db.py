import asyncio
import sys
import os

# Add the current directory to sys.path so we can import app
sys.path.append(os.getcwd())

from app.database import get_session
from app.main import seed_data

async def main():
    print("🌱 Seeding database...")
    try:
        async for session in get_session():
            await seed_data(session)
            print("✅ Seeding complete.")
            break
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())
