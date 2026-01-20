import sys
import os
sys.path.append(os.getcwd())

from app.routers import users
from fastapi import APIRouter

print("--- Inspecting Users Router ---")
for route in users.router.routes:
    print(f"Path: {route.path} | Methods: {route.methods} | Name: {route.name}")
