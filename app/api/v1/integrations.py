from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.integration import IntegrationCreate, IntegrationUpdate, IntegrationOut
from app.crypto import VaultError
from app.services import integration_service
from app.services.task_service import history_for_integration

router = APIRouter(prefix="/integrations", tags=["integrations"])


def _out(integ) -> IntegrationOut:
    masked_credentials = integration_service.masked(integ)
    credentials_available = bool(masked_credentials)
    meta_data = integ.meta_data or {}
    status = integ.status
    if not credentials_available:
        status = "error"
        meta_data = {
            **meta_data,
            "error": "Saved credentials cannot be decrypted. Restore the original FERNET_KEY or reconnect this integration.",
        }
    return IntegrationOut(
        id=integ.id, platform=integ.platform, name=integ.name,
        external_id=integ.external_id, status=status,
        last_check_at=integ.last_check_at, meta_data=meta_data,
        created_at=integ.created_at, masked_credentials=masked_credentials,
        credentials_available=credentials_available,
    )


@router.get("", response_model=list[IntegrationOut])
async def list_all(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    items = await integration_service.list_for_user(db, current)
    return [_out(i) for i in items]


@router.post("", response_model=IntegrationOut, status_code=201)
async def create(payload: IntegrationCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    try:
        integ = await integration_service.create_integration(db, current, payload.platform, payload.name, dict(payload.credentials))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return _out(integ)


@router.get("/{integration_id}", response_model=IntegrationOut)
async def get_one(integration_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    integ = await integration_service.get_owned(db, current, integration_id)
    if integ is None:
        raise HTTPException(status_code=404, detail="Not found")
    return _out(integ)


@router.patch("/{integration_id}", response_model=IntegrationOut)
async def update(integration_id: int, payload: IntegrationUpdate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    integ = await integration_service.get_owned(db, current, integration_id)
    if integ is None:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        integ = await integration_service.update_integration(db, integ, payload.name, dict(payload.credentials) if payload.credentials is not None else None)
    except VaultError as exc:
        raise HTTPException(
            status_code=409,
            detail="Saved credentials cannot be decrypted. Restore the original FERNET_KEY or delete and reconnect this integration.",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return _out(integ)


@router.delete("/{integration_id}", status_code=204)
async def delete(integration_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    integ = await integration_service.get_owned(db, current, integration_id)
    if integ is None:
        raise HTTPException(status_code=404, detail="Not found")
    await integration_service.delete_integration(db, integ)
    return None


@router.post("/{integration_id}/check")
async def check(integration_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    integ = await integration_service.get_owned(db, current, integration_id)
    if integ is None:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        status = await integration_service.refresh_status(db, integ)
        return {"ok": True, "status": status}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:500])


@router.get("/{integration_id}/runs")
async def runs(integration_id: int, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    integ = await integration_service.get_owned(db, current, integration_id)
    if integ is None:
        raise HTTPException(status_code=404, detail="Not found")
    items = await history_for_integration(db, current.id, integration_id)
    return [
        {"id": r.id, "kind": r.kind, "status": r.status, "params": r.params, "result": r.result,
         "error": r.error, "created_at": r.created_at.isoformat() if r.created_at else None,
         "started_at": r.started_at.isoformat() if r.started_at else None,
         "finished_at": r.finished_at.isoformat() if r.finished_at else None}
        for r in items
    ]
