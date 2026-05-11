from datetime import datetime
from typing import Optional, Any, Dict
from uuid import UUID
from fastapi import Request
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models import AuditLog, User

async def log_action(
    session: AsyncSession,
    action_type: str,
    user: Optional[User] = None,
    table_name: Optional[str] = None,
    record_id: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    description: Optional[str] = None,
    request: Optional[Request] = None
):
    """
    Log an action to the audit trail.
    Captures IP, User-Agent, and other browser metadata if request is provided.
    """
    ip_address = None
    user_agent = None
    browser_info = {}
    
    if request:
        ip_address = request.client.host if request.client else "unknown"
        # If behind proxy (Nginx), try to get real IP
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            ip_address = forwarded_for.split(",")[0]
            
        user_agent = request.headers.get("user-agent")
        
        # Capture additional browser metadata as requested
        browser_info = {
            "accept_language": request.headers.get("accept-language"),
            "referer": request.headers.get("referer"),
            "sec_ch_ua": request.headers.get("sec-ch-ua"),
            "sec_ch_ua_platform": request.headers.get("sec-ch-ua-platform"),
            "connection": request.headers.get("connection"),
            "host": request.headers.get("host")
        }
        
        # Combine browser_info into new_values if they are empty or just add it
        if not new_values:
            new_values = {}
        new_values["browser_metadata"] = browser_info

    log = AuditLog(
        timestamp=datetime.utcnow(),
        user_id=user.id if user else None,
        user_name=user.full_name if user else "System",
        action_type=action_type,
        table_name=table_name,
        record_id=str(record_id) if record_id else None,
        old_values=old_values or {},
        new_values=new_values or {},
        ip_address=ip_address,
        user_agent=user_agent,
        description=description
    )
    
    session.add(log)
    await session.commit()
