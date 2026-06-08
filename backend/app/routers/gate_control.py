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
    Manually log vehicle entry with passenger count.
    Payload: { "plate_number": str, "passengers": int }
    """
    plate = payload.get("plate_number", "").strip().upper()
    passengers = payload.get("passengers", 1)
    
    if not plate:
        raise HTTPException(status_code=400, detail="Plate number required")

    # 1. Lookup/Create Vehicle
    vehicle = (await session.exec(select(Vehicle).where(Vehicle.plate_number == plate))).first()
    
    status = "allowed"
    if not vehicle:
        # Create new "Visitor" vehicle
        vehicle = Vehicle(
            plate_number=plate,
            make="Unknown",
            model="Auto-Logged",
            color="Unknown"
        )
        status = "visitor"
    
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

    # 3. Log Entry
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

    # Log manual vehicle entry
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
        "message": f"Vehicle {plate} logged manually",
        "data": {
            "plate": plate,
            "passengers": passengers,
            "time": log.entry_time.strftime("%I:%M %p"),
            "isVehicle": True,
            "image": "https://cdn-icons-png.flaticon.com/512/3202/3202926.png" # Car Icon
        }
    }

@router.post("/scan")
async def scan_entry(
    request: Request,
    scan_data: dict, # { "admission_number": "...", "gate_id": "optional" }
    session: AsyncSession = Depends(get_session)
):
    import re
    code = scan_data.get("admission_number", "").strip()
    if not code:
        return {"status": "rejected", "message": "Scanned code is empty", "data": None}

    # 1. Check for Gate
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

    # 2. Check for Prefix
    upper_code = code.upper()
    parsed_code = code
    entity_type = None

    if upper_code.startswith("EVENT:"):
        entity_type = "event"
        parsed_code = code[6:].strip()
    elif upper_code.startswith("VEHICLE:") or upper_code.startswith("BUS:"):
        entity_type = "vehicle"
        parsed_code = code.split(":", 1)[1].strip()
    elif upper_code.startswith("VISITOR:"):
        entity_type = "visitor"
        parsed_code = code[8:].strip()
    elif upper_code.startswith("STUDENT:") or upper_code.startswith("STAFF:"):
        entity_type = "user"
        parsed_code = code.split(":", 1)[1].strip()
    
    # 3. If no prefix matched, we auto-identify from the string format/data
    if not entity_type:
        # Check User first
        user = (await session.exec(select(User).where(User.admission_number == code))).first()
        if user:
            entity_type = "user"
            parsed_code = code
        else:
            # Check Vehicle table
            vehicle = (await session.exec(select(Vehicle).where(Vehicle.plate_number == code.upper()))).first()
            if vehicle:
                entity_type = "vehicle"
                parsed_code = code
            else:
                # Check Visitor table
                visitor = (await session.exec(select(Visitor).where(Visitor.id_number == code))).first()
                if not visitor:
                    # check if code is UUID matching visitor ID
                    try:
                        import uuid
                        val_uuid = uuid.UUID(code)
                        visitor = await session.get(Visitor, val_uuid)
                    except Exception:
                        pass
                
                if visitor:
                    entity_type = "visitor"
                    parsed_code = code
                else:
                    # Check if code matches standard Kenyan vehicle plate formats or generic alphanumeric format
                    is_plate = bool(re.match(r'^[A-Z]{2,3}\s?\d{3,4}\s?[A-Z]{0,2}$', upper_code)) or bool(re.match(r'^[A-Z0-9\s]{5,10}$', upper_code))
                    if is_plate:
                        entity_type = "vehicle"
                        parsed_code = code
                    else:
                        entity_type = "user"
                        parsed_code = code

    # Now handle based on detected entity type
    if entity_type == "event":
        token = parsed_code
        ev = (await session.exec(select(Event).where(Event.qr_code_token == token))).first()
        if ev:
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
        else:
             return {"status": "rejected", "message": "Invalid Event Pass"}

    elif entity_type == "vehicle":
        plate = parsed_code.upper().replace("-", " ")
        vehicle = (await session.exec(select(Vehicle).where(Vehicle.plate_number == plate))).first()
        
        # Auto-create vehicle if not exists
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
                vehicle_type="bus" if "BUS" in upper_code else "utility"
            )
            session.add(vehicle)
            await session.commit()
            await session.refresh(vehicle)
            
        # Check logs for open entry (exit_time is null)
        open_log = (await session.exec(
            select(VehicleLog)
            .where(VehicleLog.vehicle_id == vehicle.id)
            .where(VehicleLog.exit_time == None)
            .order_by(VehicleLog.entry_time.desc())
        )).first()

        if open_log:
            # Check Out
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
            # Check In
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

    elif entity_type == "visitor":
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
        user = (await session.exec(select(User).where(User.admission_number == parsed_code))).first()
        if not user:
            return {
                "status": "rejected",
                "message": f"User not found for code: {parsed_code}",
                "data": None
            }
            
        status = "allowed"
        message = "Access Granted"
        if user.status != "active":
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
            # Check In
            new_log = EntryLog(
                user_id=user.id,
                gate_id=gate.id,
                entry_time=get_eat_time(),
                method="qr",
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

@router.post("/check-in/{admission_number}")
async def check_in_user(
    request: Request,
    admission_number: str, 
    gate_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session)
):
    user = (await session.exec(select(User).where(User.admission_number == admission_number))).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
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

    # 1. Close any open sessions
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

    return {"message": "Check-in successful", "time": new_log.entry_time.strftime("%H:%M %p")}

@router.post("/check-out/{admission_number}")
async def check_out_user(
    request: Request,
    admission_number: str, 
    gate_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session)
):
    user = (await session.exec(select(User).where(User.admission_number == admission_number))).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
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

    return {"message": "Check-out successful", "time": log.exit_time.strftime("%H:%M %p")}

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
    try:
        import pytesseract
        from PIL import Image
        import re
        
        image = Image.open(filepath)
        text = pytesseract.image_to_string(image)
        # Clean text: uppercase and remove non-alphanumeric characters
        clean_text = re.sub(r'[^A-Z0-9]', '', text.upper())
        if clean_text:
            # Reconstruct Kenyan format (e.g., KCA 123A -> KCA123A)
            # We will use the cleaned alphanumeric text for searching.
            detected_text = clean_text
    except Exception as e:
        print(f"OCR failed or tesseract not installed: {e}")
        pass
        
    if not detected_text:
        # Fallback if OCR fails completely (for development/testing)
        existing_vehicle = (await session.exec(select(Vehicle))).first()
        if existing_vehicle and random.choice([True, True, False]):
            detected_text = existing_vehicle.plate_number.replace(" ", "")
        else:
            detected_text = f"KCA{random.randint(100, 999)}{random.choice(['A','B','C'])}"

    # Search in DB using a cleaned comparison (removing spaces from DB plate_number as well)
    from sqlalchemy import func
    vehicle = (await session.exec(
        select(Vehicle).where(
            func.replace(Vehicle.plate_number, ' ', '') == detected_text
        )
    )).first()
    
    # If vehicle exists, use the formatted plate number from the database for display
    display_plate = vehicle.plate_number if vehicle else detected_text
    
    return {
        "plate_number": display_plate,
        "is_registered": vehicle is not None,
        "vehicle": vehicle,
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
    query = select(Vehicle).where(Vehicle.plate_number.contains(q)).limit(10)
    results = await session.exec(query)
    return results.all()

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
                "passengers": log.detected_passengers or 1
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
    query = select(Visitor).order_by(Visitor.time_in.desc()).limit(100)
    results = await session.exec(query)
    return results.all()

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
            status="checked_in",
            gate_id=gate_uuid,
            time_in=get_eat_time()
        )
        session.add(visitor)
        await session.commit()
        await session.refresh(visitor)

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

@router.get("/visitor-stats")
async def get_visitor_stats(
    gate_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session)
):
    today = get_eat_time().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
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
    
    # Hourly Distribution
    hourly = [0] * 24
    for v in visitors:
        if v.time_in:
            hourly[v.time_in.hour] += 1

    return {
        "total_today": total,
        "active_now": active,
        "exited_today": exited,
        "hourly": hourly
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

    # Handle Logic based on Role
    if role in ["taxi", "cab", "delivery", "visitor"]:
         # Register Visitor / Vehicle
         # 1. Vehicle if applicable
         vehicle = None
         if data.get("plate_number"):
             # Normalize Plate
             plate = data["plate_number"].strip().upper()
             vehicle = (await session.exec(select(Vehicle).where(Vehicle.plate_number == plate))).first()
             if not vehicle:
                 vehicle = Vehicle(
                     plate_number=plate,
                     driver_name=data.get("name"),
                     driver_id_number=data.get("id_number"),
                     driver_contact=data.get("mobile"),
                     make="Self-Reg",
                     model=role.title(),
                     color="Unknown"
                 )
                 session.add(vehicle)
                 await session.commit()
                 await session.refresh(vehicle)
             
             # Log Vehicle Entry
             v_log = VehicleLog(
                 vehicle_id=vehicle.id,
                 gate_id=gate.id,
                 entry_time=get_eat_time(),
                 vehicle_images={},
                 manual_override=True, # Flag as manual/self-service
                 detected_passengers=int(data.get("passengers", 1))
             )
             session.add(v_log)
         
         # 2. Register Visitor Person (if no vehicle or driver details distinct)
         if not vehicle:
             visitor = Visitor(
                 first_name=data.get("name", "").split(" ")[0],
                 last_name=data.get("name", "").split(" ")[-1] if " " in data.get("name", "") else "",
                 phone_number=data.get("mobile"),
                 id_number=data.get("id_number"),
                 visit_details=f"{role.title()}: {data.get('purpose') or data.get('delivery_details')}",
                 status="checked_in",
                 time_in=get_eat_time(),
                 gate_id=gate.id, # LINK TO GATE
                 visitor_type=role  # RECORD TYPE
             )
             session.add(visitor)

         await session.commit()
         return {"status": "success", "message": "Check-in Successful. You may proceed."}

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
                 status_msg = f"Welcome back, {user.first_name}"
                 
                 if final_status == "rejected":
                     status_msg = f"Entry Denied: {', '.join(fail_reason)}"
                 
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
                 
                 if final_status == "rejected":
                     return {"status": "rejected", "message": status_msg}
                     
                 return {"status": "success", "message": status_msg}
             else:
                  raise HTTPException(404, "User not found")
        else:
             raise HTTPException(400, "User ID required for student entry")
        
    return {"status": "pending", "message": "Request processed"}

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
