from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func, col, case
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database import get_session
from app.models import User, EntryLog, VehicleLog, AttendanceRecord, Role, Gate, ClassSession, IncidentReport
from app.auth import get_current_user
from datetime import datetime, timedelta
from app.utils.timezone import get_eat_time
from typing import List, Dict, Any, Optional

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
    today = get_eat_time().date()
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
    end_date = get_eat_time().date()
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

from app.models import Vehicle

@router.get("/detailed")
async def get_detailed_report(
    date: str = Query(None),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(ensure_admin)
):
    """Generate detailed daily reports containing scans, vehicles, and key metrics."""
    if not date:
        date_obj = get_eat_time().date()
    else:
        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    
    start_dt = datetime.combine(date_obj, datetime.min.time())
    end_dt = datetime.combine(date_obj, datetime.max.time())
    
    # 1. Fetch People Entry Logs for the given day
    query_entries = (
        select(EntryLog)
        .where(EntryLog.entry_time >= start_dt, EntryLog.entry_time <= end_dt)
        .order_by(EntryLog.entry_time.desc())
    )
    entries = (await session.exec(query_entries)).all()
    
    entry_list = []
    # Batch-fetch flagged users for this date's entries
    entry_user_ids = [e.user_id for e in entries if e.user_id]
    flagged_user_ids = set()
    if entry_user_ids:
        try:
            flagged_stmt = select(IncidentReport.target_user_id).where(
                (IncidentReport.target_user_id.in_(entry_user_ids)) &
                (IncidentReport.status.notin_(["resolved"]))
            )
            flagged_results = (await session.exec(flagged_stmt)).all()
            flagged_user_ids = {str(uid) for uid in flagged_results if uid is not None}
        except Exception as e:
            print(f"Error fetching flagged users: {e}")

    for entry in entries:
        user_obj = None
        role_name = "User"
        try:
            user_stmt = select(User).where(User.id == entry.user_id)
            user_res = await session.exec(user_stmt)
            user_obj = user_res.first()
            if user_obj:
                role_stmt = select(Role).where(Role.id == user_obj.role_id)
                role_res = await session.exec(role_stmt)
                role_obj = role_res.first()
                if role_obj:
                    role_name = role_obj.name
        except Exception as e:
            print(f"Error loading user for entry: {e}")
            
        gate_name = "Unknown Gate"
        try:
            gate_stmt = select(Gate).where(Gate.id == entry.gate_id)
            gate_res = await session.exec(gate_stmt)
            gate_obj = gate_res.first()
            if gate_obj:
                gate_name = gate_obj.name
        except Exception as e:
            print(f"Error loading gate for entry: {e}")

        exit_gate_name = "-"
        try:
            if entry.exit_gate_id:
                exit_gate_stmt = select(Gate).where(Gate.id == entry.exit_gate_id)
                exit_gate_res = await session.exec(exit_gate_stmt)
                exit_gate_obj = exit_gate_res.first()
                if exit_gate_obj:
                    exit_gate_name = exit_gate_obj.name
        except Exception as e:
            print(f"Error loading exit gate for entry: {e}")
            
        guard_name = "System"
        try:
            if entry.guard_id:
                guard_stmt = select(User).where(User.id == entry.guard_id)
                guard_res = await session.exec(guard_stmt)
                guard_obj = guard_res.first()
                if guard_obj:
                    guard_name = guard_obj.full_name
        except Exception as e:
            print(f"Error loading guard for entry: {e}")
            
        is_flagged = str(entry.user_id) in flagged_user_ids if entry.user_id else False
        entry_list.append({
            "id": str(entry.id),
            "name": user_obj.full_name if user_obj else "Unknown User",
            "email": user_obj.email if user_obj else "-",
            "role": role_name,
            "gate": gate_name,
            "exit_gate": exit_gate_name,
            "entry_time": entry.entry_time.isoformat() if entry.entry_time else None,
            "exit_time": entry.exit_time.isoformat() if entry.exit_time else None,
            "method": entry.method,
            "guard": guard_name,
            "status": entry.status,
            "is_flagged": is_flagged,
        })

    # 2. Fetch Vehicle Scan Logs for the given day
    query_vehicles = (
        select(VehicleLog)
        .where(VehicleLog.entry_time >= start_dt, VehicleLog.entry_time <= end_dt)
        .order_by(VehicleLog.entry_time.desc())
    )
    vehicle_logs = (await session.exec(query_vehicles)).all()
    
    vehicle_list = []
    for vlog in vehicle_logs:
        vehicle_obj = None
        try:
            vehicle_stmt = select(Vehicle).where(Vehicle.id == vlog.vehicle_id)
            vehicle_res = await session.exec(vehicle_stmt)
            vehicle_obj = vehicle_res.first()
        except Exception as e:
            print(f"Error loading vehicle for log: {e}")
            
        gate_name = "Unknown Gate"
        try:
            gate_stmt = select(Gate).where(Gate.id == vlog.gate_id)
            gate_res = await session.exec(gate_stmt)
            gate_obj = gate_res.first()
            if gate_obj:
                gate_name = gate_obj.name
        except Exception as e:
            print(f"Error loading gate for vehicle: {e}")

        exit_gate_name = "-"
        try:
            if vlog.exit_gate_id:
                exit_gate_stmt = select(Gate).where(Gate.id == vlog.exit_gate_id)
                exit_gate_res = await session.exec(exit_gate_stmt)
                exit_gate_obj = exit_gate_res.first()
                if exit_gate_obj:
                    exit_gate_name = exit_gate_obj.name
        except Exception as e:
            print(f"Error loading exit gate for vehicle: {e}")
            
        guard_name = "System"
        try:
            if vlog.guard_id:
                guard_stmt = select(User).where(User.id == vlog.guard_id)
                guard_res = await session.exec(guard_stmt)
                guard_obj = guard_res.first()
                if guard_obj:
                    guard_name = guard_obj.full_name
        except Exception as e:
            print(f"Error loading guard for vehicle: {e}")
            
        vehicle_list.append({
            "id": str(vlog.id),
            "plate_number": vehicle_obj.plate_number if vehicle_obj else "Unknown Plate",
            "driver_name": vehicle_obj.driver_name if vehicle_obj else "-",
            "vehicle_type": vehicle_obj.vehicle_type if vehicle_obj else "utility",
            "gate": gate_name,
            "exit_gate": exit_gate_name,
            "entry_time": vlog.entry_time.isoformat() if vlog.entry_time else None,
            "exit_time": vlog.exit_time.isoformat() if vlog.exit_time else None,
            "guard": guard_name
        })

    # 3. Calculate Daily Metrics Summary
    total_people_in = len([e for e in entry_list if e["status"] == "allowed"])
    total_people_out = len([e for e in entry_list if e["exit_time"] is not None])
    total_students = len([e for e in entry_list if e["role"].lower() == "student"])
    total_rejected = len([e for e in entry_list if e["status"] == "rejected"])
    
    total_visitors = len([e for e in entry_list if e["role"].lower() not in ["student", "staff", "admin", "superadmin", "guard"]])
    
    total_vehicles = len(vehicle_list)
    total_deliveries = len([v for v in vehicle_list if v["vehicle_type"].lower() in ["utility", "delivery"]])
    
    total_classes = 0
    try:
        class_stmt = select(func.count(ClassSession.id)).where(
            func.date(ClassSession.start_time) == date_obj
        )
        class_res = await session.exec(class_stmt)
        total_classes = class_res.one()
    except Exception as e:
        print(f"Error calculating classes: {e}")

    return {
        "date": date_obj.strftime("%Y-%m-%d"),
        "metrics": {
            "people_entered": total_people_in,
            "people_exited": total_people_out,
            "visitors_entered": total_visitors,
            "rejected_attempts": total_rejected,
            "vehicles_entered": total_vehicles,
            "deliveries_logged": total_deliveries,
            "classes_held": total_classes,
            "students_entered": total_students
        },
        "entry_logs": entry_list,
        "vehicle_logs": vehicle_list
    }


