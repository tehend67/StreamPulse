from __future__ import annotations
from typing import Any, Dict
import httpx
from app.adapters.base import AdapterError, PlatformAdapter

API = "https://www.googleapis.com/youtube/v3"


class YoutubeAdapter(PlatformAdapter):
    platform = "youtube"

    def _key(self) -> str:
        key = str(self.credentials.get("api_key", "")).strip()
        if not key:
            raise AdapterError("Missing api_key in credentials")
        return key

    def _channel(self) -> str:
        ch = str(self.credentials.get("channel_id", "")).strip()
        if not ch:
            raise AdapterError("Missing channel_id in credentials")
        return ch

    async def _get(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        q = dict(params)
        q["key"] = self._key()
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.get(API + path, params=q)
                data = r.json()
        except httpx.TimeoutException as exc:
            raise AdapterError(f"YouTube timeout on {path}: {exc}") from exc
        except Exception as exc:
            raise AdapterError(f"YouTube transport error on {path}: {exc}") from exc
        if "error" in data:
            raise AdapterError(f"YouTube API error: {data['error'].get('message', data['error'])}")
        return data

    async def validate(self) -> Dict[str, Any]:
        data = await self._get("/channels", {"part": "snippet,statistics", "id": self._channel()})
        items = data.get("items", [])
        if not items:
            raise AdapterError("Channel not found. Check channel_id and api_key")
        snip = items[0].get("snippet", {})
        return {
            "ok": True,
            "external_id": self._channel(),
            "username": snip.get("title", ""),
            "display": snip.get("title", self._channel()),
            "raw": {"title": snip.get("title")},
        }

    async def fetch_status(self) -> Dict[str, Any]:
        data = await self._get("/channels", {"part": "snippet,statistics", "id": self._channel()})
        items = data.get("items", [])
        if not items:
            raise AdapterError("Channel not found")
        ch = items[0]
        stats = ch.get("statistics", {})
        live = await self.live_status()
        return {
            "online": True,
            "title": ch.get("snippet", {}).get("title"),
            "subscribers": stats.get("subscriberCount"),
            "views": stats.get("viewCount"),
            "videos": stats.get("videoCount"),
            "live": live,
        }

    async def live_status(self) -> Dict[str, Any]:
        data = await self._get("/search", {
            "part": "snippet",
            "channelId": self._channel(),
            "eventType": "live",
            "type": "video",
            "maxResults": 5,
        })
        items = data.get("items", [])
        return {
            "is_live": len(items) > 0,
            "live_count": len(items),
            "videos": [
                {"video_id": it.get("id", {}).get("videoId"), "title": it.get("snippet", {}).get("title")}
                for it in items
            ],
        }

    async def action_sync(self, params: Dict[str, Any]) -> Dict[str, Any]:
        return await self.fetch_status()

    async def action_livestream(self, params: Dict[str, Any]) -> Dict[str, Any]:
        return await self.live_status()

    async def action_videos(self, params: Dict[str, Any]) -> Dict[str, Any]:
        data = await self._get("/search", {
            "part": "snippet", "channelId": self._channel(),
            "type": "video", "order": "date", "maxResults": int(params.get("limit", 10) or 10),
        })
        items = data.get("items", [])
        out = []
        for it in items:
            vid = (it.get("id") or {}).get("videoId")
            sn = it.get("snippet", {})
            if vid:
                out.append({"video_id": vid, "title": sn.get("title"), "published": sn.get("publishedAt")})
        stats: Dict[str, Any] = {"count": len(out), "videos": out}
        if out:
            det = await self._get("/videos", {"part": "statistics,snippet", "id": ",".join([v["video_id"] for v in out[:10]])})
            for d in det.get("items", []):
                for v in out:
                    if v["video_id"] == d.get("id"):
                        v["views"] = (d.get("statistics") or {}).get("viewCount")
                        v["likes"] = (d.get("statistics") or {}).get("likeCount")
                        v["comments"] = (d.get("statistics") or {}).get("commentCount")
        return stats

    async def action_video_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        vid = str(params.get("video_id", "")).strip()
        if not vid:
            raise AdapterError("video_id is required")
        data = await self._get("/videos", {"part": "snippet,statistics", "id": vid})
        items = data.get("items", [])
        if not items:
            raise AdapterError("Video not found")
        v = items[0]
        return {"video_id": vid, "title": v.get("snippet", {}).get("title"), "statistics": v.get("statistics", {})}

    async def action_playlists(self, params: Dict[str, Any]) -> Dict[str, Any]:
        data = await self._get("/playlists", {
            "part": "snippet,contentDetails", "channelId": self._channel(), "maxResults": 25,
        })
        items = data.get("items", [])
        return {
            "count": len(items),
            "playlists": [{"id": p.get("id"), "title": p.get("snippet", {}).get("title"), "videos": (p.get("contentDetails") or {}).get("itemCount")} for p in items],
        }

    async def action_search(self, params: Dict[str, Any]) -> Dict[str, Any]:
        q = str(params.get("query", "")).strip()
        if not q:
            raise AdapterError("query is required")
        data = await self._get("/search", {
            "part": "snippet", "channelId": self._channel(), "q": q, "type": "video", "maxResults": 10,
        })
        return {"query": q, "results": [{"video_id": (it.get("id") or {}).get("videoId"), "title": it.get("snippet", {}).get("title")} for it in data.get("items", [])]}
