from __future__ import annotations
import logging
import time
from collections import defaultdict, deque
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, TokenOut, UserOut
from app.security import create_access_token
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["auth"])

_attempts: dict[str, deque[float]] = defaultdict(deque)
LIMIT = 12
WINDOW = 60.0
log = logging.getLogger("streampulse.auth")


def _throttle(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    slot = _attempts[ip]
    while slot and now - slot[0] > WINDOW:
        slot.popleft()
    if len(slot) >= LIMIT:
        raise HTTPException(status_code=429, detail="Too many attempts, try later")
    slot.append(now)


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(payload: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    _throttle(request)
    existing = await user_service.get_by_email(db, str(payload.email))
    if existing is not None:
        log.warning("register rejected: email exists ip=%s", request.client.host if request.client else "?")
        raise HTTPException(status_code=400, detail="Email already registered")
    result = await db.execute(select(User).where(User.username == payload.username.strip()))
    if result.scalar_one_or_none() is not None:
        log.warning("register rejected: username taken ip=%s", request.client.host if request.client else "?")
        raise HTTPException(status_code=400, detail="Username already taken")
    count = (await db.execute(select(User))).scalars().all()
    is_admin = len(count) == 0
    user = await user_service.create_user(db, payload, is_admin=is_admin)
    token = create_access_token(str(user.id))
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
async def login(payload: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    _throttle(request)
    user = await user_service.authenticate(db, str(payload.email), payload.password)
    if user is None:
        log.warning("login failed ip=%s email=%s", request.client.host if request.client else "?", str(payload.email))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(str(user.id))
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current: User = Depends(get_current_user)):
    return UserOut.model_validate(current)
