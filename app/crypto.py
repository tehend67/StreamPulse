from __future__ import annotations
import base64
import json
from typing import Any, Dict
from cryptography.fernet import Fernet, InvalidToken
from app.config import settings


class VaultError(Exception):
    pass


def _fernet() -> Fernet:
    key = settings.fernet_key.strip() if settings.fernet_key else ""
    if not key:
        raise VaultError("FERNET_KEY is not configured. Generate one and set it in .env")
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception as exc:
        raise VaultError(f"Invalid FERNET_KEY: {exc}") from exc


def generate_fernet_key() -> str:
    return Fernet.generate_key().decode()


def encrypt_dict(payload: Dict[str, Any]) -> str:
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    token = _fernet().encrypt(raw)
    return token.decode()


def decrypt_dict(token: str) -> Dict[str, Any]:
    try:
        raw = _fernet().decrypt(token.encode())
        data = json.loads(raw.decode("utf-8"))
        if not isinstance(data, dict):
            raise VaultError("Decrypted payload is not a dict")
        return data
    except (InvalidToken, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise VaultError("Unable to decrypt credentials: invalid key or corrupted data") from exc


def encrypt_str(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode()


def decrypt_str(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode()).decode("utf-8")
    except InvalidToken as exc:
        raise VaultError("Unable to decrypt value") from exc


def mask_credentials(payload: Dict[str, Any]) -> Dict[str, Any]:
    masked: Dict[str, Any] = {}
    for k, v in payload.items():
        s = str(v)
        if len(s) <= 8:
            masked[k] = "***"
        else:
            masked[k] = s[:3] + "***" + s[-2:]
    return masked
