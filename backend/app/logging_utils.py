from sqlmodel.ext.asyncio.session import AsyncSession
from app.models import SystemActivity
import uuid
from datetime import datetime

async def log_system_activity(
    session: AsyncSession,
    action_type: str,
    entity_type: str,
    description: str,
    actor_id: uuid.UUID = None,
    entity_id: str = None,
    metadata: dict = None,
    ip_address: str = None
):
    """
    Log any system activity to the database.
    """
    try:
        activity = SystemActivity(
            actor_id=actor_id,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            description=description,
            metadata_info=metadata or {},
            ip_address=ip_address,
            timestamp=datetime.utcnow()
        )
        session.add(activity)
        # Note: We do not commit here to allow the caller to group it with their transaction
        # But if we want it to persist even on error, we might want a separate session or commit.
        # For this requirement "record any activity", usually we want it in the same transaction for data integrity.
        # OR we want it effectively logged. 
        # I'll stick to 'add' and let caller commit, or I can flush.
        # Let's simple .add(). The callers (routers) usually commit at the end.
        
    except Exception as e:
        print(f"Failed to log system activity: {e}")
