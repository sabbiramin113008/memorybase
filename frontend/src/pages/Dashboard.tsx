import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { projects as projectsApi, type Project, type ProjectStatus } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<ProjectStatus, "success" | "warning" | "secondary"> = {
  active: "success",
  paused: "warning",
  archived: "secondary",
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Create project modal ─────────────────────────────────────────────────────

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
}

function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [domain, setDomain] = useState("")
  const [error, setError] = useState("")

  const mutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      onClose()
      setName(""); setDescription(""); setDomain(""); setError("")
      navigate(`/projects/${project.id}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    if (!name.trim()) { setError("Project name is required."); return }
    setError("")
    mutation.mutate({ name: name.trim(), description: description.trim(), domain: domain.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>Create a new MemoryBase project to track blueprints and tasks.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="proj-name"
              placeholder="My awesome project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-domain">Domain</Label>
            <Input
              id="proj-domain"
              placeholder="e.g. e-commerce, developer-tools"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              placeholder="What does this project do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-1">
            {project.name}
          </CardTitle>
          <StatusBadge status={project.status} />
        </div>
        {project.domain && (
          <CardDescription className="text-xs">{project.domain}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Updated {relativeTime(project.updated_at)}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="rounded-full bg-muted p-6 mb-4 text-4xl">📁</div>
      <h2 className="text-xl font-semibold mb-1">No projects yet</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs">
        Create your first project and let AI agents track blueprints, tasks, and decisions.
      </p>
      <Button onClick={onNew}>+ New Project</Button>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false)

  const { data: projectList, isLoading, isError } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {projectList ? `${projectList.length} project${projectList.length !== 1 ? "s" : ""}` : "Loading…"}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ New Project</Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load projects. Make sure the backend is running.
        </div>
      )}

      {!isLoading && !isError && projectList && (
        projectList.length === 0
          ? <EmptyState onNew={() => setShowModal(true)} />
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectList.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
          )
      )}

      <CreateProjectModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
