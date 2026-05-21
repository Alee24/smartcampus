from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date as date_type, timedelta

from app.database import get_session
from app.models import (
    Vehicle, VehicleLog, FleetTrip, FleetPassengerManifest,
    FleetFuelLog, FleetGPSLog, FleetMaintenanceLog,
    FleetNotification, User, Role, Gate
)
from app.auth import get_current_user
from app.utils.audit import log_action

router = APIRouter()

# ---- Safe Pydantic Input Schemas (avoid SQLModel relationship serialization issues) ----

class VehicleCreate(BaseModel):
    plate_number: str
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None
    driver_id_number: Optional[str] = None
    owner_id: Optional[UUID] = None
    vehicle_type: str = "utility"
    fuel_type: str = "petrol"
    fuel_capacity: float = 0.0
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    year: Optional[int] = None
    status: str = "active"
    current_odometer: float = 0.0

class VehicleUpdate(BaseModel):
    plate_number: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None
    driver_id_number: Optional[str] = None
    owner_id: Optional[UUID] = None
    vehicle_type: Optional[str] = None
    fuel_type: Optional[str] = None
    fuel_capacity: Optional[float] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    year: Optional[int] = None
    status: Optional[str] = None
    current_odometer: Optional[float] = None

class TripCreate(BaseModel):
    vehicle_id: UUID
    driver_id: Optional[UUID] = None
    purpose: str
    origin: str
    destination: str
    planned_route: Optional[str] = None
    scheduled_departure: datetime
    start_odometer: float = 0.0
    status: str = "scheduled"
    notes: Optional[str] = None
    trip_lead_name: Optional[str] = None
    trip_lead_contact: Optional[str] = None

class TripUpdate(BaseModel):
    vehicle_id: Optional[UUID] = None
    driver_id: Optional[UUID] = None
    purpose: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    planned_route: Optional[str] = None
    scheduled_departure: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    trip_lead_name: Optional[str] = None
    trip_lead_contact: Optional[str] = None

class FuelLogCreate(BaseModel):
    vehicle_id: UUID
    driver_id: Optional[UUID] = None
    amount_liters: float
    cost: float
    station_name: Optional[str] = None
    odometer_reading: float

class MaintenanceLogCreate(BaseModel):
    vehicle_id: UUID
    service_type: str
    description: str
    cost: float = 0.0
    odometer_reading: float
    service_date: str  # ISO date string e.g. "2026-05-19"
    next_service_due_odometer: Optional[float] = None
    performed_by: Optional[str] = None

class VehicleResponse(BaseModel):
    id: UUID
    plate_number: str
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None
    driver_id_number: Optional[str] = None
    owner_id: Optional[UUID] = None
    vehicle_type: str
    fuel_type: str
    fuel_capacity: float
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    year: Optional[int] = None
    status: str
    current_odometer: float
    is_checked_in: bool = False

# --- Vehicle Management ---

@router.get("/vehicles", response_model=List[VehicleResponse])
async def get_vehicles(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Vehicle))
    vehicles = result.all()
    
    # Query all active log vehicle IDs
    active_logs = (await session.exec(
        select(VehicleLog.vehicle_id)
        .where(VehicleLog.exit_time == None)
    )).all()
    checked_in_ids = set(active_logs)
    
    return [
        VehicleResponse(
            id=v.id,
            plate_number=v.plate_number,
            make=v.make,
            model=v.model,
            color=v.color,
            driver_name=v.driver_name,
            driver_contact=v.driver_contact,
            driver_id_number=v.driver_id_number,
            owner_id=v.owner_id,
            vehicle_type=v.vehicle_type,
            fuel_type=v.fuel_type,
            fuel_capacity=v.fuel_capacity,
            engine_number=v.engine_number,
            chassis_number=v.chassis_number,
            year=v.year,
            status=v.status,
            current_odometer=v.current_odometer,
            is_checked_in=v.id in checked_in_ids
        )
        for v in vehicles
    ]

