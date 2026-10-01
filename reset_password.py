"""
StreamPulse — reset_password.py
Reset a user's password directly via the database.

Usage (local SQLite):
    python reset_password.py --email user@example.com --password newpassword

Usage (PostgreSQL via env):
    DATABASE_URL=postgresql+asyncpg://... python reset_password.py --email ... --password ...
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys


os.environ.setdefault("DATABASE_URL",      "sqlite+aiosqlite:///./streampulse.db")
os.environ.setdefault("SYNC_DATABASE_URL", "sqlite:///./streampulse.db")
os.environ.setdefault("REDIS_URL",         "memory://")

from sqlalchemy import select  # noqa: E402

from app.database import AsyncSessionLocal  # noqa: E402
from app.models.user import User            # noqa: E402
from app.security import hash_password      # noqa: E402


async def main() -> int:
    ap = argparse.ArgumentParser(description="Reset a StreamPulse user password")
    ap.add_argument("--email",    required=True,  help="User email address")
    ap.add_argument("--password", required=True,  help="New password (min 6 chars)")
    ap.add_argument("--activate", action="store_true", help="Also re-activate the account")
    args = ap.parse_args()

    if len(args.password) < 6:
        print("[ERR] Password is too short (minimum 6 characters)")
        return 1

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == args.email.lower().strip())
        )
        user = result.scalar_one_or_none()

        if user is None:
            print(f"[ERR] No user found with email: {args.email}")
            return 1

        user.hashed_password = hash_password(args.password)
        if args.activate:
            user.is_active = True

        await db.commit()
        status = "active" if user.is_active else "inactive"
        print(f"[OK] Password reset for '{user.username}' <{user.email}> (status: {status})")
        return 0


sys.exit(asyncio.run(main()))
