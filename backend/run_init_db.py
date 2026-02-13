
import asyncio
import sys
import os

# Add the current directory to sys.path so we can import app
sys.path.append(os.getcwd())

from app.database import init_db

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    print("Initializing database tables...")
    try:
        asyncio.run(init_db())
        print("Tables created successfully.")
    except Exception as e:
        print(f"Error creating tables: {e}")
