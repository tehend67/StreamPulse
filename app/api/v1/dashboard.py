from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.deps import get_current_user
from app.models.integration import Integration
from app.models.task_run import TaskRun
from app.models.user import User
from app.schemas.task_run import EventOut
from app.services import integration_service
from app.services.event_service import recent_for_user
from app.services.task_service import counts

router = APIRouter(tags=["dashboard"])

PLATFORMS = ("telegram", "discord", "youtube")

METRIC_KEYS: Dict[str, List[str]] = {
    "telegram": ["member_count", "sent", "total", "failed", "username", "title"],
    "discord": ["guilds_count", "count", "member_count", "roles_count", "sampled_members"],
    "youtube": ["subscribers", "views", "videos", "live_count", "is_live", "count"],
}


def _pick_metrics(platform: str, result: Dict[str, Any] | None) -> Dict[str, Any]:
    if not result:
        return {}
    out: Dict[str, Any] = {}
    for key in METRIC_KEYS.get(platform, []):
        if key in result:
            out[key] = result[key]
    live = result.get("live")
    if isinstance(live, dict) and "is_live" not in out and "is_live" in live:
        out["is_live"] = live["is_live"]
    return out


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    data = await counts(db, current.id)
    items = await integration_service.list_for_user(db, current)
    by_platform: dict[str, int] = {}
    for i in items:
        by_platform[i.platform] = by_platform.get(i.platform, 0) + 1
    return {**data, "by_platform": by_platform, "ok": all(i.status != "error" for i in items)}


@router.get("/stats/platforms")
async def platform_stats(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    result = await db.execute(
        select(Integration).where(Integration.user_id == current.id).order_by(Integration.created_at.desc())
    )
    integrations = list(result.scalars().all())
    runs_result = await db.execute(
        select(TaskRun)
        .where(TaskRun.user_id == current.id)
        .order_by(desc(TaskRun.created_at))
        .limit(400)
    )
    runs = list(runs_result.scalars().all())
    integ_platform: Dict[int, str] = {i.id: i.platform for i in integrations}
    out: Dict[str, Any] = {}
    for platform in PLATFORMS:
        plats = [i for i in integrations if i.platform == platform]
        pruns = [r for r in runs if r.integration_id in integ_platform and integ_platform[r.integration_id] == platform]
        done = [r for r in pruns if r.status in ("success", "failed")]
        ok = [r for r in pruns if r.status == "success"]
        last = pruns[0] if pruns else None
        last_ok = ok[0] if ok else None
        last_at = last.created_at.isoformat() if last and last.created_at else None
        rate = round(len(ok) / len(done) * 100) if done else None
        metrics = _pick_metrics(platform, last_ok.result if last_ok and last_ok.result else None)
        out[platform] = {
            "integrations": len(plats),
            "online": sum(1 for i in plats if i.status == "active"),
            "runs": len(pruns),
            "success": len(ok),
            "failed": sum(1 for r in pruns if r.status == "failed"),
            "success_rate": rate,
            "last_run_at": last_at,
            "last_kind": last.kind if last else None,
            "last_status": last.status if last else None,
            "metrics": metrics,
            "items": [
                {"id": i.id, "name": i.name, "status": i.status,
                 "last_check_at": i.last_check_at.isoformat() if i.last_check_at else None}
                for i in plats
            ],
        }
    return out


@router.get("/events", response_model=list[EventOut])
async def events(limit: int = 50, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    items = await recent_for_user(db, current.id, limit=min(limit, 200))
    return [EventOut.model_validate(e) for e in items]
