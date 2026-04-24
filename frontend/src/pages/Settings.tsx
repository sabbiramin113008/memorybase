import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <Button size="sm" variant="outline" onClick={copy} className="h-7 text-xs">
      {copied ? "✓ Copied" : "⎘ Copy"}
    </Button>
  )
}

// ─── Code block ───────────────────────────────────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative rounded-md border bg-muted">
      <div className="absolute right-2 top-2">
        <CopyButton text={code} />
      </div>
      <pre className="text-xs p-4 pr-20 overflow-x-auto whitespace-pre font-mono">{code}</pre>
    </div>
  )
}

// ─── MCP config snippets ──────────────────────────────────────────────────────

function MCPSection() {
  const baseUrl = `${window.location.protocol}//${window.location.hostname}:8120`
  const mcpUrl = `${baseUrl}/mcp/sse`

  const claudeConfig = JSON.stringify({
    mcpServers: {
      memorybase: {
        type: "sse",
        url: mcpUrl,
      },
    },
  }, null, 2)

  const cursorConfig = JSON.stringify({
    mcpServers: {
      memorybase: {
        url: mcpUrl,
      },
    },
  }, null, 2)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">MCP Connection</CardTitle>
        <CardDescription>
          Connect AI agents to MemoryBase via the Model Context Protocol.
          The SSE endpoint is <code className="text-xs bg-muted px-1 rounded">{mcpUrl}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium">Claude Code / Claude Desktop</p>
          <p className="text-xs text-muted-foreground">Add to your <code className="bg-muted px-1 rounded">claude_desktop_config.json</code></p>
          <CodeBlock code={claudeConfig} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Cursor IDE</p>
          <p className="text-xs text-muted-foreground">Add to your <code className="bg-muted px-1 rounded">.cursor/mcp.json</code></p>
          <CodeBlock code={cursorConfig} />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── API key section ──────────────────────────────────────────────────────────

function APIKeySection() {
  const [revealed, setRevealed] = useState(false)
  const apiKey = import.meta.env.VITE_API_KEY ?? "dev-key-change-in-production"
  const masked = apiKey.slice(0, 4) + "•".repeat(Math.max(0, apiKey.length - 4))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">API Key</CardTitle>
        <CardDescription>Used in the <code className="text-xs bg-muted px-1 rounded">X-MemoryBase-Key</code> header for all API calls.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <code className="text-sm bg-muted px-3 py-1.5 rounded flex-1 font-mono">
            {revealed ? apiKey : masked}
          </code>
          <Button size="sm" variant="outline" onClick={() => setRevealed((v) => !v)} className="h-8 text-xs">
            {revealed ? "Hide" : "Reveal"}
          </Button>
          <CopyButton text={apiKey} />
        </div>
        <p className="text-xs text-muted-foreground">
          To change the key, set <code className="bg-muted px-1 rounded">MEMORYBASE_API_KEY</code> in your environment and restart the backend.
        </p>
      </CardContent>
    </Card>
  )
}

// ─── About section ────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">About</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">MemoryBase</span>
          <Badge variant="secondary">v0.1.0</Badge>
        </div>
        <p className="text-muted-foreground text-xs max-w-md">
          The project operating system for AI agents. Manage blueprints, tasks, and decisions — all accessible via MCP tools from any AI coding assistant.
        </p>
        <div className="flex gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            ↗ GitHub
          </a>
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            ↗ Documentation
          </a>
        </div>
        <div className="pt-2 space-y-1 text-xs text-muted-foreground">
          <p>Backend: FastAPI · SQLModel · Python 3.11</p>
          <p>Frontend: React 18 · Vite · Tailwind CSS · shadcn/ui</p>
          <p>Protocol: MCP (Model Context Protocol) via SSE</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Settings page ────────────────────────────────────────────────────────────

export default function Settings() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">MCP configuration, API key, and project info.</p>
      </div>
      <MCPSection />
      <APIKeySection />
      <AboutSection />
    </div>
  )
}
