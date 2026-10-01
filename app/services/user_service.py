from __future__ import annotations
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.user import UserCreate
from app.security import hash_password, verify_password


async def create_user(db: AsyncSession, payload: UserCreate, is_admin: bool = False) -> User:
    user = User(
        email=str(payload.email).lower().strip(),
        username=payload.username.strip(),
        hashed_password=hash_password(payload.password),
        is_admin=is_admin,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower().strip()))
    return result.scalar_one_or_none()


async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_by_email(db, email)
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def update_prefs(db: AsyncSession, user: User, lang: str | None, theme: str | None) -> User:
    if lang in ("uk", "ru", "en"):
        user.lang = lang
    if theme in ("dark", "light"):
        user.theme = theme
    await db.commit()
    await db.refresh(user)
    return user
