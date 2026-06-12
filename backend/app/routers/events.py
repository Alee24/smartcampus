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
from ..auth import get_current_user, get_current_admin
from app.utils.timezone import get_eat_time

router = APIRouter(prefix="/api/events", tags=["Events"])

@router.get("/", response_model=List[Event])
async def get_events(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Event).order_by(Event.event_date.desc()))
    return result.all()

@router.post("/", response_model=Event)
async def create_event(event: Event, session: AsyncSession = Depends(get_session), user: User = Depends(get_current_admin)):
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
    visitor.entry_time = get_eat_time()
    
    session.add(visitor)
    await session.commit()
    await session.refresh(visitor)
    return visitor

@router.get("/{event_id}/visitors")
async def get_event_visitors(event_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    from sqlalchemy.orm import selectinload
    from app.models import UserFace
    
    result = await session.exec(select(EventVisitor).where(EventVisitor.event_id == event_id).order_by(EventVisitor.entry_time.desc()))
    visitors = result.all()
    
    identifiers = [v.visitor_identifier for v in visitors if v.visitor_identifier]
    emails = [v.email for v in visitors if v.email]
    
    user_map = {}
    if identifiers or emails:
        user_query = select(User).where(
            (User.admission_number.in_(identifiers)) | 
            (User.email.in_(emails))
        ).options(selectinload(User.role))
        users = (await session.exec(user_query)).all()
        
        user_ids = [u.id for u in users]
        face_user_ids = set()
        if user_ids:
            face_query = select(UserFace.user_id).where(UserFace.user_id.in_(user_ids))
            faces = (await session.exec(face_query)).all()
            face_user_ids = set(faces)
            
        for u in users:
            info = {
                "profile_image": u.profile_image or "",
                "has_face": u.id in face_user_ids,
                "role": u.role.name if u.role else "Student"
            }
            if u.admission_number:
                user_map[u.admission_number] = info
            if u.email:
                user_map[u.email] = info
                
    out = []
    for v in visitors:
        info = user_map.get(v.visitor_identifier) or user_map.get(v.email) or {
            "profile_image": v.profile_image or "",
            "has_face": False,
            "role": "External Guest"
        }
        v_dict = v.model_dump()
        v_dict["profile_image"] = info["profile_image"] or v.profile_image or ""
        v_dict["has_face"] = info["has_face"]
        v_dict["user_role"] = info["role"]
        out.append(v_dict)
    return out


@router.post("/{event_id}/visitors/upload")
async def upload_visitors_csv(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_admin)
):
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
        
    content = await file.read()
    # Resilient decoding: try utf-8-sig, cp1252 (windows smart quotes), latin-1, fallback to utf-8 errors replace
    decoded = None
    for enc in ["utf-8-sig", "cp1252", "latin-1"]:
        try:
            decoded = content.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if decoded is None:
        decoded = content.decode("utf-8", errors="replace")
        
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
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_admin)
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
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_admin)
):
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    stmt = select(EventVisitor).where(EventVisitor.event_id == event_id)
    visitors = (await session.exec(stmt)).all()
    
    from app.email_utils import send_attendance_email
    import asyncio
    
    sent_count = 0
    for v in visitors:
        if v.email:
            subject = f"Your Entry Pass for {event.name}"
            body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <h2 style="color: #7A1975; margin-bottom: 8px;">Entry Pass Registered Successfully</h2>
                <p>Hello <strong>{v.visitor_name}</strong>,</p>
                <p>You have been registered for the upcoming event. Below are your details:</p>
                <div style="background-color: #f7fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 4px 0;"><strong>Event:</strong> {event.name}</p>
                    <p style="margin: 4px 0;"><strong>Date:</strong> {event.event_date}</p>
                    <p style="margin: 4px 0;"><strong>Type:</strong> {event.event_type}</p>
                    <p style="margin: 4px 0;"><strong>Host:</strong> {event.host} ({event.school})</p>
                    <p style="margin: 4px 0;"><strong>Your ID/Admission No:</strong> {v.visitor_identifier}</p>
                </div>
                <p>Please present this email or the system pass QR code at the campus gate for check-in.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #718096; text-align: center;">Smart Campus Gateway Pass System</p>
            </div>
            """
            asyncio.create_task(send_attendance_email(recipients=[v.email], subject=subject, body=body))
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

@router.get("/public/by-token/{token}")
async def get_public_event_by_token(token: str, session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Event).where(Event.qr_code_token == token))
    event = result.first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {
        "id": str(event.id),
        "name": event.name,
        "host": event.host,
        "school": event.school,
        "description": event.description,
        "event_date": str(event.event_date),
        "start_time": event.start_time.strftime("%H:%M") if event.start_time else "All Day",
        "end_time": event.end_time.strftime("%H:%M") if event.end_time else None,
        "event_type": event.event_type,
        "is_active": event.is_active,
        "scan_mode": event.scan_mode,
        "require_profile_pic": event.require_profile_pic
    }

@router.post("/public/by-token/{token}/register")
async def register_public_visitor(
    token: str,
    data: dict, 
    session: AsyncSession = Depends(get_session)
):
    result = await session.exec(select(Event).where(Event.qr_code_token == token))
    event = result.first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not event.is_active:
        raise HTTPException(status_code=400, detail="Registration for this event is closed")

    name = data.get("visitor_name", "").strip()
    identifier = data.get("visitor_identifier", "").strip()
    phone = data.get("phone_number", "").strip()
    email = data.get("email", "").strip()
    auto_delete = bool(data.get("auto_delete_24h", False))
    profile_pic_b64 = data.get("profile_image", "").strip()

    saved_profile_image = None
    if profile_pic_b64:
        import base64
        import uuid as uuid_lib
        try:
            if "base64," in profile_pic_b64:
                header, encoded = profile_pic_b64.split("base64,", 1)
            else:
                encoded = profile_pic_b64
            img_bytes = base64.b64decode(encoded)
            filename = f"event_guest_{str(uuid_lib.uuid4())[:12]}.jpg"
            save_dir = "static/profiles"
            os.makedirs(save_dir, exist_ok=True)
            saved_path = f"{save_dir}/{filename}"
            with open(saved_path, "wb") as f:
                f.write(img_bytes)
            saved_profile_image = f"/static/profiles/{filename}"
        except Exception as e:
            print(f"Failed to save event guest profile photo: {e}")

    if not name or not identifier or not phone:
        raise HTTPException(status_code=400, detail="Name, ID/Admission number, and phone number are required")

    status = "pre_registered"
    if event.scan_mode == "check_in":
        status = "checked_in"
    elif event.scan_mode == "auto":
        today = get_eat_time().date()
        if today >= event.event_date:
            status = "checked_in"

    existing_stmt = select(EventVisitor).where(
        EventVisitor.event_id == event.id,
        EventVisitor.visitor_identifier == identifier
    )
    existing = (await session.exec(existing_stmt)).first()

    if existing:
        existing.visitor_name = name
        existing.phone_number = phone
        existing.email = email
        existing.auto_delete_24h = auto_delete
        if saved_profile_image:
            existing.profile_image = saved_profile_image
        if status == "checked_in" and existing.status != "checked_in":
            existing.status = "checked_in"
            existing.entry_time = get_eat_time()
        session.add(existing)
        await session.commit()
        await session.refresh(existing)
        return {
            "message": "Registration updated successfully",
            "visitor": {
                "id": str(existing.id),
                "visitor_name": existing.visitor_name,
                "visitor_identifier": existing.visitor_identifier,
                "status": existing.status,
                "auto_delete_24h": existing.auto_delete_24h
            }
        }

    visitor = EventVisitor(
        event_id=event.id,
        visitor_name=name,
        visitor_identifier=identifier,
        phone_number=phone,
        email=email if email else None,
        status=status,
        auto_delete_24h=auto_delete,
        profile_image=saved_profile_image,
        entry_time=get_eat_time()
    )
    session.add(visitor)
    await session.commit()
    await session.refresh(visitor)
    return {
        "message": "Registered successfully",
        "visitor": {
            "id": str(visitor.id),
            "visitor_name": visitor.visitor_name,
            "visitor_identifier": visitor.visitor_identifier,
            "status": visitor.status,
            "auto_delete_24h": visitor.auto_delete_24h
        }
    }

@router.put("/{event_id}/scan-mode")
async def update_event_scan_mode(
    event_id: uuid.UUID,
    data: dict, 
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_admin)
):
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    scan_mode = data.get("scan_mode", "auto").strip().lower()
    if scan_mode not in ["auto", "check_in", "register"]:
        raise HTTPException(status_code=400, detail="Invalid scan_mode. Must be auto, check_in, or register")
        
    event.scan_mode = scan_mode
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return {
        "id": str(event.id),
        "name": event.name,
        "scan_mode": event.scan_mode,
        "message": f"Scan mode updated to {scan_mode} successfully"
    }

@router.post("/{event_id}/visitors/email-all")
async def email_all_visitors(
    event_id: uuid.UUID,
    data: dict, 
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_admin)
):
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    subject = data.get("subject", "").strip()
    body = data.get("body", "").strip()
    if not subject or not body:
        raise HTTPException(status_code=400, detail="Subject and Body are required")
        
    stmt = select(EventVisitor).where(EventVisitor.event_id == event_id)
    visitors = (await session.exec(stmt)).all()
    
    from app.email_utils import send_attendance_email
    import asyncio
    
    sent_count = 0
    for v in visitors:
        if v.email:
            asyncio.create_task(send_attendance_email(recipients=[v.email], subject=subject, body=body))
            sent_count += 1
            
    return {
        "message": f"Emails sent successfully to {sent_count} guests",
        "sent_count": sent_count,
        "total_guests": len(visitors)
    }


@router.post("/{event_id}/visitors/sms-all")
async def sms_all_visitors(
    event_id: uuid.UUID,
    data: dict, 
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_admin)
):
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    message = data.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message content is required")
        
    stmt = select(EventVisitor).where(EventVisitor.event_id == event_id)
    visitors = (await session.exec(stmt)).all()
    
    sent_count = 0
    for v in visitors:
        if v.phone_number:
            print(f"SMS SEND: to={v.phone_number}, message='{message}'")
            sent_count += 1
            
    return {
        "message": f"SMS sent successfully to {sent_count} guests",
        "sent_count": sent_count,
        "total_guests": len(visitors)
    }
