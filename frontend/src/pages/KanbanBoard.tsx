import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { useDroppable, useDraggable } from "@dnd-kit/core"
import { tasks as tasksApi, type Task, type TaskStatus, type CreateTaskBody } from "@/lib/api"
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

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo",        label: "Todo",        color: "bg-slate-100 text-slate-700" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { id: "blocked",     label: "Blocked",     color: "bg-red-100 text-red-700" },
  { id: "done",        label: "Done",        color: "bg-green-100 text-green-700" },
  { id: "tested",      label: "Tested",      color: "bg-purple-100 text-purple-700" },
]

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({ task, isDragging = false }: { task: Task; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-md border bg-card p-3 shadow-sm cursor-grab select-none space-y-1.5",
        task.status === "blocked" && "border-l-4 border-l-red-500",
        isDragging && "opacity-40",
      )}
    >
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      <div className="flex flex-wrap gap-1">
        {task.phase && (
          <Badge variant="outline" className="text-xs px-1.5 py-0">{task.phase}</Badge>
        )}
        {task.milestone && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">{task.milestone}</Badge>
        )}
      </div>
      {task.status === "blocked" && task.blocked_reason && (
        <p className="text-xs text-red-600 flex items-start gap-1">
          <span className="shrink-0">⚠</span>
          {task.blocked_reason}
        </p>
      )}
      {task.agent_notes && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.agent_notes}</p>
      )}
    </div>
  )
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status, label, colorClass, tasks, onAddTask,
}: {
  status: TaskStatus
  label: string
  colorClass: string
  tasks: Task[]
  onAddTask: (status: TaskStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col min-w-[220px] w-full">
      {/* Column header */}
      <div className={cn("rounded-t-md px-3 py-2 flex items-center justify-between", colorClass)}>
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-xs font-medium opacity-70">{tasks.length}</span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-b-md border border-t-0 p-2 space-y-2 min-h-[120px] transition-colors",
          isOver ? "bg-accent/60" : "bg-muted/30",
        )}
      >
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-4">Drop tasks here</p>
        )}
        {tasks.map((t) => <TaskCard key={t.id} task={t} />)}

        <button
          onClick={() => onAddTask(status)}
          className="w-full flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded px-2 py-1.5 transition-colors"
        >
          + Add task
        </button>
      </div>
    </div>
  )
}

// ─── Add task modal ───────────────────────────────────────────────────────────

interface AddTaskModalProps {
  projectId: string
  defaultStatus: TaskStatus
  open: boolean
  onClose: () => void
}

function AddTaskModal({ projectId, defaultStatus, open, onClose }: AddTaskModalProps) {
  const qc = useQueryClient()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [phase, setPhase] = useState("")
  const [milestone, setMilestone] = useState("")
  const [error, setError] = useState("")

  const mutation = useMutation({
    mutationFn: (body: CreateTaskBody) => tasksApi.create(projectId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] })
      onClose()
      setTitle(""); setDescription(""); setPhase(""); setMilestone(""); setError("")
    },
    onError: (e: Error) => setError(e.message),
  })

  function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    if (!title.trim()) { setError("Title is required."); return }
    setError("")
    mutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      phase: phase.trim() || undefined,
      milestone: milestone.trim() || undefined,
      status: defaultStatus,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>Add a task in the <strong>{defaultStatus.replace("_", " ")}</strong> column.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title <span className="text-destructive">*</span></Label>
            <Input id="task-title" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-phase">Phase</Label>
              <Input id="task-phase" placeholder="e.g. Phase 1" value={phase} onChange={(e) => setPhase(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-milestone">Milestone</Label>
              <Input id="task-milestone" placeholder="e.g. MVP" value={milestone} onChange={(e) => setMilestone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea id="task-desc" placeholder="Optional details…" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Adding…" : "Add Task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────

export default function KanbanBoard() {
  const { id: projectId } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { lastEvent } = useSSE(projectId)

  const [phaseFilter, setPhaseFilter] = useState("all")
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [addModal, setAddModal] = useState<{ open: boolean; status: TaskStatus }>({
    open: false, status: "todo",
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data: taskList = [] } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => tasksApi.list(projectId!),
    enabled: !!projectId,
  })

  // Refresh on SSE task events
  useEffect(() => {
    if (!lastEvent) return
    if (["task.created", "task.updated", "task.deleted"].includes(lastEvent.event)) {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] })
    }
  }, [lastEvent, projectId, qc])

  const updateStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      tasksApi.updateStatus(projectId!, taskId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  })

  // Unique phases for filter — exclude null/undefined/empty values
  const phases = [
    "all",
    ...Array.from(new Set(taskList.map((t) => t.phase).filter((p): p is string => !!p))),
  ]

  const filtered = phaseFilter === "all" ? taskList : taskList.filter((t) => t.phase === phaseFilter)

  const tasksByStatus = (status: TaskStatus) => filtered.filter((t) => t.status === status)

  function onDragStart(e: DragStartEvent) {
    const task = taskList.find((t) => t.id === e.active.id)
    setActiveTask(task ?? null)
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = e
    if (!over) return
    const newStatus = over.id as TaskStatus
    const task = taskList.find((t) => t.id === active.id)
    if (!task || task.status === newStatus) return
    updateStatus.mutate({ taskId: task.id, status: newStatus })
  }

  if (!projectId) return null

  return (
    <div className="p-6 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Kanban Board</h1>
        <div className="flex items-center gap-2">
          {/* Phase filter */}
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="All phases" />
            </SelectTrigger>
            <SelectContent>
              {phases.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {p === "all" ? "All phases" : p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setAddModal({ open: true, status: "todo" })}>
            + Add Task
          </Button>
        </div>
      </div>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1 items-start">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex-1 min-w-[200px]">
              <KanbanColumn
                status={col.id}
                label={col.label}
                colorClass={col.color}
                tasks={tasksByStatus(col.id)}
                onAddTask={(s) => setAddModal({ open: true, status: s })}
              />
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rounded-md border bg-card p-3 shadow-lg opacity-95 rotate-2 w-52">
              <p className="text-sm font-medium">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <AddTaskModal
        projectId={projectId}
        defaultStatus={addModal.status}
        open={addModal.open}
        onClose={() => setAddModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
