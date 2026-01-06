"""
Ralph V3 MCP Server
Minimal MCP server with progressive disclosure for context management.

Tools:
1. search_index - Fast FTS5 search, returns IDs only (~50 tokens)
2. get_timeline - Get context around observations (~150 tokens)
3. get_full - Get full observation details (~500 tokens)
4. ralph_recall - Smart context retrieval (combines all 3)

Architecture:
- Single-process MCP (no separate worker)
- Embedded SQLite (no HTTP)
- Progressive disclosure (x10 token efficiency)
"""

import asyncio
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

# MCP SDK
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp.types import (
  Resource,
  Tool,
  TextContent,
  ImageContent,
  EmbeddedResource,
)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from db import (
  init_database,
  search_observations,
  get_observation,
  get_timeline,
  get_session,
  get_insights,
  search_insights,
  DEFAULT_DB_PATH,
)

# Server instance
server = Server("ralph-v3")

# Configuration
DB_PATH = DEFAULT_DB_PATH


# ============================================================================
# MCP TOOLS
# ============================================================================

@server.list_tools()
async def handle_list_tools() -> list[Tool]:
  """List available MCP tools."""
  return [
    Tool(
      name="search_index",
      description="FAST search - Returns observation IDs only (~50 tokens). Use this FIRST to find relevant observations.",
      inputSchema={
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query (FTS5 full-text search)"
          },
          "project_path": {
            "type": "string",
            "description": "Optional: Filter by project path"
          },
          "limit": {
            "type": "integer",
            "description": "Max results (default: 20)",
            "default": 20
          }
        },
        "required": ["query"]
      }
    ),
    Tool(
      name="get_timeline",
      description="Get timeline context around observations (~150 tokens per observation). Use after search_index to get context.",
      inputSchema={
        "type": "object",
        "properties": {
          "session_id": {
            "type": "string",
            "description": "Session ID"
          },
          "limit": {
            "type": "integer",
            "description": "Max observations (default: 50)",
            "default": 50
          }
        },
        "required": ["session_id"]
      }
    ),
    Tool(
      name="get_full",
      description="Get full observation details including code snippets (~500 tokens per observation). Use sparingly for specific observations.",
      inputSchema={
        "type": "object",
        "properties": {
          "observation_id": {
            "type": "integer",
            "description": "Observation ID"
          }
        },
        "required": ["observation_id"]
      }
    ),
    Tool(
      name="ralph_recall",
      description="SMART context retrieval - Combines search + insights + timeline. Use this for most queries (~100-300 tokens).",
      inputSchema={
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Natural language query"
          },
          "project_path": {
            "type": "string",
            "description": "Optional: Filter by project path"
          },
          "include_insights": {
            "type": "boolean",
            "description": "Include compressed insights (default: true)",
            "default": True
          },
          "max_results": {
            "type": "integer",
            "description": "Max results per category (default: 5)",
            "default": 5
          }
        },
        "required": ["query"]
      }
    ),
  ]


