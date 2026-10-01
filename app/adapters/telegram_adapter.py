from __future__ import annotations
import asyncio
from typing import Any, Dict, List
import httpx
from app.adapters.base import AdapterError, PlatformAdapter


class TelegramAdapter(PlatformAdapter):
    platform = "telegram"

    def _token(self) -> str:
        token = str(self.credentials.get("bot_token", "")).strip()
        if not token:
            raise AdapterError("Missing bot_token in credentials")
        return token

    def _base(self) -> str:
        return f"https://api.telegram.org/bot{self._token()}"

    async def _call(self, method: str, payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
        url = f"{self._base()}/{method}"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(url, json=payload or {})
                data = r.json()
        except httpx.TimeoutException as exc:
            raise AdapterError(f"Telegram timeout on {method}: {exc}") from exc
        except Exception as exc:
            raise AdapterError(f"Telegram transport error on {method}: {exc}") from exc
        if not data.get("ok"):
            raise AdapterError(f"Telegram API error on {method}: {data.get('description', data)}")
        return data["result"]

    async def validate(self) -> Dict[str, Any]:
        me = await self._call("getMe")
        return {
            "ok": True,
            "external_id": str(me.get("id", "")),
            "username": me.get("username", ""),
            "display": f"@{me.get('username', '')}" if me.get("username") else str(me.get("id")),
            "raw": me,
        }

    async def fetch_status(self) -> Dict[str, Any]:
        me = await self._call("getMe")
        chat_id = self.credentials.get("chat_id")
        member_count = None
        if chat_id:
            try:
                count = await self._call("getChatMemberCount", {"chat_id": chat_id})
                member_count = int(count) if isinstance(count, int) else None
            except AdapterError:
                member_count = None
        return {
            "online": True,
            "username": me.get("username"),
            "bot_id": me.get("id"),
            "can_join_groups": me.get("can_join_groups"),
            "member_count": member_count,
        }

    async def action_send_message(self, params: Dict[str, Any]) -> Dict[str, Any]:
        chat_id = params.get("chat_id") or self.credentials.get("chat_id")
        text = str(params.get("text", "")).strip()
        if not chat_id:
            raise AdapterError("chat_id is required")
        if not text:
            raise AdapterError("text is required")
        payload = {
            "chat_id": chat_id,
            "text": text,
            "disable_web_page_preview": True,
        }
        if params.get("parse_mode"):
            payload["parse_mode"] = params["parse_mode"]
        res = await self._call("sendMessage", payload)
        return {"message_id": res.get("message_id"), "chat_id": str(chat_id)}

    async def action_broadcast(self, params: Dict[str, Any]) -> Dict[str, Any]:
        text = str(params.get("text", "")).strip()
        targets: List[str] = list(params.get("chat_ids") or self.credentials.get("chat_ids") or [])
        single = params.get("chat_id") or self.credentials.get("chat_id")
        if single and str(single) not in [str(t) for t in targets]:
            targets.append(str(single))
        if not text:
            raise AdapterError("text is required")
        if not targets:
            raise AdapterError("No target chats configured")
        sent = 0
        failed = 0
        errors: List[Dict[str, Any]] = []
        sem = asyncio.Semaphore(5)

        async def _one(chat: str):
            nonlocal sent, failed
            async with sem:
                try:
                    await self._call("sendMessage", {"chat_id": chat, "text": text})
                    sent += 1
                except AdapterError as exc:
                    failed += 1
                    errors.append({"chat_id": str(chat), "error": str(exc)})

        await asyncio.gather(*[_one(str(c)) for c in targets])
        return {"total": len(targets), "sent": sent, "failed": failed, "errors": errors[:20]}

    async def action_stats(self, params: Dict[str, Any]) -> Dict[str, Any]:
        return await self.fetch_status()

    def _chat(self, params: Dict[str, Any]) -> str:
        chat_id = params.get("chat_id") or params.get("channel") or self.credentials.get("chat_id")
        if not chat_id:
            raise AdapterError("chat_id is required (укажите ID канала/чата)")
        return str(chat_id)

    async def action_chat_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        chat_id = self._chat(params)
        info = await self._call("getChat", {"chat_id": chat_id})
        count = None
        try:
            count = await self._call("getChatMemberCount", {"chat_id": chat_id})
        except AdapterError:
            pass
        return {
            "id": info.get("id"),
            "type": info.get("type"),
            "title": info.get("title") or ((info.get("first_name") or "") + " " + (info.get("last_name") or "")).strip(),
            "username": info.get("username"),
            "description": (info.get("description") or info.get("bio") or "")[:500],
            "invite_link": info.get("invite_link"),
            "member_count": count,
        }

    async def action_members(self, params: Dict[str, Any]) -> Dict[str, Any]:
        chat_id = self._chat(params)
        try:
            count = await self._call("getChatMemberCount", {"chat_id": chat_id})
        except AdapterError as exc:
            raise AdapterError(f"Member count unavailable for this chat: {exc}") from exc
        try:
            admins = await self._call("getChatAdministrators", {"chat_id": chat_id})
        except AdapterError as exc:
            if "no administrators in the private chat" in str(exc):
                return {
                    "chat_id": chat_id,
                    "member_count": count,
                    "admins_count": 0,
                    "note": "Private chat has no admin list — admins are shown for groups and channels only",
                    "admins": [],
                }
            raise
        return {
            "chat_id": chat_id,
            "member_count": count,
            "admins_count": len(admins) if isinstance(admins, list) else 0,
            "note": "Telegram Bot API provides the member count and administrators, but does not provide a full member list.",
            "admins": [
                {"id": (a.get("user") or {}).get("id"), "name": (a.get("user") or {}).get("first_name"), "status": a.get("status")}
                for a in (admins if isinstance(admins, list) else [])
            ][:20],
        }

    async def action_admins(self, params: Dict[str, Any]) -> Dict[str, Any]:
        return await self.action_members(params)

    async def action_webhook_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        return await self._call("getWebhookInfo")

    async def action_commands(self, params: Dict[str, Any]) -> Dict[str, Any]:
        cmds = await self._call("getMyCommands")
        return {"commands": cmds if isinstance(cmds, list) else []}

    async def action_poll(self, params: Dict[str, Any]) -> Dict[str, Any]:
        chat_id = self._chat(params)
        question = str(params.get("question", "")).strip()
        options = params.get("options") or []
        if not question:
            raise AdapterError("question is required")
        if not isinstance(options, list) or len(options) < 2:
            raise AdapterError("options: минимум 2 варианта")
        res = await self._call("sendPoll", {"chat_id": chat_id, "question": question[:300], "options": [str(o)[:100] for o in options[:10]]})
        return {"message_id": res.get("message_id"), "poll_id": (res.get("poll") or {}).get("id")}
