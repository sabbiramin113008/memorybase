import asyncio
from datetime import datetime, timezone
from typing import Any


class EventBus:
    """In-process pub/sub event bus backed by asyncio.Queue.

    Each project has its own list of subscriber queues. Publishing an event
    puts the envelope into every queue for that project. SSE handlers consume
    from their queue and stream events to the browser / MCP client.
    """

    def __init__(self) -> None:
        # project_id → list of asyncio.Queue
        self._subscribers: dict[str, list[asyncio.Queue]] = {}

    async def subscribe(self, project_id: str) -> asyncio.Queue:
        """Register a new subscriber for a project and return its queue."""
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.setdefault(project_id, []).append(queue)
        return queue

    async def unsubscribe(self, project_id: str, queue: asyncio.Queue) -> None:
        """Remove a subscriber queue for a project (called on client disconnect)."""
        queues = self._subscribers.get(project_id, [])
        try:
            queues.remove(queue)
        except ValueError:
            pass
        if not queues:
            self._subscribers.pop(project_id, None)

    async def publish(self, project_id: str, event_type: str, data: dict[str, Any]) -> None:
        """Broadcast a typed event to all subscribers of a project.

        Fire-and-forget: if a queue is full or a subscriber is slow the
        put_nowait call is skipped for that subscriber so the HTTP response
        is never blocked.
        """
        envelope = {
            "event": event_type,
            "project_id": project_id,
            "data": data,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        for queue in list(self._subscribers.get(project_id, [])):
            try:
                queue.put_nowait(envelope)
            except asyncio.QueueFull:
                pass


# Module-level singleton — import this throughout the app
event_bus = EventBus()