# ─────────────────────────────────────────────────────────────────────────────
# System-Wide Reports Hub Endpoints
# ─────────────────────────────────────────────────────────────────────────────

from app.models import IncidentReport, LostAndFoundItem, AttendanceRecord
from datetime import date as date_type

@router.get("/hub/incidents")
async def get_incidents_report(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(ensure_admin)
):
    """Incidents report with serial numbers and optional filters."""
    stmt = select(IncidentReport).order_by(IncidentReport.created_at.desc())
    if status:
        stmt = stmt.where(IncidentReport.status == status)
    if severity:
        stmt = stmt.where(IncidentReport.severity == severity)
    if date_from:
        try:
            df = datetime.strptime(date_from, "%Y-%m-%d")
            stmt = stmt.where(IncidentReport.created_at >= df)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.strptime(date_to, "%Y-%m-%d")
            from datetime import time
            stmt = stmt.where(IncidentReport.created_at <= datetime.combine(dt.date(), time.max))
        except ValueError:
            pass

    incidents = (await session.exec(stmt)).all()

    # Total unfiltered count for serial numbering
    total_stmt = select(func.count(IncidentReport.id))
    if date_from or date_to or status or severity:
        # Use filtered total for relative serial within the current filter
        total_stmt = stmt.with_only_columns(func.count(IncidentReport.id))
    try:
        total = (await session.exec(select(func.count(IncidentReport.id)))).one()
    except Exception:
        total = len(incidents)

    enriched = []
    for idx, inc in enumerate(incidents):
        reporter = await session.get(User, inc.reporter_id)
        target = await session.get(User, inc.target_user_id) if inc.target_user_id else None
        serial_num = total - idx
        enriched.append({
            "serial_number": f"INC-{serial_num:04d}",
            "id": str(inc.id),
            "title": inc.title,
            "reporter_name": reporter.full_name if reporter else "Unknown",
            "target_name": target.full_name if target else (inc.target_name_external or "-"),
            "location": inc.location,
            "severity": inc.severity,
            "status": inc.status,
            "incident_date": inc.incident_date.isoformat(),
            "created_at": inc.created_at.isoformat()
        })

    return {
        "total": len(enriched),
        "items": enriched,
        "summary": {
            "total": len(enriched),
            "resolved": len([i for i in enriched if i["status"] == "resolved"]),
            "open": len([i for i in enriched if i["status"] != "resolved"]),
            "high_severity": len([i for i in enriched if i["severity"] == "high"]),
            "medium_severity": len([i for i in enriched if i["severity"] == "medium"]),
            "low_severity": len([i for i in enriched if i["severity"] == "low"]),
        }
    }


