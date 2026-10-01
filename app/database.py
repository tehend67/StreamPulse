from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine
from app.config import settings


class Base(DeclarativeBase):
    pass


async_url = settings.database_url
sync_url = settings.sync_database_url
is_sqlite_async = async_url.startswith("sqlite")
is_sqlite_sync = sync_url.startswith("sqlite")

if is_sqlite_async:
    async_engine = create_async_engine(async_url, future=True, connect_args={"check_same_thread": False, "timeout": 30})
else:
    async_engine = create_async_engine(async_url, pool_pre_ping=True, future=True)
AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

if is_sqlite_sync:
    sync_engine = create_engine(sync_url, future=True, connect_args={"check_same_thread": False, "timeout": 30})
else:
    sync_engine = create_engine(sync_url, pool_pre_ping=True, future=True)
SyncSessionLocal = sessionmaker(bind=sync_engine, autoflush=False, autocommit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
