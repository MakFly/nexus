"""
Ralph V3 Capture Hook
Analyzes tool usage and captures observations.

Triggered by: Claude Code PostToolUse event
Purpose: Analyze tools (Read, Write, Bash, Edit) and create observations
"""

import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from db import (
  add_observation,
  create_session,
  update_session_tokens,
  init_database,
  DEFAULT_DB_PATH,
)

# Configuration
# File patterns for different categories
CATEGORY_PATTERNS = {
  'backend': [
    r'\.(ts|js|py|php|go|rs|java)$',
    r'(controller|model|service|repository|handler)\.',
  ],
  'testing': [
    r'\.(test|spec)\.(ts|js|py)$',
    r'test_.*\.py$',
    r'/tests?/',
    r'/__tests__/',
  ],
  'docs': [
    r'\.(md|txt|rst|adoc)$',
    r'/docs?/',
    r'readme',
  ],
  'auth': [
    r'auth',
    r'login',
    r'jwt',
    r'session',
    r'passport',
  ],
  'config': [
    r'\.(json|yaml|yml|toml|ini|env|config)$',
    r'/config/',
  ],
}

# Action patterns for observation types
ACTION_PATTERNS = {
  'decision': [
    r'created|added|implemented',
    r'decided|chose|selected',
  ],
  'action': [
    r'modified|updated|changed',
    r'deleted|removed',
    r'refactored|renamed',
    r'moved|migrated',
  ],
  'error': [
    r'error|exception|failed',
    r'bug|fix|issue',
  ],
}


def get_current_project_path() -> str:
  """Get current project path from environment or CWD."""
  if "CWD" in os.environ:
    return os.environ["CWD"]
  return os.getcwd()


def get_session_id() -> str:
  """
  Get or create session ID.

  In a real implementation, this would come from Claude Code's session API.
  For now, generate based on project path and date.
  """
  project_path = get_current_project_path()
  today = datetime.now().strftime("%Y-%m-%d")
  return f"{Path(project_path.name)}-{today}"


def categorize_file(file_path: str) -> str:
  """Categorize a file path based on patterns."""
  file_lower = file_path.lower()

  for category, patterns in CATEGORY_PATTERNS.items():
    for pattern in patterns:
      if re.search(pattern, file_lower):
        return category

  return 'other'


def classify_tool_use(tool_name: str, tool_input: dict) -> dict:
  """
  Classify a tool use into an observation.

  Returns: {
    type: str,
    category: str,
    priority: str,
    content: str,
    file_path: str | None,
    function_name: str | None,
    code_snippet: str | None,
  }
  """
  result = {
    'type': 'action',
    'category': 'other',
    'priority': 'normal',
    'content': '',
    'file_path': None,
    'function_name': None,
    'code_snippet': None,
  }

  # Extract file path from tool input
  file_path = tool_input.get('file_path', '')
  if not file_path:
    file_path = tool_input.get('path', '')

  if file_path:
    result['file_path'] = file_path
    result['category'] = categorize_file(file_path)

  # Classify based on tool name
  if tool_name == 'Write':
    result['type'] = 'decision'
    result['content'] = f"Created {Path(file_path).name if file_path else 'file'}"
    result['priority'] = 'normal'

  elif tool_name == 'Edit':
    result['type'] = 'action'
    old_text = tool_input.get('old_string', '')
    new_text = tool_input.get('new_string', '')

    # Detect if this is a fix
    if any(word in old_text.lower() for word in ['error', 'bug', 'fix']):
      result['type'] = 'error'
      result['content'] = f"Fixed issue in {Path(file_path).name if file_path else 'file'}"
    else:
      result['content'] = f"Modified {Path(file_path).name if file_path else 'file'}"

    # Extract function name if present
    if 'def ' in old_text or 'function ' in old_text:
      match = re.search(r'(?:def|function)\s+(\w+)', old_text)
      if match:
        result['function_name'] = match.group(1)

  elif tool_name == 'Read':
    result['type'] = 'context'
    result['content'] = f"Read {Path(file_path).name if file_path else 'file'}"
    result['priority'] = 'low'

  elif tool_name == 'Bash':
    command = tool_input.get('command', '')

    # Classify command type
    if any(word in command for word in ['git commit', 'git add']):
      result['type'] = 'action'
      result['content'] = f"Git: {command[:50]}..."
    elif any(word in command for word in ['test', 'pytest', 'vitest', 'jest']):
      result['category'] = 'testing'
      result['content'] = f"Ran tests: {command[:50]}..."
    elif any(word in command for word in ['build', 'compile', 'bun run build']):
      result['type'] = 'action'
      result['content'] = f"Build: {command[:50]}..."
    else:
      result['content'] = f"Command: {command[:50]}..."

  elif tool_name == 'Task':
    result['type'] = 'action'
    agent = tool_input.get('subagent_type', 'unknown')
    result['content'] = f"Launched {agent} agent"
    result['priority'] = 'high'

  return result


def capture_tool_use(tool_name: str, tool_input: dict, db_path: Path = None) -> int:
  """
  Capture a tool use as an observation.

  Returns the observation ID.
  """
  db_path = db_path or DEFAULT_DB_PATH

  # Initialize DB if needed
  if not db_path.exists():
    init_database(db_path)

  # Classify the tool use
  observation = classify_tool_use(tool_name, tool_input)

  # Get session info
  session_id = get_session_id()
  project_path = get_current_project_path()

  # Ensure session exists
  try:
    from db import get_session
    if not get_session(session_id, db_path):
      create_session(session_id, project_path, db_path=db_path)
  except:
    create_session(session_id, project_path, db_path=db_path)

  # Add observation
  obs_id = add_observation(
    session_id=session_id,
    project_path=project_path,
    content=observation['content'],
    type=observation['type'],
    category=observation['category'],
    priority=observation['priority'],
    file_path=observation['file_path'],
    function_name=observation['function_name'],
    code_snippet=observation.get('code_snippet'),
    db_path=db_path,
  )

  return obs_id


def main():
  """
  Main entry point for the capture hook.

  This hook receives tool usage information via stdin or environment variables.
  Format: JSON with { tool_name, tool_input, ... }
  """
  # Read tool usage from stdin
  try:
    input_data = json.load(sys.stdin)
  except json.JSONDecodeError:
    # No input provided, exit silently
    sys.exit(0)

  tool_name = input_data.get('tool_name')
  tool_input = input_data.get('tool_input', {})

  if not tool_name:
    sys.exit(0)

  try:
    obs_id = capture_tool_use(tool_name, tool_input)
    print(f"[Ralph Capture] Observation #{obs_id} captured", file=sys.stderr)
    sys.exit(0)

  except Exception as e:
    print(f"[Ralph Capture] Error: {e}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
  main()
