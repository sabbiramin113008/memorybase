import asyncio
import json

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from backend.services.event_bus import event_bus

router = APIRouter(tags=["events"])

PING_INTERVAL_SECONDS = 30


@router.get("/events/{project_id}")
async def sse_stream(project_id: str):
    """SSE stream for a project. No auth required — agents configure key in MCP headers."""

    async def event_generator():
        queue = await event_bus.subscribe(project_id)
        try:
            while True:
                try:
                    # Wait for an event with a timeout so we can send pings
                    envelope = await asyncio.wait_for(
                        queue.get(), timeout=PING_INTERVAL_SECONDS
                    )
                    yield {
                        "event": envelope["event"],
                        "data": json.dumps(envelope),
                    }
                except asyncio.TimeoutError:
                    # Send a keepalive ping so proxies/load balancers don't drop the connection
                    yield {"event": "ping", "data": json.dumps({"ping": True})}
        except asyncio.CancelledError:
            # Client disconnected — clean up subscription
            pass
        finally:
            await event_bus.unsubscribe(project_id, queue)

    return EventSourceResponse(event_generator())
