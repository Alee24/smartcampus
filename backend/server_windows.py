import asyncio
import sys
import uvicorn
import os

# CRITICAL: Set the event loop policy BEFORE any other imports that might create a loop
if sys.platform == 'win32':
    print("Forcing Windows SelectorEventLoopPolicy...")
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Ensure static directories exist
os.makedirs("static/profiles", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

if __name__ == "__main__":
    print("Starting Gatepass Backend on Windows...")
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=False, 
        workers=1,
        loop="asyncio"
    )
