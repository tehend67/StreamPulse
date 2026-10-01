from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class TaskRunCreate(BaseModel):
    integration_id: int
    kind: str
    params: Dict[str, Any] = {}


class TaskRunOut(BaseModel):
    id: int
    integration_id: Optional[int]
    kind: str
    status: str
    params: Dict[str, Any]
    result: Optional[Dict[str, Any]]
    error: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    finished_at: Optional[datetime]

    class Config:
        from_attributes = True


class EventOut(BaseModel):
    id: int
    level: str
    source: str
    message: str
    payload: Dict[str, Any]
    integration_id: Optional[int]
    task_run_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
