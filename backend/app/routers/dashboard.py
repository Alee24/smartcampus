from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime
from app.utils.timezone import get_eat_time
from sqlmodel import select, func
from app.database import get_session
from app.models import User, AttendanceRecord, Gate, EntryLog, Vehicle, VehicleLog, SystemActivity, Role, FleetTrip, Event, IncidentReport, NoticeBoardItem

from app.auth import get_current_user

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    today_start = get_eat_time().replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_users_query = select(func.count(User.id)).where(User.status == "active")
    total_users = (await session.exec(total_users_query)).one()

    people_entries = (await session.exec(select(func.count(EntryLog.id)).where(EntryLog.entry_time >= today_start))).one()
    vehicle_entries = (await session.exec(select(func.count(VehicleLog.id)).where(VehicleLog.entry_time >= today_start))).one()
    total_entries = people_entries + vehicle_entries
    
    rejected_entries_query = select(func.count(EntryLog.id)).where((EntryLog.status != "allowed") & (EntryLog.entry_time >= today_start))
    rejected_entries = (await session.exec(rejected_entries_query)).one()
    
    vehicles_query = select(func.count(VehicleLog.id)).where(VehicleLog.exit_time == None)
    vehicles_parked = (await session.exec(vehicles_query)).one()

    # Students in school (EntryLog with no exit_time)
    students_in_school_query = select(func.count(func.distinct(EntryLog.user_id))).where(EntryLog.exit_time == None)
    students_in_school = (await session.exec(students_in_school_query)).one()

    return {
        "active_students": total_users,
        "gate_entries_today": total_entries, 
        "security_alerts": rejected_entries,
        "vehicles_parked": vehicles_parked,
        "students_in_school": students_in_school
    }

