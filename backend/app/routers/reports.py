from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func, col, case
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database import get_session
from app.models import User, EntryLog, VehicleLog, AttendanceRecord, Role, Gate, ClassSession
from app.auth import get_current_user
from datetime import datetime, timedelta
from typing import List, Dict, Any

router = APIRouter()

# Dependency: Ensure Admin (reused logic or strictly for reports)
async def ensure_admin(current_user: User = Depends(get_current_user)):
    # In a real app, check role. For now assuming accessible to authenticated users or check logic
    return current_user

@router.get("/summary")
async def get_summary_stats(session: AsyncSession = Depends(get_session), user: User = Depends(ensure_admin)):
    """High level counts for dashboard cards"""
    
    # Total Users
    total_users = (await session.exec(select(func.count(User.id)))).one()
    
    # Total Logs (All Time)
    total_entries = (await session.exec(select(func.count(EntryLog.id)))).one()
    
    # Entries Today
    today = datetime.utcnow().date()
    entries_today = (await session.exec(select(func.count(EntryLog.id)).where(func.date(EntryLog.entry_time) == today))).one()
    
    # Vehicles Parked (logs without exit time)
    vehicles_parked = (await session.exec(select(func.count(VehicleLog.id)).where(VehicleLog.exit_time == None))).one()
    
    # Attendance Rate (Simplified: Total Present / Total Records)
    # This might need refinement based on how you track 'absent'
    total_attendance = (await session.exec(select(func.count(AttendanceRecord.id)))).one()
    
    return {
        "total_users": total_users,
        "total_entries": total_entries,
        "entries_today": entries_today,
        "vehicles_parked": vehicles_parked,
        "total_attendance_records": total_attendance
    }

@router.get("/traffic/weekly")
async def get_weekly_traffic(session: AsyncSession = Depends(get_session), user: User = Depends(ensure_admin)):
    """Entries for the last 7 days"""
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=6)
    
    query = (
        select(func.date(EntryLog.entry_time).label("date"), func.count(EntryLog.id).label("count"))
        .where(func.date(EntryLog.entry_time) >= start_date)
        .group_by(func.date(EntryLog.entry_time))
        .order_by("date")
    )
    results = (await session.exec(query)).all()
    
    # Fill missing days
    data = {res.date: res.count for res in results}
    filled_data = []
    
    current = start_date
    while current <= end_date:
        filled_data.append({
            "date": current.strftime("%Y-%m-%d"), # Mon, Tue, etc.
            "day": current.strftime("%a"),
            "count": data.get(current, 0)
        })
        current += timedelta(days=1)
        
    return filled_data

@router.get("/traffic/gate")
async def get_gate_distribution(session: AsyncSession = Depends(get_session), user: User = Depends(ensure_admin)):
    """Entries split by Gate"""
    query = (
        select(Gate.name, func.count(EntryLog.id).label("count"))
        .join(EntryLog, Gate.id == EntryLog.gate_id)
        .group_by(Gate.name)
    )
    results = (await session.exec(query)).all()
    
    return [{"name": r[0], "value": r[1]} for r in results]

@router.get("/users/roles")
async def get_user_roles(session: AsyncSession = Depends(get_session), user: User = Depends(ensure_admin)):
    """User distribution by Role"""
    query = (
        select(Role.name, func.count(User.id))
        .join(User, Role.id == User.role_id)
        .group_by(Role.name)
    )
    results = (await session.exec(query)).all()
    
    return [{"name": r[0], "value": r[1]} for r in results]

@router.get("/traffic/peak-hours")
async def get_peak_hours(session: AsyncSession = Depends(get_session), user: User = Depends(ensure_admin)):
    """Average traffic by hour of day"""
    # Group by EXTRACT(HOUR from entry_time)
    # Note: Syntax varies by DB. Postgres: extract(hour from ...), MySQL: extract(hour from ...) or hour(...)
    
    # Universal way: 
    query = (
        select(func.extract('hour', EntryLog.entry_time).label("hour"), func.count(EntryLog.id))
        .group_by("hour")
        .order_by("hour")
    )
    try:
        results = (await session.exec(query)).all()
    except Exception:
        # Fallback for SQLite/Other nuances if needed, but MySQL/PG usually support extract
        # For SQLite: func.strftime('%H', ...)
        return []

    # Format 0-23
    data = {int(r[0]): r[1] for r in results if r[0] is not None}
    formatted = []
    for h in range(24):
        formatted.append({
            "hour": f"{h:02d}:00",
            "count": data.get(h, 0)
        })
        
    return formatted

@router.get("/security/flags")
async def get_security_flags(session: AsyncSession = Depends(get_session), user: User = Depends(ensure_admin)):
    """Rejected entries vs Allowed"""
    query = (
        select(EntryLog.status, func.count(EntryLog.id))
        .group_by(EntryLog.status)
    )
    results = (await session.exec(query)).all()
    return [{"status": r[0], "count": r[1]} for r in results]
