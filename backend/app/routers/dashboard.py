from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime
from sqlmodel import select, func
from app.database import get_session
from app.models import User, AttendanceRecord, Gate, EntryLog, Vehicle, VehicleLog, SystemActivity, Role

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
    from datetime import timedelta
    today = datetime.utcnow().date()
    
    data = []
    labels = []
    people_data = []
    vehicle_data = []
    
    # Last 7 Days Trend
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        start = datetime.combine(day, datetime.min.time())
        end = datetime.combine(day, datetime.max.time())
        
        # People Entries
        q1 = select(func.count(EntryLog.id)).where((EntryLog.entry_time >= start) & (EntryLog.entry_time <= end))
        c1 = (await session.exec(q1)).one()
        
        # Vehicle Entries
        q2 = select(func.count(VehicleLog.id)).where((VehicleLog.entry_time >= start) & (VehicleLog.entry_time <= end))
        c2 = (await session.exec(q2)).one()
        
        total = c1 + c2
        data.append(total)
        people_data.append(c1)
        vehicle_data.append(c2)
        labels.append(day.strftime("%a")) # Mon, Tue...

    max_val = max(data) if data and max(data) > 0 else 10
    # Normalize to 100% height
    normalized = [int((x / max_val) * 100) for x in data]
    
    return {
        "raw": data,
        "normalized": normalized,
        "labels": labels,
        "details": {
            "people": people_data,
            "vehicles": vehicle_data
        }
    }

@router.get("/recent-logs")
async def get_recent_logs(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    # 1. Gate Entries
    p_stm = select(EntryLog).order_by(EntryLog.entry_time.desc()).limit(10)
    p_logs = (await session.exec(p_stm)).all()
    
    # 2. Vehicle Entries
    v_stm = select(VehicleLog).order_by(VehicleLog.entry_time.desc()).limit(10)
    v_logs = (await session.exec(v_stm)).all()
    
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

@router.get("/analytics")
async def get_analytics(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    from datetime import timedelta
    
    # 1. Active User Roles
    # Correctly join with Role table to get role name
    roles_q = select(Role.name, func.count(User.id)).where(User.role_id == Role.id).where(User.status == "active").group_by(Role.name)
    roles_res = (await session.exec(roles_q)).all()
    roles_data = [{"name": r, "value": c} for r, c in roles_res]
    
    # 2. Gate Usage (Last 30 Days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # Check-ins
    q_in = select(Gate.name, func.count(EntryLog.id))\
        .join(Gate)\
        .where(EntryLog.entry_time >= thirty_days_ago)\
        .group_by(Gate.name)
    res_in = (await session.exec(q_in)).all()

    # Check-outs
    q_out = select(Gate.name, func.count(EntryLog.id))\
        .join(Gate)\
        .where(EntryLog.exit_time >= thirty_days_ago)\
        .group_by(Gate.name)
    res_out = (await session.exec(q_out)).all()
    
    # Merge results
    gate_stats = {}
    for name, count in res_in:
        gate_stats.setdefault(name, {"checkins": 0, "checkouts": 0})
        gate_stats[name]["checkins"] = count
        
    for name, count in res_out:
        gate_stats.setdefault(name, {"checkins": 0, "checkouts": 0})
        gate_stats[name]["checkouts"] = count
        
    gates_data = [{"name": k, "checkins": v["checkins"], "checkouts": v["checkouts"]} for k, v in gate_stats.items()]
    
    return {
        "roles": roles_data,
        "gates": gates_data
    }