@router.get("/hub/lost-found")
async def get_lost_found_report(
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(ensure_admin)
):
    """Lost & Found items report with serial numbers and optional filters."""
    stmt = select(LostAndFoundItem).order_by(LostAndFoundItem.created_at.desc())
    if status:
        stmt = stmt.where(LostAndFoundItem.status == status)
    if date_from:
        try:
            df = date_type.fromisoformat(date_from)
            stmt = stmt.where(LostAndFoundItem.date_found >= df)
        except ValueError:
            pass
    if date_to:
        try:
            dt = date_type.fromisoformat(date_to)
            stmt = stmt.where(LostAndFoundItem.date_found <= dt)
        except ValueError:
            pass

    items = (await session.exec(stmt)).all()

    try:
        total = (await session.exec(select(func.count(LostAndFoundItem.id)))).one()
    except Exception:
        total = len(items)

    enriched = []
    for idx, item in enumerate(items):
        handler = await session.get(User, item.handler_id)
        claimant = await session.get(User, item.claimant_id) if item.claimant_id else None
        serial_num = total - idx
        enriched.append({
            "serial_number": f"LNF-{serial_num:04d}",
            "id": str(item.id),
            "item_name": item.item_name,
            "description": item.description,
            "location_found": item.location_found,
            "date_found": item.date_found.isoformat(),
            "status": item.status,
            "finder_name": item.finder_name or "Anonymous",
            "claimant_name": (claimant.full_name if claimant else item.claimant_name) or "-",
            "date_claimed": item.date_claimed.isoformat() if item.date_claimed else None,
            "handler_name": handler.full_name if handler else "Unknown",
            "created_at": item.created_at.isoformat()
        })

    return {
        "total": len(enriched),
        "items": enriched,
        "summary": {
            "total": len(enriched),
            "found": len([i for i in enriched if i["status"] == "found"]),
            "claimed": len([i for i in enriched if i["status"] == "claimed"]),
            "disposed": len([i for i in enriched if i["status"] == "disposed"]),
        }
    }


