"""
Ralph V3 Context Hook
Injects relevant context at session start based on project history.

Triggered by: Claude Code UserPromptSubmit event
Purpose: Load previous session insights and inject into prompt
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime, timedelta

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from db import (
  get_session,
  get_insights,
  search_insights,
  get_timeline,
  init_database,
  DEFAULT_DB_PATH,
)

# Configuration
MAX_RECENT_INSIGHTS = 5
MAX_RECENT_OBSERVATIONS = 10
CONTEXT_LOOKBACK_DAYS = 7


def get_current_project_path() -> str:
  """Get current project path from environment or CWD."""
  # Claude Code sets CWD environment variable
  if "CWD" in os.environ:
    return os.environ["CWD"]

  # Fallback to current working directory
  return os.getcwd()


def format_context_injection(
  insights: list,
  observations: list,
  project_path: str,
) -> str:
  """Format collected context into prompt injection."""
  sections = []

  # Header
  sections.append(f"# 🧠 Ralph Context: {Path(project_path).name}")
  sections.append("")
  sections.append(f"Project: `{project_path}`")
  sections.append(f"Loaded: {datetime.now().isoformat()}")
  sections.append("")

  # Recent Insights
  if insights:
    sections.append("## 💡 Key Insights from Previous Sessions")
    sections.append("")

    for insight in insights[:MAX_RECENT_INSIGHTS]:
      sections.append(f"### {insight['title']}")
      sections.append(f"**Type:** {insight['type']} | **Confidence:** {insight.get('confidence', 'N/A')}")
      sections.append(insight['content'])
      sections.append("")

  # Recent Observations
  if observations:
    sections.append("## 📋 Recent Activity")
    sections.append("")

    for obs in observations[:MAX_RECENT_OBSERVATIONS]:
      emoji = {
        'decision': '💡',
        'action': '⚡',
        'error': '❌',
        'context': '📝',
        'progress': '🔄',
      }.get(obs['type'], '•')

      sections.append(
        f"{emoji} **{obs['type']}** [{obs.get('category', 'N/A')}] {obs.get('timestamp', '')}"
      )
      sections.append(f"   {obs['content']}")

      if obs.get('file_path'):
        sections.append(f"   📁 `{obs['file_path']}`")

      sections.append("")

  # Footer
  sections.append("---")
  sections.append("*This context was auto-loaded by Ralph V3*")

  return "\n".join(sections)


def load_context_for_project(project_path: str, db_path: Path = None) -> str:
  """
  Load relevant context for a project.

  Returns formatted markdown string for injection into prompt.
  """
  db_path = db_path or DEFAULT_DB_PATH

  # Initialize DB if needed
  if not db_path.exists():
    init_database(db_path)
    return ""

  # Get recent insights (last 7 days)
  since_date = (datetime.now() - timedelta(days=CONTEXT_LOOKBACK_DAYS)).isoformat()

  insights = []
  observations = []

  try:
    # Search for recent insights
    all_insights = search_insights(
      query=project_path,
      limit=50,
      db_path=db_path,
    )

    # Filter by date and project
    insights = [
      i for i in all_insights
      if i['project_path'] == project_path
      and i.get('timestamp', '') > since_date
    ][:MAX_RECENT_INSIGHTS]

    # Get recent observations timeline
    # We need a session ID for this, but we don't have one yet
    # Instead, search for recent observations
    from db import search_observations
    observations = search_observations(
      query=project_path,
      project_path=project_path,
      limit=MAX_RECENT_OBSERVATIONS,
      db_path=db_path,
    )

  except Exception as e:
    # Database might be empty or corrupted
    print(f"[Ralph Context Hook] Warning: {e}", file=sys.stderr)
    return ""

  # Format and return
  return format_context_injection(insights, observations, project_path)


def main():
  """
  Main entry point for the context hook.

  This hook is called by Claude Code before the user's prompt is processed.
  It should print context to stdout for injection into the prompt.
  """
  project_path = get_current_project_path()

  try:
    context = load_context_for_project(project_path)

    if context:
      print(context)
      sys.exit(0)
    else:
      # No context available
      sys.exit(0)

  except Exception as e:
    print(f"[Ralph Context Hook] Error: {e}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
  main()
