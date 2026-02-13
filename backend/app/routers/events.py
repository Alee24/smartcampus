from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
import csv
import io
from sqlmodel import select, func, and_, extract
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Dict, Any, Optional
from datetime import datetime, date
import uuid
# Import func explicitly from sqlalchemy to ensure correct SQL generation
from sqlalchemy import func as sa_func 
from ..database import get_session
from ..models import Event, EventVisitor, User, EntryLog, VehicleLog, ClassSession, GateScanLog, TimetableSlot
from ..auth import get_current_user

router = APIRouter(prefix="/api/events", tags=["Events"])

@router.get("/", response_model=List[Event])
async def get_events(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Event).order_by(Event.event_date.desc()))
    return result.all()

@router.post("/", response_model=Event)
async def create_event(event: Event, session: AsyncSession = Depends(get_session), user: User = Depends(get_current_user)):
    event.qr_code_token = str(uuid.uuid4())
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event

@router.get("/by-token/{token}", response_model=Event)
async def get_event_by_token(token: str, session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Event).where(Event.qr_code_token == token))
    event = result.first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.post("/{event_id}/register-visitor", response_model=EventVisitor)
async def register_visitor(
    event_id: uuid.UUID, 
    visitor: EventVisitor, 
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user)
):
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    visitor.event_id = event_id
    visitor.scanned_by = user.id
    visitor.entry_time = datetime.utcnow()
    
    session.add(visitor)
    await session.commit()
    await session.refresh(visitor)
    return visitor

@router.get("/{event_id}/visitors", response_model=List[EventVisitor])
async def get_event_visitors(event_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(EventVisitor).where(EventVisitor.event_id == event_id).order_by(EventVisitor.entry_time.desc()))
    return result.all()

@router.post("/{event_id}/visitors/upload")
async def upload_visitors_csv(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session)
):
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
        
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    count = 0
    for row in reader:
        # Expected Headers: name, id, phone, email
        # Loose matching for columns
        name = row.get("name") or row.get("Name")
        id_num = row.get("id") or row.get("ID") or row.get("id_number")
        phone = row.get("phone") or row.get("Phone")
        email = row.get("email") or row.get("Email")
        
        if name and id_num:
            visitor = EventVisitor(
                event_id=event_id,
                visitor_name=name,
                visitor_identifier=id_num,
                phone_number=phone or "",
                email=email,
                status="pre_registered"
            )
            session.add(visitor)
            count += 1
            
    await session.commit()
    return {"message": f"Successfully uploaded {count} guests", "count": count}

@router.post("/{event_id}/visitors/generate-passes")
async def generate_passes(
    event_id: uuid.UUID,
    session: AsyncSession = Depends(get_session)
):
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    stmt = select(EventVisitor).where(EventVisitor.event_id == event_id)
    visitors = (await session.exec(stmt)).all()
    
    # In a real app, this might generate PDFs or Signed URLs
    # For now, we confirm they exist and are ready
    return {
        "message": f"Generated passes for {len(visitors)} guests",
        "status": "ready"
    }

@router.post("/{event_id}/visitors/send-passes")
async def send_passes_email(
    event_id: uuid.UUID,
    session: AsyncSession = Depends(get_session)
):
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    stmt = select(EventVisitor).where(EventVisitor.event_id == event_id)
    visitors = (await session.exec(stmt)).all()
    
    sent_count = 0
    for v in visitors:
        if v.email:
            # Mock Email Sending
            print(f"Sending Pass to {v.email} for event {event.name}")
            sent_count += 1
            
    return {
        "message": f"Sent emails to {sent_count} guests",
        "sent_count": sent_count,
        "total_guests": len(visitors)
    }

