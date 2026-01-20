from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.models import User

router = APIRouter()

@router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    """Get notifications for current user"""
    # For now, return empty list
    # In future, this will query a notifications table
    return []
