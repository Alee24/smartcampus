from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database import get_session
from app.models import User, Role, SystemConfig
from app.auth import get_password_hash
from pydantic import BaseModel
from typing import List, Optional
from app.utils.audit import log_action

router = APIRouter()

class ExternalStudent(BaseModel):
    admission_number: str
    full_name: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    school: str = "General"
    program: Optional[str] = None
    status: str = "Active"
    password: Optional[str] = None # If not provided, use admission number as default password

async def verify_api_key(session: AsyncSession = Depends(get_session), x_api_key: str = Header(..., alias="X-API-KEY")):
    stmt = select(SystemConfig).where(SystemConfig.key == "external_sync_api_key")
    config = (await session.exec(stmt)).first()
    if not config or x_api_key != config.value:
        raise HTTPException(status_code=403, detail="Invalid or missing API Key")
    return True

@router.post("/students")
async def sync_students(
    students: List[ExternalStudent],
    request: Request,
    session: AsyncSession = Depends(get_session),
    authorized: bool = Depends(verify_api_key)
):
    """
    Upsert students from an external system.
    If admission_number exists, update the student details.
    If not, create a new student record.
    """
    # Get Student Role
    student_role = (await session.exec(select(Role).where(Role.name == "Student"))).first()
    if not student_role:
        student_role = Role(name="Student", description="Student Role")
        session.add(student_role)
        await session.commit()
        await session.refresh(student_role)

    results = {"created": 0, "updated": 0, "errors": []}

    for s_data in students:
        try:
            stmt = select(User).where(User.admission_number == s_data.admission_number)
            user = (await session.exec(stmt)).first()
            
            if user:
                # Update existing user
                user.full_name = s_data.full_name
                if s_data.email: user.email = s_data.email
                if s_data.phone_number: user.phone_number = s_data.phone_number
                user.school = s_data.school
                if s_data.program: user.program = s_data.program
                user.status = s_data.status
                
                if s_data.password:
                    user.hashed_password = get_password_hash(s_data.password)
                
                session.add(user)
                results["updated"] += 1
            else:
                # Create new user
                password = s_data.password or s_data.admission_number
                new_user = User(
                    admission_number=s_data.admission_number,
                    full_name=s_data.full_name,
                    email=s_data.email,
                    phone_number=s_data.phone_number,
                    school=s_data.school,
                    program=s_data.program,
                    status=s_data.status,
                    hashed_password=get_password_hash(password),
                    role_id=student_role.id
                )
                session.add(new_user)
                results["created"] += 1
                
        except Exception as e:
            results["errors"].append({"admission_number": s_data.admission_number, "error": str(e)})

    await session.commit()
    
    # Log the sync action
    await log_action(
        session=session,
        action_type="external_sync",
        description=f"External system synced {len(students)} students. Created: {results['created']}, Updated: {results['updated']}",
        new_values=results,
        request=request
    )
    
    return results
