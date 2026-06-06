from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Response
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime, date as date_type
from app.utils.timezone import get_eat_time

from app.database import get_session
from app.models import Asset, AssetLog, User, Role
from app.auth import get_current_user, get_current_admin
from app.utils.audit import log_action

router = APIRouter()

# ---- Pydantic Schemas ----
class AssetCreate(BaseModel):
    tag_number: str
    name: str
    category: str = "electronics"
    status: str = "available"
    location: str = "General"
    serial_number: Optional[str] = None
    purchase_date: Optional[date_type] = None
    cost: float = 0.0
    assigned_to_id: Optional[UUID] = None
    notes: Optional[str] = None

class AssetUpdate(BaseModel):
    tag_number: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date_type] = None
    cost: Optional[float] = None
    assigned_to_id: Optional[UUID] = None
    notes: Optional[str] = None

class CheckoutRequest(BaseModel):
    borrower_identifier: Optional[str] = None  # Can be admission_number, email, etc.
    handover_name: Optional[str] = None
    handover_email: Optional[str] = None
    handover_phone: Optional[str] = None
    handover_no: Optional[str] = None
    handover_department: Optional[str] = None
    handover_date: Optional[date_type] = None
    notes: Optional[str] = None

class CheckinRequest(BaseModel):
    notes: Optional[str] = None

class AssetLogResponse(BaseModel):
    id: UUID
    asset_id: UUID
    action: str
    timestamp: str
    handled_by_name: str
    borrower_name: Optional[str] = None
    notes: Optional[str] = None
    handover_name: Optional[str] = None
    handover_email: Optional[str] = None
    handover_phone: Optional[str] = None
    handover_no: Optional[str] = None
    handover_department: Optional[str] = None
    handover_date: Optional[str] = None

class AssetResponse(BaseModel):
    id: UUID
    tag_number: str
    name: str
    category: str
    status: str
    location: str
    serial_number: Optional[str] = None
    purchase_date: Optional[str] = None
    cost: float
    assigned_to_id: Optional[UUID] = None
    assigned_to_name: Optional[str] = None
    assigned_to_identifier: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    handover_name: Optional[str] = None
    handover_email: Optional[str] = None
    handover_phone: Optional[str] = None
    handover_no: Optional[str] = None
    handover_department: Optional[str] = None
    handover_date: Optional[str] = None

# ---- API Endpoints ----

