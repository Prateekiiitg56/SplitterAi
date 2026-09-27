"""Team board: the live message channel between workers and the coordinator during one run.

Workers post notes (post_note tool) and file-write activity; the coordinator reads that
activity and posts directives. Each worker receives messages addressed to it or to everyone
between its model steps, so information crosses workers while they are still running.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

COORDINATOR = "coordinator"
EVERYONE = "all"


@dataclass
class Message:
    sender: str
    to: str  # a worker id, EVERYONE, or COORDINATOR
    text: str
    file: str | None = None  # set on file-write activity


class Board:
    def __init__(self) -> None:
        self.messages: list[Message] = []
        self._cursors: dict[str, int] = {}
        self.running: set[str] = set()
        self.finished: set[str] = set()
        # Set on every post the coordinator should see; the coordinator clears it when it reads.
        self.activity = asyncio.Event()

    def post(self, sender: str, text: str, to: str = EVERYONE, file: str | None = None) -> None:
        self.messages.append(Message(sender, to, text, file))
        if sender != COORDINATOR:
            self.activity.set()

    def unread(self, reader: str) -> list[Message]:
        """Messages for `reader` since its last call, never its own."""
        start = self._cursors.get(reader, 0)
        self._cursors[reader] = len(self.messages)
        if reader == COORDINATOR:
            return [m for m in self.messages[start:] if m.sender != COORDINATOR]
        return [m for m in self.messages[start:] if m.sender != reader and m.to in (reader, EVERYONE)]


POST_NOTE_TOOL = {
    "type": "function",
    "function": {
        "name": "post_note",
        "description": (
            "Send a short message to the coordinator and the other agents working in parallel with you. "
            "Use it to announce shared names you chose (file names, element ids, CSS classes, function "
            "names, API shapes) or to ask another agent for something you depend on."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "message": {"type": "string", "description": "The note. Be specific: exact names and paths."},
                "to": {"type": "string", "description": "A subtask id, or 'all' (default)."},
            },
            "required": ["message"],
        },
    },
}
