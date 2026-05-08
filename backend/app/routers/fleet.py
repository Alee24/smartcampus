from fastapi import APIRouter, Depends, HTTPException, status
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

router = APIRouter()

# --- Vehicle Management ---

@router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Vehicle))
    return result.all()

@router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(vehicle: Vehicle, session: AsyncSession = Depends(get_session)):
    session.add(vehicle)
    await session.commit()
    await session.refresh(vehicle)
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
async def create_trip(trip: FleetTrip, session: AsyncSession = Depends(get_session)):
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    return trip

@router.post("/trips/{trip_id}/start")
async def start_trip(trip_id: UUID, odometer: float, session: AsyncSession = Depends(get_session)):
    trip = await session.get(FleetTrip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip.actual_departure = datetime.utcnow()
    trip.start_odometer = odometer
    trip.status = "ongoing"
    
    session.add(trip)
    await session.commit()
    return {"status": "success", "message": "Trip started"}

@router.post("/trips/{trip_id}/end")
async def end_trip(trip_id: UUID, odometer: float, notes: Optional[str] = None, session: AsyncSession = Depends(get_session)):
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
    return {"status": "success", "message": "Trip ended"}

# --- Fuel Logging ---

@router.post("/fuel-logs", response_model=FleetFuelLog)
async def create_fuel_log(log: FleetFuelLog, session: AsyncSession = Depends(get_session)):
    session.add(log)
    
    # Update vehicle odometer if provided
    vehicle = await session.get(Vehicle, log.vehicle_id)
    if vehicle and log.odometer_reading > vehicle.current_odometer:
        vehicle.current_odometer = log.odometer_reading
        session.add(vehicle)
        
    await session.commit()
    await session.refresh(log)
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
