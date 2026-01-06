"""
Ralph V3 Summary Hook
Compresses observations into insights using AI.

Triggered by: Manual or scheduled (session end)
Purpose: Use LLM to compress observations into actionable insights
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from db import (
  get_session,
  get_timeline,
  add_insight,
  close_session,
  record_metric,
  init_database,
  DEFAULT_DB_PATH,
)

# Configuration
# Compression prompts
COMPRESSION_PROMPT = """You are a context compression expert. Analyze these observations and extract key insights.

Observations:
{observations}

Extract 3-5 key insights following this format:
1. **Pattern**: Recurring technical approach or decision
2. **Decision**: Important architectural or implementation choice
3. **Error**: Common issue or bug with solution
4. **Architecture**: System design insight
5. **Summary**: High-level overview

Respond in JSON format:
{{
  "insights": [
    {{
      "title": "Brief title",
      "type": "pattern|decision|error|architecture|summary",
      "category": "backend|testing|docs|refactor|implementation|auth|config|other",
      "content": "Detailed explanation of the insight",
      "confidence": 0.8,
      "observation_ids": [1, 2, 3]
    }}
  ]
}}"""


def get_current_project_path() -> str:
  """Get current project path from environment or CWD."""
  if "CWD" in os.environ:
    return os.environ["CWD"]
  return os.getcwd()


def call_llm_for_compression(
  observations: List[Dict[str, Any]],
  api_key: str,
  model: str = "claude-3-5-haiku-20241022",
) -> List[Dict[str, Any]]:
  """
  Call LLM to compress observations into insights.

  Uses Anthropic Claude API by default.
  """
  import anthropic

  client = anthropic.Anthropic(api_key=api_key)

  # Format observations
  obs_text = ""
  for obs in observations:
    emoji = {
      'decision': '💡',
      'action': '⚡',
      'error': '❌',
      'context': '📝',
      'progress': '🔄',
    }.get(obs['type'], '•')

    obs_text += f"{emoji} [{obs['type']}] {obs['content']}\n"
    if obs.get('file_path'):
      obs_text += f"   📁 {obs['file_path']}\n"
    obs_text += "\n"

  # Call Claude
  prompt = COMPRESSION_PROMPT.format(observations=obs_text)

  try:
    message = client.messages.create(
      model=model,
      max_tokens=2000,
      messages=[
        {
          "role": "user",
          "content": prompt
        }
      ]
    )

    # Parse response
    response_text = message.content[0].text

    # Extract JSON from response
    json_match = __import__('re').search(r'\{.*\}', response_text, re.DOTALL)
    if json_match:
      data = json.loads(json_match.group())
      return data.get('insights', [])
    else:
      # Fallback: create summary insight
      return [{
        "title": "Session Summary",
        "type": "summary",
        "category": "other",
        "content": response_text[:500],
        "confidence": 0.5,
        "observation_ids": [o['id'] for o in observations]
      }]

  except Exception as e:
    print(f"[Ralph Summary] LLM Error: {e}", file=sys.stderr)
    # Return empty list on error
    return []


def compress_session(
  session_id: str,
  api_key: str,
  model: str = "claude-3-5-haiku-20241022",
  db_path: Path = None,
) -> Dict[str, Any]:
  """
  Compress a session's observations into insights.

  Returns statistics about compression.
  """
  db_path = db_path or DEFAULT_DB_PATH

  # Get session
  session = get_session(session_id, db_path)
  if not session:
    raise ValueError(f"Session not found: {session_id}")

  # Get observations
  observations = get_timeline(
    session_id=session_id,
    limit=100,
    db_path=db_path,
  )

  if not observations:
    return {
      "insights_created": 0,
      "tokens_saved": 0,
      "observation_count": 0,
    }

  # Estimate original tokens (rough estimate: ~4 chars per token)
  original_tokens = sum(
    len(o.get('content', '')) + len(o.get('code_snippet', '')) + len(o.get('file_path', ''))
    for o in observations
  ) // 4

  # Call LLM for compression
  insights = call_llm_for_compression(observations, api_key, model)

  # Store insights
  tokens_saved = 0
  for insight in insights:
    insight_id = add_insight(
      session_id=session_id,
      project_path=session['project_path'],
      title=insight['title'],
      content=insight['content'],
      type=insight['type'],
      category=insight.get('category'),
      observation_ids=insight.get('observation_ids', []),
      confidence=insight.get('confidence'),
      db_path=db_path,
    )

    # Estimate tokens saved (insight is ~10x smaller than source observations)
    if 'observation_ids' in insight:
      source_obs = [o for o in observations if o['id'] in insight['observation_ids']]
      source_tokens = sum(
        len(o.get('content', '')) + len(o.get('code_snippet', ''))
        for o in source_obs
      ) // 4
      compressed_tokens = len(insight['content']) // 4
      tokens_saved += max(0, source_tokens - compressed_tokens)

  # Record metric
  record_metric(
    project_path=session['project_path'],
    metric_type="compression",
    metric_name="tokens_saved",
    value=tokens_saved,
    session_id=session_id,
    db_path=db_path,
  )

  return {
    "insights_created": len(insights),
    "tokens_saved": tokens_saved,
    "observation_count": len(observations),
  }


def main():
  """
  Main entry point for the summary hook.

  Usage:
    python summary.py --session-id <id> [--api-key <key>] [--model <model>]
  """
  import argparse

  parser = argparse.ArgumentParser(description="Compress session observations into insights")
  parser.add_argument("--session-id", help="Session ID to compress")
  parser.add_argument("--api-key", default=os.environ.get("ANTHROPIC_API_KEY"), help="Anthropic API key")
  parser.add_argument("--model", default="claude-3-5-haiku-20241022", help="Claude model to use")
  parser.add_argument("--project-path", help="Project path (auto-detected if not provided)")
  args = parser.parse_args()

  if not args.api_key:
    print("[Ralph Summary] Error: ANTHROPIC_API_KEY not set", file=sys.stderr)
    sys.exit(1)

  # Get session ID
  session_id = args.session_id
  if not session_id:
    # Generate from project path
    project_path = args.project_path or get_current_project_path()
    today = datetime.now().strftime("%Y-%m-%d")
    session_id = f"{Path(project_path).name}-{today}"

  # Initialize DB if needed
  db_path = DEFAULT_DB_PATH
  if not db_path.exists():
    init_database(db_path)

  try:
    # Compress session
    stats = compress_session(
      session_id=session_id,
      api_key=args.api_key,
      model=args.model,
      db_path=db_path,
    )

    print(f"[Ralph Summary] Compressed session: {session_id}")
    print(f"  Insights created: {stats['insights_created']}")
    print(f"  Tokens saved: ~{stats['tokens_saved']}")
    print(f"  Observations processed: {stats['observation_count']}")

    sys.exit(0)

  except Exception as e:
    print(f"[Ralph Summary] Error: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)


if __name__ == "__main__":
  main()