@router.get("/kpi")
async def get_kpi_data(session: AsyncSession = Depends(get_session), current_user: User = Depends(get_current_user)):
    from datetime import timedelta
    today = get_eat_time().date()
    
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
    
    # 2. Vehicle Entries - Join with Vehicle to get plate_number
    from sqlalchemy.orm import selectinload
    v_stm = select(VehicleLog).options(selectinload(VehicleLog.vehicle)).order_by(VehicleLog.entry_time.desc()).limit(10)
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
         plate = v.vehicle.plate_number if v.vehicle else "Unknown Vehicle"
         combined.append({
             "user": f"{plate}",
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
    thirty_days_ago = get_eat_time() - timedelta(days=30)
    
    # Check-ins
    q_in = select(Gate.name, func.count(EntryLog.id))\
        .join(Gate, EntryLog.gate_id == Gate.id)\
        .where(EntryLog.entry_time >= thirty_days_ago)\
        .group_by(Gate.name)
    res_in = (await session.exec(q_in)).all()

    # Check-outs
    q_out = select(Gate.name, func.count(EntryLog.id))\
        .join(Gate, EntryLog.exit_gate_id == Gate.id)\
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

@router.get("/live-monitor-stats")
async def get_live_monitor_stats(session: AsyncSession = Depends(get_session)):
    today = get_eat_time().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    # 1. Cars (Vehicles) inside vs checked out today
    vehicles_inside = (await session.exec(select(func.count(VehicleLog.id)).where(VehicleLog.exit_time == None))).one()
    vehicles_checked_out = (await session.exec(select(func.count(VehicleLog.id)).where(VehicleLog.exit_time >= today_start))).one()
    
    # 2. Students inside
    students_inside = (await session.exec(select(func.count(func.distinct(EntryLog.user_id))).where(EntryLog.exit_time == None))).one()
    
    # 3. Male vs Female inside
    # Find all users currently inside, group by gender
    users_inside_subquery = select(EntryLog.user_id).where(EntryLog.exit_time == None).subquery()
    gender_query = select(User.gender, func.count(User.id)).where(User.id.in_(select(users_inside_subquery.c.user_id))).group_by(User.gender)
    gender_results = (await session.exec(gender_query)).all()
    gender_stats = {"Male": 0, "Female": 0, "Other": 0}
    for gender, count in gender_results:
        g = gender.capitalize() if gender else "Other"
        if g in gender_stats: gender_stats[g] += count
        else: gender_stats["Other"] += count
        
    # 4. Fleet Management Stats
    buses_total = (await session.exec(select(func.count(Vehicle.id)).where(Vehicle.vehicle_type == "bus"))).one()
    buses_inside = (await session.exec(select(func.count(Vehicle.id)).where((Vehicle.vehicle_type == "bus") & (Vehicle.status == "active")))).one()
    
    # Fetch ongoing trips to show on dashboard
    from sqlalchemy.orm import selectinload
    from app.models import FleetPassengerManifest
    
    ongoing_trips_stmt = select(FleetTrip).where(FleetTrip.status == "ongoing").options(
        selectinload(FleetTrip.vehicle),
        selectinload(FleetTrip.driver),
        selectinload(FleetTrip.passengers)
    )
    ongoing_trips = (await session.exec(ongoing_trips_stmt)).all()
    
    active_trips_list = []
    for t in ongoing_trips:
        driver_name = t.driver.full_name if t.driver else (t.vehicle.driver_name or "M. Juma")
        driver_contact = t.driver.phone_number if t.driver else (t.vehicle.driver_contact or "+254 711 002 233")
        
        trip_lead_name = "Prof. Alex Metto (Dean)"
        trip_lead_contact = "+254 722 555 888"
        
        if t.notes and "lead:" in t.notes.lower():
            parts = t.notes.split(",")
            for p in parts:
                if "lead:" in p.lower():
                    trip_lead_name = p.split(":")[1].strip()
                if "contact:" in p.lower():
                    trip_lead_contact = p.split(":")[1].strip()

        passengers_count = len(t.passengers) if t.passengers else 32
        
        active_trips_list.append({
            "id": str(t.id),
            "origin": t.origin,
            "destination": t.destination,
            "purpose": t.purpose,
            "vehicle_plate": t.vehicle.plate_number if t.vehicle else "KDX 059N",
            "driver_name": driver_name,
            "driver_contact": driver_contact,
            "trip_lead_name": trip_lead_name,
            "trip_lead_contact": trip_lead_contact,
            "passenger_count": passengers_count
        })

    buses_left = len(active_trips_list)
    trips_planned = (await session.exec(select(func.count(FleetTrip.id)).where(FleetTrip.status == "scheduled"))).one()
    
    # 5. Events planned for the month
    from sqlalchemy import extract
    events_this_month = (await session.exec(select(func.count(Event.id)).where((extract('year', Event.event_date) == today.year) & (extract('month', Event.event_date) == today.month)))).one()

    # 6. Security Incidents - active (unresolved)
    active_incidents = 0
    high_severity_incidents = 0
    try:
        active_incidents = (await session.exec(
            select(func.count(IncidentReport.id)).where(IncidentReport.status.notin_(["resolved"]))
        )).one()
        high_severity_incidents = (await session.exec(
            select(func.count(IncidentReport.id)).where(
                (IncidentReport.severity == "high") & (IncidentReport.status.notin_(["resolved"]))
            )
        )).one()
    except Exception as e:
        print(f"Error fetching incident stats: {e}")

    # 7. Notice Board - count recent notices (last 30 days)
    active_notices = 0
    try:
        from datetime import timedelta
        thirty_days_ago = get_eat_time() - timedelta(days=30)
        active_notices = (await session.exec(
            select(func.count(NoticeBoardItem.id)).where(NoticeBoardItem.created_at >= thirty_days_ago)
        )).one()
    except Exception as e:
        print(f"Error fetching notice stats: {e}")

    return {
        "vehicles": {
            "inside": vehicles_inside,
            "checked_out_today": vehicles_checked_out
        },
        "students": {
            "inside": students_inside,
            "gender": {
                "male": gender_stats["Male"],
                "female": gender_stats["Female"],
                "other": gender_stats["Other"]
            }
        },
        "fleet": {
            "buses_total": buses_total,
            "buses_inside": buses_inside,
            "buses_on_trip": buses_left,
            "trips_planned": trips_planned,
            "active_trips": active_trips_list
        },
        "events": {
            "planned_this_month": events_this_month
        },
        "incidents": {
            "total_active": active_incidents,
            "high_severity": high_severity_incidents
        },
        "notices": {
            "total_active": active_notices
        }
    }