@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[TextContent | ImageContent | EmbeddedResource]:
  """Handle tool calls."""

  # Initialize DB if needed
  if not DB_PATH.exists():
    init_database(DB_PATH)

  if name == "search_index":
    # Layer 1: Fast search, returns IDs only
    query = arguments["query"]
    project_path = arguments.get("project_path")
    limit = arguments.get("limit", 20)

    results = search_observations(
      query=query,
      project_path=project_path,
      limit=limit,
      db_path=DB_PATH,
    )

    # Return only IDs (minimal tokens)
    output = {
      "count": len(results),
      "observation_ids": [r["id"] for r in results],
      "note": "Use get_timeline or get_full to retrieve details"
    }

    return [TextContent(
      type="text",
      text=json.dumps(output, indent=2)
    )]

  elif name == "get_timeline":
    # Layer 2: Get timeline with context
    session_id = arguments["session_id"]
    limit = arguments.get("limit", 50)

    observations = get_timeline(
      session_id=session_id,
      limit=limit,
      db_path=DB_PATH,
    )

    # Format as timeline
    timeline = []
    for obs in observations:
      timeline.append({
        "id": obs["id"],
        "timestamp": obs["timestamp"],
        "type": obs["type"],
        "category": obs.get("category"),
        "content": obs["content"],
        "file_path": obs.get("file_path"),
      })

    return [TextContent(
      type="text",
      text=json.dumps(timeline, indent=2)
    )]

  elif name == "get_full":
    # Layer 3: Get full details
    obs_id = arguments["observation_id"]

    observation = get_observation(
      obs_id=obs_id,
      db_path=DB_PATH,
    )

    if not observation:
      return [TextContent(
        type="text",
        text=json.dumps({"error": f"Observation {obs_id} not found"})
      )]

    # Return full details including code snippet
    output = {
      "id": observation["id"],
      "session_id": observation["session_id"],
      "project_path": observation["project_path"],
      "timestamp": observation["timestamp"],
      "type": observation["type"],
      "category": observation.get("category"),
      "priority": observation.get("priority"),
      "content": observation["content"],
      "file_path": observation.get("file_path"),
      "function_name": observation.get("function_name"),
      "code_snippet": observation.get("code_snippet"),
      "parent_id": observation.get("parent_id"),
      "related_ids": observation.get("related_ids"),
    }

    return [TextContent(
      type="text",
      text=json.dumps(output, indent=2)
    )]

  elif name == "ralph_recall":
    # Smart recall: combines search + insights + timeline
    query = arguments["query"]
    project_path = arguments.get("project_path")
    include_insights = arguments.get("include_insights", True)
    max_results = arguments.get("max_results", 5)

    results = {
      "query": query,
      "timestamp": datetime.now().isoformat(),
      "observations": [],
      "insights": [],
    }

    # Search observations
    obs_results = search_observations(
      query=query,
      project_path=project_path,
      limit=max_results,
      db_path=DB_PATH,
    )

    for obs in obs_results[:max_results]:
      results["observations"].append({
        "id": obs["id"],
        "timestamp": obs["timestamp"],
        "type": obs["type"],
        "category": obs.get("category"),
        "content": obs["content"],
        "file_path": obs.get("file_path"),
        "note": "Use get_full for complete details"
      })

    # Search insights if requested
    if include_insights:
      insight_results = search_insights(
        query=query,
        project_path=project_path,
        limit=max_results,
        db_path=DB_PATH,
      )

      for insight in insight_results[:max_results]:
        results["insights"].append({
          "id": insight["id"],
          "timestamp": insight["timestamp"],
          "type": insight["type"],
          "title": insight["title"],
          "content": insight["content"],
        })

    return [TextContent(
      type="text",
      text=json.dumps(results, indent=2)
    )]

  else:
    return [TextContent(
      type="text",
      text=json.dumps({"error": f"Unknown tool: {name}"})
    )]


# ============================================================================
# MCP RESOURCES (Optional)
# ============================================================================

@server.list_resources()
async def handle_list_resources() -> list[Resource]:
  """List available resources."""
  return [
    Resource(
      uri="ralph://status",
      name="Ralph Status",
      description="Current Ralph system status",
      mimeType="application/json"
    ),
  ]


@server.read_resource()
async def handle_read_resource(uri: str) -> str:
  """Read a resource."""
  if uri == "ralph://status":
    # Get status
    status = {
      "version": "3.0",
      "db_path": str(DB_PATH),
      "db_exists": DB_PATH.exists(),
      "timestamp": datetime.now().isoformat(),
    }

    if DB_PATH.exists():
      # Get session count
      try:
        from db import get_connection
        with get_connection(DB_PATH) as conn:
          sessions = conn.execute("SELECT COUNT(*) as count FROM sessions").fetchone()
          observations = conn.execute("SELECT COUNT(*) as count FROM observations").fetchone()
          insights = conn.execute("SELECT COUNT(*) as count FROM compressed_insights").fetchone()

          status["sessions"] = sessions["count"]
          status["observations"] = observations["count"]
          status["insights"] = insights["count"]
      except Exception as e:
        status["error"] = str(e)

    return json.dumps(status, indent=2)

  else:
    return json.dumps({"error": f"Unknown resource: {uri}"})


# ============================================================================
# MAIN
# ============================================================================

async def main():
  """Main entry point."""
  # Initialize DB
  if not DB_PATH.exists():
    init_database(DB_PATH)

  # Run server
  async with stdio_server() as (read_stream, write_stream):
    await server.run(
      read_stream,
      write_stream,
      InitializationOptions(
        server_name="ralph-v3",
        server_version="3.0.0",
        capabilities=server.get_capabilities(
          notification_options=NotificationOptions(),
          experimental_capabilities={},
        )
      )
    )


def entry_point():
  """Synchronous entry point for console scripts."""
  asyncio.run(main())


if __name__ == "__main__":
  entry_point()
