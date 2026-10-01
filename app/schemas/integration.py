from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class IntegrationCreate(BaseModel):
    platform: str = Field(pattern="^(telegram|discord|youtube)$")
    name: str = Field(min_length=2, max_length=128)
    credentials: Dict[str, Any]


class IntegrationUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=128)
    credentials: Optional[Dict[str, Any]] = None


class IntegrationOut(BaseModel):
    id: int
    platform: str
    name: str
    external_id: Optional[str]
    status: str
    last_check_at: Optional[datetime]
    meta_data: Dict[str, Any]
    created_at: datetime
    masked_credentials: Dict[str, Any] = {}
    credentials_available: bool = True

    class Config:
        from_attributes = True
