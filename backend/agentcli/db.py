"""One SQLite connection per database file for the whole process, with its schema set up once.

Callers run on the event loop and on worker threads (asyncio.to_thread), so access is serialized.
"""

from __future__ import annotations

import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Callable, Iterator

_CONNECTIONS: dict[str, sqlite3.Connection] = {}
_INITIALIZED: set[tuple[str, Callable]] = set()
_LOCK = threading.RLock()


@contextmanager
def connection(path: Path, init: Callable[[sqlite3.Connection], None]) -> Iterator[sqlite3.Connection]:
    key = str(path)
    with _LOCK:
        conn = _CONNECTIONS.get(key)
        if conn is None:
            conn = sqlite3.connect(key, check_same_thread=False)
            conn.execute("PRAGMA journal_mode=WAL")
            _CONNECTIONS[key] = conn
        if (key, init) not in _INITIALIZED:
            init(conn)
            _INITIALIZED.add((key, init))
        yield conn


def close_all() -> None:
    """Close every connection (tests that delete their database folder; Windows keeps open files locked)."""
    with _LOCK:
        for conn in _CONNECTIONS.values():
            conn.close()
        _CONNECTIONS.clear()
        _INITIALIZED.clear()
