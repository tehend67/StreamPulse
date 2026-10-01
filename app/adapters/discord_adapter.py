from __future__ import annotations
from typing import Any, Dict, List
import httpx
from app.adapters.base import AdapterError, PlatformAdapter

API = "https://discord.com/api/v10"


class DiscordAdapter(PlatformAdapter):
    platform = "discord"

    def _token(self) -> str:
        token = str(self.credentials.get("bot_token", "")).strip()
        if not token:
            raise AdapterError("Missing bot_token in credentials")
        return token

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bot {self._token()}", "Content-Type": "application/json"}

    async def _req(self, method: str, path: str, payload: Dict[str, Any] | None = None) -> Any:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.request(method, API + path, headers=self._headers(), json=payload)
                if r.status_code == 429:
                    raise AdapterError("Discord rate limited (429)")
                if r.status_code >= 400:
                    raise AdapterError(f"Discord HTTP {r.status_code}: {r.text[:500]}")
                if not r.text:
                    return {}
                return r.json()
        except httpx.TimeoutException as exc:
            raise AdapterError(f"Discord timeout on {path}: {exc}") from exc
        except AdapterError:
            raise
        except Exception as exc:
            raise AdapterError(f"Discord transport error on {path}: {exc}") from exc

    async def validate(self) -> Dict[str, Any]:
        me = await self._req("GET", "/users/@me")
        return {
            "ok": True,
            "external_id": str(me.get("id", "")),
            "username": me.get("username", ""),
            "display": me.get("username", ""),
            "raw": me,
        }

    async def fetch_status(self, guild_id: str | None = None) -> Dict[str, Any]:
        me = await self._req("GET", "/users/@me")
        guild_id = str(guild_id or self.credentials.get("guild_id") or "").strip()
        guilds: List[Dict[str, Any]] = []
        if guild_id:
            if not guild_id.isdigit():
                raise AdapterError("guild_id must contain only digits")
            full = await self._req("GET", f"/guilds/{guild_id}?with_counts=true")
            guilds.append({
                "id": full.get("id", guild_id),
                "name": full.get("name"),
                "member_count": full.get("approximate_member_count"),
                "presence_count": full.get("approximate_presence_count"),
            })
        return {
            "online": True,
            "bot": me.get("username"),
            "guilds_count": len(guilds),
            "guilds": guilds,
            "note": None if guild_id else "Add a guild_id to check a server; bot tokens cannot list all servers.",
        }

    async def action_audit(self, params: Dict[str, Any]) -> Dict[str, Any]:
        return await self.fetch_status(str(params.get("guild_id") or "") or None)

    def _channel(self, params: Dict[str, Any]) -> str:
        channel_id = str(params.get("channel_id") or self.credentials.get("channel_id") or "").strip()
        if not channel_id:
            raise AdapterError("channel_id is required")
        if not channel_id.isdigit():
            raise AdapterError("channel_id must contain only digits")
        return channel_id

    async def action_send_message(self, params: Dict[str, Any]) -> Dict[str, Any]:
        channel_id = self._channel(params)
        content = str(params.get("text", params.get("content", ""))).strip()
        if not content:
            raise AdapterError("text is required")
        res = await self._req("POST", f"/channels/{channel_id}/messages", {"content": content[:2000]})
        return {"message_id": res.get("id"), "channel_id": channel_id}

    async def action_moderation(self, params: Dict[str, Any]) -> Dict[str, Any]:
        guild_id = str(params.get("guild_id") or self.credentials.get("guild_id") or "").strip()
        if not guild_id:
            status = await self.fetch_status()
            return {"mode": "audit_only", "guilds": status.get("guilds", [])}
        roles = await self._req("GET", f"/guilds/{guild_id}/roles")
        members_url = f"/guilds/{guild_id}/members?limit=100"
        members = await self._req("GET", members_url)
        return {
            "guild_id": guild_id,
            "roles_count": len(roles) if isinstance(roles, list) else 0,
            "sampled_members": len(members) if isinstance(members, list) else 0,
            "roles": [{"id": r.get("id"), "name": r.get("name"), "permissions": r.get("permissions")} for r in (roles if isinstance(roles, list) else [])][:50],
        }

    async def action_webhook(self, params: Dict[str, Any]) -> Dict[str, Any]:
        channel_id = self._channel(params)
        hooks = await self._req("GET", f"/channels/{channel_id}/webhooks")
        name = str(params.get("webhook_name", "StreamPulse")).strip()
        if params.get("create") and isinstance(hooks, list) and len(hooks) == 0:
            created = await self._req("POST", f"/channels/{channel_id}/webhooks", {"name": name})
            return {"webhooks": [created], "created": True}
        return {"webhooks": hooks if isinstance(hooks, list) else [], "created": False}

    def _guild(self, params: Dict[str, Any]) -> str:
        gid = str(params.get("guild_id") or self.credentials.get("guild_id") or "").strip()
        if not gid:
            raise AdapterError("guild_id is required")
        if not gid.isdigit():
            raise AdapterError("guild_id must contain only digits")
        return gid

    async def action_guild_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        gid = self._guild(params)
        g = await self._req("GET", f"/guilds/{gid}?with_counts=true")
        return {
            "id": g.get("id"),
            "name": g.get("name"),
            "description": (g.get("description") or "")[:500],
            "member_count": g.get("approximate_member_count"),
            "presence_count": g.get("approximate_presence_count"),
            "premium_tier": g.get("premium_tier"),
            "features": (g.get("features") or [])[:20],
        }

    async def action_channels(self, params: Dict[str, Any]) -> Dict[str, Any]:
        gid = self._guild(params)
        chs = await self._req("GET", f"/guilds/{gid}/channels")
        items = chs if isinstance(chs, list) else []
        return {
            "guild_id": gid,
            "count": len(items),
            "channels": [{"id": c.get("id"), "name": c.get("name"), "type": c.get("type"), "topic": (c.get("topic") or "")[:200]} for c in items][:50],
        }

    async def action_roles(self, params: Dict[str, Any]) -> Dict[str, Any]:
        gid = self._guild(params)
        roles = await self._req("GET", f"/guilds/{gid}/roles")
        items = roles if isinstance(roles, list) else []
        return {
            "guild_id": gid,
            "count": len(items),
            "roles": [{"id": r.get("id"), "name": r.get("name"), "color": r.get("color"), "members": (r.get("tags") or {})} for r in items][:50],
        }

    async def action_invites(self, params: Dict[str, Any]) -> Dict[str, Any]:
        gid = self._guild(params)
        invs = await self._req("GET", f"/guilds/{gid}/invites")
        items = invs if isinstance(invs, list) else []
        return {
            "guild_id": gid,
            "count": len(items),
            "invites": [{"code": i.get("code"), "uses": i.get("uses"), "max_uses": i.get("max_uses"), "channel": (i.get("channel") or {}).get("name")} for i in items][:30],
        }

    async def action_pins(self, params: Dict[str, Any]) -> Dict[str, Any]:
        channel_id = self._channel(params)
        pins = await self._req("GET", f"/channels/{channel_id}/pins")
        items = pins if isinstance(pins, list) else []
        return {
            "channel_id": channel_id,
            "count": len(items),
            "pins": [{"id": p.get("id"), "author": (p.get("author") or {}).get("username"), "content": (p.get("content") or "")[:200]} for p in items][:20],
        }
