from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from app.auth import get_current_user
from app.models import User, NoticeBoardItem, Role
from app.database import get_session
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from datetime import datetime
from app.utils.timezone import get_eat_time
import uuid
import os
import shutil

router = APIRouter()

@router.get("", response_model=List[NoticeBoardItem])
async def get_notices(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all notice board items sorted by creation date descending"""
    stmt = select(NoticeBoardItem).order_by(NoticeBoardItem.created_at.desc())
    notices = (await session.exec(stmt)).all()
    
    # If empty, let's seed a default welcome notice so it's not blank!
    if not notices:
        import uuid
        welcome_notice = NoticeBoardItem(
            id=uuid.uuid4(),
            title="Welcome to the University Notice Board",
            content="Welcome to the Smart Campus University Notice Board! Here, administrators, lecturers, and student leaders will post important announcements, guidelines, and learning materials. Stay tuned for live updates!",
            attachment_url=None,
            author_id=current_user.id,
            author_name="Campus Admin Team",
            author_role="Administrator",
            created_at=get_eat_time()
        )
        session.add(welcome_notice)
        await session.commit()
        return [welcome_notice]
        
    return notices

@router.post("")
async def create_notice(
    title: str = Form(...),
    content: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Create a new notice board item (Admins, Lecturers, and Student Leaders only)"""
    role_stmt = select(Role).where(Role.id == current_user.role_id)
    role = (await session.exec(role_stmt)).first()
    role_name = role.name.lower() if role else ""
    
    # Allow SuperAdmin, Admin, Lecturer, Student Leader
    if role_name not in ["superadmin", "admin", "lecturer", "student leader", "student_leader"]:
        raise HTTPException(status_code=403, detail="Only Admins, Lecturers, and Student Leaders can post notices.")
        
    attachment_url = None
    if file and file.filename:
        # Create directory
        os.makedirs("static/notice_board", exist_ok=True)
        file_ext = file.filename.split('.')[-1].lower()
        filename = f"{uuid.uuid4().hex[:12]}.{file_ext}"
        file_path = f"static/notice_board/{filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        attachment_url = f"/static/notice_board/{filename}"
        
    new_notice = NoticeBoardItem(
        id=uuid.uuid4(),
        title=title,
        content=content,
        attachment_url=attachment_url,
        author_id=current_user.id,
        author_name=current_user.full_name,
        author_role=role.name if role else "User",
        created_at=get_eat_time()
    )
    
    session.add(new_notice)
    await session.commit()
    await session.refresh(new_notice)
    return new_notice

@router.delete("/{notice_id}")
async def delete_notice(
    notice_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete a notice (Only Admin, SuperAdmin, or the author of the notice can delete it)"""
    from uuid import UUID
    try:
        notice_uuid = UUID(notice_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notice ID format")
        
    notice = await session.get(NoticeBoardItem, notice_uuid)
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
        
    role_stmt = select(Role).where(Role.id == current_user.role_id)
    role = (await session.exec(role_stmt)).first()
    role_name = role.name.lower() if role else ""
    
    is_author = notice.author_id == current_user.id
    is_admin = role_name in ["superadmin", "admin"]
    
    if not (is_author or is_admin):
        raise HTTPException(status_code=403, detail="You do not have permission to delete this notice")
        
    # Delete local attachment file if it exists
    if notice.attachment_url and notice.attachment_url.startswith("/static/notice_board/"):
        file_path = notice.attachment_url.lstrip("/")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error removing notice attachment file: {e}")
                
    await session.delete(notice)
    await session.commit()
    return {"status": "success", "message": "Notice deleted successfully"}
