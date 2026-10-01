from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.adapters.registry import get_adapter, validate_fields
from app.adapters.base import AdapterError
from app.crypto import VaultError, encrypt_dict, decrypt_dict, mask_credentials
from app.models.integration import Integration
from app.models.user import User


async def create_integration(db: AsyncSession, user: User, platform: str, name: str, credentials: Dict[str, Any]) -> Integration:
    validate_fields(platform, credentials)
    token = encrypt_dict(credentials)
    integ = Integration(user_id=user.id, platform=platform, name=name.strip(), encrypted_credentials=token, status="pending", meta_data={})
    db.add(integ)
    await db.flush()
    try:
        adapter = get_adapter(platform, credentials)
        info = await adapter.validate()
        integ.external_id = str(info.get("external_id", "") or "") or None
        integ.status = "active"
        integ.last_check_at = datetime.now(timezone.utc)
        integ.meta_data = {"display": info.get("display", ""), "validated_at": datetime.now(timezone.utc).isoformat()}
    except AdapterError as exc:
        integ.status = "error"
        integ.meta_data = {"error": str(exc)[:500]}
    await db.commit()
    await db.refresh(integ)
    return integ


async def list_for_user(db: AsyncSession, user: User) -> List[Integration]:
    result = await db.execute(select(Integration).where(Integration.user_id == user.id).order_by(Integration.created_at.desc()))
    return list(result.scalars().all())


async def get_owned(db: AsyncSession, user: User, integration_id: int) -> Integration | None:
    result = await db.execute(select(Integration).where(Integration.id == integration_id, Integration.user_id == user.id))
    return result.scalar_one_or_none()


async def decrypt_credentials(integ: Integration) -> Dict[str, Any]:
    return decrypt_dict(integ.encrypted_credentials)


def masked(integ: Integration) -> Dict[str, Any]:
    try:
        creds = decrypt_dict(integ.encrypted_credentials)
        return mask_credentials(creds)
    except VaultError:
        return {}


async def update_integration(db: AsyncSession, integ: Integration, name: str | None, credentials: Dict[str, Any] | None) -> Integration:
    try:
        current_credentials = decrypt_dict(integ.encrypted_credentials)
    except VaultError:
        if not credentials:
            raise
        validate_fields(integ.platform, credentials)
        merged = dict(credentials)
    else:
        merged = {**current_credentials, **(credentials or {})}
        if credentials is not None:
            validate_fields(integ.platform, merged)

    if name:
        integ.name = name.strip()
    if credentials is not None:
        integ.encrypted_credentials = encrypt_dict(merged)
        try:
            adapter = get_adapter(integ.platform, merged)
            info = await adapter.validate()
            integ.external_id = str(info.get("external_id", "") or "") or integ.external_id
            integ.status = "active"
            integ.last_check_at = datetime.now(timezone.utc)
        except AdapterError as exc:
            integ.status = "error"
            integ.meta_data = {"error": str(exc)[:500]}
    await db.commit()
    await db.refresh(integ)
    return integ


async def delete_integration(db: AsyncSession, integ: Integration) -> None:
    await db.delete(integ)
    await db.commit()


async def refresh_status(db: AsyncSession, integ: Integration) -> Dict[str, Any]:
    creds = decrypt_dict(integ.encrypted_credentials)
    adapter = get_adapter(integ.platform, creds)
    try:
        status = await adapter.fetch_status()
        integ.status = "active"
        integ.last_check_at = datetime.now(timezone.utc)
        integ.meta_data = {**integ.meta_data, "last_status": status}
        await db.commit()
        return status
    except AdapterError as exc:
        integ.status = "error"
        integ.meta_data = {**integ.meta_data, "error": str(exc)[:500]}
        await db.commit()
        raise
