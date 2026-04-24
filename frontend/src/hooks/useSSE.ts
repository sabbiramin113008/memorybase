import { useEffect, useRef, useState } from "react"

export interface AgentDockEvent {
  event: string
  project_id: string
  data: Record<string, unknown>
  timestamp: string
}

interface UseSSEResult {
  lastEvent: AgentDockEvent | null
  connected: boolean
}

const MIN_RETRY_MS = 1_000
const MAX_RETRY_MS = 30_000

/**
 * Subscribe to the AgentDock SSE stream for a project.
 * Auto-reconnects with exponential backoff on disconnect.
 * Cleans up EventSource on component unmount.
 */
export function useSSE(projectId: string | null | undefined): UseSSEResult {
  const [lastEvent, setLastEvent] = useState<AgentDockEvent | null>(null)
  const [connected, setConnected] = useState(false)
  const retryMsRef = useRef(MIN_RETRY_MS)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!projectId) return

    let cancelled = false

    function connect() {
      if (cancelled) return

      const es = new EventSource(`/events/${projectId}`)
      esRef.current = es

      es.onopen = () => {
        if (cancelled) { es.close(); return }
        setConnected(true)
        retryMsRef.current = MIN_RETRY_MS
      }

      es.onmessage = (e) => {
        if (cancelled) return
        try {
          const parsed: AgentDockEvent = JSON.parse(e.data)
          setLastEvent(parsed)
        } catch {
          // malformed event — ignore
        }
      }

      // Named events (sse-starlette sends event: field)
      const eventTypes = [
        "task.created", "task.updated", "task.deleted",
        "vault.entry_added", "blueprint.updated",
        "project.created", "project.updated",
        "ping",
      ]
      for (const type of eventTypes) {
        es.addEventListener(type, (e: MessageEvent) => {
          if (cancelled) return
          if (type === "ping") return
          try {
            const parsed: AgentDockEvent = JSON.parse(e.data)
            setLastEvent(parsed)
          } catch {
            // ignore
          }
        })
      }

      es.onerror = () => {
        if (cancelled) return
        setConnected(false)
        es.close()
        esRef.current = null

        // Exponential backoff
        const delay = retryMsRef.current
        retryMsRef.current = Math.min(delay * 2, MAX_RETRY_MS)
        timeoutRef.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      cancelled = true
      setConnected(false)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [projectId])

  return { lastEvent, connected }
}
