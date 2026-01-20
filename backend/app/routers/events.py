from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from datetime import datetime
import uuid
from ..database import get_session
from ..models import Event, EventVisitor, User
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
