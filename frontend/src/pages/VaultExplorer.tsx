import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { vault as vaultApi, type VaultEntry, type VaultEntryType, type CreateVaultEntryBody } from "@/lib/api"
import { useSSE } from "@/hooks/useSSE"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ─── Config ───────────────────────────────────────────────────────────────────

const ENTRY_TYPES: { value: VaultEntryType | "all"; label: string }[] = [
  { value: "all",                  label: "All" },
  { value: "decision",             label: "Decisions" },
  { value: "error_pattern",        label: "Error Patterns" },
  { value: "architectural_note",   label: "Architectural Notes" },
  { value: "agent_observation",    label: "Agent Observations" },
]

const TYPE_COLORS: Record<VaultEntryType, string> = {
  decision:           "bg-blue-100 text-blue-700",
  error_pattern:      "bg-red-100 text-red-700",
  architectural_note: "bg-purple-100 text-purple-700",
  agent_observation:  "bg-amber-100 text-amber-700",
}

const TYPE_LABELS: Record<VaultEntryType, string> = {
  decision:           "Decision",
  error_pattern:      "Error Pattern",
  architectural_note: "Arch Note",
  agent_observation:  "Observation",
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry, onTagClick, onDelete,
}: {
  entry: VaultEntry
  onTagClick: (tag: string) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border rounded-lg p-4 bg-card space-y-2">
      <div className="flex items-start gap-2">
        <Badge className={cn("text-xs shrink-0 mt-0.5", TYPE_COLORS[entry.entry_type])}>
          {TYPE_LABELS[entry.entry_type]}
        </Badge>
        <p className="text-sm font-semibold leading-snug flex-1">{entry.summary}</p>
        <span className="text-xs text-muted-foreground shrink-0">{relativeTime(entry.created_at)}</span>
      </div>

      {entry.detail && (
        <div>
          <p className={cn("text-sm text-muted-foreground", !expanded && "line-clamp-2")}>
            {entry.detail}
          </p>
          {entry.detail.length > 120 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-primary hover:underline mt-0.5 flex items-center gap-0.5"
            >
              {expanded ? "▲ Show less" : "▼ Show more"}
            </button>
          )}
        </div>
      )}

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs px-1.5 py-0 cursor-pointer hover:bg-accent"
              onClick={() => onTagClick(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(entry.id)}
        >
          🗑
        </Button>
      </div>
    </div>
  )
}

// ─── Add entry modal ──────────────────────────────────────────────────────────

function AddEntryModal({
  projectId, open, onClose,
}: { projectId: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [entryType, setEntryType] = useState<VaultEntryType>("decision")
  const [summary, setSummary] = useState("")
  const [detail, setDetail] = useState("")
  const [tagsRaw, setTagsRaw] = useState("")
  const [error, setError] = useState("")

  const mutation = useMutation({
    mutationFn: (body: CreateVaultEntryBody) => vaultApi.create(projectId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vault", projectId] })
      onClose()
      setSummary(""); setDetail(""); setTagsRaw(""); setError("")
    },
    onError: (e: Error) => setError(e.message),
  })

  function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    if (!summary.trim()) { setError("Summary is required."); return }
    setError("")
    mutation.mutate({
      entry_type: entryType,
      summary: summary.trim(),
      detail: detail.trim() || undefined,
      tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vault Entry</DialogTitle>
          <DialogDescription>Record a decision, error pattern, or architectural note.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={entryType} onValueChange={(v) => setEntryType(v as VaultEntryType)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_TYPES.filter((t) => t.value !== "all").map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vault-summary">Summary <span className="text-destructive">*</span></Label>
            <Input id="vault-summary" placeholder="One-line summary" value={summary} onChange={(e) => setSummary(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vault-detail">Detail</Label>
            <Textarea id="vault-detail" placeholder="Detailed explanation…" value={detail} onChange={(e) => setDetail(e.target.value)} rows={4} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vault-tags">Tags</Label>
            <Input id="vault-tags" placeholder="auth, database, performance (comma-separated)" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Adding…" : "Add Entry"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Vault Explorer ───────────────────────────────────────────────────────────

export default function VaultExplorer() {
  const { id: projectId } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { lastEvent } = useSSE(projectId)

  const [activeType, setActiveType] = useState<VaultEntryType | "all">("all")
  const [searchQ, setSearchQ] = useState("")
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedQ, setDebouncedQ] = useState("")

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQ(searchQ), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQ])

  // Refetch on SSE vault event
  useEffect(() => {
    if (lastEvent?.event === "vault.entry_added") {
      qc.invalidateQueries({ queryKey: ["vault", projectId] })
    }
  }, [lastEvent, projectId, qc])

  const isSearching = debouncedQ.trim().length > 0

  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ["vault", projectId, activeType],
    queryFn: () => vaultApi.list(projectId!, {
      type: activeType === "all" ? undefined : activeType,
    }),
    enabled: !!projectId && !isSearching,
  })

  const { data: searchResults = [] } = useQuery({
    queryKey: ["vault-search", projectId, debouncedQ],
    queryFn: () => vaultApi.search(projectId!, debouncedQ),
    enabled: !!projectId && isSearching,
  })

  const deleteEntry = useMutation({
    mutationFn: (entryId: string) => vaultApi.delete(projectId!, entryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vault", projectId] }),
  })

  const entries = isSearching ? searchResults : allEntries
  const filtered = tagFilter ? entries.filter((e) => e.tags.includes(tagFilter)) : entries

  if (!projectId) return null

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Vault</h1>
        <Button size="sm" onClick={() => setShowModal(true)}>
          + Add Entry
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
        <Input
          className="pl-9"
          placeholder="Search vault…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
      </div>

      {/* Filter tabs */}
      {!isSearching && (
        <div className="flex flex-wrap gap-1.5">
          {ENTRY_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => { setActiveType(t.value as VaultEntryType | "all"); setTagFilter(null) }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                activeType === t.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background hover:bg-accent",
              )}
            >
              {t.label}
            </button>
          ))}
          {tagFilter && (
            <button
              onClick={() => setTagFilter(null)}
              className="px-3 py-1 rounded-full text-xs font-medium border border-dashed border-primary text-primary flex items-center gap-1"
            >
              #{tagFilter} ×
            </button>
          )}
        </div>
      )}

      {/* Entries */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg border bg-muted animate-pulse" />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">{isSearching ? `No results for "${debouncedQ}"` : "No entries yet."}</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onTagClick={(tag) => setTagFilter(tag === tagFilter ? null : tag)}
            onDelete={(id) => deleteEntry.mutate(id)}
          />
        ))}
      </div>

      <AddEntryModal projectId={projectId} open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
