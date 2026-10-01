"""
StreamPulse — run_local.py
Local development launcher using SQLite + in-memory Celery (no Redis/Postgres needed).

Usage:
    python run_local.py

Requirements:
    - .env with at least FERNET_KEY set (generate once):
        python -c "from cryptography.fernet import Fernet; print('FERNET_KEY=' + Fernet.generate_key().decode())"
    - pip install -r requirements-local.txt
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path


os.environ.setdefault("DATABASE_URL",      "sqlite+aiosqlite:///./streampulse.db")
os.environ.setdefault("SYNC_DATABASE_URL", "sqlite:///./streampulse.db")
os.environ.setdefault("REDIS_URL",         "memory://")


from app.config import settings  # noqa: E402

if (
    not settings.fernet_key
    or settings.fernet_key == "__GENERATE_VIA_PYTHON_CRYPTOGRAPHY_FERNET__"
    or settings.secret_key == "__GENERATE_WITH_PYTHON_SECRETS__"
    or settings.secret_key.startswith("change-me")
):
    print(
        "\n[ERROR] Application keys are not configured in .env.\n"
        "Generate missing keys without overwriting existing ones:\n"
        "  python generate_keys.py --write\n"
    )
    sys.exit(1)


from app.database import async_engine, Base  # noqa: E402
import app.models  # noqa: F401, E402  — registers all models


async def _init_db() -> None:
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] SQLite database ready: ./streampulse.db")


asyncio.run(_init_db())


import uvicorn  # noqa: E402

print("[OK] Starting StreamPulse on http://127.0.0.1:8000")
print("     Open: http://localhost:8000")
print("     Press Ctrl+C to stop.\n")

uvicorn.run(
    "app.main:app",
    host="127.0.0.1",
    port=8000,
    reload=False,
    log_level="info",
)
