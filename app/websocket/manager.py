from __future__ import annotations
import json
from typing import Dict, Set
from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect


class ConnectionManager:
    def __init__(self) -> None:
        self.rooms: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self.rooms.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: int, ws: WebSocket) -> None:
        room = self.rooms.get(user_id)
        if room and ws in room:
            room.remove(ws)

    async def push(self, user_id: int, payload: dict) -> None:
        room = list(self.rooms.get(user_id, set()))
        dead = []
        for ws in room:
            try:
                await ws.send_text(json.dumps(payload, ensure_ascii=False))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(user_id, ws)


manager = ConnectionManager()
