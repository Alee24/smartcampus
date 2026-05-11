from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import select, Session, func
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_session
from app.models import (
    Vehicle, FleetTrip, FleetPassengerManifest, 
    FleetFuelLog, FleetGPSLog, FleetMaintenanceLog, 
    FleetNotification, User, Role
)
from app.auth import get_current_user
from app.utils.audit import log_action

router = APIRouter()

# --- Vehicle Management ---

@router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Vehicle))
    return result.all()

@router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(
    request: Request,
    vehicle: Vehicle, 
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
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
        new_values=vehicle.dict(),
        request=request
    )
    
    return vehicle

@router.get("/vehicles/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(vehicle_id: UUID, session: AsyncSession = Depends(get_session)):
    vehicle = await session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

# --- Trip Management ---

@router.get("/trips", response_model=List[FleetTrip])
async def get_trips(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(FleetTrip))
    return result.all()

@router.post("/trips", response_model=FleetTrip)
async def create_trip(
    request: Request,
    trip: FleetTrip, 
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    
    await log_action(
        session=session,
        action_type="create",
        user=admin,
        table_name="fleet_trips",
        record_id=str(trip.id),
        description=f"Scheduled new trip: {trip.destination}",
        new_values=trip.dict(),
        request=request
    )
    
    return trip

@router.post("/trips/{trip_id}/start")
async def start_trip(
    request: Request,
    trip_id: UUID, 
    odometer: float, 
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
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
    
    return {"status": "success", "message": "Trip started"}

@router.post("/trips/{trip_id}/end")
async def end_trip(
    request: Request,
    trip_id: UUID, 
    odometer: float, 
    notes: Optional[str] = None, 
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
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
    
    return {"status": "success", "message": "Trip ended"}

# --- Fuel Logging ---

@router.post("/fuel-logs", response_model=FleetFuelLog)
async def create_fuel_log(
    request: Request,
    log: FleetFuelLog, 
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_user)
):
    session.add(log)
    
    # Update vehicle odometer if provided
    vehicle = await session.get(Vehicle, log.vehicle_id)
    if vehicle and log.odometer_reading > vehicle.current_odometer:
        vehicle.current_odometer = log.odometer_reading
        session.add(vehicle)
        
    await session.commit()
    await session.refresh(log)
    
    await log_action(
        session=session,
        action_type="create",
        user=admin,
        table_name="fleet_fuel_logs",
        record_id=str(log.id),
        description=f"Logged fuel for vehicle (Liters: {log.liters}, Amount: {log.amount})",
        new_values=log.dict(),
        request=request
    )
    
    return log

# --- GPS Tracking (Real-time updates) ---

@router.post("/gps-logs")
async def log_gps(log: FleetGPSLog, session: AsyncSession = Depends(get_session)):
    session.add(log)
    await session.commit()
    return {"status": "success"}

@router.get("/vehicles/{vehicle_id}/location")
async def get_latest_location(vehicle_id: UUID, session: AsyncSession = Depends(get_session)):
    statement = select(FleetGPSLog).where(FleetGPSLog.vehicle_id == vehicle_id).order_by(FleetGPSLog.timestamp.desc()).limit(1)
    result = await session.exec(statement)
    location = result.first()
    if not location:
        return {"status": "error", "message": "No location data found"}
    return location

# --- Dashboard Stats ---

@router.get("/stats")
async def get_fleet_stats(session: AsyncSession = Depends(get_session)):
    # Total vehicles
    total_vehicles = (await session.exec(select(func.count(Vehicle.id)))).first()
    # Active trips
    active_trips = (await session.exec(select(func.count(FleetTrip.id)).where(FleetTrip.status == "ongoing"))).first()
    # Maintenance due (placeholder logic)
    maintenance_due = (await session.exec(select(func.count(Vehicle.id)).where(Vehicle.status == "maintenance"))).first()
    
    return {
        "total_vehicles": total_vehicles,
        "active_trips": active_trips,
        "maintenance_due": maintenance_due,
        "active_drivers": 10, # Mocked for now
    }
