from __future__ import annotations
import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict
import redis
from sqlalchemy import select
from app.config import settings
from app.database import SyncSessionLocal
from app.models.integration import Integration
from app.models.task_run import TaskRun
from app.models.event_log import EventLog
from app.crypto import decrypt_dict
from app.crypto import VaultError
from app.adapters.registry import get_adapter
from app.adapters.base import AdapterError
from app.worker.celery_app import celery


def _publish(user_id: int, payload: Dict[str, Any]) -> None:
    url = (settings.redis_url or "").strip()
    if url in ("", "memory://", "disabled"):
        try:
            from app.websocket.manager import manager
            import asyncio as _aio
            coro = manager.push(user_id, payload)
            try:
                loop = _aio.get_event_loop()
                if loop.is_running():
                    loop.create_task(coro)
                else:
                    loop.run_until_complete(coro)
            except RuntimeError:
                _aio.run(coro)
        except Exception:
            pass
        return
    try:
        client = redis.Redis.from_url(url, decode_responses=True, socket_connect_timeout=2)
        client.publish(f"streampulse:events:{user_id}", json.dumps(payload, ensure_ascii=False))
        client.close()
    except Exception:
        pass


def _run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    if loop.is_running():
        new_loop = asyncio.new_event_loop()
        try:
            return new_loop.run_until_complete(coro)
        finally:
            new_loop.close()
    return loop.run_until_complete(coro)


@celery.task(name="streampulse.execute", bind=True, max_retries=0)
def execute_task(self, run_id: int) -> Dict[str, Any]:
    db = SyncSessionLocal()
    try:
        run = db.get(TaskRun, run_id)
        if run is None:
            return {"ok": False, "error": "run not found"}
        integ = db.get(Integration, run.integration_id) if run.integration_id else None
        if integ is None:
            run.status = "failed"
            run.error = "Integration not found"
            run.finished_at = datetime.now(timezone.utc)
            db.commit()
            _publish(run.user_id, {"type": "task", "status": "failed", "run_id": run.id,
                                   "kind": run.kind, "source": "sys",
                                   "message": f"Task #{run.id} ({run.kind}) FAILED: integration not found"})
            return {"ok": False, "error": "integration not found"}
        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
        db.commit()
        _publish(run.user_id, {"type": "task", "status": "running", "run_id": run.id,
                               "kind": run.kind, "source": integ.platform[:2],
                               "message": f"[{integ.platform}] {run.kind} started"})

        try:
            creds = decrypt_dict(integ.encrypted_credentials)
        except VaultError:
            message = "Saved credentials cannot be decrypted. Restore the original FERNET_KEY or reconnect this integration."
            run.status = "failed"
            run.error = message
            run.finished_at = datetime.now(timezone.utc)
            integ.status = "error"
            integ.meta_data = {**(integ.meta_data or {}), "error": message}
            ev = EventLog(user_id=run.user_id, integration_id=integ.id, task_run_id=run.id,
                          level="error", source=integ.platform[:2], message=message,
                          payload={"error": message})
            db.add(ev)
            db.commit()
            _publish(run.user_id, {"type": "task", "status": "failed", "run_id": run.id,
                                   "kind": run.kind, "source": integ.platform[:2],
                                   "message": message})
            return {"ok": False, "error": message}
        adapter = get_adapter(integ.platform, creds)

        async def _do():
            action = run.kind
            mapping = {"broadcast": "broadcast", "send_message": "send_message", "stats": "stats",
                       "chat_info": "chat_info", "members": "members", "admins": "admins",
                       "webhook_info": "webhook_info", "commands": "commands", "poll": "poll",
                       "audit": "audit", "moderation": "moderation", "webhook": "webhook",
                       "guild_info": "guild_info", "channels": "channels", "roles": "roles",
                       "invites": "invites", "pins": "pins",
                       "sync": "sync", "livestream": "livestream", "videos": "videos",
                       "video_info": "video_info", "playlists": "playlists", "search": "search"}
            method = f"action_{mapping.get(action, action)}"
            fn = getattr(adapter, method, None)
            if fn is None:
                raise AdapterError(f"Unsupported action {action}")
            return await fn(dict(run.params or {}))

        try:
            result = _run_async(_do())
            run.status = "success"
            run.result = result if isinstance(result, dict) else {"value": result}
            run.finished_at = datetime.now(timezone.utc)
            integ.status = "active"
            integ.last_check_at = datetime.now(timezone.utc)
            ev = EventLog(user_id=run.user_id, integration_id=integ.id, task_run_id=run.id,
                          level="success", source=integ.platform[:2],
                          message=f"[{integ.platform}] {run.kind} OK", payload=run.result)
            db.add(ev)
            db.commit()
            _publish(run.user_id, {"type": "task", "status": "success", "run_id": run.id,
                                   "kind": run.kind, "message": ev.message, "result": run.result})
            return {"ok": True, "result": run.result}
        except Exception as exc:
            run.status = "failed"
            run.error = str(exc)[:2000]
            run.finished_at = datetime.now(timezone.utc)
            integ.status = "error"
            ev = EventLog(user_id=run.user_id, integration_id=integ.id, task_run_id=run.id,
                          level="error", source=integ.platform[:2],
                          message=f"[{integ.platform}] {run.kind} FAILED: {exc}"[:2000],
                          payload={"error": str(exc)[:1000]})
            db.add(ev)
            db.commit()
            _publish(run.user_id, {"type": "task", "status": "failed", "run_id": run.id,
                                   "kind": run.kind, "message": ev.message})
            return {"ok": False, "error": str(exc)[:1000]}
    finally:
        db.close()


@celery.task(name="streampulse.periodic_refresh")
def periodic_refresh() -> Dict[str, Any]:
    db = SyncSessionLocal()
    done = 0
    try:
        integrations = db.execute(select(Integration).where(Integration.status == "active").limit(50)).scalars().all()
        for integ in integrations:
            try:
                creds = decrypt_dict(integ.encrypted_credentials)
                adapter = get_adapter(integ.platform, creds)

                async def _st():
                    return await adapter.fetch_status()

                _run_async(_st())
                integ.last_check_at = datetime.now(timezone.utc)
                done += 1
            except Exception:
                integ.status = "error"
        db.commit()
        return {"ok": True, "refreshed": done}
    finally:
        db.close()
