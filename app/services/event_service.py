from __future__ import annotations
from typing import Any, Dict, List
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.event_log import EventLog


async def log_event(
    db: AsyncSession,
    message: str,
    level: str = "info",
    source: str = "system",
    user_id: int | None = None,
    integration_id: int | None = None,
    task_run_id: int | None = None,
    payload: Dict[str, Any] | None = None,
) -> EventLog:
    ev = EventLog(
        message=message[:2000],
        level=level,
        source=source,
        user_id=user_id,
        integration_id=integration_id,
        task_run_id=task_run_id,
        payload=payload or {},
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    return ev


async def recent_for_user(db: AsyncSession, user_id: int, limit: int = 50) -> List[EventLog]:
    result = await db.execute(
        select(EventLog).where(EventLog.user_id == user_id).order_by(desc(EventLog.created_at)).limit(limit)
    )
    return list(result.scalars().all())
