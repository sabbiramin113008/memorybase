"""MCP server definition for MemoryBase.

This module creates the FastMCP instance and is the single place where the
MCP server name / version is declared. All tool registrations happen in
tools.py, which imports and decorates this instance.
"""

from mcp.server.fastmcp import FastMCP

mcp = FastMCP(
    name="memorybase",
    instructions=(
        "MemoryBase is the project operating system for AI agents. "
        "Use these tools to read and write project blueprints, manage tasks, "
        "and record decisions in the context vault. "
        "Always call list_projects() first to discover available projects."
    ),
)
