from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserOut, UserPrefs
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/prefs", response_model=UserOut)
async def prefs(payload: UserPrefs, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    user = await user_service.update_prefs(db, current, payload.lang, payload.theme)
    return UserOut.model_validate(user)
