from __future__ import annotations
from typing import Any, Dict, Type
from app.adapters.base import PlatformAdapter
from app.adapters.telegram_adapter import TelegramAdapter
from app.adapters.discord_adapter import DiscordAdapter
from app.adapters.youtube_adapter import YoutubeAdapter

REGISTRY: Dict[str, Type[PlatformAdapter]] = {
    "telegram": TelegramAdapter,
    "discord": DiscordAdapter,
    "youtube": YoutubeAdapter,
}

REQUIRED_FIELDS: Dict[str, list[str]] = {
    "telegram": ["bot_token"],
    "discord": ["bot_token"],
    "youtube": ["api_key", "channel_id"],
}

OPTIONAL_FIELDS: Dict[str, list[str]] = {
    "telegram": ["chat_id", "chat_ids"],
    "discord": ["guild_id", "channel_id"],
    "youtube": [],
}


def get_adapter(platform: str, credentials: Dict[str, Any]) -> PlatformAdapter:
    cls = REGISTRY.get(platform)
    if cls is None:
        raise ValueError(f"Unsupported platform: {platform}")
    return cls(credentials)


def validate_fields(platform: str, credentials: Dict[str, Any]) -> None:
    required = REQUIRED_FIELDS.get(platform, [])
    missing = [f for f in required if not str(credentials.get(f, "")).strip()]
    if missing:
        raise ValueError(f"Missing required fields for {platform}: {', '.join(missing)}")
    if platform == "discord":
        invalid_ids = [
            field for field in OPTIONAL_FIELDS[platform]
            if credentials.get(field) and not str(credentials[field]).strip().isdigit()
        ]
        if invalid_ids:
            raise ValueError(f"Discord IDs must contain only digits: {', '.join(invalid_ids)}")
