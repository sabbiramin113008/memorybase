import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { projects as projectsApi, type Blueprint, type Skill, type SkillType } from "@/lib/api"
import { useSSE } from "@/hooks/useSSE"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

// ─── Skill type colors ────────────────────────────────────────────────────────

const SKILL_COLORS: Record<SkillType, string> = {
  backend: "bg-blue-100 text-blue-700",
  frontend: "bg-purple-100 text-purple-700",
  infra: "bg-orange-100 text-orange-700",
  testing: "bg-green-100 text-green-700",
}

// ─── JSON key-value display ───────────────────────────────────────────────────

function JsonKV({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data)
  if (entries.length === 0) return <p className="text-muted-foreground text-sm italic">No entries.</p>
  return (
    <dl className="divide-y text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-3 py-1.5">
          <dt className="font-medium text-foreground w-36 shrink-0">{k}</dt>
          <dd className="text-muted-foreground break-all">{String(v)}</dd>
        </div>
      ))}
    </dl>
  )
}

// ─── Editable blueprint section ───────────────────────────────────────────────

interface BlueprintSectionProps {
  label: string
  value: string
  field: string
  projectId: string
  isJson?: boolean
  jsonData?: Record<string, unknown>
}

function BlueprintSection({ label, value, field, projectId, isJson, jsonData }: BlueprintSectionProps) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  const save = useMutation({
    mutationFn: (text: string) =>
      projectsApi.updateBlueprint(projectId, { [field]: isJson ? JSON.parse(text) : text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blueprint", projectId] })
      setEditing(false)
    },
  })

  return (
    <AccordionItem value={field}>
      <AccordionTrigger className="text-sm font-semibold">{label}</AccordionTrigger>
      <AccordionContent>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              autoFocus
            />
            {save.isError && (
              <p className="text-xs text-destructive">Save failed — check JSON syntax if applicable.</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => save.mutate(draft)} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "✓ Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setDraft(value) }}>
                ✕ Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 group">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setEditing(true)}
              >
                ✎ Edit
              </Button>
            </div>
            {isJson && jsonData
              ? <JsonKV data={jsonData} />
              : value
              ? <pre className="text-sm whitespace-pre-wrap font-sans text-foreground">{value}</pre>
              : <p className="text-sm text-muted-foreground italic">No content yet. Click Edit to add.</p>
            }
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

// ─── Skills panel ─────────────────────────────────────────────────────────────

function SkillsPanel({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No skills defined yet.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {skills.map((skill) => (
        <Card key={skill.id} className="text-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-base">📦</span>
              <CardTitle className="text-sm">{skill.framework || skill.skill_type}</CardTitle>
              <Badge className={cn("ml-auto text-xs", SKILL_COLORS[skill.skill_type])}>
                {skill.skill_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1.5">
            {skill.version && (
              <p className="text-xs text-muted-foreground">Version: {skill.version}</p>
            )}
            {Array.isArray(skill.libraries) && skill.libraries.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {skill.libraries.map((lib, i) => {
                  const label = typeof lib === "string" ? lib : typeof lib === "object" && lib !== null ? ((lib as Record<string, unknown>).name as string) ?? JSON.stringify(lib) : String(lib)
                  return (
                    <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">{label}</Badge>
                  )
                })}
              </div>
            )}
            {skill.practices && (
              <p className="text-xs text-muted-foreground line-clamp-3">{skill.practices}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Project Home ─────────────────────────────────────────────────────────────

export default function ProjectHome() {
  const { id: projectId } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { lastEvent } = useSSE(projectId)

  const { data: blueprint, isLoading: bpLoading } = useQuery({
    queryKey: ["blueprint", projectId],
    queryFn: () => projectsApi.getBlueprint(projectId!),
    enabled: !!projectId,
  })

  const { data: skills = [] } = useQuery({
    queryKey: ["skills", projectId],
    queryFn: () => projectsApi.listSkills(projectId!),
    enabled: !!projectId,
  })

  // Refresh blueprint on SSE event
  useEffect(() => {
    if (lastEvent?.event === "blueprint.updated") {
      qc.invalidateQueries({ queryKey: ["blueprint", projectId] })
    }
  }, [lastEvent, projectId, qc])

  if (!projectId) return null

  const bp: Blueprint = blueprint ?? {
    project_id: projectId,
    overview: "",
    tech_stack: {},
    folder_structure: "",
    external_integrations: {},
    constraints: "",
    api_specs: "",
    updated_at: "",
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Blueprint */}
      <section>
        <h2 className="text-xl font-bold mb-4">Blueprint</h2>
        {bpLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={["overview"]} className="border rounded-lg px-4">
            <BlueprintSection label="Overview" value={bp.overview} field="overview" projectId={projectId} />
            <BlueprintSection
              label="Tech Stack"
              value={JSON.stringify(bp.tech_stack, null, 2)}
              field="tech_stack"
              projectId={projectId}
              isJson
              jsonData={bp.tech_stack as Record<string, unknown>}
            />
            <BlueprintSection label="Folder Structure" value={bp.folder_structure} field="folder_structure" projectId={projectId} />
            <BlueprintSection
              label="External Integrations"
              value={JSON.stringify(bp.external_integrations, null, 2)}
              field="external_integrations"
              projectId={projectId}
              isJson
              jsonData={bp.external_integrations as Record<string, unknown>}
            />
            <BlueprintSection label="Constraints" value={bp.constraints} field="constraints" projectId={projectId} />
            <BlueprintSection label="API Specs" value={bp.api_specs} field="api_specs" projectId={projectId} />
          </Accordion>
        )}
      </section>

      {/* Skills */}
      <section>
        <h2 className="text-xl font-bold mb-4">Skills</h2>
        <SkillsPanel skills={skills} />
      </section>
    </div>
  )
}
