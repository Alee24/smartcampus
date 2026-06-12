from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Request, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import User, EntryLog, Gate, Vehicle, VehicleLog, Visitor, Event, GateScanLog
from app.utils.audit import log_action
from app.auth import get_current_user, get_current_admin
from datetime import datetime
from app.utils.timezone import get_eat_time
import shutil
import os
import uuid
import random # For mocking
from typing import Optional

router = APIRouter()

# --- Student Self-Service Gate Endpoints ---

@router.get("/my-status")
async def get_my_gate_status(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Check if the current student is checked in (has an open entry log with no exit_time)"""
    open_log = (await session.exec(
        select(EntryLog)
        .where(EntryLog.user_id == current_user.id)
        .where(EntryLog.exit_time == None)
        .order_by(EntryLog.entry_time.desc())
    )).first()
    
    if open_log:
        return {
            "checked_in": True,
            "entry_time": open_log.entry_time.strftime("%I:%M %p"),
            "entry_id": str(open_log.id)
        }
    return {"checked_in": False}

@router.post("/self-checkout")
async def self_checkout(
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Allow a checked-in student to check themselves out"""
    open_log = (await session.exec(
        select(EntryLog)
        .where(EntryLog.user_id == current_user.id)
        .where(EntryLog.exit_time == None)
        .order_by(EntryLog.entry_time.desc())
    )).first()
    
    if not open_log:
        raise HTTPException(status_code=400, detail="You are not currently checked in")
    
    open_log.exit_time = get_eat_time()
    session.add(open_log)
    await session.commit()
    
    try:
        await log_action(
            session=session,
            action_type="update",
            user=current_user,
            table_name="entry_logs",
            record_id=str(open_log.id),
            description=f"Self-checkout by {current_user.full_name} ({current_user.admission_number})",
            request=request
        )
    except Exception:
        pass
    
    return {
        "message": "Check-out successful",
        "time": open_log.exit_time.strftime("%I:%M %p")
    }


@router.post("/manual-vehicle-entry")
async def manual_vehicle_entry(
    request: Request,
    payload: dict,
    session: AsyncSession = Depends(get_session)
):
    """
    Manually log vehicle entry/exit (check-in/check-out) with passenger count.
    Payload: { "plate_number": str, "passengers": int }
    """
    plate = payload.get("plate_number", "").strip().upper()
    passengers = payload.get("passengers", 1)
    
    if not plate:
        raise HTTPException(status_code=400, detail="Plate number required")

    # Clean plate number for lookup
    clean_plate = plate.replace(" ", "").upper()

    # 1. Lookup/Create Vehicle
    from sqlalchemy import func
    vehicle = (await session.exec(
        select(Vehicle).where(func.replace(Vehicle.plate_number, ' ', '') == clean_plate)
    )).first()
    
    status = "allowed"
    if not vehicle:
        # Create new "Visitor" vehicle
        vehicle = Vehicle(
            plate_number=plate,
            make="Unknown",
            model="Auto-Logged",
            color="Unknown",
            vehicle_type="visitor"
        )
        status = "visitor"
    else:
        status = vehicle.vehicle_type if vehicle.vehicle_type in ["staff", "student", "visitor"] else "allowed"
    
    # Update/Set Driver Details
    if payload.get("driver_name"): vehicle.driver_name = payload["driver_name"]
    if payload.get("driver_contact"): vehicle.driver_contact = payload["driver_contact"]
    if payload.get("driver_id_number"): vehicle.driver_id_number = payload["driver_id_number"]
    
    session.add(vehicle)
    await session.commit()
    await session.refresh(vehicle)
    
    # 2. Get Gate
    gate_id = payload.get("gate_id")
    gate = None
    if gate_id:
        try:
            import uuid
            gate = await session.get(Gate, uuid.UUID(str(gate_id)))
        except Exception:
            pass
    if not gate:
        gate = (await session.exec(select(Gate).where(Gate.name == "Main Gate"))).first()
        if not gate:
            gate = Gate(name="Main Gate", location="Main Entrance")
            session.add(gate)
            await session.commit()
            await session.refresh(gate)

    # Check if the vehicle is currently checked in (has an active log with exit_time == None)
    active_log = (await session.exec(
        select(VehicleLog)
        .where(VehicleLog.vehicle_id == vehicle.id)
        .where(VehicleLog.exit_time == None)
        .order_by(VehicleLog.entry_time.desc())
    )).first()

    if active_log:
        # Check-out logic
        active_log.exit_time = get_eat_time()
        active_log.exit_gate_id = gate.id
        session.add(active_log)
        await session.commit()
        await session.refresh(active_log)

        # Log manual vehicle exit action
        await log_action(
            session=session,
            action_type="update",
            table_name="vehicle_logs",
            record_id=str(active_log.id),
            description=f"Manual vehicle exit logged for {plate}",
            request=request
        )

        return {
            "status": status,
            "action": "checkout",
            "message": f"Vehicle {plate} checked out successfully",
            "data": {
                "plate": plate,
                "passengers": active_log.detected_passengers or 1,
                "time": active_log.exit_time.strftime("%I:%M %p"),
                "isVehicle": True,
                "image": "https://cdn-icons-png.flaticon.com/512/3202/3202926.png" # Car Icon
            }
        }
    else:
        # Check-in logic
        log = VehicleLog(
            vehicle_id=vehicle.id,
            gate_id=gate.id,
            entry_time=get_eat_time(),
            vehicle_images={},
            manual_override=True,
            detected_passengers=passengers,
            purpose=payload.get("purpose"),
            destination=payload.get("destination")
        )
        
        session.add(log)
        await session.commit()
        await session.refresh(log)

        # Log manual vehicle entry action
        await log_action(
            session=session,
            action_type="create",
            table_name="vehicle_logs",
            record_id=str(log.id),
            description=f"Manual vehicle entry logged for {plate} ({passengers} passengers)",
            request=request
        )

        return {
            "status": status,
            "action": "checkin",
            "message": f"Vehicle {plate} checked in successfully",
            "data": {
                "plate": plate,
                "passengers": passengers,
                "time": log.entry_time.strftime("%I:%M %p"),
                "isVehicle": True,
                "image": "https://cdn-icons-png.flaticon.com/512/3202/3202926.png" # Car Icon
            }
        }

async def scan_entry_inner(
    request: Request,
    scan_data: dict, # { "admission_number": "...", "gate_id": "optional" }
    session: AsyncSession
):
    import re
    import urllib.parse
    import json
    from sqlalchemy import func
    from app.models import (
        Classroom, Course, Asset, AttendanceRecord, ScanLog,
        EventVisitor, FleetTrip, FleetPassengerManifest, ClassSession, UserLocationLog
    )
    from app.utils.timezone import get_eat_time
    
    code = scan_data.get("admission_number", "").strip()
    if not code:
        return {"status": "rejected", "message": "Scanned code is empty", "data": None}

    # Helper to resolve authenticated user optionally
    current_user = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            from jose import jwt
            from app.auth import SECRET_KEY, ALGORITHM
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            sub_val: str = payload.get("sub")
            if sub_val:
                current_user = (await session.exec(select(User).where((User.email == sub_val) | (User.admission_number == sub_val)))).first()
        except Exception:
            pass

    scanned_type = None

    # 1. Parse URL query parameters or paths if code is a URL (e.g. from QR Asset Hub)
    if "://" in code or "?" in code:
        try:
            parsed_url = urllib.parse.urlparse(code)
            params = urllib.parse.parse_qs(parsed_url.query)
            if "user" in params:
                code = params["user"][0].strip()
                scanned_type = "user"
            elif "vehicle" in params:
                code = params["vehicle"][0].strip()
                scanned_type = "vehicle"
            elif "room" in params:
                code = params["room"][0].strip()
                scanned_type = "room"
            elif "course" in params:
                code = params["course"][0].strip()
                scanned_type = "course"
            elif "event" in params:
                code = params["event"][0].strip()
                scanned_type = "event"
            elif "visitor" in params:
                code = params["visitor"][0].strip()
                scanned_type = "visitor"
            elif "asset" in params:
                code = params["asset"][0].strip()
                scanned_type = "asset"
            elif "trip" in params:
                code = params["trip"][0].strip()
                scanned_type = "trip"

            # Fallback: parse URL path components if no query parameter matched
            if not scanned_type:
                path_parts = [p for p in parsed_url.path.split("/") if p]
                for part in path_parts:
                    if part.startswith("EVT_"):
                        code = part
                        scanned_type = "event"
                        break
                    elif part.startswith("STUDENT:") or part.startswith("STAFF:"):
                        code = part.split(":", 1)[1]
                        scanned_type = "user"
                        break
                    elif part.startswith("VEHICLE:") or part.startswith("BUS:"):
                        code = part.split(":", 1)[1]
                        scanned_type = "vehicle"
                        break
                    elif part.startswith("TRIP:"):
                        code = part.split(":", 1)[1]
                        scanned_type = "trip"
                        break
                
                if not scanned_type:
                    if "event-register" in parsed_url.path or "event-pass" in parsed_url.path:
                        if path_parts:
                            code = path_parts[-1].strip()
                            scanned_type = "event"
        except Exception as e:
            print(f"Error parsing scan URL: {e}")
            pass

    # 2. Check for Gate
    gate = None
    gate_id = scan_data.get("gate_id")
    if gate_id:
        try:
            import uuid
            gate = await session.get(Gate, uuid.UUID(str(gate_id)))
        except Exception:
            pass
    if not gate:
        gate_query = select(Gate).where(Gate.name == "Main Gate")
        gate = (await session.exec(gate_query)).first()
        if not gate:
            gate = Gate(name="Main Gate", location="Main Entrance")
            session.add(gate)
            await session.commit()
            await session.refresh(gate)

    # 3. Auto-detect category type if not determined by URL params
    if not scanned_type:
        upper_code = code.upper()
        if upper_code.startswith("EVENT:"):
            scanned_type = "event"
            code = code[6:].strip()
        elif upper_code.startswith("TRIP:"):
            scanned_type = "trip"
            parts = code.split("|")
            code = parts[0].split(":", 1)[1].strip()
        elif upper_code.startswith("VEHICLE:") or upper_code.startswith("BUS:"):
            scanned_type = "vehicle"
            code = code.split(":", 1)[1].strip()
        elif upper_code.startswith("ROOM:"):
            scanned_type = "room"
            code = code[5:].strip()
        elif upper_code.startswith("COURSE:"):
            scanned_type = "course"
            code = code[7:].strip()
        elif upper_code.startswith("VISITOR:"):
            scanned_type = "visitor"
            code = code[8:].strip()
        elif upper_code.startswith("EVT_"):
            scanned_type = "event"
        elif upper_code.startswith("STUDENT:") or upper_code.startswith("STAFF:"):
            scanned_type = "user"
            code = code.split(":", 1)[1].strip()
        else:
            # Query databases to detect type
            room = (await session.exec(select(Classroom).where(Classroom.room_code == code))).first()
            if room:
                scanned_type = "room"
            else:
                course = (await session.exec(select(Course).where(Course.course_code == code))).first()
                if course:
                    scanned_type = "course"
                else:
                    asset = (await session.exec(select(Asset).where(Asset.tag_number == code))).first()
                    if asset:
                        scanned_type = "asset"
                    else:
                        user = (await session.exec(select(User).where(User.nfc_card_uid == code))).first()
                        if user:
                            scanned_type = "user"
                        else:
                            user = (await session.exec(select(User).where(func.lower(User.admission_number) == func.lower(code)))).first()
                            if user:
                                scanned_type = "user"
                            else:
                                clean_plate = code.replace(" ", "").lower()
                                vehicle = (await session.exec(select(Vehicle).where(func.lower(func.replace(Vehicle.plate_number, ' ', '')) == clean_plate))).first()
                                if vehicle:
                                    scanned_type = "vehicle"
                                else:
                                    visitor = (await session.exec(select(Visitor).where(func.lower(Visitor.id_number) == func.lower(code)))).first()
                                    if visitor:
                                        scanned_type = "visitor"
                                    else:
                                        try:
                                            import uuid
                                            val_uuid = uuid.UUID(code)
                                            ev = await session.get(Event, val_uuid)
                                            if ev:
                                                scanned_type = "event"
                                        except Exception:
                                            pass
                                            
                                        if not scanned_type:
                                            ev = (await session.exec(select(Event).where(Event.qr_code_token == code))).first()
                                            if ev:
                                                scanned_type = "event"
                                                
                                        if not scanned_type:
                                            scanned_type = "user"

    # Define parsed_code to prevent NameError in user and visitor blocks
    parsed_code = code

    # Now handle based on detected scanned type
    if scanned_type == "room":
        room = (await session.exec(select(Classroom).where(Classroom.room_code == code))).first()
        if not room:
            return {"status": "rejected", "message": f"Classroom {code} not found", "data": None}
            
        if not current_user:
            return {"status": "rejected", "message": "Authentication required to sign in to room", "data": None}
            
        now_time = get_eat_time().time()
        today = get_eat_time().date()
        query = select(ClassSession).where(
            ClassSession.classroom_id == room.id,
            ClassSession.session_date == today,
            ClassSession.start_time <= now_time,
            ClassSession.end_time >= now_time,
            ClassSession.active == True 
        )
        active_session = (await session.exec(query)).first()
        
        if active_session:
            existing = (await session.exec(select(AttendanceRecord).where(
                AttendanceRecord.session_id == active_session.id,
                AttendanceRecord.student_id == current_user.id
            ))).first()
            if existing:
                return {
                    "status": "allowed",
                    "message": f"Already signed in to {active_session.id} (Refreshed Data)",
                    "data": {
                        "name": current_user.full_name,
                        "role": f"Already present in {room.room_name}",
                        "time": get_eat_time().strftime("%I:%M %p"),
                        "image": current_user.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                    }
                }
                
            record = AttendanceRecord(
                session_id=active_session.id,
                student_id=current_user.id,
                status="present",
                live_image=None,
                connection_type="wifi",
                metadata_info=json.dumps({"method": "gate_qr_scan"})
            )
            session.add(record)
            await session.commit()
            return {
                "status": "allowed",
                "message": f"Signed in to {active_session.id} via Room Scan",
                "data": {
                    "name": current_user.full_name,
                    "role": f"Signed in to {room.room_name} (Class: {active_session.id})",
                    "time": get_eat_time().strftime("%I:%M %p"),
                    "image": current_user.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
            }
        else:
            log = UserLocationLog(
                user_id=current_user.id,
                ip_address=request.client.host if request.client else "unknown",
                scanned_code=code,
                context_type="room_scan"
            )
            session.add(log)
            await session.commit()
            return {
                "status": "allowed",
                "message": f"Entered Room: {room.room_name} (No class active)",
                "data": {
                    "name": current_user.full_name,
                    "role": f"Entered {room.room_name}",
                    "time": get_eat_time().strftime("%I:%M %p"),
                    "image": current_user.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
            }

    elif scanned_type == "course":
        course = (await session.exec(select(Course).where(Course.course_code == code))).first()
        if not course:
            return {"status": "rejected", "message": f"Course {code} not found", "data": None}
            
        if not current_user:
            return {"status": "rejected", "message": "Authentication required to sign in to class", "data": None}
            
        today = get_eat_time().date()
        query = select(ClassSession).where(
            ClassSession.course_id == course.id,
            ClassSession.session_date == today,
            ClassSession.active == True 
        )
        active_session = (await session.exec(query)).first()
        
        if active_session:
            existing = (await session.exec(select(AttendanceRecord).where(
                AttendanceRecord.session_id == active_session.id,
                AttendanceRecord.student_id == current_user.id
            ))).first()
            if existing:
                return {
                    "status": "allowed",
                    "message": f"Already present in class {course.course_name}",
                    "data": {
                        "name": current_user.full_name,
                        "role": f"Class: {course.course_name} ({course.course_code})",
                        "time": get_eat_time().strftime("%I:%M %p"),
                        "image": current_user.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                    }
                }
                
            record = AttendanceRecord(
                session_id=active_session.id,
                student_id=current_user.id,
                status="present",
                live_image=None,
                connection_type="wifi",
                metadata_info=json.dumps({"method": "gate_qr_scan"})
            )
            session.add(record)
            await session.commit()
            return {
                "status": "allowed",
                "message": f"Signed in to class {course.course_name} successfully",
                "data": {
                    "name": current_user.full_name,
                    "role": f"Signed in to {course.course_name} ({course.course_code})",
                    "time": get_eat_time().strftime("%I:%M %p"),
                    "image": current_user.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
            }
        else:
            return {
                "status": "rejected",
                "message": f"No active class session today for {course.course_name}",
                "data": {
                    "name": current_user.full_name,
                    "role": f"Course: {course.course_name}",
                    "time": get_eat_time().strftime("%I:%M %p"),
                    "image": current_user.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
            }

    elif scanned_type == "asset":
        asset = (await session.exec(select(Asset).where(Asset.tag_number == code))).first()
        if not asset:
            return {"status": "rejected", "message": f"Asset {code} not found", "data": None}
            
        action_performed = "scanned"
        if current_user:
            # Check if this asset is currently checked out to this user
            if asset.assigned_to_id == current_user.id:
                # Check it in
                asset.assigned_to_id = None
                asset.status = "available"
                action_performed = "check_in"
                notes_msg = f"Asset checked in by {current_user.full_name} via scan"
            else:
                # Check it out
                asset.assigned_to_id = current_user.id
                asset.status = "checked_out"
                action_performed = "check_out"
                notes_msg = f"Asset checked out by {current_user.full_name} via scan"
                
            session.add(asset)
            
            # Log to AssetLog
            from app.models import AssetLog
            log_entry = AssetLog(
                asset_id=asset.id,
                user_id=current_user.id,
                action=action_performed,
                timestamp=get_eat_time(),
                handled_by_id=current_user.id,
                notes=notes_msg
            )
            session.add(log_entry)
            await session.commit()
            await session.refresh(asset)
            
        assigned_name = None
        if asset.assigned_to_id:
            user = await session.get(User, asset.assigned_to_id)
            if user:
                assigned_name = user.full_name
                
        status_label = f"Tag: {asset.tag_number} | Status: {asset.status} | Location: {asset.location}"
        if assigned_name:
            status_label += f" | Assigned to: {assigned_name}"
            
        action_msg = "Asset checked out successfully via scan" if action_performed == "check_out" else "Asset checked in successfully via scan" if action_performed == "check_in" else f"Asset Found: {asset.name}"
        
        return {
            "status": "allowed",
            "message": action_msg,
            "data": {
                "name": asset.name,
                "role": status_label,
                "time": get_eat_time().strftime("%I:%M %p"),
                "image": "https://cdn-icons-png.flaticon.com/512/684/684908.png"
            }
        }

    elif scanned_type == "event":
        import uuid
        ev = None
        try:
            val_uuid = uuid.UUID(code)
            ev = await session.get(Event, val_uuid)
        except Exception:
            pass
        if not ev:
            ev = (await session.exec(select(Event).where(Event.qr_code_token == code))).first()
            
        if not ev:
            return {"status": "rejected", "message": "Invalid Event Pass"}
            
        if not current_user:
            return {
                "status": "event_pass",
                "message": f"Valid Event Pass: {ev.name}",
                "data": {
                    "name": ev.name,
                    "host": ev.host,
                    "school": ev.school,
                    "event_id": str(ev.id),
                    "is_active": ev.is_active
                }
            }
            
        visitor = (await session.exec(
            select(EventVisitor)
            .where(EventVisitor.event_id == ev.id)
            .where(EventVisitor.visitor_identifier == current_user.admission_number)
        )).first()
        
        status = "pre_registered"
        if ev.scan_mode == "check_in":
            status = "checked_in"
        elif ev.scan_mode == "auto":
            today = get_eat_time().date()
            if today >= ev.event_date:
                status = "checked_in"

        if not visitor:
            visitor = EventVisitor(
                event_id=ev.id,
                visitor_name=current_user.full_name,
                visitor_identifier=current_user.admission_number,
                phone_number=current_user.phone_number or "N/A",
                email=current_user.email,
                status=status,
                entry_time=get_eat_time(),
                scanned_by=current_user.id
            )
            session.add(visitor)
            await session.commit()
        else:
            if status == "checked_in" and visitor.status != "checked_in":
                visitor.status = "checked_in"
                visitor.entry_time = get_eat_time()
                visitor.scanned_by = current_user.id
                session.add(visitor)
                await session.commit()
            
        return {
            "status": "allowed",
            "message": f"Registered for Event {ev.name} successfully",
            "data": {
                "name": current_user.full_name,
                "role": f"Attending Event: {ev.name}",
                "time": get_eat_time().strftime("%I:%M %p"),
                "image": current_user.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            }
        }

    elif scanned_type == "vehicle":
        plate = code.upper().replace("-", " ")
        vehicle = (await session.exec(select(Vehicle).where(Vehicle.plate_number == plate))).first()
        
        if not vehicle:
            import random
            ai_colors = ["White", "Silver", "Black", "Blue", "Red", "Grey"]
            ai_makes = ["Toyota", "Subaru", "Mazda", "Nissan", "Honda", "Mercedes"]
            ai_models = ["Corolla", "Outback", "Demio", "Note", "Fit", "C200"]
            
            vehicle = Vehicle(
                plate_number=plate,
                make=random.choice(ai_makes),
                model=random.choice(ai_models),
                color=random.choice(ai_colors),
                vehicle_type="bus" if "BUS" in code.upper() else "utility",
                is_fleet=True
            )
            session.add(vehicle)
            await session.commit()
            await session.refresh(vehicle)
            
        if current_user:
            from app.models import Role
            user_role = await session.get(Role, current_user.role_id)
            user_role_name = user_role.name if user_role else "Student"
            
            is_gate_operator_scan = (user_role_name in ["Security", "SuperAdmin"]) and (scan_data.get("gate_id") is not None)
            if not is_gate_operator_scan:
                # 1. Search for an ongoing trip first
                trip = (await session.exec(
                    select(FleetTrip)
                    .where(FleetTrip.vehicle_id == vehicle.id)
                    .where(FleetTrip.status == "ongoing")
                )).first()
                
                # 2. If not found, look for a scheduled trip for this vehicle today
                if not trip:
                    from datetime import datetime, time
                    eat_now = get_eat_time()
                    start_of_today = datetime.combine(eat_now.date(), time.min)
                    end_of_today = datetime.combine(eat_now.date(), time.max)
                    trip = (await session.exec(
                        select(FleetTrip)
                        .where(FleetTrip.vehicle_id == vehicle.id)
                        .where(FleetTrip.status == "scheduled")
                        .where(FleetTrip.scheduled_departure >= start_of_today)
                        .where(FleetTrip.scheduled_departure <= end_of_today)
                        .order_by(FleetTrip.scheduled_departure.asc())
                    )).first()
                
                # 3. Fallback: create a new ad-hoc ongoing trip (ensuring required fields are filled)
                if not trip:
                    trip = FleetTrip(
                        vehicle_id=vehicle.id,
                        driver_id=None,
                        purpose="Ad-hoc boarding via scan",
                        origin="Campus",
                        destination="Destination",
                        status="ongoing",
                        scheduled_departure=get_eat_time(),
                        actual_departure=get_eat_time(),
                        start_odometer=vehicle.current_odometer or 0.0
                    )
                    session.add(trip)
                    await session.commit()
                    await session.refresh(trip)
                    
                passenger = (await session.exec(
                    select(FleetPassengerManifest)
                    .where(FleetPassengerManifest.trip_id == trip.id)
                    .where(FleetPassengerManifest.user_id == current_user.id)
                )).first()
                
                if not passenger and current_user.admission_number:
                    passenger = (await session.exec(
                        select(FleetPassengerManifest)
                        .where(FleetPassengerManifest.trip_id == trip.id)
                        .where(func.lower(FleetPassengerManifest.admission_number) == func.lower(current_user.admission_number))
                    )).first()

                if not passenger:
                    passenger = FleetPassengerManifest(
                        trip_id=trip.id,
                        user_id=current_user.id,
                        passenger_name=current_user.full_name,
                        phone_number=current_user.phone_number,
                        admission_number=current_user.admission_number,
                        arrival_confirmed=True,
                        check_in_time=get_eat_time(),
                        added_via_scan=True
                    )
                    session.add(passenger)
                    await session.commit()
                else:
                    passenger.arrival_confirmed = True
                    passenger.check_in_time = get_eat_time()
                    # Link user_id if it wasn't linked (e.g. from CSV import)
                    if passenger.user_id is None:
                        passenger.user_id = current_user.id
                    session.add(passenger)
                    await session.commit()
                    
                return {
                    "status": "allowed",
                    "message": f"Boarded vehicle {vehicle.plate_number} successfully",
                    "data": {
                        "name": current_user.full_name,
                        "role": f"Boarded {vehicle.make} {vehicle.model} ({vehicle.plate_number})",
                        "time": get_eat_time().strftime("%I:%M %p"),
                        "image": current_user.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                    }
                }
            
        open_log = (await session.exec(
            select(VehicleLog)
            .where(VehicleLog.vehicle_id == vehicle.id)
            .where(VehicleLog.exit_time == None)
            .order_by(VehicleLog.entry_time.desc())
        )).first()

        if open_log:
            open_log.exit_time = get_eat_time()
            open_log.exit_gate_id = gate.id
            session.add(open_log)
            await session.commit()
            
            await log_action(
                session=session,
                action_type="vehicle_scan_out",
                table_name="vehicle_logs",
                record_id=str(open_log.id),
                description=f"Auto vehicle checkout for {plate} at {gate.name}",
                request=request
            )
            
            return {
                "status": "allowed",
                "message": f"Vehicle {plate} checked OUT successfully",
                "data": {
                    "name": plate,
                    "role": f"Checked OUT - {vehicle.make} {vehicle.model} ({vehicle.color})",
                    "time": get_eat_time().strftime("%I:%M %p"),
                    "image": "https://cdn-icons-png.flaticon.com/512/3202/3202926.png"
                }
            }
        else:
            new_log = VehicleLog(
                vehicle_id=vehicle.id,
                gate_id=gate.id,
                entry_time=get_eat_time(),
                manual_override=False,
                detected_passengers=1
            )
            session.add(new_log)
            await session.commit()
            await session.refresh(new_log)

            await log_action(
                session=session,
                action_type="vehicle_scan_in",
                table_name="vehicle_logs",
                record_id=str(new_log.id),
                description=f"Auto vehicle checkin for {plate} at {gate.name}",
                request=request
            )

            return {
                "status": "allowed",
                "message": f"Vehicle {plate} checked IN successfully",
                "data": {
                    "name": plate,
                    "role": f"Checked IN - {vehicle.make} {vehicle.model} ({vehicle.color})",
                    "time": get_eat_time().strftime("%I:%M %p"),
                    "image": "https://cdn-icons-png.flaticon.com/512/3202/3202926.png"
                }
            }

    elif scanned_type == "trip":
        import uuid
        trip_uuid = None
        try:
            trip_uuid = uuid.UUID(code)
        except Exception:
            pass

        trip = None
        if trip_uuid:
            trip = await session.get(FleetTrip, trip_uuid)

        if not trip:
            return {"status": "rejected", "message": f"Trip not found for code: {code}", "data": None}

        if trip.status in ["completed", "cancelled"]:
            return {"status": "rejected", "message": f"Cannot board. Trip status is {trip.status}", "data": None}

        vehicle = await session.get(Vehicle, trip.vehicle_id)
        vehicle_info = f"{vehicle.make} {vehicle.model} ({vehicle.plate_number})" if vehicle else "Bus"

        user_role_name = "Student"
        if current_user:
            from app.models import Role
            user_role = await session.get(Role, current_user.role_id)
            user_role_name = user_role.name if user_role else "Student"

        # If security guard scans at a gate, just verify trip details
        is_gate_operator_scan = (user_role_name in ["Security", "SuperAdmin"]) and (scan_data.get("gate_id") is not None)
        if is_gate_operator_scan:
            return {
                "status": "allowed",
                "message": f"Verified trip: {trip.purpose} on vehicle {vehicle_info}",
                "data": {
                    "name": f"Trip: {trip.purpose}",
                    "role": f"Vehicle: {vehicle_info} | Passengers: {len(trip.passengers)}",
                    "time": get_eat_time().strftime("%I:%M %p"),
                    "image": "https://cdn-icons-png.flaticon.com/512/3202/3202926.png"
                }
            }

        if not current_user:
            return {"status": "rejected", "message": "Authentication required. Please log in to board.", "data": None}

        # Board the user (passenger)
        passenger = (await session.exec(
            select(FleetPassengerManifest)
            .where(FleetPassengerManifest.trip_id == trip.id)
            .where(FleetPassengerManifest.user_id == current_user.id)
        )).first()

        if not passenger and current_user.admission_number:
            passenger = (await session.exec(
                select(FleetPassengerManifest)
                .where(FleetPassengerManifest.trip_id == trip.id)
                .where(func.lower(FleetPassengerManifest.admission_number) == func.lower(current_user.admission_number))
            )).first()

        if not passenger:
            passenger = FleetPassengerManifest(
                trip_id=trip.id,
                user_id=current_user.id,
                passenger_name=current_user.full_name,
                phone_number=current_user.phone_number,
                admission_number=current_user.admission_number,
                arrival_confirmed=True,
                check_in_time=get_eat_time(),
                added_via_scan=True
            )
            session.add(passenger)
            await session.commit()
            await session.refresh(passenger)
        else:
            passenger.arrival_confirmed = True
            passenger.check_in_time = get_eat_time()
            passenger.added_via_scan = True
            session.add(passenger)
            await session.commit()

        return {
            "status": "allowed",
            "message": f"Successfully boarded trip: {trip.purpose} on vehicle {vehicle_info}",
            "data": {
                "name": current_user.full_name,
                "role": f"Boarded {vehicle_info}",
                "time": get_eat_time().strftime("%I:%M %p"),
                "image": current_user.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            }
        }

    elif scanned_type == "visitor":
        # Look up visitor by parsing details or ID number
        import uuid
        visitor = None
        visitor_parts = parsed_code.split(":")
        
        if len(visitor_parts) >= 3:
            name = visitor_parts[0]
            id_no = visitor_parts[1]
            phone = visitor_parts[2]
            details = visitor_parts[3] if len(visitor_parts) > 3 else "Scanned Visitor Card"
            
            visitor = (await session.exec(select(Visitor).where(Visitor.id_number == id_no))).first()
            if not visitor:
                first_name = name.split(" ")[0]
                last_name = " ".join(name.split(" ")[1:]) if len(name.split(" ")) > 1 else "Visitor"
                visitor = Visitor(
                    first_name=first_name,
                    last_name=last_name,
                    id_number=id_no,
                    phone_number=phone,
                    visit_details=details,
                    status="checked_in",
                    time_in=get_eat_time()
                )
                session.add(visitor)
                await session.commit()
                await session.refresh(visitor)
        else:
            try:
                val_uuid = uuid.UUID(parsed_code)
                event_visitor = await session.get(EventVisitor, val_uuid)
                if event_visitor:
                    event_obj = await session.get(Event, event_visitor.event_id)
                    event_name = event_obj.name if event_obj else "Event"
                    
                    event_visitor.status = "checked_in"
                    event_visitor.entry_time = get_eat_time()
                    session.add(event_visitor)
                    await session.commit()
                    
                    await log_action(
                        session=session,
                        action_type="event_visitor_checkin",
                        table_name="event_visitors",
                        record_id=str(event_visitor.id),
                        description=f"Event guest checkin for {event_visitor.visitor_name} to {event_name}",
                        request=request
                    )
                    
                    return {
                        "status": "allowed",
                        "message": f"Guest {event_visitor.visitor_name} checked IN to event: {event_name}",
                        "data": {
                            "name": event_visitor.visitor_name,
                            "role": f"Checked IN - Event Guest going to {event_name}",
                            "time": get_eat_time().strftime("%I:%M %p"),
                            "image": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                        }
                    }
            except Exception:
                pass

            visitor = (await session.exec(select(Visitor).where(Visitor.id_number == parsed_code))).first()
            if not visitor:
                try:
                    val_uuid = uuid.UUID(parsed_code)
                    visitor = await session.get(Visitor, val_uuid)
                except Exception:
                    pass
            
            if not visitor:
                visitor = Visitor(
                    first_name="Scanned",
                    last_name=f"Guest-{parsed_code[-4:]}",
                    id_number=parsed_code,
                    phone_number="N/A",
                    visit_details="Auto-Registered Guest",
                    status="checked_in",
                    time_in=get_eat_time()
                )
                session.add(visitor)
                await session.commit()
                await session.refresh(visitor)
                
        if visitor.status == "checked_in" and not visitor.time_out:
            # Check Out
            visitor.time_out = get_eat_time()
            visitor.status = "checked_out"
            session.add(visitor)
            await session.commit()
            
            await log_action(
                session=session,
                action_type="visitor_scan_out",
                table_name="visitors",
                record_id=str(visitor.id),
                description=f"Auto visitor checkout for {visitor.first_name} {visitor.last_name}",
                request=request
            )
            
            return {
                "status": "allowed",
                "message": f"Visitor {visitor.first_name} checked OUT successfully",
                "data": {
                    "name": f"{visitor.first_name} {visitor.last_name}",
                    "role": f"Checked OUT - Visitor ({visitor.visit_details})",
                    "time": get_eat_time().strftime("%I:%M %p"),
                    "image": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
            }
        else:
            # Check In
            visitor.time_in = get_eat_time()
            visitor.time_out = None
            visitor.status = "checked_in"
            session.add(visitor)
            await session.commit()
            
            await log_action(
                session=session,
                action_type="visitor_scan_in",
                table_name="visitors",
                record_id=str(visitor.id),
                description=f"Auto visitor checkin for {visitor.first_name} {visitor.last_name}",
                request=request
            )
            
            return {
                "status": "allowed",
                "message": f"Visitor {visitor.first_name} checked IN successfully",
                "data": {
                    "name": f"{visitor.first_name} {visitor.last_name}",
                    "role": f"Checked IN - Visitor ({visitor.visit_details})",
                    "time": get_eat_time().strftime("%I:%M %p"),
                    "image": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
            }

    else: # user
        from sqlalchemy import func
        user = (await session.exec(
            select(User).where(User.nfc_card_uid == parsed_code.strip())
        )).first()
        if not user:
            user = (await session.exec(
                select(User).where(func.lower(User.admission_number) == func.lower(parsed_code.strip()))
            )).first()
        if not user:
            return {
                "status": "rejected",
                "message": f"User not found for code: {parsed_code}",
                "data": None
            }
            
        status = "allowed"
        message = "Access Granted"
        if user.status.lower() != "active":
            status = "rejected"
            message = f"User is inactive ({user.status})"
            return {
                "status": status,
                "message": message,
                "data": {
                    "name": user.full_name,
                    "role": user.school or "Inactive User",
                    "time": get_eat_time().strftime("%I:%M %p"),
                    "image": user.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
            }

        open_log = (await session.exec(
            select(EntryLog)
            .where(EntryLog.user_id == user.id)
            .where(EntryLog.exit_time == None)
            .order_by(EntryLog.entry_time.desc())
        )).first()

        if open_log:
            # Check Out
            open_log.exit_time = get_eat_time()
            open_log.exit_gate_id = gate.id
            session.add(open_log)
            await session.commit()
            
            await log_action(
                session=session,
                action_type="gate_scan_out",
                table_name="entry_logs",
                record_id=str(open_log.id),
                description=f"Auto gate scan checkout for {user.full_name} at {gate.name}",
                request=request
            )
            
            return {
                "status": "allowed",
                "message": f"Checked OUT successfully: {user.full_name}",
                "data": {
                    "name": user.full_name,
                    "role": f"Checked OUT ({user.school or 'Student'})",
                    "time": get_eat_time().strftime("%I:%M %p"),
                    "image": user.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
            }
        else:
            # Check if NFC was used
            scan_method = "nfc" if (user.nfc_card_uid and parsed_code.strip() == user.nfc_card_uid) else "qr"
            new_log = EntryLog(
                user_id=user.id,
                gate_id=gate.id,
                entry_time=get_eat_time(),
                method=scan_method,
                status="allowed"
            )
            session.add(new_log)
            await session.commit()
            await session.refresh(new_log)
            
            await log_action(
                session=session,
                action_type="gate_scan_in",
                table_name="entry_logs",
                record_id=str(new_log.id),
                description=f"Auto gate scan checkin for {user.full_name} at {gate.name}",
                request=request
            )
            
            return {
                "status": "allowed",
                "message": f"Checked IN successfully: {user.full_name}",
                "data": {
                    "name": user.full_name,
                    "role": f"Checked IN ({user.school or 'Student'})",
                    "time": get_eat_time().strftime("%I:%M %p"),
                    "image": user.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
            }

@router.post("/scan")
async def scan_entry(
    request: Request,
    scan_data: dict, # { "admission_number": "...", "gate_id": "optional" }
    session: AsyncSession = Depends(get_session)
):
    import urllib.parse
    from sqlalchemy import func
    from app.models import ScanLog, User, Classroom, ClassSession
    from app.utils.timezone import get_eat_time

    code = scan_data.get("admission_number", "").strip()
    if not code:
        return {"status": "rejected", "message": "Scanned code is empty", "data": None}

    # Helper to resolve authenticated user optionally
    current_user = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            from jose import jwt
            from app.auth import SECRET_KEY, ALGORITHM
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            sub_val: str = payload.get("sub")
            if sub_val:
                current_user = (await session.exec(select(User).where((User.email == sub_val) | (User.admission_number == sub_val)))).first()
        except Exception:
            pass

    # Detect the scanned type to help with logging/resolve student_id
    scanned_type = None
    temp_code = code
    if "://" in temp_code or "?" in temp_code:
        try:
            parsed_url = urllib.parse.urlparse(temp_code)
            params = urllib.parse.parse_qs(parsed_url.query)
            if "user" in params:
                temp_code = params["user"][0].strip()
                scanned_type = "user"
            elif "vehicle" in params:
                temp_code = params["vehicle"][0].strip()
                scanned_type = "vehicle"
            elif "room" in params:
                temp_code = params["room"][0].strip()
                scanned_type = "room"
            elif "course" in params:
                temp_code = params["course"][0].strip()
                scanned_type = "course"
            elif "event" in params:
                temp_code = params["event"][0].strip()
                scanned_type = "event"
            elif "visitor" in params:
                temp_code = params["visitor"][0].strip()
                scanned_type = "visitor"
            elif "asset" in params:
                temp_code = params["asset"][0].strip()
                scanned_type = "asset"
            elif "trip" in params:
                temp_code = params["trip"][0].strip()
                scanned_type = "trip"

            # Fallback: parse URL path components if no query parameter matched
            if not scanned_type:
                path_parts = [p for p in parsed_url.path.split("/") if p]
                for part in path_parts:
                    if part.startswith("EVT_"):
                        temp_code = part
                        scanned_type = "event"
                        break
                    elif part.startswith("STUDENT:") or part.startswith("STAFF:"):
                        temp_code = part.split(":", 1)[1]
                        scanned_type = "user"
                        break
                    elif part.startswith("VEHICLE:") or part.startswith("BUS:"):
                        temp_code = part.split(":", 1)[1]
                        scanned_type = "vehicle"
                        break
                    elif part.startswith("TRIP:"):
                        temp_code = part.split(":", 1)[1]
                        scanned_type = "trip"
                        break
                
                if not scanned_type:
                    if "event-register" in parsed_url.path or "event-pass" in parsed_url.path:
                        if path_parts:
                            temp_code = path_parts[-1].strip()
                            scanned_type = "event"
        except Exception:
            pass

    if not scanned_type:
        upper_code = temp_code.upper()
        if upper_code.startswith("EVENT:"):
            scanned_type = "event"
            temp_code = temp_code[6:].strip()
        elif upper_code.startswith("TRIP:"):
            scanned_type = "trip"
            parts = temp_code.split("|")
            temp_code = parts[0].split(":", 1)[1].strip()
        elif upper_code.startswith("VEHICLE:") or upper_code.startswith("BUS:"):
            scanned_type = "vehicle"
            temp_code = temp_code.split(":", 1)[1].strip()
        elif upper_code.startswith("ROOM:"):
            scanned_type = "room"
            temp_code = temp_code[5:].strip()
        elif upper_code.startswith("COURSE:"):
            scanned_type = "course"
            temp_code = temp_code[7:].strip()
        elif upper_code.startswith("VISITOR:"):
            scanned_type = "visitor"
            temp_code = temp_code[8:].strip()
        elif upper_code.startswith("EVT_"):
            scanned_type = "event"
        elif upper_code.startswith("STUDENT:") or upper_code.startswith("STAFF:"):
            scanned_type = "user"
            temp_code = temp_code.split(":", 1)[1].strip()
        else:
            room = (await session.exec(select(Classroom).where(Classroom.room_code == temp_code))).first()
            if room:
                scanned_type = "room"
            else:
                from app.models import Course
                course = (await session.exec(select(Course).where(Course.course_code == temp_code))).first()
                if course:
                    scanned_type = "course"
                else:
                    from app.models import Asset
                    asset = (await session.exec(select(Asset).where(Asset.tag_number == temp_code))).first()
                    if asset:
                        scanned_type = "asset"
                    else:
                        user = (await session.exec(select(User).where(
                            (func.lower(User.admission_number) == func.lower(temp_code)) |
                            (User.nfc_card_uid == temp_code)
                        ))).first()
                        if user:
                            scanned_type = "user"
                        else:
                            clean_plate = temp_code.replace(" ", "").lower()
                            vehicle = (await session.exec(select(Vehicle).where(func.lower(func.replace(Vehicle.plate_number, ' ', '')) == clean_plate))).first()
                            if vehicle:
                                scanned_type = "vehicle"
                            else:
                                from app.models import Visitor
                                visitor = (await session.exec(select(Visitor).where(func.lower(Visitor.id_number) == func.lower(temp_code)))).first()
                                if visitor:
                                    scanned_type = "visitor"
                                else:
                                    try:
                                        import uuid
                                        from app.models import Event
                                        val_uuid = uuid.UUID(temp_code)
                                        ev = await session.get(Event, val_uuid)
                                        if ev:
                                            scanned_type = "event"
                                        else:
                                            from app.models import FleetTrip
                                            ft = await session.get(FleetTrip, val_uuid)
                                            if ft:
                                                scanned_type = "trip"
                                    except Exception:
                                        pass
                                        
                                    if not scanned_type:
                                        from app.models import Event
                                        ev = (await session.exec(select(Event).where(Event.qr_code_token == temp_code))).first()
                                        if ev:
                                            scanned_type = "event"
                                            
                                    if not scanned_type:
                                        scanned_type = "user"

    # Call the original scan logic
    res = None
    try:
        res = await scan_entry_inner(request, scan_data, session)
    except Exception as e:
        import traceback
        traceback.print_exc()
        res = {"status": "rejected", "message": f"Scan error: {str(e)}", "data": None}
    finally:
        # Log the scan!
        if res:
            is_success = res.get("status") in ["allowed", "event_pass"]
            status_msg = res.get("message") or "Scan processed"
            
            # Prefix status message with scan type
            prefix = f"{scanned_type.upper() if scanned_type else 'UNKNOWN'} Scan: "
            if not status_msg.startswith(prefix):
                status_msg = f"{prefix}{status_msg}"
                
            # Get location name
            gate_name = None
            gate_id = scan_data.get("gate_id")
            if gate_id:
                try:
                    import uuid
                    from app.models import Gate
                    gate = await session.get(Gate, uuid.UUID(str(gate_id)))
                    if gate:
                        gate_name = gate.name
                except Exception:
                    pass
            if not gate_name:
                from app.models import Gate
                gate = (await session.exec(select(Gate).where(Gate.name == "Main Gate"))).first()
                if gate:
                    gate_name = gate.name

            # Resolve student_id
            log_student_id = None
            
            # 1. If scanned code corresponds to a student/user, resolve that user first to preserve logging accuracy
            if scanned_type == "user" or not scanned_type:
                user_obj = (await session.exec(select(User).where(
                    (func.lower(User.admission_number) == func.lower(temp_code)) |
                    (User.nfc_card_uid == temp_code)
                ))).first()
                if user_obj:
                    log_student_id = user_obj.id

            # 2. Fallback to current authenticated user (who scanned it, e.g. student scanning room/fleet)
            if not log_student_id and current_user:
                log_student_id = current_user.id

            # 3. Last fallback: first active user
            if not log_student_id:
                fallback_user = (await session.exec(select(User).limit(1))).first()
                if fallback_user:
                    log_student_id = fallback_user.id

            if log_student_id:
                # Resolve class session id if we can find one active for today in this room
                class_sess_id = None
                if scanned_type in ["room", "course"]:
                    # Find active session today
                    now_time = get_eat_time().time()
                    today = get_eat_time().date()
                    if scanned_type == "room":
                        room = (await session.exec(select(Classroom).where(Classroom.room_code == temp_code))).first()
                        if room:
                            query = select(ClassSession).where(
                                ClassSession.classroom_id == room.id,
                                ClassSession.session_date == today,
                                ClassSession.start_time <= now_time,
                                ClassSession.end_time >= now_time,
                                ClassSession.active == True
                            )
                            active_session = (await session.exec(query)).first()
                            if active_session:
                                class_sess_id = active_session.id
                    else: # course
                        from app.models import Course
                        course = (await session.exec(select(Course).where(Course.course_code == temp_code))).first()
                        if course:
                            query = select(ClassSession).where(
                                ClassSession.course_id == course.id,
                                ClassSession.session_date == today,
                                ClassSession.active == True
                            )
                            active_session = (await session.exec(query)).first()
                            if active_session:
                                class_sess_id = active_session.id

                scan_log = ScanLog(
                    timestamp=get_eat_time(),
                    student_id=log_student_id,
                    room_code=temp_code[:255],
                    is_successful=is_success,
                    status_message=status_msg,
                    class_session_id=class_sess_id,
                    detected_location=gate_name
                )
                session.add(scan_log)
                await session.commit()
                
    return res

@router.post("/check-in/{admission_number}")
async def check_in_user(
    request: Request,
    admission_number: str, 
    gate_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session)
):
    user = (await session.exec(select(User).where(User.admission_number == admission_number))).first()
    
    # 2. Get Gate
    gate = None
    if gate_id:
        try:
            import uuid
            gate = await session.get(Gate, uuid.UUID(str(gate_id)))
        except Exception:
            pass
    if not gate:
        gate = (await session.exec(select(Gate).where(Gate.name == "Main Gate"))).first()
        if not gate:
            gate = Gate(name="Main Gate", location="Main Entrance")
            session.add(gate)
            await session.commit()
            await session.refresh(gate)

    if not user:
        # Fallback 1: check Vehicle (by plate number)
        from sqlalchemy import func
        clean_plate = admission_number.replace(" ", "").upper()
        vehicle = (await session.exec(
            select(Vehicle).where(func.replace(Vehicle.plate_number, ' ', '') == clean_plate)
        )).first()
        if vehicle:
            active_log = (await session.exec(
                select(VehicleLog)
                .where(VehicleLog.vehicle_id == vehicle.id)
                .where(VehicleLog.exit_time == None)
                .order_by(VehicleLog.entry_time.desc())
            )).first()
            if not active_log:
                log = VehicleLog(
                    vehicle_id=vehicle.id,
                    gate_id=gate.id,
                    entry_time=get_eat_time(),
                    manual_override=True,
                    detected_passengers=1
                )
                session.add(log)
                await session.commit()
                await session.refresh(log)
                await log_action(
                    session=session,
                    action_type="vehicle_scan_in",
                    table_name="vehicle_logs",
                    record_id=str(log.id),
                    description=f"Manual vehicle entry logged for {vehicle.plate_number}",
                    request=request
                )
                return {"message": "Check-in successful", "time": log.entry_time.strftime("%I:%M %p")}
            else:
                return {"message": "Vehicle already checked in", "time": active_log.entry_time.strftime("%I:%M %p")}

        # Fallback 2: check Visitor (by ID number)
        visitor = (await session.exec(select(Visitor).where(Visitor.id_number == admission_number).order_by(Visitor.time_in.desc()))).first()
        if visitor:
            visitor.time_in = get_eat_time()
            visitor.time_out = None
            visitor.status = "checked_in"
            visitor.gate_id = gate.id
            session.add(visitor)
            await session.commit()
            await log_action(
                session=session,
                action_type="visitor_scan_in",
                table_name="visitors",
                record_id=str(visitor.id),
                description=f"Manual visitor checkin for {visitor.first_name} {visitor.last_name}",
                request=request
            )
            return {"message": "Check-in successful", "time": visitor.time_in.strftime("%I:%M %p")}

        # Fallback 3: check EventVisitor (by identifier)
        from app.models import EventVisitor
        event_visitor = (await session.exec(select(EventVisitor).where(EventVisitor.visitor_identifier == admission_number).order_by(EventVisitor.entry_time.desc()))).first()
        if event_visitor:
            event_visitor.status = "checked_in"
            event_visitor.entry_time = get_eat_time()
            session.add(event_visitor)
            await session.commit()
            await log_action(
                session=session,
                action_type="event_visitor_checkin",
                table_name="event_visitors",
                record_id=str(event_visitor.id),
                description=f"Manual event guest checkin for {event_visitor.visitor_name}",
                request=request
            )
            return {"message": "Check-in successful", "time": event_visitor.entry_time.strftime("%I:%M %p")}

        raise HTTPException(status_code=404, detail="Student/Visitor/Guest/Vehicle not found")

    # 1. Close any open sessions for user
    open_logs = (await session.exec(select(EntryLog).where(EntryLog.user_id == user.id).where(EntryLog.exit_time == None))).all()
    for log in open_logs:
        log.exit_time = get_eat_time()
        log.exit_gate_id = gate.id
        session.add(log)
    
    new_log = EntryLog(
        user_id=user.id,
        gate_id=gate.id,
        entry_time=get_eat_time(),
        method="manual",
        status="allowed"
    )
    session.add(new_log)
    await session.commit()

    # Log manual student check-in
    await log_action(
        session=session,
        action_type="create",
        table_name="entry_logs",
        record_id=str(new_log.id),
        description=f"Manual check-in for student {user.full_name} ({admission_number}) at {gate.name}",
        request=request
    )

    return {"message": "Check-in successful", "time": new_log.entry_time.strftime("%I:%M %p")}

@router.post("/check-out/{admission_number}")
async def check_out_user(
    request: Request,
    admission_number: str, 
    gate_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session)
):
    user = (await session.exec(select(User).where(User.admission_number == admission_number))).first()
    
    # Get Gate
    gate = None
    if gate_id:
        try:
            import uuid
            gate = await session.get(Gate, uuid.UUID(str(gate_id)))
        except Exception:
            pass
    if not gate:
        gate = (await session.exec(select(Gate).where(Gate.name == "Main Gate"))).first()
        if not gate:
            gate = Gate(name="Main Gate", location="Main Entrance")
            session.add(gate)
            await session.commit()
            await session.refresh(gate)

    if not user:
        # Fallback 1: check Vehicle
        from sqlalchemy import func
        clean_plate = admission_number.replace(" ", "").upper()
        vehicle = (await session.exec(
            select(Vehicle).where(func.replace(Vehicle.plate_number, ' ', '') == clean_plate)
        )).first()
        if vehicle:
            active_log = (await session.exec(
                select(VehicleLog)
                .where(VehicleLog.vehicle_id == vehicle.id)
                .where(VehicleLog.exit_time == None)
                .order_by(VehicleLog.entry_time.desc())
            )).first()
            if active_log:
                active_log.exit_time = get_eat_time()
                active_log.exit_gate_id = gate.id
                session.add(active_log)
                await session.commit()
                await session.refresh(active_log)
                await log_action(
                    session=session,
                    action_type="vehicle_scan_out",
                    table_name="vehicle_logs",
                    record_id=str(active_log.id),
                    description=f"Manual vehicle exit logged for {vehicle.plate_number}",
                    request=request
                )
                return {"message": "Check-out successful", "time": active_log.exit_time.strftime("%I:%M %p")}
            else:
                # Create a mock entry to checkout
                log = VehicleLog(
                    vehicle_id=vehicle.id,
                    gate_id=gate.id,
                    entry_time=get_eat_time(),
                    exit_time=get_eat_time(),
                    exit_gate_id=gate.id,
                    manual_override=True,
                    detected_passengers=1
                )
                session.add(log)
                await session.commit()
                await session.refresh(log)
                await log_action(
                    session=session,
                    action_type="vehicle_scan_out",
                    table_name="vehicle_logs",
                    record_id=str(log.id),
                    description=f"Manual vehicle exit (no entry log) logged for {vehicle.plate_number}",
                    request=request
                )
                return {"message": "Check-out successful", "time": log.exit_time.strftime("%I:%M %p")}

        # Fallback 2: check Visitor
        visitor = (await session.exec(select(Visitor).where(Visitor.id_number == admission_number).order_by(Visitor.time_in.desc()))).first()
        if visitor:
            visitor.time_out = get_eat_time()
            visitor.status = "checked_out"
            visitor.gate_id = gate.id
            session.add(visitor)
            await session.commit()
            await log_action(
                session=session,
                action_type="visitor_scan_out",
                table_name="visitors",
                record_id=str(visitor.id),
                description=f"Manual visitor checkout for {visitor.first_name} {visitor.last_name}",
                request=request
            )
            return {"message": "Check-out successful", "time": visitor.time_out.strftime("%I:%M %p")}

        # Fallback 3: check EventVisitor
        from app.models import EventVisitor
        event_visitor = (await session.exec(select(EventVisitor).where(EventVisitor.visitor_identifier == admission_number).order_by(EventVisitor.entry_time.desc()))).first()
        if event_visitor:
            event_visitor.status = "checked_out"
            session.add(event_visitor)
            await session.commit()
            await log_action(
                session=session,
                action_type="event_visitor_checkout",
                table_name="event_visitors",
                record_id=str(event_visitor.id),
                description=f"Manual event guest checkout for {event_visitor.visitor_name}",
                request=request
            )
            return {"message": "Check-out successful", "time": get_eat_time().strftime("%I:%M %p")}

        raise HTTPException(status_code=404, detail="Student/Visitor/Guest/Vehicle not found")

    # Find last open entry
    log = (await session.exec(select(EntryLog).where(EntryLog.user_id == user.id).where(EntryLog.exit_time == None).order_by(EntryLog.entry_time.desc()))).first()
    
    if not log:
        # Create a mock entry if none found, to allow checking out.
        log = EntryLog(
            user_id=user.id,
            gate_id=gate.id,
            entry_time=get_eat_time(),
            exit_time=get_eat_time(),
            exit_gate_id=gate.id,
            method="manual",
            status="allowed"
        )
    else:
        log.exit_time = get_eat_time()
        log.exit_gate_id = gate.id
    
    session.add(log)
    await session.commit()

    # Log manual student check-out
    await log_action(
        session=session,
        action_type="update",
        table_name="entry_logs",
        record_id=str(log.id),
        description=f"Manual check-out for student {user.full_name} ({admission_number}) at {gate.name}",
        request=request
    )

    return {"message": "Check-out successful", "time": log.exit_time.strftime("%I:%M %p")}

@router.post("/scan-vehicle")
async def scan_vehicle_plate(
    request: Request,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session)
):
    """
    Uploads an image of a vehicle, performs OCR (Simulated), and logs the entry.
    """
    # 1. Setup Directories
    upload_dir = "static/vehicle_logs"
    os.makedirs(upload_dir, exist_ok=True)
    
    # 2. Save Image
    file_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{file_id}.{ext}"
    filepath = f"{upload_dir}/{filename}"
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 3. Perform OCR (Simulated for Demo)
    # In production: text = ocr_engine.process(filepath)
    # We will simulate a successful read of a plate
    # For demo purposes, we can toggle between a known existing plate and a new one
    
    # Let's try to find an existing vehicle to mock success
    existing_vehicle = (await session.exec(select(Vehicle))).first()
    
    if existing_vehicle and random.choice([True, True, False]):
        detected_text = existing_vehicle.plate_number
    else:
        detected_text = f"KCA {random.randint(100, 999)}{random.choice(['A','B','C'])}"
        
    # 4. Lookup Vehicle with Owner details
    from sqlalchemy.orm import selectinload
    vehicle = (await session.exec(
        select(Vehicle)
        .where(Vehicle.plate_number == detected_text)
        .options(selectinload(Vehicle.owner))
    )).first()
    
    status = "allowed" if vehicle else "flagged" # Flagged if unknown
    
    # 5. Get Gate
    gate = (await session.exec(select(Gate).where(Gate.name == "Main Gate"))).first()
    if not gate:
        # Create default gate if missing (auto-heal)
        gate = Gate(name="Main Gate", location="Main Entrance")
        session.add(gate)
        await session.commit()
    
    # 6. Log Entry
    owner_data = None
    if vehicle and vehicle.owner:
        owner_data = {
            "name": vehicle.owner.full_name,
            "image": vehicle.owner.profile_image or "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            "school": vehicle.owner.school or "N/A"
        }

    if not vehicle:
        # Auto-register as Visitor (Simulate AI Detection of Make/Color)
        ai_colors = ["White", "Silver", "Black", "Blue", "Red", "Grey"]
        ai_makes = ["Toyota Corolla", "Subaru Outback", "Mazda Demio", "Nissan Note", "Honda Fit", "Mercedes C200"]
        rand_make = random.choice(ai_makes).split(" ")
        
        vehicle = Vehicle(
            plate_number=detected_text,
            make=rand_make[0],
            model=rand_make[1],
            color=random.choice(ai_colors)
        )
        session.add(vehicle)
        await session.commit()
        await session.refresh(vehicle)
        status = "visitor"
    elif not vehicle.owner:
        # We have a vehicle but no registered system owner (e.g. staff car not linked yet)
        owner_data = {
            "name": vehicle.driver_name or "Unknown Owner",
            "image": "https://cdn-icons-png.flaticon.com/512/3202/3202926.png", # Car Icon
            "school": "Guest/External"
        }

    # Check if the vehicle is currently checked in (has an active log with exit_time == None)
    active_log = (await session.exec(
        select(VehicleLog)
        .where(VehicleLog.vehicle_id == vehicle.id)
        .where(VehicleLog.exit_time == None)
        .order_by(VehicleLog.entry_time.desc())
    )).first()

    if active_log:
        # Check-out logic
        active_log.exit_time = get_eat_time()
        active_log.exit_gate_id = gate.id
        if filepath:
            if not active_log.vehicle_images:
                active_log.vehicle_images = {}
            active_log.vehicle_images["exit"] = f"/{filepath}"
        session.add(active_log)
        await session.commit()
        await session.refresh(active_log)

        await log_action(
            session=session,
            action_type="vehicle_scan_exit",
            table_name="vehicle_logs",
            record_id=str(active_log.id),
            description=f"AI Vehicle scan exit for {detected_text} at {gate.name} - Status: {status}",
            request=request
        )

        return {
            "status": status,
            "action": "checkout",
            "message": f"Vehicle {detected_text} checked out",
            "data": {
                "plate": detected_text,
                "make": vehicle.make,
                "model": vehicle.model,
                "color": vehicle.color,
                "passengers": active_log.detected_passengers or 1,
                "exit_time": active_log.exit_time.strftime("%I:%M %p"),
                "image_url": f"/{filepath}",
                "owner": owner_data
            }
        }
    else:
        # Log with AI Insights (Passengers)
        log = VehicleLog(
            vehicle_id=vehicle.id,
            gate_id=gate.id,
            entry_time=get_eat_time(),
            vehicle_images={"front": f"/{filepath}"},
            manual_override=False,
            detected_passengers=random.randint(1, 4)
        )
        
        session.add(log)
        await session.commit()
        await session.refresh(log)
        
        await log_action(
            session=session,
            action_type="vehicle_scan",
            table_name="vehicle_logs",
            record_id=str(log.id),
            description=f"AI Vehicle scan for {detected_text} at {gate.name} - Status: {status}",
            request=request
        )
        
        return {
            "status": status,
            "action": "checkin",
            "message": f"Vehicle {detected_text} processed",
            "data": {
                "plate": detected_text,
                "make": vehicle.make,
                "model": vehicle.model,
                "color": vehicle.color,
                "passengers": log.detected_passengers,
                "entry_time": log.entry_time.strftime("%I:%M %p"),
                "image_url": f"/{filepath}",
                "owner": owner_data
            }
        }

@router.post("/ocr-plate")
async def ocr_plate(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session)
):
    """
    Perform OCR on vehicle plate image and return the plate number and registration status.
    """
    upload_dir = "static/vehicle_logs"
    os.makedirs(upload_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"ocr_{file_id}.{ext}"
    filepath = f"{upload_dir}/{filename}"
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    detected_text = ""
    
    def extract_license_plate(text_str: str) -> str:
        if not text_str:
            return ""
        text_str = text_str.upper()
        import re
        
        # Kenyan format: KAA 123A (3 letters, digits, 1 letter)
        match = re.search(r'([KkGg][A-Za-z]{2})\s*(\d{3})\s*([A-Za-z])', text_str)
        if match:
            return f"{match.group(1).upper()} {match.group(2)}{match.group(3).upper()}"
            
        # Old/Alternate: KAA 1234 or KAA 123
        match_alt = re.search(r'([KkGg][A-Za-z]{2})\s*(\d{3,4})', text_str)
        if match_alt:
            return f"{match_alt.group(1).upper()} {match_alt.group(2)}"
            
        # Alphanumeric length 5-10
        clean = re.sub(r'[^A-Z0-9]', '', text_str)
        if len(clean) >= 5 and len(clean) <= 10:
            return clean
            
        return ""

    # Load system AI config
    stmt = select(SystemConfig).where(SystemConfig.key == "ai_config")
    config_record = (await session.exec(stmt)).first()
    ai_config = {}
    if config_record:
        try:
            import json
            ai_config = json.loads(config_record.value)
        except Exception:
            pass

    google_key = ai_config.get("google_vision_api_key", "").strip()
    openai_key = ai_config.get("openai_api_key", "").strip()

    # 1. Try Google Vision OCR if key is set
    if google_key and not detected_text:
        try:
            from google.cloud import vision
            import json
            if google_key.startswith("{"):
                from google.oauth2 import service_account
                info = json.loads(google_key)
                credentials = service_account.Credentials.from_service_account_info(info)
                client = vision.ImageAnnotatorClient(credentials=credentials)
            else:
                from google.api_core.client_options import ClientOptions
                client_options = ClientOptions(api_key=google_key)
                client = vision.ImageAnnotatorClient(client_options=client_options)
                
            with open(filepath, 'rb') as image_file:
                content = image_file.read()
            image = vision.Image(content=content)
            response = client.text_detection(image=image)
            texts = response.text_annotations
            if texts:
                raw_text = texts[0].description
                detected_text = extract_license_plate(raw_text)
                print(f"Google Vision OCR Extracted: '{detected_text}' from raw: '{raw_text}'")
        except Exception as e:
            print(f"Google Vision OCR failed: {e}")

    # 2. Try OpenAI Vision if key is set
    if openai_key and not detected_text:
        try:
            import base64
            import requests
            with open(filepath, "rb") as image_file:
                encoded_image = base64.b64encode(image_file.read()).decode('utf-8')
                
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {openai_key}"
            }
            payload = {
                "model": "gpt-4o",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "What is the vehicle license plate number shown in this image? Respond with ONLY the license plate number (e.g. KCA 123A) and nothing else. If none is found, respond with 'NONE'."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{encoded_image}"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 10
            }
            response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                res_json = response.json()
                gpt_text = res_json['choices'][0]['message']['content'].strip()
                if gpt_text != "NONE":
                    detected_text = extract_license_plate(gpt_text)
                    print(f"OpenAI Vision OCR Extracted: '{detected_text}' from GPT: '{gpt_text}'")
        except Exception as e:
            print(f"OpenAI Vision OCR failed: {e}")

    # 3. Fallback to local Tesseract OCR
    if not detected_text:
        try:
            import pytesseract
            from PIL import Image
            
            image = Image.open(filepath)
            text = pytesseract.image_to_string(image)
            detected_text = extract_license_plate(text)
            print(f"Local Tesseract OCR Extracted: '{detected_text}'")
        except Exception as e:
            print(f"Local OCR failed or tesseract not installed: {e}")
            
    # 4. Final simulation fallback
    if not detected_text:
        existing_vehicle = (await session.exec(select(Vehicle))).first()
        if existing_vehicle and random.choice([True, True, False]):
            detected_text = existing_vehicle.plate_number
        else:
            detected_text = f"KCA {random.randint(100, 999)}{random.choice(['A','B','C'])}"

    # Search in DB using a cleaned comparison (removing spaces)
    from sqlalchemy import func
    from sqlalchemy.orm import selectinload
    
    clean_detected = detected_text.replace(" ", "").upper()
    vehicle = (await session.exec(
        select(Vehicle)
        .where(func.replace(Vehicle.plate_number, ' ', '') == clean_detected)
        .options(selectinload(Vehicle.owner))
    )).first()
    
    # If vehicle exists, use the formatted plate number from the database for display
    display_plate = vehicle.plate_number if vehicle else detected_text
    
    vehicle_dict = None
    is_checked_in = False
    if vehicle:
        d_name = vehicle.driver_name
        d_contact = vehicle.driver_contact
        d_id = vehicle.driver_id_number
        
        # Fallback to owner details if driver details are empty
        if not d_name and vehicle.owner:
            d_name = vehicle.owner.full_name
        if not d_contact and vehicle.owner:
            d_contact = vehicle.owner.phone_number
        if not d_id and vehicle.owner:
            d_id = vehicle.owner.admission_number
            
        vehicle_dict = {
            "id": str(vehicle.id),
            "plate_number": vehicle.plate_number,
            "make": vehicle.make or "Unknown",
            "model": vehicle.model or "Unknown",
            "color": vehicle.color or "Unknown",
            "driver_name": d_name or "",
            "driver_contact": d_contact or "",
            "driver_id_number": d_id or "",
            "is_fleet": vehicle.is_fleet,
            "vehicle_type": vehicle.vehicle_type or "visitor"
        }

        # Check check-in status
        active_log = (await session.exec(
            select(VehicleLog)
            .where(VehicleLog.vehicle_id == vehicle.id)
            .where(VehicleLog.exit_time == None)
            .order_by(VehicleLog.entry_time.desc())
        )).first()
        is_checked_in = active_log is not None
    
    return {
        "plate_number": display_plate,
        "is_registered": vehicle is not None,
        "is_checked_in": is_checked_in,
        "vehicle": vehicle_dict,
        "image_url": f"/{filepath}"
    }

# Duplicate get_vehicle_logs removed (Use the one below)

@router.get("/vehicles")
async def get_all_vehicles(limit: int = 100, session: AsyncSession = Depends(get_session)):
    """Fetch all vehicles"""
    try:
        # Standard ORM Select
        query = select(Vehicle) 
        # Optional: .order_by(Vehicle.plate_number)
        results = (await session.exec(query)).all()
        
        vehicles = []
        for v in results:
            vehicles.append({
                "id": str(v.id),
                "plate_number": v.plate_number,
                "make": v.make or "Unknown",
                "model": v.model or "Unknown",
                "color": v.color or "Unknown",
                "driver_name": v.driver_name,
                "driver_contact": v.driver_contact,
                "driver_id_number": v.driver_id_number
            })
        print(f"DEBUG: Found {len(vehicles)} registered vehicles via ORM")
        return vehicles
    except Exception as e:
        print(f"Error fetching vehicles: {e}")
        return []

@router.get("/vehicles/search")
async def search_vehicles(q: str, session: AsyncSession = Depends(get_session)):
    """Autocomplete search for vehicles by plate"""
    if len(q) < 2: return []
    
    clean_q = q.replace(" ", "").upper()
    from sqlalchemy import func
    query = select(Vehicle).where(func.replace(Vehicle.plate_number, ' ', '').contains(clean_q)).limit(10)
    results = await session.exec(query)
    vehicles = results.all()
    
    output = []
    for v in vehicles:
        active_log = (await session.exec(
            select(VehicleLog)
            .where(VehicleLog.vehicle_id == v.id)
            .where(VehicleLog.exit_time == None)
            .order_by(VehicleLog.entry_time.desc())
        )).first()
        
        output.append({
            "id": str(v.id),
            "plate_number": v.plate_number,
            "driver_name": v.driver_name,
            "driver_contact": v.driver_contact,
            "driver_id_number": v.driver_id_number,
            "vehicle_type": v.vehicle_type or "visitor",
            "is_checked_in": active_log is not None
        })
    return output

@router.post("/vehicle-exit")
async def vehicle_exit(payload: dict, session: AsyncSession = Depends(get_session)):
    """Mark a vehicle as exited"""
    plate = payload.get("plate_number")
    # Find last entry without exit
    query = (
        select(VehicleLog)
        .join(Vehicle)
        .where(Vehicle.plate_number == plate)
        .where(VehicleLog.exit_time == None)
        .order_by(VehicleLog.entry_time.desc())
    )
    log = (await session.exec(query)).first()
    
    if not log:
         raise HTTPException(status_code=404, detail="Vehicle not inside")
    
    log.exit_time = get_eat_time()
    
    gate_id = payload.get("gate_id")
    if gate_id:
        try:
            import uuid
            log.exit_gate_id = uuid.UUID(str(gate_id))
        except Exception:
            pass

    session.add(log)
    await session.commit()
    return {"message": "Exit recorded", "time": log.exit_time.strftime("%H:%M:%S")}

@router.get("/vehicle-stats")
async def get_vehicle_stats(
    gate_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session)
):
    today = get_eat_time().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
    query_today = select(VehicleLog, Vehicle).join(Vehicle).where(VehicleLog.entry_time >= start_of_day)
    if gate_id:
        try:
            import uuid
            gate_uuid = uuid.UUID(gate_id)
            query_today = query_today.where((VehicleLog.gate_id == gate_uuid) | (VehicleLog.exit_gate_id == gate_uuid))
        except Exception:
            pass
    results = (await session.exec(query_today)).all()
    
    logs_data = [] # List of dicts
    for log, vehicle in results:
        logs_data.append({"log": log, "vehicle": vehicle})
    
    total_entered = len(logs_data)
    exited_logs = [d for d in logs_data if d["log"].exit_time]
    active_logs = [d for d in logs_data if not d["log"].exit_time]
    
    total_exited = len(exited_logs)
    current_inside = len(active_logs)
    manual_entries = len([d for d in logs_data if d["log"].manual_override])
    
    # Calculate Longest Stays
    now = get_eat_time()
    durations = []
    
    # Init Hourly Traffic (0-23)
    traffic_map = {i: {"entries": 0, "exits": 0} for i in range(24)}

    for d in logs_data:
        entry = d["log"].entry_time
        exit_t = d["log"].exit_time or now
        duration_sec = (exit_t - entry).total_seconds()
        durations.append({
            "plate": d["vehicle"].plate_number,
            "driver": d["vehicle"].driver_name or "Unknown",
            "make": d["vehicle"].make or "Unknown",
            "duration_sec": duration_sec,
            "status": "Exited" if d["log"].exit_time else "Parked",
            "entry_time": entry.strftime("%H:%M")
        })
        
        # Traffic Counts
        h_in = entry.hour
        if 0 <= h_in < 24: traffic_map[h_in]["entries"] += 1
        
        if d["log"].exit_time:
            h_out = d["log"].exit_time.hour
            if 0 <= h_out < 24: traffic_map[h_out]["exits"] += 1
    
    # Top 5 longest
    longest_stays = sorted(durations, key=lambda x: x["duration_sec"], reverse=True)[:5]
    
    # Format durations
    for d in longest_stays:
        total_seconds = int(d["duration_sec"])
        hours, remainder = divmod(total_seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        if hours > 0:
            d["duration_fmt"] = f"{hours}h {minutes}m"
        else:
            d["duration_fmt"] = f"{minutes}m"

    # Format Hourly Traffic (Show 06:00 to 22:00 or current hour)
    hourly_traffic = []
    for h in range(6, 23): # 6 AM to 10 PM
        hourly_traffic.append({
            "time": f"{h:02d}:00",
            "entries": traffic_map[h]["entries"],
            "exits": traffic_map[h]["exits"]
        })

    return {
        "total_today": total_entered,
        "total_exited": total_exited,
        "current_inside": current_inside,
        "manual_entries": manual_entries,
        "unique_vehicles": len({d["log"].vehicle_id for d in logs_data}),
        "longest_stays": longest_stays,
        "hourly_traffic": hourly_traffic
    }

from sqlmodel import select, func, text

# ... imports ...

@router.get("/vehicle-logs")
async def get_vehicle_logs(session: AsyncSession = Depends(get_session)):
    """
    Get all vehicle logs with vehicle details.
    Uses the exact same robust query pattern as get_vehicle_stats.
    """
    try:
        # Proven working query pattern (ORM Join)
        query = select(VehicleLog, Vehicle).join(Vehicle).order_by(VehicleLog.entry_time.desc())
        
        results = (await session.exec(query)).all()
        print(f"DEBUG: Found {len(results)} logs via ORM")
        
        gates = (await session.exec(select(Gate))).all()
        gate_map = {gate.id: gate.name for gate in gates}
        
        logs = []
        for log, vehicle in results:
            # Handle timestamps details
            # Return full ISO string for frontend parsing
            t_entry = log.entry_time.isoformat() if log.entry_time else None
            t_exit = log.exit_time.isoformat() if log.exit_time else None
            
            logs.append({
                "id": str(log.id),
                "plate": vehicle.plate_number,
                "make": vehicle.make or "Unknown",
                "model": vehicle.model or "Unknown",
                "color": vehicle.color or "Unknown",
                "driver_name": vehicle.driver_name,
                "driver_contact": vehicle.driver_contact,
                "driver_id_number": vehicle.driver_id_number,
                "time": t_entry,
                "entry_time": t_entry, 
                "exit_time": t_exit,
                "status": "allowed" if (vehicle.make != "Unknown") else "flagged",
                "image": log.vehicle_images.get("front") if log.vehicle_images else None,
                "passengers": log.detected_passengers or 1,
                "purpose": log.purpose,
                "destination": log.destination,
                "entry_gate_name": gate_map.get(log.gate_id, "Unknown Gate"),
                "exit_gate_name": gate_map.get(log.exit_gate_id) if log.exit_gate_id else None,
                "manual_override": log.manual_override
            })
        return logs
    except Exception as e:
        print(f"Error fetching logs: {e}")
        return []

@router.post("/alarm")
async def trigger_alarm(session: AsyncSession = Depends(get_session)):
    # In real world: Send websocket event, SMS, Siren
    print("!!! SECURITY ALARM TRIGGERED !!!")
    return {"status": "triggered", "message": "Security Alert Broadcasted"}

@router.get("/student-stats")
async def get_student_stats(
    gate_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session)
):
    today = get_eat_time().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
    query = select(EntryLog).where(EntryLog.entry_time >= start_of_day)
    if gate_id:
        try:
            import uuid
            gate_uuid = uuid.UUID(gate_id)
            query = query.where((EntryLog.gate_id == gate_uuid) | (EntryLog.exit_gate_id == gate_uuid))
        except Exception:
            pass
            
    logs = (await session.exec(query)).all()
    
    if gate_id:
        total = len([log for log in logs if str(log.gate_id) == gate_id])
        active = len([log for log in logs if str(log.gate_id) == gate_id and not log.exit_time])
        exited = len([log for log in logs if log.exit_time and (str(log.exit_gate_id) == gate_id or str(log.gate_id) == gate_id)])
    else:
        total = len(logs)
        active = len([log for log in logs if not log.exit_time])
        exited = len([log for log in logs if log.exit_time])
    
    return {
        "total_today": total,
        "active_now": active,
        "exited_today": exited
    }

# --- Visitor Management ---

@router.get("/visitors")
async def list_visitors(session: AsyncSession = Depends(get_session)):
    query = select(Visitor, Gate).join(Gate, isouter=True).order_by(Visitor.time_in.desc()).limit(100)
    results = await session.exec(query)
    visitors_list = []
    for visitor, gate in results:
        v_dict = visitor.dict()
        v_dict["gate_name"] = gate.name if gate else "Unknown Gate"
        visitors_list.append(v_dict)
    return visitors_list

@router.post("/visitors/check-in")
async def check_in_visitor(
    request: Request,
    payload: dict, # { first_name, last_name, phone_number, id_number, visit_details }
    session: AsyncSession = Depends(get_session)
):
    try:
        phone_number = payload.get("phone_number")
        if not phone_number or not str(phone_number).strip():
            raise ValueError("Phone number is required")
            
        gate_id = payload.get("gate_id")
        gate_uuid = None
        if gate_id:
            try:
                import uuid
                gate_uuid = uuid.UUID(str(gate_id))
            except Exception:
                pass

        visitor = Visitor(
            first_name=payload.get("first_name"),
            last_name=payload.get("last_name"),
            phone_number=str(phone_number).strip(),
            id_number=payload.get("id_number"),
            visit_details=payload.get("visit_details"),
            visitor_type=payload.get("visitor_type", "visitor"),
            plate_number=payload.get("plate_number"),
            passengers=payload.get("passengers", 1),
            dropoff_name=payload.get("dropoff_name"),
            dropoff_admission_number=payload.get("dropoff_admission_number"),
            is_pickup=payload.get("is_pickup", False),
            check_in_student=payload.get("check_in_student", False),
            status="checked_in",
            gate_id=gate_uuid,
            time_in=get_eat_time()
        )
        session.add(visitor)
        await session.commit()
        await session.refresh(visitor)

        # Log vehicle if plate number exists
        if visitor.plate_number:
            clean_plate = visitor.plate_number.replace(" ", "").upper()
            vehicle = (await session.exec(
                select(Vehicle).where(func.replace(Vehicle.plate_number, ' ', '') == clean_plate)
            )).first()
            if not vehicle:
                vehicle = Vehicle(
                    plate_number=visitor.plate_number,
                    make="Unknown",
                    model="Visitor Vehicle",
                    color="Unknown",
                    vehicle_type="visitor",
                    status="active"
                )
                session.add(vehicle)
                await session.commit()
                await session.refresh(vehicle)
            
            v_log = VehicleLog(
                vehicle_id=vehicle.id,
                gate_id=visitor.gate_id or gate_uuid,
                entry_time=get_eat_time(),
                vehicle_images={},
                manual_override=True,
                detected_passengers=visitor.passengers or 1,
                purpose=visitor.visit_details,
                destination=visitor.dropoff_name or "Campus"
            )
            session.add(v_log)
            await session.commit()

        # Check if visitor ID matches student admission number and auto-check-in student
        if visitor.id_number:
            student = (await session.exec(select(User).where(User.admission_number == visitor.id_number))).first()
            if student:
                # Close any open logs
                open_logs = (await session.exec(
                    select(EntryLog)
                    .where(EntryLog.user_id == student.id)
                    .where(EntryLog.exit_time == None)
                )).all()
                for log in open_logs:
                    log.exit_time = get_eat_time()
                    log.exit_gate_id = visitor.gate_id
                    session.add(log)
                
                # Check In student
                student_log = EntryLog(
                    user_id=student.id,
                    gate_id=visitor.gate_id or gate_uuid,
                    entry_time=get_eat_time(),
                    method="visitor_check_in",
                    status="allowed"
                )
                session.add(student_log)
                await session.commit()

        # Log visitor check-in
        await log_action(
            session=session,
            action_type="create",
            table_name="visitors",
            record_id=str(visitor.id),
            description=f"Visitor {visitor.first_name} {visitor.last_name} checked in",
            request=request
        )

        return visitor
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Check-in failed: {str(e)}")

@router.post("/visitors/check-out")
async def check_out_visitor(
    request: Request,
    payload: dict, # { visitor_id }
    session: AsyncSession = Depends(get_session)
):
    visitor_id = payload.get("visitor_id")
    try:
        # Ensure UUID format
        if isinstance(visitor_id, str):
            visitor_id = uuid.UUID(visitor_id)
    except Exception:
        pass # Let session.get handle or return None

    visitor = await session.get(Visitor, visitor_id)
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor not found")
        
    visitor.time_out = get_eat_time()
    visitor.status = "checked_out"
    session.add(visitor)
    await session.commit()
    await session.refresh(visitor)

    # Log visitor check-out
    await log_action(
        session=session,
        action_type="update",
        table_name="visitors",
        record_id=str(visitor_id),
        description=f"Visitor {visitor.first_name} {visitor.last_name} checked out",
        request=request
    )

    return visitor

@router.post("/visitors/{visitor_id}/approve")
async def approve_visitor_request(
    visitor_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    try:
        if isinstance(visitor_id, str):
            visitor_id = uuid.UUID(visitor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request ID format")

    visitor = await session.get(Visitor, visitor_id)
    if not visitor:
        raise HTTPException(status_code=404, detail="Request not found")

    if visitor.status != "pending":
        raise HTTPException(status_code=400, detail="Request is already processed")

    # 1. Update status to checked_in
    visitor.status = "checked_in"
    visitor.time_in = get_eat_time()
    session.add(visitor)

    # If the visitor is a student (id_number matches a student's admission_number), auto check-in the student
    if visitor.id_number:
        student = (await session.exec(select(User).where(User.admission_number == visitor.id_number))).first()
        if student:
            # Close any open logs
            open_logs = (await session.exec(
                select(EntryLog)
                .where(EntryLog.user_id == student.id)
                .where(EntryLog.exit_time == None)
            )).all()
            for log in open_logs:
                log.exit_time = get_eat_time()
                log.exit_gate_id = visitor.gate_id
                session.add(log)
            
            # Check In student
            student_log = EntryLog(
                user_id=student.id,
                gate_id=visitor.gate_id,
                entry_time=get_eat_time(),
                method="visitor_check_in",
                status="allowed"
            )
            session.add(student_log)

    # 1.5 If standard visitor, register as a User under Visitor role
    if visitor.visitor_type == "visitor":
        from sqlmodel import or_
        from app.models import Role
        visitor_adm = f"VISITOR-{visitor.id_number}"
        user_query = select(User).where(or_(
            User.admission_number == visitor_adm,
            User.admission_number == visitor.id_number
        ))
        existing_user = (await session.exec(user_query)).first()
        if not existing_user and visitor.phone_number and visitor.phone_number != "N/A":
            existing_user = (await session.exec(select(User).where(User.phone_number == visitor.phone_number))).first()
            
        if not existing_user:
            visitor_role = (await session.exec(select(Role).where(Role.name == "Visitor"))).first()
            if not visitor_role:
                visitor_role = Role(name="Visitor", description="Visitor")
                session.add(visitor_role)
                await session.commit()
                await session.refresh(visitor_role)
                
            from app.auth import get_password_hash
            hashed_pwd = get_password_hash(f"visitor-{visitor.id_number}")
            new_visitor_user = User(
                admission_number=visitor_adm,
                full_name=f"{visitor.first_name} {visitor.last_name}",
                school="Visitor Center",
                hashed_password=hashed_pwd,
                role_id=visitor_role.id,
                status="Active",
                phone_number=visitor.phone_number,
                first_name=visitor.first_name,
                last_name=visitor.last_name
            )
            session.add(new_visitor_user)
            await session.commit()

    # 2. If it's a vehicle registration, activate vehicle and log entry
    if visitor.visitor_type == "vehicle_registration":
        if visitor.plate_number:
            plate = visitor.plate_number.strip().upper()
            clean_plate = plate.replace(" ", "")
            from sqlalchemy import func
            vehicle = (await session.exec(
                select(Vehicle).where(func.replace(Vehicle.plate_number, ' ', '') == clean_plate)
            )).first()

            if not vehicle:
                vehicle = Vehicle(
                    plate_number=plate,
                    make="Self-Reg",
                    model="User Registered",
                    color="Unknown"
                )
            
            # Update driver details
            vehicle.driver_name = f"{visitor.first_name} {visitor.last_name}"
            vehicle.driver_contact = visitor.phone_number
            vehicle.driver_id_number = visitor.id_number
            
            # Determine role from visitor details
            # e.g., "Vehicle Registration for student"
            v_role = "visitor"
            if "student" in (visitor.visit_details or "").lower():
                v_role = "student"
            elif "staff" in (visitor.visit_details or "").lower():
                v_role = "staff"
            vehicle.vehicle_type = v_role
            vehicle.status = "active"

            # Link owner
            owner = (await session.exec(
                select(User).where(User.admission_number == visitor.id_number)
            )).first()
            if not owner and visitor.phone_number:
                owner = (await session.exec(
                    select(User).where(User.phone_number == visitor.phone_number)
                )).first()
            if owner:
                vehicle.owner_id = owner.id

            session.add(vehicle)
            await session.commit()
            await session.refresh(vehicle)

            # Log Vehicle Entry
            v_log = VehicleLog(
                vehicle_id=vehicle.id,
                gate_id=visitor.gate_id,
                entry_time=get_eat_time(),
                vehicle_images={},
                manual_override=True,
                detected_passengers=1
            )
            session.add(v_log)

    # 3. If it's a taxi with a plate number, register vehicle and log entry
    elif visitor.visitor_type in ["taxi", "cab"]:
        if visitor.plate_number:
            plate = visitor.plate_number.strip().upper()
            clean_plate = plate.replace(" ", "")
            from sqlalchemy import func
            vehicle = (await session.exec(
                select(Vehicle).where(func.replace(Vehicle.plate_number, ' ', '') == clean_plate)
            )).first()

            if not vehicle:
                vehicle = Vehicle(
                    plate_number=plate,
                    driver_name="Taxi Driver",
                    driver_contact=visitor.phone_number,
                    driver_id_number=visitor.id_number,
                    make="Self-Reg",
                    model="Taxi/Cab",
                    color="Unknown",
                    vehicle_type="visitor",
                    status="active"
                )
                session.add(vehicle)
                await session.commit()
                await session.refresh(vehicle)
            
            v_log = VehicleLog(
                vehicle_id=vehicle.id,
                gate_id=visitor.gate_id,
                entry_time=get_eat_time(),
                vehicle_images={},
                manual_override=True,
                detected_passengers=visitor.passengers or 1
            )
            session.add(v_log)

        # 4. Check in or Check out student/staff based on pick-up or drop-off
        if visitor.dropoff_admission_number:
            student = (await session.exec(
                select(User).where(User.admission_number == visitor.dropoff_admission_number)
            )).first()
            if student:
                if getattr(visitor, "is_pickup", False):
                    # Check Out: Find open EntryLog and close it
                    open_log = (await session.exec(
                        select(EntryLog)
                        .where(EntryLog.user_id == student.id)
                        .where(EntryLog.exit_time == None)
                        .order_by(EntryLog.entry_time.desc())
                    )).first()
                    if open_log:
                        open_log.exit_time = get_eat_time()
                        open_log.exit_gate_id = visitor.gate_id
                        session.add(open_log)
                else:
                    # Check In: Create new EntryLog
                    student_log = EntryLog(
                        user_id=student.id,
                        gate_id=visitor.gate_id,
                        entry_time=get_eat_time(),
                        method="self_service_dropoff",
                        status="allowed"
                    )
                    session.add(student_log)

    await session.commit()
    await session.refresh(visitor)

    # Log action
    await log_action(
        session=session,
        action_type="update",
        table_name="visitors",
        record_id=str(visitor.id),
        description=f"Approved and checked in {visitor.visitor_type} {visitor.first_name} {visitor.last_name}",
        request=request
    )

    return {"status": "success", "message": "Checked in successfully", "visitor": visitor}

@router.post("/visitors/{visitor_id}/decline")
async def decline_visitor_request(
    visitor_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    try:
        if isinstance(visitor_id, str):
            visitor_id = uuid.UUID(visitor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request ID format")

    visitor = await session.get(Visitor, visitor_id)
    if not visitor:
        raise HTTPException(status_code=404, detail="Request not found")

    if visitor.status != "pending":
        raise HTTPException(status_code=400, detail="Request is already processed")

    visitor.status = "rejected"
    visitor.time_out = get_eat_time()
    session.add(visitor)
    await session.commit()
    await session.refresh(visitor)

    # Log action
    await log_action(
        session=session,
        action_type="update",
        table_name="visitors",
        record_id=str(visitor.id),
        description=f"Declined {visitor.visitor_type} request for {visitor.first_name} {visitor.last_name}",
        request=request
    )

    return {"status": "success", "message": "Request declined successfully", "visitor": visitor}

@router.get("/visitor-stats")
async def get_visitor_stats(
    gate_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session)
):
    today = get_eat_time().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
    # 1. Query Visitors
    query = select(Visitor).where(Visitor.time_in >= start_of_day)
    if gate_id:
        try:
            import uuid
            query = query.where(Visitor.gate_id == uuid.UUID(gate_id))
        except Exception:
            pass
    visitors = (await session.exec(query)).all()
    
    total = len(visitors)
    active = len([v for v in visitors if v.status == 'checked_in'])
    exited = len([v for v in visitors if v.status == 'checked_out'])
    
    hourly_visitors = [0] * 24
    for v in visitors:
        if v.time_in:
            hourly_visitors[v.time_in.hour] += 1

    # 2. Query EntryLog (with User and Role)
    from app.models import EntryLog, User, Role, VehicleLog
    
    entry_logs_query = select(EntryLog, User, Role).join(User, EntryLog.user_id == User.id).join(Role, User.role_id == Role.id).where(EntryLog.entry_time >= start_of_day)
    if gate_id:
        try:
            import uuid
            entry_logs_query = entry_logs_query.where(EntryLog.gate_id == uuid.UUID(gate_id))
        except Exception:
            pass
            
    entry_logs_res = (await session.exec(entry_logs_query)).all()
    
    hourly_students = [0] * 24
    hourly_staff = [0] * 24
    hourly_clients = [0] * 24
    
    staff_roles = {"superadmin", "security", "lecturer", "fleetmanager", "driver", "staff"}
    
    for log, user, role in entry_logs_res:
        hour = log.entry_time.hour
        role_name_lower = role.name.lower()
        if role_name_lower == "student":
            hourly_students[hour] += 1
        elif role_name_lower == "client":
            hourly_clients[hour] += 1
        elif role_name_lower in staff_roles:
            hourly_staff[hour] += 1

    # 3. Query Vehicles (VehicleLog)
    vehicle_query = select(VehicleLog).where(VehicleLog.entry_time >= start_of_day)
    if gate_id:
        try:
            import uuid
            vehicle_query = vehicle_query.where(VehicleLog.gate_id == uuid.UUID(gate_id))
        except Exception:
            pass
    vehicles = (await session.exec(vehicle_query)).all()
    
    hourly_vehicles = [0] * 24
    for vl in vehicles:
        if vl.entry_time:
            hourly_vehicles[vl.entry_time.hour] += 1

    return {
        "total_today": total,
        "active_now": active,
        "exited_today": exited,
        "hourly": hourly_visitors,
        "hourly_breakdown": {
            "students": hourly_students,
            "visitors": hourly_visitors,
            "staff": hourly_staff,
            "clients": hourly_clients,
            "cars": hourly_vehicles
        }
    }

@router.get("/stats")
async def get_gate_statistics(session: AsyncSession = Depends(get_session)):
    """Fetch statistics for all gates: Cars, People, Deliveries, Trend"""
    gates = (await session.exec(select(Gate))).all()
    
    stats_data = []
    
    for gate in gates:
        # 1. Count Cars (VehicleLog)
        car_query = select(VehicleLog).where(VehicleLog.gate_id == gate.id)
        cars = len((await session.exec(car_query)).all())
        
        # 2. Count People (EntryLog)
        people_query = select(EntryLog).where(EntryLog.gate_id == gate.id)
        people = len((await session.exec(people_query)).all())
        
        # 3. Deliveries (Mocked logic: ~15% of traffic)
        deliveries = int(cars * 0.15) 
        
        stats_data.append({
            "id": str(gate.id),
            "name": gate.name,
            "location": gate.location,
            "stats": {
                "cars": cars,
                "people": people,
                "deliveries": deliveries,
                # Mock weekly trend for the chart (randomized for visualization)
                "trend": [random.randint(min(50, cars), max(200, cars + 100)) for _ in range(7)] 
            }
        })
        
    return stats_data

# --- Gate Management CRUD ---

@router.get("/manage/gates")
async def list_gates(session: AsyncSession = Depends(get_session)):
    return (await session.exec(select(Gate))).all()

@router.post("/manage/gates")
async def create_gate(gate_data: dict, session: AsyncSession = Depends(get_session), admin: User = Depends(get_current_admin)):
    # Basic validation
    if not gate_data.get("name"): raise HTTPException(400, "Name required")
    gate = Gate(name=gate_data["name"], location=gate_data.get("location"))
    session.add(gate)
    await session.commit()
    await session.refresh(gate)
    return gate

@router.put("/manage/gates/{gate_id}")
async def update_gate(gate_id: uuid.UUID, gate_data: dict, session: AsyncSession = Depends(get_session), admin: User = Depends(get_current_admin)):
    gate = await session.get(Gate, gate_id)
    if not gate: raise HTTPException(404, "Gate not found")
    
    if gate_data.get("name"): gate.name = gate_data["name"]
    if gate_data.get("location"): gate.location = gate_data["location"]
    if "is_active" in gate_data: gate.is_active = gate_data["is_active"]
    
    session.add(gate)
    await session.commit()
    await session.refresh(gate)
    return gate

@router.delete("/manage/gates/{gate_id}")
async def delete_gate(gate_id: uuid.UUID, session: AsyncSession = Depends(get_session), admin: User = Depends(get_current_admin)):
    gate = await session.get(Gate, gate_id)
    if gate:
        session.delete(gate)
        await session.commit()
    return {"message": "Deleted"}

# --- Public/Self-Service Access ---

from sqlalchemy import desc

# ... existing code ...

@router.get("/recent-activity")
async def get_global_recent_activity(session: AsyncSession = Depends(get_session)):
    """Fetch live recent activity (Last 5) from ALL gates"""
    return await fetch_recent_activity(session, None)

@router.get("/recent-activity/{gate_id}")
async def get_gate_recent_activity(gate_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    """Fetch live recent activity (Last 5) for a specific gate"""
    return await fetch_recent_activity(session, gate_id)

async def fetch_recent_activity(session: AsyncSession, gate_id: Optional[uuid.UUID]):
    combined = []
    
    # helper for filtering
    def apply_filter(stmt, model_col):
        if gate_id: return stmt.where(model_col == gate_id)
        return stmt

    # 1. User Entries
    q_users = (
        select(EntryLog, User, Gate)
        .join(User)
        .join(Gate, EntryLog.gate_id == Gate.id)
        .order_by(desc(EntryLog.entry_time))
        .limit(5)
    )
    if gate_id: q_users = q_users.where(EntryLog.gate_id == gate_id)
    
    user_logs = (await session.exec(q_users)).all()
    for log, user, gate in user_logs:
        combined.append({
            "id": str(log.id),
            "type": "user", 
            "role": "Student/Staff", 
            "name": user.full_name or user.first_name, 
            "identifier": user.admission_number,
            "gate": gate.name,
            "time": log.entry_time,
            "status": log.status,
            "details": f"IP: {log.ip_address}" if log.ip_address else "QR Scan",
            "verification_image": log.verification_image
        })

    # 2. Vehicles
    q_vehicles = (
        select(VehicleLog, Vehicle, Gate)
        .join(Vehicle)
        .join(Gate, VehicleLog.gate_id == Gate.id)
        .order_by(desc(VehicleLog.entry_time))
        .limit(5)
    )
    if gate_id: q_vehicles = q_vehicles.where(VehicleLog.gate_id == gate_id)
    
    vehicle_logs = (await session.exec(q_vehicles)).all()
    for log, vehicle, gate in vehicle_logs:
        combined.append({
            "id": str(log.id),
            "type": "vehicle",
            "role": "Vehicle",
            "name": vehicle.plate_number,
            "identifier": vehicle.driver_name or "Unknown Driver",
            "gate": gate.name,
            "time": log.entry_time,
            "status": "allowed",
            "details": f"{log.detected_passengers} Passenger(s)"
        })

    # 3. Visitors
    # Need to join Gate to get name
    q_visitors = (
        select(Visitor, Gate)
        .join(Gate, isouter=True) # Left join just in case
        .order_by(desc(Visitor.time_in))
        .limit(5)
    )
    if gate_id: q_visitors = q_visitors.where(Visitor.gate_id == gate_id)
    
    visitors = (await session.exec(q_visitors)).all()
    for v, gate in visitors:
        combined.append({
            "id": str(v.id),
            "type": "visitor",
            "role": (v.visitor_type or "visitor").title(),
            "name": f"{v.first_name} {v.last_name}",
            "identifier": v.id_number,
            "gate": gate.name if gate else "Unknown",
            "time": v.time_in,
            "status": v.status,
            "details": v.visit_details
        })

    # Sort and slice
    combined.sort(key=lambda x: x['time'], reverse=True)
    return combined[:5]

@router.post("/public/access-request")
async def public_access_request(
    payload: dict, 
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """
    Handles self-service entry requests from QR Code scan pages.
    Payload varies by role: { gate_id, role, data: {...} }
    """
    role = payload.get("role")
    gate_id = payload.get("gate_id")
    data = payload.get("data", {})
    
    # Verify Gate
    gate = None
    if gate_id:
        try:
            import uuid
            gate = await session.get(Gate, uuid.UUID(str(gate_id)))
        except Exception:
            pass
    if not gate:
        # Fallback to "Main Gate"
        from sqlmodel import select
        gate = (await session.exec(select(Gate).where(Gate.name.ilike("%main%")))).first()
        if not gate:
            gate = (await session.exec(select(Gate))).first()
        if not gate:
            gate = Gate(
                name="Main Gate",
                description="Default Main Gate"
            )
            session.add(gate)
            await session.commit()
            await session.refresh(gate)

    if role in ["taxi", "cab", "delivery", "visitor", "vehicle_registration"]:
         import base64
         import uuid as uuid_lib
         import os
         
         # Helper to save base64 image
         def save_base64_image(b64_str, prefix):
             if not b64_str:
                 return None
             try:
                 if "base64," in b64_str:
                     header, encoded = b64_str.split("base64,", 1)
                 else:
                     encoded = b64_str
                 img_bytes = base64.b64decode(encoded)
                 filename = f"{prefix}_{str(uuid_lib.uuid4())[:12]}.jpg"
                 save_dir = "static/deliveries"
                 os.makedirs(save_dir, exist_ok=True)
                 saved_path = f"{save_dir}/{filename}"
                 with open(saved_path, "wb") as f:
                     f.write(img_bytes)
                 return f"/static/deliveries/{filename}"
             except Exception as e:
                 print(f"Failed to save image {prefix}: {e}")
                 return None

         pkg_img = save_base64_image(data.get("delivery_image_package"), "package")
         rcpt_img = save_base64_image(data.get("delivery_image_receipt"), "receipt")

         # Map name details
         first_name = data.get("first_name", "").strip()
         last_name = data.get("last_name", "").strip()
         if first_name or last_name:
             f_name = first_name or "Visitor"
             l_name = last_name or ""
         else:
             full_name = data.get("name") or data.get("driver_name") or "Taxi Driver"
             f_name = full_name.split(" ")[0]
             l_name = full_name.split(" ")[-1] if " " in full_name else ""

         # Create Visitor record with status = "pending"
         visitor = Visitor(
             first_name=f_name,
             last_name=l_name,
             phone_number=data.get("mobile") or data.get("driver_contact") or "N/A",
             id_number=data.get("id_number") or data.get("driver_id_number") or "N/A",
             visit_details=data.get("purpose") or data.get("delivery_details") or f"Vehicle Registration for {data.get('vehicle_role') or 'visitor'}",
             visitor_type=role,
             status="pending",
             time_in=get_eat_time(),
             gate_id=gate.id if gate else None,
             plate_number=data.get("plate_number") or data.get("driver_plate") or None,
             passengers=int(data.get("passengers")) if data.get("passengers") else None,
             dropoff_name=data.get("dropoff_name"),
             dropoff_admission_number=data.get("dropoff_admission_number"),
             check_in_student=bool(data.get("check_in_student", False)),
             delivery_image_package=pkg_img,
             delivery_image_receipt=rcpt_img,
             auto_delete_24h=bool(data.get("auto_delete_24h", False)),
             is_pickup=bool(data.get("is_pickup", False))
         )

         # Look up drop-off user if admission number is provided
         if data.get("dropoff_admission_number"):
             from sqlmodel import select
             student = (await session.exec(select(User).where(User.admission_number == data.get("dropoff_admission_number")))).first()
             if student:
                 visitor.dropoff_user_id = student.id

         session.add(visitor)
         await session.commit()
         await session.refresh(visitor)

         return {
              "status": "success",
              "message": "Request submitted successfully. Please wait for guard verification and check-in approval.",
              "visitor_id": str(visitor.id),
              "id_number": visitor.id_number,
              "visitor_type": visitor.visitor_type
          }

    elif role in ["student", "staff"]:
        # Check IP Address
        client_ip = request.client.host if request.client else "unknown"
        # Define allowed University IPs (Mock Range + Localhost)
        # Strictly enforces university IP for approval
        ALLOWED_IPS = ["127.0.0.1", "::1", "localhost"] 
        # In production, this would be the University's Public IP or Subnet, e.g., "196.201..."
        
        # Verify Image Metadata & Save
        image_b64 = data.get("image")
        saved_image_path = None
        
        if not image_b64:
             raise HTTPException(400, "Verification photo required")
             
        try:
            # Decode and Save Image
            if "base64," in image_b64:
                header, encoded = image_b64.split("base64,", 1)
            else:
                encoded = image_b64
                
            import base64
            img_bytes = base64.b64decode(encoded)
            
            # TODO: Add deeper metadata verification here (e.g. check EXIF if available, though canvas usually strips it)
            # For now, we trust the frontend enforced camera-only usage and analyze usage later.
            
            file_id = str(uuid.uuid4())
            filename = f"{file_id}.jpg"
            save_dir = "static/verifications"
            os.makedirs(save_dir, exist_ok=True)
            saved_image_path = f"{save_dir}/{filename}"
            
            with open(saved_image_path, "wb") as f:
                f.write(img_bytes)
                
        except Exception as e:
            print(f"Image processing failed: {e}")
            raise HTTPException(500, "Failed to process verification image")
        
        # If IP is invalid, we flag it but might still record it as 'flagged' or reject?
        # User said: "only approve scan from the univerwsitis ip"
        is_ip_valid = client_ip in ALLOWED_IPS or client_ip.startswith("192.168.")
        
        entry_status = "allowed"
        fail_reason = []
        
        if not is_ip_valid:
            entry_status = "rejected"
            fail_reason.append("Invalid Network Location")
            
        user_id = data.get("user_id")
        if user_id:
             user = await session.get(User, user_id)
             if user:
                 if user.status != "active":
                     entry_status = "rejected"
                     fail_reason.append(f"Account {user.status}")
                 
                 final_status = entry_status
                 
                 if final_status == "rejected":
                     status_msg = f"Entry Denied: {', '.join(fail_reason)}"
                     return {"status": "rejected", "message": status_msg}

                 action = payload.get("action") or data.get("action") or "checkin"
                 if action == "checkout":
                     # Check out the student
                     open_log = (await session.exec(
                         select(EntryLog)
                         .where(EntryLog.user_id == user.id)
                         .where(EntryLog.exit_time == None)
                         .order_by(EntryLog.entry_time.desc())
                     )).first()
                     if open_log:
                         open_log.exit_time = get_eat_time()
                         open_log.exit_gate_id = gate.id
                         session.add(open_log)
                         await session.commit()
                         return {"status": "success", "message": f"Checked out student {user.full_name} successfully."}
                     else:
                         # Create a checkout record directly if no open entry log exists
                         log = EntryLog(
                             user_id=user.id,
                             gate_id=gate.id,
                             entry_time=get_eat_time(),
                             exit_time=get_eat_time(),
                             exit_gate_id=gate.id,
                             method="self_service_verification",
                             status=final_status,
                             ip_address=client_ip,
                             verification_image=saved_image_path
                         )
                         session.add(log)
                         await session.commit()
                         return {"status": "success", "message": f"Checked out student {user.full_name} successfully."}
                 else:
                     # Check in the student
                     log = EntryLog(
                         user_id=user.id,
                         gate_id=gate.id,
                         entry_time=get_eat_time(),
                         method="self_service_verification",
                         status=final_status,
                         ip_address=client_ip,
                         verification_image=saved_image_path
                     )
                     session.add(log)
                     await session.commit()
                     return {"status": "success", "message": f"Welcome back, {user.first_name}"}
             else:
                  raise HTTPException(404, "User not found")
        else:
             raise HTTPException(400, "User ID required for student entry")
        
    return {"status": "pending", "message": "Request processed"}

@router.post("/public/register-vehicle")
async def public_register_vehicle(
    payload: dict,
    session: AsyncSession = Depends(get_session)
):
    """
    Self-service vehicle registration endpoint.
    Payload: {
        "driver_name": str,
        "driver_id_number": str,
        "driver_contact": str,
        "plate_number": str,
        "role": str
    }
    """
    first_name = payload.get("first_name", "").strip()
    last_name = payload.get("last_name", "").strip()
    driver_name = payload.get("driver_name", "").strip()
    if first_name or last_name:
        driver_name = f"{first_name} {last_name}".strip()
    driver_id_number = payload.get("driver_id_number", "").strip()
    driver_contact = payload.get("driver_contact", "").strip()
    plate_number = payload.get("plate_number", "").strip().upper()
    role = payload.get("role", "visitor").strip().lower()

    if not plate_number or not driver_name or not driver_id_number or not driver_contact:
        raise HTTPException(status_code=400, detail="All fields (Name, ID, Contact, Plate) are required.")

    if role not in ["staff", "student", "visitor"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be Staff, Student, or Visitor.")

    # Clean plate number for lookup
    clean_plate = plate_number.replace(" ", "").upper()
    
    # 1. Lookup vehicle by plate
    from sqlalchemy import func
    vehicle = (await session.exec(
        select(Vehicle).where(func.replace(Vehicle.plate_number, ' ', '') == clean_plate)
    )).first()

    if not vehicle:
        vehicle = Vehicle(
            plate_number=plate_number,
            make="Self-Reg",
            model="User Registered",
            color="Unknown"
        )

    # 2. Update vehicle details
    vehicle.driver_name = driver_name
    vehicle.driver_contact = driver_contact
    vehicle.driver_id_number = driver_id_number
    vehicle.vehicle_type = role  # staff, student, visitor
    vehicle.status = "active"

    # 3. Try to link to a system user (owner)
    owner = (await session.exec(
        select(User).where(User.admission_number == driver_id_number)
    )).first()
    if not owner and driver_contact:
        owner = (await session.exec(
            select(User).where(User.phone_number == driver_contact)
        )).first()
        
    if owner:
        vehicle.owner_id = owner.id

    session.add(vehicle)
    await session.commit()
    await session.refresh(vehicle)

    return {
        "status": "success",
        "message": f"Vehicle {plate_number} registered successfully as {role.upper()}.",
        "data": {
            "id": str(vehicle.id),
            "plate_number": vehicle.plate_number,
            "driver_name": vehicle.driver_name,
            "role": role
        }
    }

@router.get("/scan-logs")
async def get_all_gate_scan_logs(limit: int = 100, session: AsyncSession = Depends(get_session)):
    """Fetch all gate scan logs"""
    query = select(GateScanLog, Gate).join(Gate, isouter=True).order_by(GateScanLog.timestamp.desc()).limit(limit)
    results = (await session.exec(query)).all()
    
    logs = []
    for log, gate in results:
        logs.append({
            "id": str(log.id),
            "timestamp": log.timestamp.isoformat(),
            "scan_type": log.scan_type,
            "scanned_value": log.scanned_value,
            "gate_name": gate.name if gate else "Unknown Gate",
            "status": log.status,
            "details": log.details,
            "scanner": log.scanner_name or "System"
        })
    return logs

async def create_scan_log(session: AsyncSession, gate_id: Optional[uuid.UUID], scan_type: str, value: str, status: str, details: str = None, guard_id: Optional[uuid.UUID] = None, scanner_name: str = None):
    try:
        log = GateScanLog(
            gate_id=gate_id,
            scan_type=scan_type,
            scanned_value=value,
            status=status,
            details=details,
            guard_id=guard_id,
            scanner_name=scanner_name,
            timestamp=get_eat_time()
        )
        session.add(log)
        await session.commit()
    except Exception as e:
        print(f"Failed to log scan: {e}")
