from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime
from sqlmodel import select, func
from app.database import get_session
from app.models import User, AttendanceRecord, Gate, EntryLog, Vehicle, VehicleLog, SystemActivity

from app.auth import get_current_user

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_users_query = select(func.count(User.id)).where(User.status == "active")
    total_users = (await session.exec(total_users_query)).one()

    people_entries = (await session.exec(select(func.count(EntryLog.id)).where(EntryLog.entry_time >= today_start))).one()
    vehicle_entries = (await session.exec(select(func.count(VehicleLog.id)).where(VehicleLog.entry_time >= today_start))).one()
    total_entries = people_entries + vehicle_entries
    
    rejected_entries_query = select(func.count(EntryLog.id)).where((EntryLog.status != "allowed") & (EntryLog.entry_time >= today_start))
    rejected_entries = (await session.exec(rejected_entries_query)).one()
    
    vehicles_query = select(func.count(VehicleLog.id)).where(VehicleLog.exit_time == None)
    vehicles_parked = (await session.exec(vehicles_query)).one()

    return {
        "active_students": total_users,
        "gate_entries_today": total_entries, 
        "security_alerts": rejected_entries,
        "vehicles_parked": vehicles_parked
    }

@router.get("/kpi")
async def get_kpi_data(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    current_year = datetime.utcnow().year
    data = []
    for month in range(1, 13):
         start = datetime(current_year, month, 1)
         if month == 12: end = datetime(current_year + 1, 1, 1)
         else: end = datetime(current_year, month + 1, 1)
         q1 = select(func.count(EntryLog.id)).where((EntryLog.entry_time >= start) & (EntryLog.entry_time < end))
         c1 = (await session.exec(q1)).one()
         q2 = select(func.count(VehicleLog.id)).where((VehicleLog.entry_time >= start) & (VehicleLog.entry_time < end))
         c2 = (await session.exec(q2)).one()
         data.append(c1 + c2)
         
    max_val = max(data) if max(data) > 0 else 1
    normalized = [int((x / max_val) * 100) for x in data]
    return {"raw": data, "normalized": normalized, "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]}

@router.get("/recent-logs")
async def get_recent_logs(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    # 1. Gate Entries
    p_stm = select(EntryLog).order_by(EntryLog.entry_time.desc()).limit(10)
    p_logs = (await session.exec(p_stm)).all()
    
    # 2. Vehicle Entries
    v_stm = select(VehicleLog).order_by(VehicleLog.entry_time.desc()).limit(10)
    v_logs = (await session.exec(v_stm)).all()
    
    # 3. System Activity (New)
    sa_stm = select(SystemActivity).order_by(SystemActivity.timestamp.desc()).limit(10)
    sa_logs = (await session.exec(sa_stm)).all()
    
    combined = []
    
    # Process Gate Logs
    for p in p_logs:
         user = await session.get(User, p.user_id)
         user_name = user.full_name if user else "Unknown User"
         combined.append({
             "user": user_name,
             "time_obj": p.entry_time,
             "time": p.entry_time.strftime("%H:%M %p"),
             "status": f"Gate: {p.status.title()}",
             "isAlert": p.status != "allowed"
         })

    # Process Vehicle Logs
    for v in v_logs:
         combined.append({
             "user": f"{v.plate_number}",
             "time_obj": v.entry_time,
             "time": v.entry_time.strftime("%H:%M %p"),
             "status": "Vehicle Entry",
             "isAlert": False
         })
         
    # Process System Activity
    for sa in sa_logs:
         actor_name = "System"
         if sa.actor_id:
             actor = await session.get(User, sa.actor_id)
             if actor: actor_name = actor.full_name
         
         is_alert = "FAIL" in sa.action_type or "ALERT" in sa.action_type
         
         # Beautify Status
         desc = sa.description
         if len(desc) > 30: desc = desc[:30] + "..."
         
         combined.append({
             "user": actor_name,
             "time_obj": sa.timestamp,
             "time": sa.timestamp.strftime("%H:%M %p"),
             "status": desc,
             "isAlert": is_alert
         })
         
    # Sort by time descend
    combined.sort(key=lambda x: x["time_obj"], reverse=True)
    
    # Limit to 15 items for richer dashboard
    final_logs = combined[:15]
    
    # Remove time_obj
    for item in final_logs:
        del item["time_obj"]
        
    return final_logs

@router.get("/guardian")
async def get_guardian_dashboard(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    # 1. Fetch Wards
    wards_query = select(User).where(User.guardian_id == current_user.id)
    wards = (await session.exec(wards_query)).all()
    
    ward_data = []
    
    for ward in wards:
        # Get Last Gate Entry
        entry_q = select(EntryLog).where(EntryLog.user_id == ward.id).order_by(EntryLog.entry_time.desc()).limit(1)
        last_entry = (await session.exec(entry_q)).first()
        
        # Get Last Class Attendance
        att_q = select(AttendanceRecord).where(AttendanceRecord.student_id == ward.id).order_by(AttendanceRecord.scan_time.desc()).limit(1)
        last_attendance = (await session.exec(att_q)).first()
        
        # Determine Current Status (In School / Out of School)
        # Simple logic: If last gate log was 'exit' -> Out, 'entry' -> In. 
        # If no logs, assumed Out or Unknown.
        location_status = "Unknown"
        last_seen = "Never"
        
        if last_entry:
            last_seen = last_entry.entry_time.strftime("%d %b %H:%M")
            if last_entry.direction == "entry":
                location_status = "In Campus"
            elif last_entry.direction == "exit":
                location_status = "Checked Out"
        
        ward_data.append({
            "id": ward.id,
            "full_name": ward.full_name,
            "admission_number": ward.admission_number,
            "profile_image": ward.profile_image,
            "school": ward.school,
            "status": ward.status, # Academic status
            "location_status": location_status,
            "last_seen": last_seen,
            "last_class": last_attendance.scan_time.strftime("%d %b %H:%M") if last_attendance else "No Records"
        })
        
    return {
        "guardian_name": current_user.full_name,
        "wards": ward_data
    }
