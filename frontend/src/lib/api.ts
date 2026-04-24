// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "archived" | "paused"
export type SkillType = "backend" | "frontend" | "infra" | "testing"
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "tested"
export type VaultEntryType =
  | "decision"
  | "error_pattern"
  | "architectural_note"
  | "agent_observation"

export interface Project {
  id: string
  name: string
  description: string
  domain: string
  status: ProjectStatus
  created_at: string
  updated_at: string
}

export interface Blueprint {
  project_id: string
  overview: string
  tech_stack: Record<string, unknown>
  folder_structure: string
  external_integrations: Record<string, unknown>
  constraints: string
  api_specs: string
  updated_at: string
}

export interface Skill {
  id: string
  project_id: string
  skill_type: SkillType
  framework: string
  version: string
  libraries: unknown[]
  practices: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string
  phase: string
  milestone: string
  status: TaskStatus
  acceptance_criteria: string | null
  agent_notes: string | null
  blocked_reason: string | null
  created_at: string
  updated_at: string
}

export interface VaultEntry {
  id: string
  project_id: string
  entry_type: VaultEntryType
  summary: string
  detail: string
  tags: string[]
  created_at: string
}

// ─── Request bodies ────────────────────────────────────────────────────────────

export interface CreateProjectBody {
  name: string
  description?: string
  domain?: string
}

export interface UpdateProjectBody {
  name?: string
  description?: string
  domain?: string
  status?: ProjectStatus
}

export interface UpdateBlueprintBody {
  overview?: string
  tech_stack?: Record<string, unknown>
  folder_structure?: string
  external_integrations?: Record<string, unknown>
  constraints?: string
  api_specs?: string
}

export interface CreateTaskBody {
  title: string
  description?: string
  phase?: string
  milestone?: string
  status?: TaskStatus
  acceptance_criteria?: string
}

export interface UpdateTaskBody {
  title?: string
  description?: string
  phase?: string
  milestone?: string
  status?: TaskStatus
  acceptance_criteria?: string
  agent_notes?: string
  blocked_reason?: string
}

export interface UpdateTaskStatusBody {
  status: TaskStatus
  notes?: string
  blocked_reason?: string
}

export interface CreateVaultEntryBody {
  entry_type: VaultEntryType
  summary: string
  detail?: string
  tags?: string[]
}

export interface CreateSkillBody {
  skill_type: SkillType
  framework?: string
  version?: string
  libraries?: unknown[]
  practices?: string
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

// ─── Client ───────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""
const API_KEY = import.meta.env.VITE_API_KEY ?? "dev-key-change-in-production"

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-AgentDock-Key": API_KEY,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => ({ error: res.statusText }))

  if (!res.ok) {
    const msg =
      typeof data?.detail === "object"
        ? (data.detail?.error ?? JSON.stringify(data.detail))
        : (data?.detail ?? data?.error ?? res.statusText)
    throw new ApiError(res.status, String(msg))
  }

  return data as T
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = {
  list: () =>
    request<Project[]>("GET", "/api/projects"),

  create: (body: CreateProjectBody) =>
    request<Project>("POST", "/api/projects", body),

  get: (id: string) =>
    request<Project>("GET", `/api/projects/${id}`),

  update: (id: string, body: UpdateProjectBody) =>
    request<Project>("PATCH", `/api/projects/${id}`, body),

  delete: (id: string) =>
    request<void>("DELETE", `/api/projects/${id}`),

  getBlueprint: (id: string) =>
    request<Blueprint>("GET", `/api/projects/${id}/blueprint`),

  updateBlueprint: (id: string, body: UpdateBlueprintBody) =>
    request<Blueprint>("PATCH", `/api/projects/${id}/blueprint`, body),

  listSkills: (id: string) =>
    request<Skill[]>("GET", `/api/projects/${id}/skills`),

  createSkill: (id: string, body: CreateSkillBody) =>
    request<Skill>("POST", `/api/projects/${id}/skills`, body),

  updateSkill: (id: string, skillId: string, body: Partial<CreateSkillBody>) =>
    request<Skill>("PATCH", `/api/projects/${id}/skills/${skillId}`, body),
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasks = {
  list: (projectId: string, params?: { status?: TaskStatus; phase?: string }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set("status", params.status)
    if (params?.phase) qs.set("phase", params.phase)
    const query = qs.toString() ? `?${qs}` : ""
    return request<Task[]>("GET", `/api/projects/${projectId}/tasks${query}`)
  },

  create: (projectId: string, body: CreateTaskBody) =>
    request<Task>("POST", `/api/projects/${projectId}/tasks`, body),

  get: (projectId: string, taskId: string) =>
    request<Task>("GET", `/api/projects/${projectId}/tasks/${taskId}`),

  update: (projectId: string, taskId: string, body: UpdateTaskBody) =>
    request<Task>("PATCH", `/api/projects/${projectId}/tasks/${taskId}`, body),

  updateStatus: (projectId: string, taskId: string, body: UpdateTaskStatusBody) =>
    request<Task>("PATCH", `/api/projects/${projectId}/tasks/${taskId}/status`, body),

  delete: (projectId: string, taskId: string) =>
    request<void>("DELETE", `/api/projects/${projectId}/tasks/${taskId}`),
}

// ─── Vault ────────────────────────────────────────────────────────────────────

export const vault = {
  list: (projectId: string, params?: { type?: VaultEntryType; tags?: string }) => {
    const qs = new URLSearchParams()
    if (params?.type) qs.set("type", params.type)
    if (params?.tags) qs.set("tags", params.tags)
    const query = qs.toString() ? `?${qs}` : ""
    return request<VaultEntry[]>("GET", `/api/projects/${projectId}/vault${query}`)
  },

  create: (projectId: string, body: CreateVaultEntryBody) =>
    request<VaultEntry>("POST", `/api/projects/${projectId}/vault`, body),

  get: (projectId: string, entryId: string) =>
    request<VaultEntry>("GET", `/api/projects/${projectId}/vault/${entryId}`),

  search: (projectId: string, q: string) =>
    request<VaultEntry[]>("GET", `/api/projects/${projectId}/vault/search?q=${encodeURIComponent(q)}`),

  delete: (projectId: string, entryId: string) =>
    request<void>("DELETE", `/api/projects/${projectId}/vault/${entryId}`),
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettingsRead {
  llm_provider: string
  llm_model: string
  version: string
}

export interface AppSettingsPatch {
  llm_provider?: string
  llm_model?: string
  llm_api_key?: string
}

export const appSettings = {
  get: () => request<AppSettingsRead>("GET", "/api/settings"),
  patch: (body: AppSettingsPatch) => request<AppSettingsRead>("PATCH", "/api/settings", body),
}