@router.get("/stats/monthly")
async def get_monthly_stats(
    year: int, 
    month: int, 
    session: AsyncSession = Depends(get_session)
):
    """
    Aggegrates daily stats for the Calendar View (People, Vehicles, Classes, Scans).
    Also returns Events for the month.
    """
    # 1. Helper to format date keys
    stats = {}
    
    # 2. People Entries (EntryLog)
    # Group by Date
    query_people = (
        select(sa_func.date(EntryLog.entry_time), sa_func.count())
        .where(extract('year', EntryLog.entry_time) == year)
        .where(extract('month', EntryLog.entry_time) == month)
        .group_by(sa_func.date(EntryLog.entry_time))
    )
    people_results = (await session.exec(query_people)).all()
    
    for day, count in people_results:
        d_str = str(day)
        if d_str not in stats: stats[d_str] = {}
        stats[d_str]["people"] = count

    # 3. Vehicles (VehicleLog)
    query_vehicles = (
        select(sa_func.date(VehicleLog.entry_time), sa_func.count())
        .where(extract('year', VehicleLog.entry_time) == year)
        .where(extract('month', VehicleLog.entry_time) == month)
        .group_by(sa_func.date(VehicleLog.entry_time))
    )
    vehicles_results = (await session.exec(query_vehicles)).all()

    for day, count in vehicles_results:
        d_str = str(day)
        if d_str not in stats: stats[d_str] = {}
        stats[d_str]["vehicles"] = count

    # 4. Classes (ClassSession)
    # Using session_date directly
    query_classes = (
        select(ClassSession.session_date, sa_func.count())
        .where(extract('year', ClassSession.session_date) == year)
        .where(extract('month', ClassSession.session_date) == month)
        .group_by(ClassSession.session_date)
    )
    classes_results = (await session.exec(query_classes)).all()

    for day, count in classes_results:
        d_str = str(day)
        if d_str not in stats: stats[d_str] = {}
        stats[d_str]["classes"] = count

    # 5. Scans (GateScanLog) - Optional but requested
    query_scans = (
        select(sa_func.date(GateScanLog.timestamp), sa_func.count())
        .where(extract('year', GateScanLog.timestamp) == year)
        .where(extract('month', GateScanLog.timestamp) == month)
        .group_by(sa_func.date(GateScanLog.timestamp))
    )
    scans_results = (await session.exec(query_scans)).all()

    for day, count in scans_results:
        d_str = str(day)
        if d_str not in stats: stats[d_str] = {}
        stats[d_str]["scans"] = count

    # 6. Events (List for the month)
    query_events = (
        select(Event)
        .where(extract('year', Event.event_date) == year)
        .where(extract('month', Event.event_date) == month)
    )
    events_results = (await session.exec(query_events)).all()
    
    events_by_day = {}
    for ev in events_results:
        d_str = str(ev.event_date)
        if d_str not in events_by_day: events_by_day[d_str] = []
        events_by_day[d_str].append({
            "id": str(ev.id),
            "name": ev.name,
            "type": ev.event_type,
            "time": ev.start_time.strftime("%H:%M") if ev.start_time else "All Day"
        })

    # 7. Merge Events into Stats
    # Fill in events, and ensure every day has at least default 0s if it has something
    all_dates = set(stats.keys()) | set(events_by_day.keys())
    
    final_output = {}
    for d_str in all_dates:
        # Defaults
        day_data = stats.get(d_str, {})
        people = day_data.get("people", 0)
        vehicles = day_data.get("vehicles", 0)
        
        # Calculate Traffic Score (Simple heuristic)
        # 0-50: Low, 50-200: Medium, 200+: High
        total_traffic = people + vehicles
        traffic_level = "low"
        if total_traffic > 50: traffic_level = "medium"
        if total_traffic > 200: traffic_level = "high"
        
        final_output[d_str] = {
            "people": people,
            "vehicles": vehicles,
            "classes": day_data.get("classes", 0),
            "scans": day_data.get("scans", 0),
            "traffic": traffic_level,
            "events": events_by_day.get(d_str, [])
        }
        
    return final_output
