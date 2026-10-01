from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.task_run import TaskRunCreate, TaskRunOut
from app.services import integration_service
from app.services.task_service import TaskDispatchError, enqueue, history_for_user

router = APIRouter(prefix="/actions", tags=["actions"])


@router.post("/run", response_model=TaskRunOut, status_code=202)
async def run_action(payload: TaskRunCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    integ = await integration_service.get_owned(db, current, payload.integration_id)
    if integ is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    try:
        run = await enqueue(db, current, integ, payload.kind, dict(payload.params or {}))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except TaskDispatchError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return TaskRunOut.model_validate(run)


@router.get("/history", response_model=list[TaskRunOut])
async def history(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    items = await history_for_user(db, current.id, limit=80)
    return [TaskRunOut.model_validate(r) for r in items]
