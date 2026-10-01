from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, ForeignKey, String, Text, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class EventLog(Base):
    __tablename__ = "event_logs"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    integration_id: Mapped[Optional[int]] = mapped_column(ForeignKey("integrations.id", ondelete="SET NULL"), nullable=True, index=True)
    task_run_id: Mapped[Optional[int]] = mapped_column(ForeignKey("task_runs.id", ondelete="SET NULL"), nullable=True, index=True)
    level: Mapped[str] = mapped_column(String(16), default="info", nullable=False)
    source: Mapped[str] = mapped_column(String(16), default="system", nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    user: Mapped[Optional["User"]] = relationship(back_populates="events")
    integration: Mapped[Optional["Integration"]] = relationship(back_populates="events")
