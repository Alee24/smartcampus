from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import User, EntryLog, Gate, Vehicle, VehicleLog, Visitor, Event
from datetime import datetime
import shutil
import os
import uuid
import random # For mocking

router = APIRouter()

@router.post("/manual-vehicle-entry")
async def manual_vehicle_entry(
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
    gate = (await session.exec(select(Gate).where(Gate.name == "Main Gate"))).first()
    if not gate:
        gate = Gate(name="Main Gate", location="Main Entrance")
        session.add(gate)
        await session.commit()

    # 3. Log Entry
    log = VehicleLog(
        vehicle_id=vehicle.id,
        gate_id=gate.id,
        entry_time=datetime.utcnow(),
        vehicle_images={},
        manual_override=True,
        detected_passengers=passengers
    )
    
    session.add(log)
    await session.commit()
    await session.refresh(log)

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
    scan_data: dict, # { "admission_number": "...", "gate_id": "optional" }
    session: AsyncSession = Depends(get_session)
):
    adm_no = scan_data.get("admission_number")

    # Check for Event Pass
    if adm_no and adm_no.startswith("EVENT:"):
        token = adm_no.split("EVENT:")[1]
        ev = (await session.exec(select(Event).where(Event.qr_code_token == token))).first()
        if ev:
             return {
                 "status": "event_pass",
                 "message": "Valid Event Pass",
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
             
    # Normal User Flow
    
    # 1. Find User
    user_query = select(User).where(User.admission_number == adm_no)
    user = (await session.exec(user_query)).first()
    
    if not user:
        # In a real system we might log "unknown attempt", but schema requires user_id
        return {
            "status": "rejected",
            "message": "User not found",
            "data": None
        }

    # 2. Find Gate (Default to Main Gate if not provided)
    gate_query = select(Gate).where(Gate.name == "Main Gate")
    gate = (await session.exec(gate_query)).first()
    if not gate:
         raise HTTPException(status_code=500, detail="System configuration error: No Gate Found")

    # 3. Validation Logic
    status = "allowed"
    message = "Access Granted"
    if user.status != "active":
        status = "rejected"
        message = f"User is {user.status}"

    # 4. Create Log
    new_log = EntryLog(
        user_id=user.id,
        gate_id=gate.id,
        entry_time=datetime.utcnow(),
        method="manual_scan",
        status=status
    )
    
    session.add(new_log)
    await session.commit()
    await session.refresh(new_log)
    
    # Return enriched data for Frontend
    role_name = "Unknown"
    if user.role_id:
        # We could fetch role, but for speed let's assume we handle it or fetch it validly
        pass

    return {
        "status": status,
        "message": message,
        "data": {
            "name": user.full_name,
            "role": user.school, # Mapping school to role logic for display, or fetch real role
            "time": new_log.entry_time.strftime("%I:%M %p"),
            "image": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" # Placeholder
        }
    }

@router.post("/scan-vehicle")
async def scan_vehicle_plate(
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
        
    # 4. Lookup Vehicle
    vehicle = (await session.exec(select(Vehicle).where(Vehicle.plate_number == detected_text))).first()
    
    status = "allowed" if vehicle else "flagged" # Flagged if unknown
    
    # 5. Get Gate
    gate = (await session.exec(select(Gate).where(Gate.name == "Main Gate"))).first()
    if not gate:
        # Create default gate if missing (auto-heal)
        gate = Gate(name="Main Gate", location="Main Entrance")
        session.add(gate)
        await session.commit()
    
    # 6. Log Entry
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

    # Log with AI Insights (Passengers)
    log = VehicleLog(
        vehicle_id=vehicle.id,
        gate_id=gate.id,
        entry_time=datetime.utcnow(),
        vehicle_images={"front": f"/{filepath}"},
        manual_override=False,
        detected_passengers=random.randint(1, 4)
    )
    
    session.add(log)
    await session.commit()
    await session.refresh(log)
    
    return {
        "status": status,
        "message": f"Vehicle {detected_text} processed",
        "data": {
            "plate": detected_text,
            "make": vehicle.make,
            "model": vehicle.model,
            "color": vehicle.color,
            "passengers": log.detected_passengers,
            "entry_time": log.entry_time.strftime("%H:%M:%S"),
            "image_url": f"/{filepath}" 
        }
    }

@router.get("/vehicle-logs")
async def get_vehicle_logs(
    limit: int = 50,
    session: AsyncSession = Depends(get_session)
):
    """
    Fetch recent vehicle logs with AI insights.
    """
    query = select(VehicleLog, Vehicle).where(VehicleLog.vehicle_id == Vehicle.id).order_by(VehicleLog.entry_time.desc()).limit(limit)
    results = (await session.exec(query)).all()
    
    logs = []
    for log, vehicle in results:
        ai_confidence = 0.85 + (hash(vehicle.plate_number) % 15) / 100.0
        
        logs.append({
            "id": log.id,
            "plate": vehicle.plate_number,
            "make": f"{vehicle.make} {vehicle.model}",
            "color": vehicle.color,
            "image": log.vehicle_images.get("front") if log.vehicle_images else None,
            "time": log.entry_time.strftime("%H:%M:%S"),
            "status": "allowed" if log.status == "allowed" else "visitor",
            "passengers": log.detected_passengers or 1,
            "ai_data": {
                "confidence": f"{ai_confidence:.0%}",
                "analysis": {
                    "size": "Medium" if (log.detected_passengers or 1) < 3 else "Large",
                    "type": "Sedan" if "Toyota" in (vehicle.make or "") else "SUV",
                    "plate_region": "Kenya"
                }
            }
        })
        
    return logs

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
    
    log.exit_time = datetime.utcnow()
    session.add(log)
    await session.commit()
    return {"message": "Exit recorded", "time": log.exit_time.strftime("%H:%M:%S")}

@router.get("/vehicle-stats")
async def get_vehicle_stats(session: AsyncSession = Depends(get_session)):
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
    # Fetch logs with vehicle details
    query_today = select(VehicleLog, Vehicle).join(Vehicle).where(VehicleLog.entry_time >= start_of_day)
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
    now = datetime.utcnow()
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

from sqlmodel import select, func

# ... imports ...

@router.get("/vehicle-logs")
async def get_vehicle_logs(
    session: AsyncSession = Depends(get_session)
):
    """
    Get all vehicle logs with vehicle details.
    """
    query = (
        select(VehicleLog, Vehicle)
        .join(Vehicle, VehicleLog.vehicle_id == Vehicle.id)
        .order_by(VehicleLog.entry_time.desc())
        .limit(50)
    )
    results = await session.exec(query)
    
    logs = []
    for log, vehicle in results.all():
        # Count total entries for this vehicle
        count_q = select(func.count()).select_from(VehicleLog).where(VehicleLog.vehicle_id == vehicle.id)
        count = (await session.exec(count_q)).one()

        logs.append({
            "id": log.id,
            "plate": vehicle.plate_number,
            "make": vehicle.make or "Unknown",
            "model": vehicle.model or "Unknown",
            "color": vehicle.color or "Unknown",
            "driver_name": vehicle.driver_name,
            "driver_contact": vehicle.driver_contact,
            "driver_id_number": vehicle.driver_id_number,
            "time": log.entry_time.strftime("%H:%M:%S") if log.entry_time else "-",
            "exit_time": log.exit_time.strftime("%H:%M:%S") if log.exit_time else None,
            "status": "allowed" if vehicle.make != "Unknown" else "flagged", # Heuristic
            "image": log.vehicle_images.get("front") if log.vehicle_images else None,
            "entry_count": count
        })
    return logs

@router.post("/alarm")
async def trigger_alarm(session: AsyncSession = Depends(get_session)):
    # In real world: Send websocket event, SMS, Siren
    print("!!! SECURITY ALARM TRIGGERED !!!")
    return {"status": "triggered", "message": "Security Alert Broadcasted"}

# --- Visitor Management ---

@router.get("/visitors")
async def list_visitors(session: AsyncSession = Depends(get_session)):
    query = select(Visitor).order_by(Visitor.time_in.desc()).limit(100)
    results = await session.exec(query)
    return results.all()

@router.post("/visitors/check-in")
async def check_in_visitor(
    payload: dict, # { first_name, last_name, phone_number, id_number, visit_details }
    session: AsyncSession = Depends(get_session)
):
    try:
        visitor = Visitor(
            first_name=payload.get("first_name"),
            last_name=payload.get("last_name"),
            phone_number=payload.get("phone_number"),
            id_number=payload.get("id_number"),
            visit_details=payload.get("visit_details"),
            status="checked_in",
            time_in=datetime.utcnow()
        )
        session.add(visitor)
        await session.commit()
        await session.refresh(visitor)
        return visitor
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Check-in failed: {str(e)}")

@router.post("/visitors/check-out")
async def check_out_visitor(
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
        
    visitor.time_out = datetime.utcnow()
    visitor.status = "checked_out"
    session.add(visitor)
    await session.commit()
    await session.refresh(visitor)
    return visitor

@router.get("/visitor-stats")
async def get_visitor_stats(session: AsyncSession = Depends(get_session)):
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
    # Query all visitors from today
    query = select(Visitor).where(Visitor.time_in >= start_of_day)
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
