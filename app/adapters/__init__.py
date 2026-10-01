from app.adapters.base import PlatformAdapter, AdapterError
from app.adapters.telegram_adapter import TelegramAdapter
from app.adapters.discord_adapter import DiscordAdapter
from app.adapters.youtube_adapter import YoutubeAdapter
from app.adapters.registry import get_adapter, validate_fields, REGISTRY

__all__ = [
    "PlatformAdapter", "AdapterError",
    "TelegramAdapter", "DiscordAdapter", "YoutubeAdapter",
    "get_adapter", "validate_fields", "REGISTRY",
]