@router.get("/stats")
async def get_asset_stats(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    try:
        total = (await session.exec(select(func.count(Asset.id)))).first() or 0
        available = (await session.exec(select(func.count(Asset.id)).where(Asset.status == "available"))).first() or 0
        checked_out = (await session.exec(select(func.count(Asset.id)).where(Asset.status == "checked_out"))).first() or 0
        maintenance = (await session.exec(select(func.count(Asset.id)).where(Asset.status == "maintenance"))).first() or 0
        disposed = (await session.exec(select(func.count(Asset.id)).where(Asset.status == "disposed"))).first() or 0

        # Category Breakdown
        categories = ["electronics", "furniture", "lab_equipment", "sports_equipment", "general"]
        category_stats = {}
        for cat in categories:
            count = (await session.exec(select(func.count(Asset.id)).where(Asset.category == cat))).first() or 0
            category_stats[cat] = count

        return {
            "total": total,
            "available": available,
            "checked_out": checked_out,
            "maintenance": maintenance,
            "disposed": disposed,
            "categories": category_stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

@router.get("", response_model=List[AssetResponse])
async def get_assets(
    category: Optional[str] = None,
    status: Optional[str] = None,
    query: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    try:
        statement = select(Asset)
        if category:
            statement = statement.where(Asset.category == category)
        if status:
            statement = statement.where(Asset.status == status)
        if query:
            statement = statement.where(
                (Asset.tag_number.like(f"%{query}%")) | 
                (Asset.name.like(f"%{query}%")) |
                (Asset.location.like(f"%{query}%")) |
                (Asset.serial_number.like(f"%{query}%"))
            )
        
        statement = statement.order_by(Asset.tag_number.asc())
        result = await session.exec(statement)
        assets = result.all()

        response_list = []
        for a in assets:
            assigned_name = None
            assigned_identifier = None
            if a.assigned_to_id:
                user = await session.get(User, a.assigned_to_id)
                if user:
                    assigned_name = user.full_name
                    assigned_identifier = user.admission_number

            response_list.append(
                AssetResponse(
                    id=a.id,
                    tag_number=a.tag_number,
                    name=a.name,
                    category=a.category,
                    status=a.status,
                    location=a.location,
                    serial_number=a.serial_number,
                    purchase_date=a.purchase_date.isoformat() if a.purchase_date else None,
                    cost=a.cost,
                    assigned_to_id=a.assigned_to_id,
                    assigned_to_name=assigned_name,
                    assigned_to_identifier=assigned_identifier,
                    notes=a.notes,
                    created_at=a.created_at.isoformat(),
                    handover_name=a.handover_name,
                    handover_email=a.handover_email,
                    handover_phone=a.handover_phone,
                    handover_no=a.handover_no,
                    handover_department=a.handover_department,
                    handover_date=a.handover_date.isoformat() if a.handover_date else None
                )
            )
        return response_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get assets: {str(e)}")

@router.post("", response_model=AssetResponse)
async def create_asset(
    request: Request,
    asset_data: AssetCreate,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    try:
        # Check unique tag number
        existing = (await session.exec(select(Asset).where(Asset.tag_number == asset_data.tag_number))).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Asset with Tag Number '{asset_data.tag_number}' already exists.")

        new_asset = Asset(
            tag_number=asset_data.tag_number,
            name=asset_data.name,
            category=asset_data.category,
            status=asset_data.status,
            location=asset_data.location,
            serial_number=asset_data.serial_number,
            purchase_date=asset_data.purchase_date,
            cost=asset_data.cost,
            notes=asset_data.notes,
            created_at=get_eat_time()
        )
        session.add(new_asset)
        await session.commit()
        await session.refresh(new_asset)

        # Log action in Asset Log
        log_entry = AssetLog(
            asset_id=new_asset.id,
            action="create",
            timestamp=get_eat_time(),
            handled_by_id=admin.id,
            notes="Asset registered in inventory."
        )
        session.add(log_entry)
        await session.commit()

        await log_action(
            session=session,
            action_type="create",
            user=admin,
            table_name="assets",
            record_id=str(new_asset.id),
            description=f"Registered asset: {new_asset.name} ({new_asset.tag_number})",
            new_values=asset_data.dict(),
            request=request
        )

        return AssetResponse(
            id=new_asset.id,
            tag_number=new_asset.tag_number,
            name=new_asset.name,
            category=new_asset.category,
            status=new_asset.status,
            location=new_asset.location,
            serial_number=new_asset.serial_number,
            purchase_date=new_asset.purchase_date.isoformat() if new_asset.purchase_date else None,
            cost=new_asset.cost,
            notes=new_asset.notes,
            created_at=new_asset.created_at.isoformat(),
            handover_name=None,
            handover_email=None,
            handover_phone=None,
            handover_no=None,
            handover_department=None,
            handover_date=None
        )
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create asset: {str(e)}")

@router.get("/scan/{barcode}")
async def scan_asset_by_barcode(
    barcode: str,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    try:
        asset = (await session.exec(select(Asset).where(Asset.tag_number == barcode))).first()
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset with Tag Number '{barcode}' not found.")
        
        assigned_name = None
        assigned_identifier = None
        if asset.assigned_to_id:
            user = await session.get(User, asset.assigned_to_id)
            if user:
                assigned_name = user.full_name
                assigned_identifier = user.admission_number

        return {
            "id": str(asset.id),
            "tag_number": asset.tag_number,
            "name": asset.name,
            "category": asset.category,
            "status": asset.status,
            "location": asset.location,
            "serial_number": asset.serial_number,
            "assigned_to_name": assigned_name,
            "assigned_to_identifier": assigned_identifier,
            "notes": asset.notes,
            "handover_name": asset.handover_name,
            "handover_email": asset.handover_email,
            "handover_phone": asset.handover_phone,
            "handover_no": asset.handover_no,
            "handover_department": asset.handover_department,
            "handover_date": asset.handover_date.isoformat() if asset.handover_date else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scan lookup error: {str(e)}")

@router.get("/{asset_id}")
async def get_asset_details(
    asset_id: UUID,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    try:
        asset = await session.get(Asset, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        assigned_name = None
        assigned_identifier = None
        if asset.assigned_to_id:
            user = await session.get(User, asset.assigned_to_id)
            if user:
                assigned_name = user.full_name
                assigned_identifier = user.admission_number

        # Fetch transaction history logs
        logs_stmt = select(AssetLog).where(AssetLog.asset_id == asset_id).order_by(AssetLog.timestamp.desc())
        logs_res = await session.exec(logs_stmt)
        logs = logs_res.all()

        formatted_logs = []
        for l in logs:
            handled = await session.get(User, l.handled_by_id)
            borrower = await session.get(User, l.user_id) if l.user_id else None
            formatted_logs.append(
                AssetLogResponse(
                    id=l.id,
                    asset_id=l.asset_id,
                    action=l.action,
                    timestamp=l.timestamp.isoformat(),
                    handled_by_name=handled.full_name if handled else "Unknown Admin",
                    borrower_name=borrower.full_name if borrower else None,
                    notes=l.notes,
                    handover_name=l.handover_name,
                    handover_email=l.handover_email,
                    handover_phone=l.handover_phone,
                    handover_no=l.handover_no,
                    handover_department=l.handover_department,
                    handover_date=l.handover_date.isoformat() if l.handover_date else None
                )
            )

        return {
            "asset": AssetResponse(
                id=asset.id,
                tag_number=asset.tag_number,
                name=asset.name,
                category=asset.category,
                status=asset.status,
                location=asset.location,
                serial_number=asset.serial_number,
                purchase_date=asset.purchase_date.isoformat() if asset.purchase_date else None,
                cost=asset.cost,
                assigned_to_id=asset.assigned_to_id,
                assigned_to_name=assigned_name,
                assigned_to_identifier=assigned_identifier,
                notes=asset.notes,
                created_at=asset.created_at.isoformat(),
                handover_name=asset.handover_name,
                handover_email=asset.handover_email,
                handover_phone=asset.handover_phone,
                handover_no=asset.handover_no,
                handover_department=asset.handover_department,
                handover_date=asset.handover_date.isoformat() if asset.handover_date else None
            ),
            "logs": formatted_logs
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch details: {str(e)}")

@router.put("/{asset_id}")
async def update_asset(
    request: Request,
    asset_id: UUID,
    asset_data: AssetUpdate,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    try:
        asset = await session.get(Asset, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        update_dict = asset_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            if hasattr(asset, key) and value is not None:
                setattr(asset, key, value)

        session.add(asset)
        await session.commit()
        await session.refresh(asset)

        # Log change in asset logs
        log_entry = AssetLog(
            asset_id=asset.id,
            action="update",
            timestamp=get_eat_time(),
            handled_by_id=admin.id,
            notes=f"Updated asset details: {', '.join(update_dict.keys())}"
        )
        session.add(log_entry)
        await session.commit()

        await log_action(
            session=session,
            action_type="update",
            user=admin,
            table_name="assets",
            record_id=str(asset_id),
            description=f"Updated details for asset: {asset.name} ({asset.tag_number})",
            new_values=update_dict,
            request=request
        )

        return {"status": "success", "tag_number": asset.tag_number}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update asset: {str(e)}")

@router.delete("/{asset_id}")
async def delete_asset(
    request: Request,
    asset_id: UUID,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    try:
        asset = await session.get(Asset, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        # Soft delete or status disposed is fine, but deleting from inventory is also allowed
        # Let's perform complete delete of asset logs first
        await session.delete(asset)
        await session.commit()

        await log_action(
            session=session,
            action_type="delete",
            user=admin,
            table_name="assets",
            record_id=str(asset_id),
            description=f"Deleted asset: {asset.name} ({asset.tag_number})",
            request=request
        )
        return {"status": "success", "message": "Asset deleted successfully."}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete asset: {str(e)}")

@router.post("/{asset_id}/checkout")
async def checkout_asset(
    request: Request,
    asset_id: UUID,
    payload: CheckoutRequest,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    try:
        asset = await session.get(Asset, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        if asset.status != "available":
            raise HTTPException(status_code=400, detail=f"Asset is not available for check-out. Status: '{asset.status}'")

        # Handover target details
        borrower_id = None
        h_name = payload.handover_name
        h_email = payload.handover_email
        h_phone = payload.handover_phone
        h_no = payload.handover_no
        h_dept = payload.handover_department
        h_date = payload.handover_date or get_eat_time().date()

        # If a system user identifier is provided, look them up and pull details
        if payload.borrower_identifier:
            borrower = (await session.exec(
                select(User).where(
                    (User.admission_number == payload.borrower_identifier) |
                    (User.email == payload.borrower_identifier)
                )
            )).first()
            if borrower:
                borrower_id = borrower.id
                h_name = borrower.full_name
                h_email = borrower.email
                h_phone = borrower.phone_number
                h_no = borrower.admission_number
                h_dept = borrower.school or "General"
            else:
                raise HTTPException(status_code=404, detail=f"System user '{payload.borrower_identifier}' not found in database.")

        # Fallback validation
        if not h_name:
            raise HTTPException(status_code=400, detail="Handover recipient name is required.")

        # Perform checkout
        asset.status = "checked_out"
        asset.assigned_to_id = borrower_id
        asset.handover_name = h_name
        asset.handover_email = h_email
        asset.handover_phone = h_phone
        asset.handover_no = h_no
        asset.handover_department = h_dept
        asset.handover_date = h_date
        session.add(asset)

        # Log action
        log_entry = AssetLog(
            asset_id=asset.id,
            user_id=borrower_id,
            action="check_out",
            timestamp=get_eat_time(),
            handled_by_id=admin.id,
            notes=payload.notes or f"Checked out to {h_name}",
            handover_name=h_name,
            handover_email=h_email,
            handover_phone=h_phone,
            handover_no=h_no,
            handover_department=h_dept,
            handover_date=h_date
        )
        session.add(log_entry)
        await session.commit()

        await log_action(
            session=session,
            action_type="checkout_asset",
            user=admin,
            table_name="assets",
            record_id=str(asset_id),
            description=f"Checked out asset {asset.name} ({asset.tag_number}) to {h_name}",
            new_values={
                "borrower": h_name,
                "email": h_email,
                "phone": h_phone,
                "staff_no": h_no,
                "department": h_dept,
                "handover_date": h_date.isoformat() if h_date else None,
                "notes": payload.notes
            },
            request=request
        )

        return {"status": "success", "message": f"Asset checked out to {h_name} successfully."}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")

@router.post("/{asset_id}/checkin")
async def checkin_asset(
    request: Request,
    asset_id: UUID,
    payload: CheckinRequest,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    try:
        asset = await session.get(Asset, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        if asset.status != "checked_out":
            raise HTTPException(status_code=400, detail="Asset is not checked out.")

        borrower_id = asset.assigned_to_id
        h_name = asset.handover_name

        # Perform checkin
        asset.status = "available"
        asset.assigned_to_id = None
        asset.handover_name = None
        asset.handover_email = None
        asset.handover_phone = None
        asset.handover_no = None
        asset.handover_department = None
        asset.handover_date = None
        session.add(asset)

        # Log action
        log_entry = AssetLog(
            asset_id=asset.id,
            user_id=borrower_id,
            action="check_in",
            timestamp=get_eat_time(),
            handled_by_id=admin.id,
            notes=payload.notes or f"Returned from {h_name or 'borrower'}."
        )
        session.add(log_entry)
        await session.commit()

        await log_action(
            session=session,
            action_type="checkin_asset",
            user=admin,
            table_name="assets",
            record_id=str(asset_id),
            description=f"Checked in asset {asset.name} ({asset.tag_number}) back to inventory.",
            new_values={"notes": payload.notes},
            request=request
        )

        return {"status": "success", "message": "Asset checked in successfully."}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Check-in failed: {str(e)}")

@router.post("/{asset_id}/maintenance")
async def send_to_maintenance(
    request: Request,
    asset_id: UUID,
    payload: CheckinRequest,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    try:
        asset = await session.get(Asset, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        asset.status = "maintenance"
        asset.assigned_to_id = None
        asset.handover_name = None
        asset.handover_email = None
        asset.handover_phone = None
        asset.handover_no = None
        asset.handover_department = None
        asset.handover_date = None
        session.add(asset)

        log_entry = AssetLog(
            asset_id=asset.id,
            action="maintenance",
            timestamp=get_eat_time(),
            handled_by_id=admin.id,
            notes=payload.notes or "Sent to repairs/maintenance."
        )
        session.add(log_entry)
        await session.commit()

        await log_action(
            session=session,
            action_type="maintenance_asset",
            user=admin,
            table_name="assets",
            record_id=str(asset_id),
            description=f"Sent asset {asset.name} ({asset.tag_number}) to maintenance.",
            new_values={"notes": payload.notes},
            request=request
        )

        return {"status": "success", "message": "Asset status updated to maintenance."}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Maintenance status update failed: {str(e)}")

@router.get("/template/csv")
async def download_csv_template(
    admin: User = Depends(get_current_admin)
):
    # Plain CSV headers
    csv_content = "tag_number,name,category,status,location,serial_number,purchase_date,cost,notes\n"
    csv_content += "RU01171,Dell Latitude Laptop,electronics,available,Main Library,SN-987654321,2026-05-15,75000.00,Academic staff laptop\n"
    csv_content += "RU01172,Lecture Hall Projector,electronics,available,LH-03,PJ-776352,2026-04-10,120000.00,High definition projector\n"
    
    from fastapi import Response
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=asset_upload_template.csv"}
    )

@router.post("/upload/csv")
async def upload_assets_csv(
    request: Request,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    try:
        import csv
        import io
        from datetime import datetime
        
        contents = await file.read()
        csv_file = io.StringIO(contents.decode("utf-8"))
        reader = csv.DictReader(csv_file)
        
        success_count = 0
        error_rows = []
        
        # Check required columns
        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="Invalid CSV format. Header is empty.")
            
        required_fields = ["tag_number", "name"]
        for field in required_fields:
            if field not in reader.fieldnames:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid CSV format. Missing required column '{field}'"
                )
        
        for idx, row in enumerate(reader, start=2):
            tag_num = row.get("tag_number", "").strip()
            name = row.get("name", "").strip()
            
            if not tag_num or not name:
                error_rows.append(f"Row {idx}: Missing tag_number or name.")
                continue
                
            # Check if tag number already exists
            existing = (await session.exec(
                select(Asset).where(Asset.tag_number == tag_num)
            )).first()
            if existing:
                error_rows.append(f"Row {idx}: Asset with Tag Number '{tag_num}' already exists.")
                continue
                
            # Parse purchase date
            p_date = None
            p_date_str = row.get("purchase_date", "").strip()
            if p_date_str:
                try:
                    p_date = datetime.strptime(p_date_str, "%Y-%m-%d").date()
                except Exception:
                    try:
                        p_date = datetime.strptime(p_date_str, "%m/%d/%Y").date()
                    except Exception:
                        error_rows.append(f"Row {idx}: Invalid date format for '{p_date_str}'. Use YYYY-MM-DD.")
                        continue
            
            # Parse cost
            cost = 0.0
            cost_str = row.get("cost", "").strip()
            if cost_str:
                try:
                    cost = float(cost_str)
                except ValueError:
                    error_rows.append(f"Row {idx}: Invalid cost value '{cost_str}'.")
                    continue
            
            # Default categories & status validations
            category = row.get("category", "electronics").strip().lower()
            if category not in ["electronics", "furniture", "lab_equipment", "sports_equipment", "general"]:
                category = "general"
                
            status_val = row.get("status", "available").strip().lower()
            if status_val not in ["available", "checked_out", "maintenance", "disposed"]:
                status_val = "available"

            new_asset = Asset(
                tag_number=tag_num,
                name=name,
                category=category,
                status=status_val,
                location=row.get("location", "General").strip() or "General",
                serial_number=row.get("serial_number", "").strip() or None,
                purchase_date=p_date,
                cost=cost,
                notes=row.get("notes", "").strip() or None,
                created_at=get_eat_time()
            )
            session.add(new_asset)
            
            # Log action
            log_entry = AssetLog(
                asset_id=new_asset.id,
                action="create",
                timestamp=get_eat_time(),
                handled_by_id=admin.id,
                notes="Asset registered via bulk CSV upload."
            )
            session.add(log_entry)
            success_count += 1

        if success_count > 0:
            await session.commit()
            await log_action(
                session=session,
                action_type="bulk_upload_assets",
                user=admin,
                table_name="assets",
                record_id="bulk",
                description=f"Bulk uploaded {success_count} assets via CSV",
                request=request
            )
        
        return {
            "status": "success",
            "message": f"Successfully imported {success_count} assets.",
            "errors": error_rows
        }
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"CSV Import failed: {str(e)}")
