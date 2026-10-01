"""
StreamPulse — generate_keys.py
Generates all required secret keys and prints them ready to paste into .env.

Usage:
    python generate_keys.py
    python generate_keys.py --write  # writes directly into .env
"""
from __future__ import annotations

import argparse
import re
import secrets
import sys
from pathlib import Path


def _gen_secret_key() -> str:
    return secrets.token_hex(32)


def _gen_fernet_key() -> str:
    try:
        from cryptography.fernet import Fernet
        return Fernet.generate_key().decode()
    except ImportError:
        print("[ERR] cryptography not installed. Run: pip install cryptography")
        sys.exit(1)


def _replace_placeholder(content: str, name: str, value: str) -> tuple[str, bool]:
    pattern = re.compile(rf"^{re.escape(name)}=(.*)$", re.MULTILINE)
    match = pattern.search(content)
    placeholders = (
        "",
        "__GENERATE_WITH_PYTHON_SECRETS__",
        "__GENERATE_VIA_PYTHON_CRYPTOGRAPHY_FERNET__",
    )
    if match and match.group(1).strip() not in placeholders:
        return content, False

    line = f"{name}={value}"
    if match:
        return pattern.sub(lambda _: line, content, count=1), True
    suffix = "" if not content or content.endswith("\n") else "\n"
    return content + suffix + line + "\n", True


def main() -> None:
    ap = argparse.ArgumentParser(description="Generate StreamPulse secret keys")
    ap.add_argument(
        "--write",
        action="store_true",
        help="Write generated keys into .env (replaces placeholders only)",
    )
    args = ap.parse_args()

    if args.write:
        env_path = Path(".env")
        if not env_path.exists():
            example = Path(".env.example")
            if not example.exists():
                print("[ERR] .env and .env.example not found.")
                sys.exit(1)
            env_path.write_text(example.read_text(encoding="utf-8"), encoding="utf-8")
            print("[INFO] Created .env from .env.example")

        content = env_path.read_text(encoding="utf-8")
        content, secret_generated = _replace_placeholder(content, "SECRET_KEY", _gen_secret_key())
        content, fernet_generated = _replace_placeholder(content, "FERNET_KEY", _gen_fernet_key())
        if secret_generated or fernet_generated:
            env_path.write_text(content, encoding="utf-8")
        print("[OK] SECRET_KEY " + ("generated" if secret_generated else "kept (already configured)"))
        print("[OK] FERNET_KEY " + ("generated" if fernet_generated else "kept (already configured)"))
        return

    print("\n" + "=" * 60)
    print("  StreamPulse — Generated Keys")
    print("=" * 60)
    print(f"SECRET_KEY={_gen_secret_key()}")
    print(f"FERNET_KEY={_gen_fernet_key()}")
    print("=" * 60)
    print("\nCopy these into your .env file.\n")


if __name__ == "__main__":
    main()
