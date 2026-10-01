from __future__ import annotations
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy import select, desc
from app.database import AsyncSessionLocal
from app.models.event_log import EventLog
from app.security import decode_token
from app.websocket.manager import manager
import redis.asyncio as aioredis
from app.config import settings

router = APIRouter()


async def _user_id_from_token(token: str | None) -> int | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
        return int(payload.get("sub", "0"))
    except Exception:
        return None


@router.websocket("/ws/feed")
async def feed(ws: WebSocket):
    protocols = [item.strip() for item in ws.headers.get("sec-websocket-protocol", "").split(",")]
    token = next((item[len("sp-auth."):] for item in protocols if item.startswith("sp-auth.")), None)
    user_id = await _user_id_from_token(token)
    if not user_id:
        await ws.close(code=4401)
        return
    await manager.connect(user_id, ws)
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(EventLog).where(EventLog.user_id == user_id).order_by(desc(EventLog.created_at)).limit(20)
            )
            for ev in reversed(list(result.scalars().all())):
                await ws.send_text(json.dumps({
                    "type": "event", "level": ev.level, "source": ev.source,
                    "message": ev.message, "created_at": ev.created_at.isoformat() if ev.created_at else "",
                }, ensure_ascii=False))
    except Exception:
        pass
    pubsub = None
    redis_url = (settings.redis_url or "").strip()
    use_redis = redis_url not in ("", "memory://", "disabled")
    try:
        if not use_redis:
            while True:
                try:
                    await ws.receive_text()
                except WebSocketDisconnect:
                    break
                except Exception:
                    break
            return
        client = aioredis.from_url(redis_url, decode_responses=True)
        pubsub = client.pubsub()
        await pubsub.subscribe(f"streampulse:events:{user_id}")

        async def _listen():
            async for msg in pubsub.listen():
                if msg.get("type") != "message":
                    continue
                try:
                    await ws.send_text(str(msg.get("data", "{}")))
                except Exception:
                    break

        listen_task = asyncio.create_task(_listen())
        while True:
            try:
                await ws.receive_text()
            except WebSocketDisconnect:
                break
            except Exception:
                break
        listen_task.cancel()
    finally:
        manager.disconnect(user_id, ws)
        try:
            if pubsub is not None:
                await pubsub.unsubscribe(f"streampulse:events:{user_id}")
                await pubsub.close()
        except Exception:
            pass
