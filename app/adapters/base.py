from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Dict


class AdapterError(Exception):
    pass


class PlatformAdapter(ABC):
    platform: str = "base"

    def __init__(self, credentials: Dict[str, Any]):
        self.credentials = credentials

    @abstractmethod
    async def validate(self) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def fetch_status(self) -> Dict[str, Any]:
        raise NotImplementedError

    async def execute(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        handler = getattr(self, f"action_{action}", None)
        if handler is None:
            raise AdapterError(f"Unknown action '{action}' for {self.platform}")
        return await handler(params)
