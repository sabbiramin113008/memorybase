import React, { Suspense, lazy } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  BrowserRouter,
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useParams,
} from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { projects as projectsApi } from "@/lib/api"
import { useSSE } from "@/hooks/useSSE"
import { cn } from "@/lib/utils"

// ─── Lazy-load pages so icon imports don't run until navigation ───────────────

const Dashboard    = lazy(() => import("@/pages/Dashboard"))
const ProjectHome  = lazy(() => import("@/pages/ProjectHome"))
const KanbanBoard  = lazy(() => import("@/pages/KanbanBoard"))
const VaultExplorer = lazy(() => import("@/pages/VaultExplorer"))
const Settings     = lazy(() => import("@/pages/Settings"))

// ─── React Query client ───────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
})

// ─── Error boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("=== MEMORYBASE RENDER ERROR ===")
    console.error("Message:", error.message)
    console.error("Component stack:", info.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8 text-sm text-red-600 font-mono whitespace-pre-wrap">
          <strong>Render Error:</strong>{"\n"}{this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ projectId }: { projectId?: string }) {
  const { data: projectList = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
    retry: false,
  })

  const navItem = (to: string, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )
      }
    >
      {label}
    </NavLink>
  )

  return (
    <aside className="w-56 shrink-0 border-r bg-card flex flex-col h-screen sticky top-0">
      <div className="px-4 py-4 border-b">
        <Link to="/" className="font-bold text-lg tracking-tight">
          MemoryBase
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">Project OS for AI agents</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItem("/", "Dashboard")}

        {projectList.length > 0 && (
          <div className="pt-3">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Projects
            </p>
            {projectList.map((p) => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}`}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors truncate",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )
                }
              >
                <span className="truncate">{p.name}</span>
              </NavLink>
            ))}
          </div>
        )}

        {projectId && (
          <div className="pt-3 space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Current Project
            </p>
            {navItem(`/projects/${projectId}/kanban`, "Kanban Board")}
            {navItem(`/projects/${projectId}`, "Blueprint")}
            {navItem(`/projects/${projectId}/vault`, "Vault")}
          </div>
        )}
      </nav>

      <div className="p-3 border-t">
        {navItem("/settings", "Settings")}
      </div>
    </aside>
  )
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({ projectId }: { projectId?: string }) {
  const { connected } = useSSE(projectId)

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  })

  return (
    <header className="h-12 border-b bg-card flex items-center px-4 gap-3 shrink-0">
      {project && (
        <span className="text-sm font-medium text-foreground">{project.name}</span>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            connected ? "bg-green-500" : "bg-gray-300",
          )}
        />
        {connected ? "Live" : "Offline"}
      </div>
    </header>
  )
}

// ─── Page loading fallback ────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function Layout() {
  const { id } = useParams<{ id?: string }>()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar projectId={id} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar projectId={id} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="projects/:id" element={<ProjectHome />} />
                <Route path="projects/:id/kanban" element={<KanbanBoard />} />
                <Route path="projects/:id/vault" element={<VaultExplorer />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
