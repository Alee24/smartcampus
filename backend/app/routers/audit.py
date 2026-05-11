from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, desc
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import datetime, date
from app.database import get_session
from app.models import AuditLog, User, Role
from app.auth import get_current_user

router = APIRouter()

async def check_admin(user: User, session: AsyncSession):
    # Fetch role name
    role = await session.get(Role, user.role_id)
    if not role or role.name != "SuperAdmin":
        raise HTTPException(status_code=403, detail="Unauthorized: Admin access required")
    return True

@router.get("")
async def get_audit_logs(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    action_type: Optional[str] = None,
    user_id: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Fetch audit logs with filters (Admin only)"""
    await check_admin(current_user, session)
    
    query = select(AuditLog).order_by(desc(AuditLog.timestamp))
    
    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time())
        query = query.where(AuditLog.timestamp >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time())
        query = query.where(AuditLog.timestamp <= end_dt)
    if action_type:
        query = query.where(AuditLog.action_type == action_type)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
        
    # Standard limit to avoid crashing frontend with too much data
    query = query.limit(500)
        
    results = await session.exec(query)
    logs = results.all()
    
    return logs