@router.get("/hub/users")
async def get_users_report(
    role_filter: Optional[str] = Query(None, alias="role"),
    status_filter: Optional[str] = Query(None, alias="status"),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(ensure_admin)
):
    """All registered users report with role and status filters."""
    stmt = select(User).order_by(User.created_at.desc())
    if status_filter:
        stmt = stmt.where(User.status == status_filter)

    users = (await session.exec(stmt)).all()

    enriched = []
    for idx, u in enumerate(users):
        role_obj = await session.get(Role, u.role_id) if u.role_id else None
        role_name = role_obj.name if role_obj else "Unknown"
        # Optional role filter
        if role_filter and role_name.lower().replace(" ", "") != role_filter.lower().replace(" ", ""):
            continue
        serial_num = len(users) - idx
        enriched.append({
            "serial_number": f"USR-{serial_num:04d}",
            "id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "admission_number": u.admission_number or "-",
            "phone_number": u.phone_number or "-",
            "role": role_name,
            "status": u.status or "active",
            "school": u.school or "-",
            "gender": u.gender or "-",
            "created_at": u.created_at.isoformat() if u.created_at else None
        })

    return {
        "total": len(enriched),
        "items": enriched,
        "summary": {
            "total": len(enriched),
            "active": len([u for u in enriched if u["status"] == "active"]),
            "flagged": len([u for u in enriched if u["status"] == "flagged"]),
            "inactive": len([u for u in enriched if u["status"] not in ["active", "flagged"]]),
        }
    }


@router.get("/hub/attendance")
async def get_attendance_report(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(ensure_admin)
):
    """Attendance records report with date range filter."""
    stmt = select(AttendanceRecord).order_by(AttendanceRecord.timestamp.desc())
    if date_from:
        try:
            df = datetime.strptime(date_from, "%Y-%m-%d")
            stmt = stmt.where(AttendanceRecord.timestamp >= df)
        except ValueError:
            pass
    if date_to:
        try:
            from datetime import time
            dt = datetime.strptime(date_to, "%Y-%m-%d")
            stmt = stmt.where(AttendanceRecord.timestamp <= datetime.combine(dt.date(), time.max))
        except ValueError:
            pass

    records = (await session.exec(stmt)).all()

    enriched = []
    for idx, rec in enumerate(records):
        student = await session.get(User, rec.user_id) if rec.user_id else None
        serial_num = len(records) - idx
        enriched.append({
            "serial_number": f"ATT-{serial_num:04d}",
            "id": str(rec.id),
            "student_name": student.full_name if student else "Unknown",
            "admission_number": student.admission_number if student else "-",
            "course_name": rec.course_name or "-",
            "room_code": rec.room_code or "-",
            "timestamp": rec.timestamp.isoformat() if rec.timestamp else None,
            "method": rec.method or "scan",
            "is_successful": rec.is_successful
        })

    return {
        "total": len(enriched),
        "items": enriched,
        "summary": {
            "total": len(enriched),
            "successful": len([r for r in enriched if r["is_successful"]]),
            "failed": len([r for r in enriched if not r["is_successful"]]),
        }
    }
