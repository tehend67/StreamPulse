from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.integration import Integration
from app.models.task_run import TaskRun
from app.models.user import User

log = logging.getLogger(__name__)


class TaskDispatchError(Exception):
    pass


ALLOWED_KINDS: Dict[str, list[str]] = {
    "telegram": ["broadcast", "send_message", "stats", "chat_info", "members", "admins", "webhook_info", "commands", "poll"],
    "discord": ["audit", "send_message", "moderation", "webhook", "guild_info", "channels", "roles", "invites", "pins"],
    "youtube": ["sync", "livestream", "videos", "video_info", "playlists", "search"],
}


def validate_kind(platform: str, kind: str) -> None:
    allowed = ALLOWED_KINDS.get(platform, [])
    if kind not in allowed:
        raise ValueError(f"Kind '{kind}' not allowed for {platform}. Allowed: {allowed}")


async def enqueue(db: AsyncSession, user: User, integ: Integration, kind: str, params: Dict[str, Any]) -> TaskRun:
    validate_kind(integ.platform, kind)
    run = TaskRun(user_id=user.id, integration_id=integ.id, kind=kind, status="queued", params=params or {})
    db.add(run)
    await db.commit()
    await db.refresh(run)
    run_id = run.id
    try:
        from app.config import settings as _s
        from app.worker.tasks import execute_task
        url = (_s.redis_url or "").strip()
        if url in ("", "memory://", "disabled"):
            import threading

            def _bg() -> None:
                try:
                    execute_task.apply(args=[run_id])
                except Exception as exc:
                    log.error("Local task execution failed id=%s error_type=%s", run_id, type(exc).__name__)
                    from app.database import SyncSessionLocal

                    try:
                        with SyncSessionLocal() as sync_db:
                            failed_run = sync_db.get(TaskRun, run_id)
                            if failed_run and failed_run.status in ("queued", "running"):
                                failed_run.status = "failed"
                                failed_run.error = "Local task execution failed"
                                failed_run.finished_at = datetime.now(timezone.utc)
                                sync_db.commit()
                    except Exception:
                        log.exception("Could not persist local task failure id=%s", run_id)

            threading.Thread(target=_bg, daemon=True).start()
            run.celery_task_id = f"local-{run_id}"
        else:
            from app.worker.celery_app import celery
            async_task = celery.send_task("streampulse.execute", args=[run_id])
            run.celery_task_id = async_task.id
    except Exception as exc:
        log.exception("Failed to dispatch task run id=%s", run_id)
        run.status = "failed"
        run.error = "Unable to dispatch task"
        run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        raise TaskDispatchError("Task queue is unavailable") from exc
    await db.commit()
    return run


async def history_for_user(db: AsyncSession, user_id: int, limit: int = 50) -> List[TaskRun]:
    result = await db.execute(
        select(TaskRun).where(TaskRun.user_id == user_id).order_by(desc(TaskRun.created_at)).limit(limit)
    )
    return list(result.scalars().all())


async def history_for_integration(db: AsyncSession, user_id: int, integration_id: int, limit: int = 30) -> List[TaskRun]:
    result = await db.execute(
        select(TaskRun)
        .where(TaskRun.user_id == user_id, TaskRun.integration_id == integration_id)
        .order_by(desc(TaskRun.created_at))
        .limit(limit)
    )
    return list(result.scalars().all())


async def counts(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    total_integ = (await db.execute(select(func.count()).select_from(Integration).where(Integration.user_id == user_id))).scalar() or 0
    active_runs = (
        await db.execute(
            select(func.count()).select_from(TaskRun).where(TaskRun.user_id == user_id, TaskRun.status.in_(["queued", "running"]))
        )
    ).scalar() or 0
    failed = (
        await db.execute(select(func.count()).select_from(TaskRun).where(TaskRun.user_id == user_id, TaskRun.status == "failed"))
    ).scalar() or 0
    return {"integrations": total_integ, "active_tasks": active_runs, "failed": failed}