@router.post("/vehicles", response_model=VehicleResponse)
async def create_vehicle(
    request: Request,
    vehicle_data: VehicleCreate,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    try:
        vehicle = Vehicle(
            plate_number=vehicle_data.plate_number,
            make=vehicle_data.make,
            model=vehicle_data.model,
            color=vehicle_data.color,
            driver_name=vehicle_data.driver_name,
            driver_contact=vehicle_data.driver_contact,
            driver_id_number=vehicle_data.driver_id_number,
            owner_id=vehicle_data.owner_id,
            vehicle_type=vehicle_data.vehicle_type,
            fuel_type=vehicle_data.fuel_type,
            fuel_capacity=vehicle_data.fuel_capacity,
            engine_number=vehicle_data.engine_number,
            chassis_number=vehicle_data.chassis_number,
            year=vehicle_data.year,
            status=vehicle_data.status,
            current_odometer=vehicle_data.current_odometer
        )
        session.add(vehicle)
        await session.commit()
        await session.refresh(vehicle)

        await log_action(
            session=session,
            action_type="create",
            user=admin,
            table_name="vehicles",
            record_id=str(vehicle.id),
            description=f"Registered new vehicle: {vehicle.plate_number} ({vehicle.make} {vehicle.model})",
            new_values={"plate_number": vehicle.plate_number, "make": vehicle.make, "model": vehicle.model, "type": vehicle.vehicle_type},
            request=request
        )
        # Return safe dict instead of SQLModel object to avoid async lazy-load errors on relationships
        return VehicleResponse(
            id=vehicle.id,
            plate_number=vehicle.plate_number,
            make=vehicle.make,
            model=vehicle.model,
            color=vehicle.color,
            driver_name=vehicle.driver_name,
            driver_contact=vehicle.driver_contact,
            driver_id_number=vehicle.driver_id_number,
            owner_id=vehicle.owner_id,
            vehicle_type=vehicle.vehicle_type,
            fuel_type=vehicle.fuel_type,
            fuel_capacity=vehicle.fuel_capacity,
            engine_number=vehicle.engine_number,
            chassis_number=vehicle.chassis_number,
            year=vehicle.year,
            status=vehicle.status,
            current_odometer=vehicle.current_odometer,
            is_checked_in=False
        )
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        if "Duplicate entry" in str(e) or "1062" in str(e) or "UNIQUE" in str(e):
            raise HTTPException(status_code=400, detail=f"A vehicle with plate number '{vehicle_data.plate_number}' already exists.")
        raise HTTPException(status_code=500, detail=f"Failed to register vehicle: {str(e)}")

@router.get("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(vehicle_id: UUID, session: AsyncSession = Depends(get_session)):
    v = await session.get(Vehicle, vehicle_id)
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    open_log = (await session.exec(
        select(VehicleLog)
        .where(VehicleLog.vehicle_id == vehicle_id)
        .where(VehicleLog.exit_time == None)
    )).first()
    
    return VehicleResponse(
        id=v.id,
        plate_number=v.plate_number,
        make=v.make,
        model=v.model,
        color=v.color,
        driver_name=v.driver_name,
        driver_contact=v.driver_contact,
        driver_id_number=v.driver_id_number,
        owner_id=v.owner_id,
        vehicle_type=v.vehicle_type,
        fuel_type=v.fuel_type,
        fuel_capacity=v.fuel_capacity,
        engine_number=v.engine_number,
        chassis_number=v.chassis_number,
        year=v.year,
        status=v.status,
        current_odometer=v.current_odometer,
        is_checked_in=open_log is not None
    )

@router.put("/vehicles/{vehicle_id}")
async def update_vehicle(
    request: Request,
    vehicle_id: UUID,
    vehicle_data: VehicleUpdate,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    try:
        vehicle = await session.get(Vehicle, vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        update_dict = vehicle_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            if hasattr(vehicle, key) and value is not None:
                setattr(vehicle, key, value)
        
        session.add(vehicle)
        await session.commit()
        await session.refresh(vehicle)
        return {"status": "success", "plate_number": vehicle.plate_number}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update vehicle: {str(e)}")

@router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: UUID,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    try:
        vehicle = await session.get(Vehicle, vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        # Delete related GPS logs
        gps_logs = (await session.exec(select(FleetGPSLog).where(FleetGPSLog.vehicle_id == vehicle_id))).all()
        for log in gps_logs:
            await session.delete(log)
            
        # Delete related fuel logs
        fuel_logs = (await session.exec(select(FleetFuelLog).where(FleetFuelLog.vehicle_id == vehicle_id))).all()
        for log in fuel_logs:
            await session.delete(log)
            
        # Delete related maintenance logs
        maintenance_logs = (await session.exec(select(FleetMaintenanceLog).where(FleetMaintenanceLog.vehicle_id == vehicle_id))).all()
        for log in maintenance_logs:
            await session.delete(log)

        # Delete related notifications
        notifications = (await session.exec(select(FleetNotification).where(FleetNotification.vehicle_id == vehicle_id))).all()
        for notification in notifications:
            await session.delete(notification)

        # Delete related vehicle logs
        vehicle_logs = (await session.exec(select(VehicleLog).where(VehicleLog.vehicle_id == vehicle_id))).all()
        for log in vehicle_logs:
            await session.delete(log)

        # Delete related trips (passenger manifests & notifications deleted first)
        trips = (await session.exec(select(FleetTrip).where(FleetTrip.vehicle_id == vehicle_id))).all()
        for trip in trips:
            # Delete passenger manifests for this trip
            manifests = (await session.exec(select(FleetPassengerManifest).where(FleetPassengerManifest.trip_id == trip.id))).all()
            for manifest in manifests:
                await session.delete(manifest)
            
            # Delete trip notifications
            trip_notifications = (await session.exec(select(FleetNotification).where(FleetNotification.trip_id == trip.id))).all()
            for notification in trip_notifications:
                await session.delete(notification)
                
            await session.delete(trip)
            
        # Finally delete the vehicle itself
        await session.delete(vehicle)
        await session.commit()
        
        return {"status": "success", "message": f"Vehicle '{vehicle.plate_number}' and all its related records have been deleted."}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete vehicle: {str(e)}")

@router.post("/vehicles/{vehicle_id}/checkin")
async def check_in_fleet_vehicle(
    vehicle_id: UUID,
    payload: dict = {},
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    try:
        vehicle = await session.get(Vehicle, vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        # Check if already checked in
        open_log = (await session.exec(
            select(VehicleLog)
            .where(VehicleLog.vehicle_id == vehicle_id)
            .where(VehicleLog.exit_time == None)
        )).first()
        if open_log:
            raise HTTPException(status_code=400, detail="Vehicle is already checked in.")
            
        gate = (await session.exec(select(Gate).where(Gate.name == "Main Gate"))).first()
        if not gate:
            gate = Gate(name="Main Gate", location="Main Entrance")
            session.add(gate)
            await session.commit()
            await session.refresh(gate)

        log = VehicleLog(
            vehicle_id=vehicle_id,
            gate_id=gate.id,
            entry_time=datetime.utcnow(),
            vehicle_images={},
            manual_override=True,
            detected_passengers=payload.get("passengers", 1)
        )
        session.add(log)
        await session.commit()
        return {"status": "success", "message": f"Vehicle {vehicle.plate_number} checked in successfully."}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to check in vehicle: {str(e)}")

@router.post("/vehicles/{vehicle_id}/checkout")
async def check_out_fleet_vehicle(
    vehicle_id: UUID,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    try:
        vehicle = await session.get(Vehicle, vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
            
        # Find last open log
        open_log = (await session.exec(
            select(VehicleLog)
            .where(VehicleLog.vehicle_id == vehicle_id)
            .where(VehicleLog.exit_time == None)
            .order_by(VehicleLog.entry_time.desc())
        )).first()
        
        if not open_log:
            # Auto-create entry to allow checkout
            gate = (await session.exec(select(Gate).where(Gate.name == "Main Gate"))).first()
            if not gate:
                gate = Gate(name="Main Gate", location="Main Entrance")
                session.add(gate)
                await session.commit()
                await session.refresh(gate)
            open_log = VehicleLog(
                vehicle_id=vehicle_id,
                gate_id=gate.id,
                entry_time=datetime.utcnow() - timedelta(minutes=5),
                vehicle_images={},
                manual_override=True
            )
            
        open_log.exit_time = datetime.utcnow()
        session.add(open_log)
        await session.commit()
        return {"status": "success", "message": f"Vehicle {vehicle.plate_number} checked out successfully."}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to check out vehicle: {str(e)}")

# --- Trip Management ---

@router.get("/trips")
async def get_trips(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(FleetTrip).order_by(FleetTrip.scheduled_departure.desc()))
    trips = result.all()
    return [
        {
            "id": str(t.id),
            "vehicle_id": str(t.vehicle_id),
            "driver_id": str(t.driver_id) if t.driver_id else None,
            "purpose": t.purpose,
            "origin": t.origin,
            "destination": t.destination,
            "planned_route": t.planned_route,
            "scheduled_departure": t.scheduled_departure.isoformat() if t.scheduled_departure else None,
            "actual_departure": t.actual_departure.isoformat() if t.actual_departure else None,
            "actual_arrival": t.actual_arrival.isoformat() if t.actual_arrival else None,
            "start_odometer": t.start_odometer,
            "end_odometer": t.end_odometer,
            "status": t.status,
            "notes": t.notes,
            "trip_lead_name": t.trip_lead_name,
            "trip_lead_contact": t.trip_lead_contact
        }
        for t in trips
    ]

@router.post("/trips")
async def create_trip(
    request: Request,
    trip_data: TripCreate,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    try:
        # Validate vehicle exists
        vehicle = await session.get(Vehicle, trip_data.vehicle_id)
        if not vehicle:
            raise HTTPException(
                status_code=404,
                detail=f"Vehicle not found. Please select a valid vehicle from the list."
            )

        # Build trip safely without passing relationship data
        trip = FleetTrip(
            vehicle_id=trip_data.vehicle_id,
            driver_id=trip_data.driver_id,
            purpose=trip_data.purpose,
            origin=trip_data.origin,
            destination=trip_data.destination,
            planned_route=trip_data.planned_route,
            scheduled_departure=trip_data.scheduled_departure,
            start_odometer=trip_data.start_odometer,
            status=trip_data.status,
            notes=trip_data.notes,
            trip_lead_name=trip_data.trip_lead_name,
            trip_lead_contact=trip_data.trip_lead_contact
        )
        session.add(trip)
        await session.commit()
        await session.refresh(trip)

        await log_action(
            session=session,
            action_type="create",
            user=admin,
            table_name="fleet_trips",
            record_id=str(trip.id),
            description=f"Scheduled trip: {trip.origin} → {trip.destination} ({trip.purpose})",
            new_values={
                "vehicle": vehicle.plate_number,
                "origin": trip.origin,
                "destination": trip.destination,
                "purpose": trip.purpose,
                "departure": trip.scheduled_departure.isoformat(),
                "status": trip.status
            },
            request=request
        )

        return {
            "id": str(trip.id),
            "vehicle_id": str(trip.vehicle_id),
            "purpose": trip.purpose,
            "origin": trip.origin,
            "destination": trip.destination,
            "scheduled_departure": trip.scheduled_departure.isoformat(),
            "status": trip.status,
            "start_odometer": trip.start_odometer,
            "trip_lead_name": trip.trip_lead_name,
            "trip_lead_contact": trip.trip_lead_contact
        }

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to schedule trip: {str(e)}")

@router.get("/trips/{trip_id}")
async def get_trip_details(
    trip_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    from sqlalchemy.orm import selectinload
    trip = (await session.exec(
        select(FleetTrip)
        .where(FleetTrip.id == trip_id)
        .options(
            selectinload(FleetTrip.vehicle),
            selectinload(FleetTrip.driver),
            selectinload(FleetTrip.passengers)
        )
    )).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    driver_name = trip.driver.full_name if trip.driver else (trip.vehicle.driver_name if trip.vehicle else "N/A")
    driver_contact = trip.driver.phone_number if trip.driver else (trip.vehicle.driver_contact if trip.vehicle else "N/A")
    
    return {
        "id": str(trip.id),
        "vehicle_id": str(trip.vehicle_id),
        "driver_id": str(trip.driver_id) if trip.driver_id else None,
        "purpose": trip.purpose,
        "origin": trip.origin,
        "destination": trip.destination,
        "planned_route": trip.planned_route,
        "scheduled_departure": trip.scheduled_departure.isoformat() if trip.scheduled_departure else None,
        "actual_departure": trip.actual_departure.isoformat() if trip.actual_departure else None,
        "actual_arrival": trip.actual_arrival.isoformat() if trip.actual_arrival else None,
        "start_odometer": trip.start_odometer,
        "end_odometer": trip.end_odometer,
        "status": trip.status,
        "notes": trip.notes,
        "trip_lead_name": trip.trip_lead_name or "N/A",
        "trip_lead_contact": trip.trip_lead_contact or "N/A",
        "vehicle": {
            "plate_number": trip.vehicle.plate_number if trip.vehicle else "N/A",
            "make": trip.vehicle.make if trip.vehicle else "N/A",
            "model": trip.vehicle.model if trip.vehicle else "N/A",
            "driver_name": driver_name,
            "driver_contact": driver_contact
        },
        "passengers": [
            {
                "id": str(p.id),
                "passenger_name": p.passenger_name,
                "phone_number": p.phone_number or "N/A",
                "admission_number": p.admission_number or "N/A",
                "emergency_contact_phone": p.emergency_contact_phone or "N/A",
                "pickup_location": p.pickup_location or "N/A",
                "drop_off_location": p.drop_off_location or "N/A",
                "arrival_confirmed": p.arrival_confirmed,
                "check_in_time": p.check_in_time.isoformat() if p.check_in_time else None
            }
            for p in trip.passengers
        ]
    }

@router.put("/trips/{trip_id}")
async def update_trip_details(
    request: Request,
    trip_id: UUID,
    trip_data: TripUpdate,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    try:
        trip = await session.get(FleetTrip, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
            
        update_dict = trip_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            if hasattr(trip, key) and value is not None:
                setattr(trip, key, value)
                
        session.add(trip)
        await session.commit()
        await session.refresh(trip)
        
        await log_action(
            session=session,
            action_type="update",
            user=admin,
            table_name="fleet_trips",
            record_id=str(trip.id),
            description=f"Updated trip details for: {trip.origin} → {trip.destination}",
            new_values=update_dict,
            request=request
        )
        return {"status": "success", "message": "Trip updated successfully."}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update trip: {str(e)}")

@router.post("/trips/{trip_id}/manifest/upload")
async def upload_passenger_manifest(
    trip_id: UUID,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    import csv
    import io
    try:
        trip = await session.get(FleetTrip, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
            
        content = await file.read()
        try:
            decoded = content.decode("utf-8")
        except UnicodeDecodeError:
            decoded = content.decode("latin-1")
            
        csv_file = io.StringIO(decoded)
        reader = csv.DictReader(csv_file)
        
        # Clear existing passengers
        existing = (await session.exec(
            select(FleetPassengerManifest).where(FleetPassengerManifest.trip_id == trip_id)
        )).all()
        for passenger in existing:
            await session.delete(passenger)
            
        passengers_added = 0
        for row in reader:
            name_key = next((k for k in row.keys() if k and "name" in k.lower()), "passenger_name")
            phone_key = next((k for k in row.keys() if k and "phone" in k.lower() and "emergency" not in k.lower()), "phone_number")
            adm_key = next((k for k in row.keys() if k and ("admission" in k.lower() or "adm" in k.lower())), "admission_number")
            emergency_key = next((k for k in row.keys() if k and "emergency" in k.lower()), "emergency_contact_phone")
            
            p_name = row.get(name_key) or row.get("name") or row.get("passenger_name")
            p_phone = row.get(phone_key) or row.get("phone") or row.get("phone_number")
            p_adm = row.get(adm_key) or row.get("admission") or row.get("admission_number") or row.get("adm_no")
            p_emergency = row.get(emergency_key) or row.get("emergency") or row.get("emergency_contact_phone") or row.get("emergency_contact")
            
            if not p_name:
                continue
                
            manifest_item = FleetPassengerManifest(
                trip_id=trip_id,
                passenger_name=p_name.strip(),
                phone_number=p_phone.strip() if p_phone else None,
                admission_number=p_adm.strip() if p_adm else None,
                emergency_contact_phone=p_emergency.strip() if p_emergency else None,
                arrival_confirmed=False
            )
            session.add(manifest_item)
            passengers_added += 1
            
        await session.commit()
        return {"status": "success", "count": passengers_added, "message": f"Successfully imported {passengers_added} passengers."}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload CSV: {str(e)}")

@router.get("/trips/{trip_id}/report")
async def get_trip_report_summary(
    trip_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    try:
        from sqlalchemy.orm import selectinload
        trip = (await session.exec(
            select(FleetTrip)
            .where(FleetTrip.id == trip_id)
            .options(
                selectinload(FleetTrip.vehicle),
                selectinload(FleetTrip.driver),
                selectinload(FleetTrip.passengers)
            )
        )).first()
        
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
            
        driver_name = trip.driver.full_name if trip.driver else (trip.vehicle.driver_name if trip.vehicle else "N/A")
        driver_contact = trip.driver.phone_number if trip.driver else (trip.vehicle.driver_contact if trip.vehicle else "N/A")
        
        # Calculate duration
        duration_str = "N/A"
        if trip.actual_departure and trip.actual_arrival:
            diff = trip.actual_arrival - trip.actual_departure
            hrs, remainder = divmod(diff.total_seconds(), 3600)
            mins, _ = divmod(remainder, 60)
            duration_str = f"{int(hrs)}h {int(mins)}m"
        elif trip.actual_departure:
            diff = datetime.utcnow() - trip.actual_departure
            hrs, remainder = divmod(diff.total_seconds(), 3600)
            mins, _ = divmod(remainder, 60)
            duration_str = f"{int(hrs)}h {int(mins)}m (ongoing)"
            
        # Calculate odometer distance
        distance = 0.0
        if trip.end_odometer and trip.start_odometer:
            distance = trip.end_odometer - trip.start_odometer
            
        # Find fuel logs associated with this vehicle during the trip
        fuel_cost = 0.0
        fuel_liters = 0.0
        if trip.actual_departure:
            end_time = trip.actual_arrival or datetime.utcnow()
            fuel_query = select(FleetFuelLog).where(
                (FleetFuelLog.vehicle_id == trip.vehicle_id) & 
                (FleetFuelLog.timestamp >= trip.actual_departure) & 
                (FleetFuelLog.timestamp <= end_time)
            )
            fuel_logs = (await session.exec(fuel_query)).all()
            fuel_cost = sum(f.cost for f in fuel_logs)
            fuel_liters = sum(f.amount_liters for f in fuel_logs)
            
        return {
            "id": str(trip.id),
            "origin": trip.origin,
            "destination": trip.destination,
            "purpose": trip.purpose,
            "scheduled_departure": trip.scheduled_departure.isoformat() if trip.scheduled_departure else None,
            "actual_departure": trip.actual_departure.isoformat() if trip.actual_departure else None,
            "actual_arrival": trip.actual_arrival.isoformat() if trip.actual_arrival else None,
            "duration": duration_str,
            "distance_km": distance,
            "status": trip.status,
            "passenger_count": len(trip.passengers),
            "fuel_cost": fuel_cost,
            "fuel_liters": fuel_liters,
            "trip_lead_name": trip.trip_lead_name or "N/A",
            "trip_lead_contact": trip.trip_lead_contact or "N/A",
            "vehicle_plate": trip.vehicle.plate_number if trip.vehicle else "N/A",
            "driver_name": driver_name,
            "driver_contact": driver_contact
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate trip report: {str(e)}")

@router.post("/trips/{trip_id}/start")
async def start_trip(
    request: Request,
    trip_id: UUID,
    odometer: float,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    try:
        trip = await session.get(FleetTrip, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")

        trip.actual_departure = datetime.utcnow()
        trip.start_odometer = odometer
        trip.status = "ongoing"

        session.add(trip)
        await session.commit()

        await log_action(
            session=session,
            action_type="update",
            user=admin,
            table_name="fleet_trips",
            record_id=str(trip_id),
            description=f"Started trip to {trip.destination} (Odometer: {odometer})",
            request=request
        )

        return {"status": "success", "message": "Trip started successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to start trip: {str(e)}")

@router.post("/trips/{trip_id}/end")
async def end_trip(
    request: Request,
    trip_id: UUID,
    odometer: float,
    notes: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    try:
        trip = await session.get(FleetTrip, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")

        trip.actual_arrival = datetime.utcnow()
        trip.end_odometer = odometer
        trip.status = "completed"
        trip.notes = notes

        # Update vehicle odometer
        vehicle = await session.get(Vehicle, trip.vehicle_id)
        if vehicle:
            vehicle.current_odometer = odometer
            session.add(vehicle)

        session.add(trip)
        await session.commit()

        await log_action(
            session=session,
            action_type="update",
            user=admin,
            table_name="fleet_trips",
            record_id=str(trip_id),
            description=f"Ended trip to {trip.destination} (End Odometer: {odometer})",
            request=request
        )

        return {"status": "success", "message": "Trip ended successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to end trip: {str(e)}")

# --- Fuel Logging ---

@router.get("/fuel-logs")
async def get_fuel_logs(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(FleetFuelLog).order_by(FleetFuelLog.timestamp.desc()))
    logs = result.all()
    return [
        {
            "id": str(l.id),
            "vehicle_id": str(l.vehicle_id),
            "amount_liters": l.amount_liters,
            "cost": l.cost,
            "station_name": l.station_name,
            "odometer_reading": l.odometer_reading,
            "timestamp": l.timestamp.isoformat()
        }
        for l in logs
    ]

@router.post("/fuel-logs")
async def create_fuel_log(
    request: Request,
    log_data: FuelLogCreate,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    try:
        vehicle = await session.get(Vehicle, log_data.vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        log = FleetFuelLog(
            vehicle_id=log_data.vehicle_id,
            driver_id=log_data.driver_id,
            amount_liters=log_data.amount_liters,
            cost=log_data.cost,
            station_name=log_data.station_name,
            odometer_reading=log_data.odometer_reading
        )
        session.add(log)

        if log_data.odometer_reading > vehicle.current_odometer:
            vehicle.current_odometer = log_data.odometer_reading
            session.add(vehicle)

        await session.commit()
        await session.refresh(log)

        await log_action(
            session=session,
            action_type="create",
            user=admin,
            table_name="fleet_fuel_logs",
            record_id=str(log.id),
            description=f"Fuel log: {log_data.amount_liters}L @ KES {log_data.cost} for {vehicle.plate_number}",
            new_values={"liters": log_data.amount_liters, "cost": log_data.cost, "vehicle": vehicle.plate_number},
            request=request
        )

        return {
            "id": str(log.id),
            "status": "success",
            "amount_liters": log.amount_liters,
            "cost": log.cost,
            "vehicle_id": str(log.vehicle_id)
        }

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to log fuel: {str(e)}")

# --- Maintenance Management ---

@router.get("/maintenance-logs")
async def get_maintenance_logs(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(FleetMaintenanceLog).order_by(FleetMaintenanceLog.service_date.desc()))
    logs = result.all()
    return [
        {
            "id": str(l.id),
            "vehicle_id": str(l.vehicle_id),
            "service_type": l.service_type,
            "description": l.description,
            "cost": l.cost,
            "odometer_reading": l.odometer_reading,
            "service_date": l.service_date.isoformat() if l.service_date else None,
            "next_service_due_odometer": l.next_service_due_odometer,
            "performed_by": l.performed_by
        }
        for l in logs
    ]

@router.post("/maintenance-logs")
async def create_maintenance_log(
    request: Request,
    log_data: MaintenanceLogCreate,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    try:
        vehicle = await session.get(Vehicle, log_data.vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        svc_date = date_type.fromisoformat(log_data.service_date)

        log = FleetMaintenanceLog(
            vehicle_id=log_data.vehicle_id,
            service_type=log_data.service_type,
            description=log_data.description,
            cost=log_data.cost,
            odometer_reading=log_data.odometer_reading,
            service_date=svc_date,
            next_service_due_odometer=log_data.next_service_due_odometer,
            performed_by=log_data.performed_by
        )
        session.add(log)

        vehicle.status = "active"
        if log_data.odometer_reading > vehicle.current_odometer:
            vehicle.current_odometer = log_data.odometer_reading
        if log_data.next_service_due_odometer:
            vehicle.next_service_odometer = log_data.next_service_due_odometer
        session.add(vehicle)

        await session.commit()
        await session.refresh(log)

        await log_action(
            session=session,
            action_type="create",
            user=admin,
            table_name="fleet_maintenance_logs",
            record_id=str(log.id),
            description=f"Maintenance for {vehicle.plate_number}: {log_data.service_type}",
            new_values={"service_type": log_data.service_type, "vehicle": vehicle.plate_number, "cost": log_data.cost},
            request=request
        )

        return {
            "id": str(log.id),
            "status": "success",
            "service_type": log.service_type,
            "vehicle_id": str(log.vehicle_id)
        }

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to log maintenance: {str(e)}")

# --- GPS Tracking ---

@router.post("/gps-logs")
async def log_gps(log: FleetGPSLog, session: AsyncSession = Depends(get_session)):
    try:
        session.add(log)
        await session.commit()
        return {"status": "success"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to log GPS: {str(e)}")

@router.get("/locations")
async def get_all_latest_locations(session: AsyncSession = Depends(get_session)):
    """Fetch the latest GPS location for every vehicle in the fleet."""
    try:
        subquery = select(
            FleetGPSLog.vehicle_id,
            func.max(FleetGPSLog.timestamp).label("max_ts")
        ).group_by(FleetGPSLog.vehicle_id).subquery()

        statement = select(FleetGPSLog, Vehicle.plate_number).join(
            subquery,
            (FleetGPSLog.vehicle_id == subquery.c.vehicle_id) &
            (FleetGPSLog.timestamp == subquery.c.max_ts)
        ).join(Vehicle, FleetGPSLog.vehicle_id == Vehicle.id)

        result = await session.exec(statement)
        locations = []
        for log, plate in result:
            loc_dict = {
                "id": str(log.id),
                "vehicle_id": str(log.vehicle_id),
                "plate_number": plate,
                "latitude": log.latitude,
                "longitude": log.longitude,
                "speed": log.speed,
                "heading": log.heading,
                "ignition_status": log.ignition_status,
                "timestamp": log.timestamp.isoformat()
            }
            locations.append(loc_dict)

        return locations
    except Exception as e:
        return []  # Return empty list instead of crashing if no GPS data

@router.get("/vehicles/{vehicle_id}/location")
async def get_latest_location(vehicle_id: UUID, session: AsyncSession = Depends(get_session)):
    statement = select(FleetGPSLog).where(FleetGPSLog.vehicle_id == vehicle_id).order_by(FleetGPSLog.timestamp.desc()).limit(1)
    result = await session.exec(statement)
    location = result.first()
    if not location:
        return {"status": "error", "message": "No location data found"}
    return {
        "id": str(location.id),
        "vehicle_id": str(location.vehicle_id),
        "latitude": location.latitude,
        "longitude": location.longitude,
        "speed": location.speed,
        "timestamp": location.timestamp.isoformat()
    }

# --- Dashboard Stats ---

@router.get("/stats")
async def get_fleet_stats(session: AsyncSession = Depends(get_session)):
    try:
        total_vehicles = (await session.exec(select(func.count(Vehicle.id)))).first() or 0
        active_trips = (await session.exec(select(func.count(FleetTrip.id)).where(FleetTrip.status == "ongoing"))).first() or 0
        maintenance_due = (await session.exec(select(func.count(Vehicle.id)).where(Vehicle.status == "maintenance"))).first() or 0

        # Buses currently checked IN (open VehicleLog with no exit_time)
        buses_in = (await session.exec(
            select(func.count(VehicleLog.id)).where(VehicleLog.exit_time == None)
        )).first() or 0
        # Buses currently OUT (total minus checked in)
        buses_out = max(0, total_vehicles - buses_in)

        # Total students who have been on any trip (total passenger manifest entries)
        total_students = (await session.exec(select(func.count(FleetPassengerManifest.id)))).first() or 0

        # Total completed trips
        total_trips = (await session.exec(select(func.count(FleetTrip.id)))).first() or 0

        # Fuel costs and usage
        fuel_spend_raw = (await session.exec(select(func.sum(FleetFuelLog.cost)))).first()
        fuel_spend = float(fuel_spend_raw) if fuel_spend_raw else 0.0

        fuel_usage_raw = (await session.exec(select(func.sum(FleetFuelLog.amount_liters)))).first()
        fuel_usage = float(fuel_usage_raw) if fuel_usage_raw else 0.0

        # Maintenance costs
        maint_spend_raw = (await session.exec(select(func.sum(FleetMaintenanceLog.cost)))).first()
        maint_spend = float(maint_spend_raw) if maint_spend_raw else 0.0

        total_spend = fuel_spend + maint_spend

        # Last maintenance record
        last_maint = (await session.exec(
            select(FleetMaintenanceLog).order_by(FleetMaintenanceLog.service_date.desc()).limit(1)
        )).first()

        last_maintenance_info = None
        if last_maint:
            v = await session.get(Vehicle, last_maint.vehicle_id)
            last_maintenance_info = {
                "vehicle": v.plate_number if v else "Unknown",
                "service_type": last_maint.service_type,
                "description": last_maint.description,
                "date": last_maint.service_date.isoformat() if last_maint.service_date else None,
                "cost": last_maint.cost,
                "performed_by": last_maint.performed_by or "N/A"
            }

        return {
            "total_vehicles": total_vehicles,
            "active_trips": active_trips,
            "maintenance_due": maintenance_due,
            "active_drivers": 0,
            "fuel_usage": round(fuel_usage, 2),
            "buses_in": buses_in,
            "buses_out": buses_out,
            "total_students_on_trips": total_students,
            "total_trips": total_trips,
            "total_spending": round(total_spend, 2),
            "fuel_spending": round(fuel_spend, 2),
            "maintenance_spending": round(maint_spend, 2),
            "last_maintenance": last_maintenance_info
        }
    except Exception as e:
        return {
            "total_vehicles": 0,
            "active_trips": 0,
            "maintenance_due": 0,
            "active_drivers": 0,
            "fuel_usage": 0.0,
            "buses_in": 0,
            "buses_out": 0,
            "total_students_on_trips": 0,
            "total_trips": 0,
            "total_spending": 0.0,
            "fuel_spending": 0.0,
            "maintenance_spending": 0.0,
            "last_maintenance": None
        }
