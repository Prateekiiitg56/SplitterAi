"""Encryption at rest for integration secrets (GitHub tokens...).

The Fernet key comes from SPLITTER_SECRET_KEY. Without it, a key is generated once into the data
directory (next to sessions.db) so a fresh install works; set the env var to keep it elsewhere.
"""

from __future__ import annotations

import os
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken


def _key_file() -> Path:
    base = Path(os.getenv("SPLITTER_DATA_DIR") or Path.home() / ".agentcli")
    base.mkdir(parents=True, exist_ok=True)
    return base / "secret.key"


def _fernet() -> Fernet:
    key = os.getenv("SPLITTER_SECRET_KEY", "").strip()
    if not key:
        path = _key_file()
        if not path.exists():
            path.write_bytes(Fernet.generate_key())
            try:
                path.chmod(0o600)
            except OSError:
                pass
        key = path.read_text().strip()
    return Fernet(key.encode())


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> str | None:
    """None when the key changed and the secret can no longer be read."""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return None
