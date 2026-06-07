from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile, status
from app.auth import get_current_user
from app.models import User, Role, IncidentReport, IncidentFollowup, LostAndFoundItem
from app.database import get_session
from sqlmodel import select, or_
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import datetime, date
from app.utils.timezone import get_eat_time
import uuid
import os
import shutil

router = APIRouter()

# Helper to verify role name
async def get_user_role_name(user: User, session: AsyncSession) -> str:
    role_stmt = select(Role).where(Role.id == user.role_id)
    role = (await session.exec(role_stmt)).first()
    return role.name.lower().replace(" ", "") if role else "student"

@router.get("/users/lookup", response_model=List[dict])
async def lookup_users(
    q: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Lookup student or staff by name, email, admission_number, or phone_number"""
    role_name = await get_user_role_name(current_user, session)
    if role_name not in ["superadmin", "admin", "securitylead", "security", "guard"]:
        raise HTTPException(status_code=403, detail="Not authorized to lookup users")
        
    stmt = select(User).where(
        or_(
            User.full_name.like(f"%{q}%"),
            User.email.like(f"%{q}%"),
            User.admission_number.like(f"%{q}%"),
            User.phone_number.like(f"%{q}%")
        )
    ).limit(10)
    users = (await session.exec(stmt)).all()
    
    results = []
    for u in users:
        # Fetch role name
        u_role = await session.get(Role, u.role_id)
        results.append({
            "id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "admission_number": u.admission_number,
            "phone_number": u.phone_number,
            "role": u_role.name if u_role else "student",
            "school": u.school
        })
    return results

@router.get("/incidents")
async def get_incidents(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all incident reports with optional filtering"""
    role_name = await get_user_role_name(current_user, session)
    # Allow admin, security lead, guard, management, and student/staff to view their own reports
    stmt = select(IncidentReport).order_by(IncidentReport.created_at.desc())
    if severity:
        stmt = stmt.where(IncidentReport.severity == severity)
    if status:
        stmt = stmt.where(IncidentReport.status == status)
        
    incidents = (await session.exec(stmt)).all()
    
    # Enrich results with reporter and target user info
    enriched = []
    for inc in incidents:
        reporter = await session.get(User, inc.reporter_id)
        target = await session.get(User, inc.target_user_id) if inc.target_user_id else None
        
        # Filter visibility for student/staff/guest (only their own reports or reports where they are targets)
        if role_name not in ["superadmin", "admin", "securitylead", "security", "guard", "management"]:
            if inc.reporter_id != current_user.id and (target is None or target.id != current_user.id):
                continue
                
        enriched.append({
            "id": str(inc.id),
            "title": inc.title,
            "description": inc.description,
            "reporter_id": str(inc.reporter_id),
            "reporter_name": reporter.full_name if reporter else "Unknown",
            "status": inc.status,
            "incident_date": inc.incident_date.isoformat(),
            "location": inc.location,
            "severity": inc.severity,
            "target_user_id": str(inc.target_user_id) if inc.target_user_id else None,
            "target_user_name": target.full_name if target else inc.target_name_external,
            "target_admission_number": target.admission_number if target else None,
            "evidence_image": inc.evidence_image,
            "notes": inc.notes,
            "created_at": inc.created_at.isoformat()
        })
    return enriched

@router.get("/incidents/{incident_id}")
async def get_incident(
    incident_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve single incident report with followups"""
    inc_uuid = uuid.UUID(incident_id)
    inc = await session.get(IncidentReport, inc_uuid)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident report not found")
        
    role_name = await get_user_role_name(current_user, session)
    target = await session.get(User, inc.target_user_id) if inc.target_user_id else None
    
    if role_name not in ["superadmin", "admin", "securitylead", "security", "guard", "management"]:
        if inc.reporter_id != current_user.id and (target is None or target.id != current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to view this incident report")
            
    reporter = await session.get(User, inc.reporter_id)
    
    # Fetch followups
    followups_stmt = select(IncidentFollowup).where(IncidentFollowup.incident_id == inc.id).order_by(IncidentFollowup.timestamp.asc())
    followups = (await session.exec(followups_stmt)).all()
    
    enriched_followups = []
    for f in followups:
        officer = await session.get(User, f.officer_id)
        enriched_followups.append({
            "id": str(f.id),
            "followup_type": f.followup_type,
            "description": f.description,
            "officer_name": officer.full_name if officer else "Unknown",
            "timestamp": f.timestamp.isoformat()
        })
        
    return {
        "id": str(inc.id),
        "title": inc.title,
        "description": inc.description,
        "reporter_id": str(inc.reporter_id),
        "reporter_name": reporter.full_name if reporter else "Unknown",
        "status": inc.status,
        "incident_date": inc.incident_date.isoformat(),
        "location": inc.location,
        "severity": inc.severity,
        "target_user_id": str(inc.target_user_id) if inc.target_user_id else None,
        "target_user_name": target.full_name if target else inc.target_name_external,
        "target_admission_number": target.admission_number if target else None,
        "evidence_image": inc.evidence_image,
        "notes": inc.notes,
        "created_at": inc.created_at.isoformat(),
        "followups": enriched_followups
    }

@router.post("/incidents")
async def create_incident(
    title: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    severity: str = Form("low"),
    incident_date: Optional[str] = Form(None),
    target_user_id: Optional[str] = Form(None),
    target_name_external: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new incident report (Only Admins, Security Lead, and Guards can report)"""
    role_name = await get_user_role_name(current_user, session)
    
    # Strict Admin enforcement rule if specified, but security officers must report incidents.
    # To satisfy both "only admin can add to system" and "security officers report incidents",
    # we allow superadmin, admin, securitylead, security, guard.
    if role_name not in ["superadmin", "admin", "securitylead", "security", "guard"]:
        raise HTTPException(status_code=403, detail="Only Administrators and Security Officers can create incident reports.")
        
    evidence_image = None
    if file and file.filename:
        os.makedirs("uploads/incidents", exist_ok=True)
        file_ext = file.filename.split('.')[-1].lower()
        filename = f"{uuid.uuid4().hex[:12]}.{file_ext}"
        file_path = f"uploads/incidents/{filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        evidence_image = f"/uploads/incidents/{filename}"
        
    inc_date = get_eat_time()
    if incident_date:
        try:
            inc_date = datetime.fromisoformat(incident_date.replace("Z", "+00:00"))
        except Exception:
            pass
            
    t_user_uuid = None
    if target_user_id and target_user_id != "null" and target_user_id != "":
        try:
            t_user_uuid = uuid.UUID(target_user_id)
        except ValueError:
            pass
            
    new_inc = IncidentReport(
        id=uuid.uuid4(),
        title=title,
        description=description,
        reporter_id=current_user.id,
        status="reported",
        incident_date=inc_date,
        location=location,
        severity=severity,
        target_user_id=t_user_uuid,
        target_name_external=target_name_external,
        evidence_image=evidence_image,
        notes=notes,
        created_at=get_eat_time()
    )
    
    session.add(new_inc)
    await session.commit()
    await session.refresh(new_inc)
    return new_inc

@router.post("/incidents/{incident_id}/followup")
async def add_followup(
    incident_id: str,
    followup_type: str = Form(...), # police_report, disciplinary, resolved, update
    description: str = Form(...),
    reactivate_user: bool = Form(False),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Add a followup timeline event to an incident report and update its status.
    When followup_type=='resolved' and reactivate_user=True, also restores target user's status to 'active'."""
    inc_uuid = uuid.UUID(incident_id)
    inc = await session.get(IncidentReport, inc_uuid)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident report not found")
        
    role_name = await get_user_role_name(current_user, session)
    if role_name not in ["superadmin", "admin", "securitylead", "security", "guard"]:
        raise HTTPException(status_code=403, detail="Only security officers and admins can add follow-ups")
        
    new_followup = IncidentFollowup(
        id=uuid.uuid4(),
        incident_id=inc.id,
        followup_type=followup_type,
        description=description,
        officer_id=current_user.id,
        timestamp=get_eat_time()
    )
    
    # Automatically update incident status based on followup type
    if followup_type == "resolved":
        inc.status = "resolved"
        # If reactivate_user is requested and there's a target, restore their status
        if reactivate_user and inc.target_user_id:
            target_user = await session.get(User, inc.target_user_id)
            if target_user:
                target_user.status = "active"
                session.add(target_user)
    elif followup_type == "police_report":
        inc.status = "police_reported"
    elif followup_type == "disciplinary":
        inc.status = "disciplinary"
    else:
        inc.status = "under_investigation"
        
    session.add(new_followup)
    session.add(inc)
    await session.commit()
    reactivated = reactivate_user and followup_type == "resolved" and inc.target_user_id is not None
    return {"status": "success", "incident_status": inc.status, "user_reactivated": reactivated}

# --- Lost & Found Endpoints ---

@router.get("/lost-found")
async def get_lost_found(
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all lost and found items"""
    stmt = select(LostAndFoundItem).order_by(LostAndFoundItem.created_at.desc())
    if status:
        stmt = stmt.where(LostAndFoundItem.status == status)
        
    items = (await session.exec(stmt)).all()
    
    enriched = []
    for item in items:
        handler = await session.get(User, item.handler_id)
        claimant = await session.get(User, item.claimant_id) if item.claimant_id else None
        
        enriched.append({
            "id": str(item.id),
            "item_name": item.item_name,
            "description": item.description,
            "location_found": item.location_found,
            "date_found": item.date_found.isoformat(),
            "status": item.status,
            "finder_name": item.finder_name,
            "claimant_name": claimant.full_name if claimant else item.claimant_name,
            "claimant_id": str(item.claimant_id) if item.claimant_id else None,
            "date_claimed": item.date_claimed.isoformat() if item.date_claimed else None,
            "image_path": item.image_path,
            "notes": item.notes,
            "handler_name": handler.full_name if handler else "Unknown",
            "created_at": item.created_at.isoformat()
        })
    return enriched

@router.post("/lost-found")
async def create_lost_found_item(
    item_name: str = Form(...),
    description: str = Form(...),
    location_found: str = Form(...),
    date_found: Optional[str] = Form(None),
    finder_name: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Log a new found item (Admins, Security Lead, and Guards only)"""
    role_name = await get_user_role_name(current_user, session)
    if role_name not in ["superadmin", "admin", "securitylead", "security", "guard"]:
        raise HTTPException(status_code=403, detail="Only security officers and administrators can log lost/found items.")
        
    image_path = None
    if file and file.filename:
        os.makedirs("uploads/lost_found", exist_ok=True)
        file_ext = file.filename.split('.')[-1].lower()
        filename = f"{uuid.uuid4().hex[:12]}.{file_ext}"
        file_path = f"uploads/lost_found/{filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        image_path = f"/uploads/lost_found/{filename}"
        
    d_found = get_eat_time().date()
    if date_found:
        try:
            d_found = date.fromisoformat(date_found)
        except Exception:
            pass
            
    new_item = LostAndFoundItem(
        id=uuid.uuid4(),
        item_name=item_name,
        description=description,
        location_found=location_found,
        date_found=d_found,
        status="found",
        finder_name=finder_name,
        image_path=image_path,
        notes=notes,
        handler_id=current_user.id,
        created_at=get_eat_time()
    )
    
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item

@router.post("/lost-found/{item_id}/claim")
async def claim_lost_found_item(
    item_id: str,
    claimant_id: Optional[str] = Form(None),
    claimant_name_external: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Mark a lost and found item as claimed"""
    role_name = await get_user_role_name(current_user, session)
    if role_name not in ["superadmin", "admin", "securitylead", "security", "guard"]:
        raise HTTPException(status_code=403, detail="Only security officers and administrators can claim lost/found items.")
        
    item_uuid = uuid.UUID(item_id)
    item = await session.get(LostAndFoundItem, item_uuid)
    if not item:
        raise HTTPException(status_code=404, detail="Lost & found item not found")
        
    if item.status == "claimed":
        raise HTTPException(status_code=400, detail="Item is already claimed")
        
    c_uuid = None
    if claimant_id and claimant_id != "null" and claimant_id != "":
        try:
            c_uuid = uuid.UUID(claimant_id)
        except ValueError:
            pass
            
    item.status = "claimed"
    item.claimant_id = c_uuid
    item.claimant_name = claimant_name_external
    item.date_claimed = get_eat_time().date()
    
    session.add(item)
    await session.commit()
    return {"status": "success", "item_status": item.status}
