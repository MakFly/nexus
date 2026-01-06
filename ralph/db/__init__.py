"""
Ralph V3 Database Layer
SQLite + FTS5 for context management
"""

import sqlite3
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import contextmanager

# Default DB path
DEFAULT_DB_PATH = Path.home() / ".ralph" / "ralph.db"


@contextmanager
def get_connection(db_path: Optional[Path] = None):
  """Context manager for SQLite connections."""
  db_path = db_path or DEFAULT_DB_PATH
  db_path.parent.mkdir(parents=True, exist_ok=True)

  conn = sqlite3.connect(str(db_path))
  conn.row_factory = sqlite3.Row  # Return dict-like rows
  conn.execute("PRAGMA foreign_keys = ON")
  conn.execute("PRAGMA journal_mode = WAL")  # Better concurrency

  try:
    yield conn
    conn.commit()
  except Exception:
    conn.rollback()
    raise
  finally:
    conn.close()


def init_database(db_path: Optional[Path] = None) -> None:
  """Initialize database schema."""
  db_path = db_path or DEFAULT_DB_PATH
  schema_path = Path(__file__).parent / "schema.sql"

  if not schema_path.exists():
    raise FileNotFoundError(f"Schema not found: {schema_path}")

  with get_connection(db_path) as conn:
    schema = schema_path.read_text()
    conn.executescript(schema)


# ============================================================================
# OBSERVATIONS CRUD
# ============================================================================

def add_observation(
  session_id: str,
  project_path: str,
  content: str,
  type: str,
  category: Optional[str] = None,
  priority: str = "normal",
  file_path: Optional[str] = None,
  function_name: Optional[str] = None,
  code_snippet: Optional[str] = None,
  parent_id: Optional[int] = None,
  related_ids: Optional[List[int]] = None,
  tokens_estimate: Optional[int] = None,
  db_path: Optional[Path] = None,
) -> int:
  """Add a new observation."""
  with get_connection(db_path) as conn:
    cursor = conn.execute(
      """
      INSERT INTO observations (
        session_id, project_path, type, category, priority,
        content, file_path, function_name, code_snippet,
        parent_id, related_ids, tokens_estimate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """,
      (
        session_id,
        project_path,
        type,
        category,
        priority,
        content,
        file_path,
        function_name,
        code_snippet,
        parent_id,
        json.dumps(related_ids) if related_ids else None,
        tokens_estimate,
      ),
    )
    return cursor.lastrowid


def get_observation(
  obs_id: int,
  db_path: Optional[Path] = None,
) -> Optional[Dict[str, Any]]:
  """Get observation by ID."""
  with get_connection(db_path) as conn:
    row = conn.execute("SELECT * FROM observations WHERE id = ?", (obs_id,)).fetchone()
    if row:
      return dict(row)
    return None


def search_observations(
  query: str,
  project_path: Optional[str] = None,
  limit: int = 20,
  db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
  """Full-text search over observations using FTS5."""
  with get_connection(db_path) as conn:
    if project_path:
      rows = conn.execute(
        """
        SELECT o.* FROM observations o
        JOIN observations_fts f ON o.id = f.rowid
        WHERE observations_fts MATCH ?
        AND o.project_path = ?
        ORDER BY rank
        LIMIT ?
        """,
        (query, project_path, limit),
      ).fetchall()
    else:
      rows = conn.execute(
        """
        SELECT o.* FROM observations o
        JOIN observations_fts f ON o.id = f.rowid
        WHERE observations_fts MATCH ?
        ORDER BY rank
        LIMIT ?
        """,
        (query, limit),
      ).fetchall()

    return [dict(row) for row in rows]


def get_timeline(
  session_id: str,
  before_timestamp: Optional[str] = None,
  after_timestamp: Optional[str] = None,
  limit: int = 50,
  db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
  """Get timeline of observations for a session."""
  with get_connection(db_path) as conn:
    query = "SELECT * FROM observations WHERE session_id = ?"
    params = [session_id]

    if after_timestamp:
      query += " AND timestamp > ?"
      params.append(after_timestamp)
    if before_timestamp:
      query += " AND timestamp < ?"
      params.append(before_timestamp)

    query += " ORDER BY timestamp ASC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    return [dict(row) for row in rows]


# ============================================================================
# SESSIONS CRUD
# ============================================================================

def create_session(
  session_id: str,
  project_path: str,
  task_description: Optional[str] = None,
  db_path: Optional[Path] = None,
) -> None:
  """Create a new session."""
  with get_connection(db_path) as conn:
    conn.execute(
      """
      INSERT INTO sessions (id, project_path, task_description)
      VALUES (?, ?, ?)
      """,
      (session_id, project_path, task_description),
    )


def get_session(
  session_id: str,
  db_path: Optional[Path] = None,
) -> Optional[Dict[str, Any]]:
  """Get session by ID."""
  with get_connection(db_path) as conn:
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if row:
      return dict(row)
    return None


def update_session_tokens(
  session_id: str,
  start_tokens: Optional[int] = None,
  peak_tokens: Optional[int] = None,
  end_tokens: Optional[int] = None,
  db_path: Optional[Path] = None,
) -> None:
  """Update session token counts."""
  with get_connection(db_path) as conn:
    updates = []
    params = []

    if start_tokens is not None:
      updates.append("start_tokens = ?")
      params.append(start_tokens)
    if peak_tokens is not None:
      updates.append("peak_tokens = ?")
      params.append(peak_tokens)
    if end_tokens is not None:
      updates.append("end_tokens = ?")
      params.append(end_tokens)

    updates.append("updated_at = ?")
    params.append(datetime.now().isoformat())

    params.append(session_id)

    conn.execute(
      f"UPDATE sessions SET {', '.join(updates)} WHERE id = ?",
      params,
    )


def close_session(
  session_id: str,
  db_path: Optional[Path] = None,
) -> None:
  """Close a session."""
  with get_connection(db_path) as conn:
    conn.execute(
      """
      UPDATE sessions
      SET status = 'closed', closed_at = ?
      WHERE id = ?
      """,
      (datetime.now().isoformat(), session_id),
    )


# ============================================================================
# COMPRESSED INSIGHTS CRUD
# ============================================================================

def add_insight(
  session_id: str,
  project_path: str,
  title: str,
  content: str,
  type: str,
  category: Optional[str] = None,
  observation_ids: Optional[List[int]] = None,
  related_insights: Optional[List[int]] = None,
  confidence: Optional[float] = None,
  tokens_saved: int = 0,
  db_path: Optional[Path] = None,
) -> int:
  """Add a compressed insight."""
  with get_connection(db_path) as conn:
    cursor = conn.execute(
      """
      INSERT INTO compressed_insights (
        session_id, project_path, title, content, type, category,
        observation_ids, related_insights, confidence, tokens_saved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """,
      (
        session_id,
        project_path,
        title,
        content,
        type,
        category,
        json.dumps(observation_ids) if observation_ids else None,
        json.dumps(related_insights) if related_insights else None,
        confidence,
        tokens_saved,
      ),
    )
    return cursor.lastrowid


def get_insights(
  session_id: str,
  db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
  """Get all insights for a session."""
  with get_connection(db_path) as conn:
    rows = conn.execute(
      "SELECT * FROM compressed_insights WHERE session_id = ? ORDER BY timestamp DESC",
      (session_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def search_insights(
  query: str,
  project_path: Optional[str] = None,
  limit: int = 20,
  db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
  """Full-text search over insights."""
  with get_connection(db_path) as conn:
    if project_path:
      rows = conn.execute(
        """
        SELECT i.* FROM compressed_insights i
        JOIN insights_fts f ON i.id = f.rowid
        WHERE insights_fts MATCH ?
        AND i.project_path = ?
        ORDER BY rank
        LIMIT ?
        """,
        (query, project_path, limit),
      ).fetchall()
    else:
      rows = conn.execute(
        """
        SELECT i.* FROM compressed_insights i
        JOIN insights_fts f ON i.id = f.rowid
        WHERE insights_fts MATCH ?
        ORDER BY rank
        LIMIT ?
        """,
        (query, limit),
      ).fetchall()

    return [dict(row) for row in rows]


# ============================================================================
# CHECKPOINTS CRUD
# ============================================================================

def create_checkpoint(
  session_id: str,
  label: str,
  trajectory_summary: Optional[str] = None,
  key_decisions: Optional[List[int]] = None,
  key_errors: Optional[List[int]] = None,
  active_context: Optional[str] = None,
  metadata: Optional[Dict[str, Any]] = None,
  db_path: Optional[Path] = None,
) -> int:
  """Create a checkpoint for a session."""
  with get_connection(db_path) as conn:
    cursor = conn.execute(
      """
      INSERT INTO checkpoints (
        session_id, label, trajectory_summary,
        key_decisions, key_errors, active_context, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      """,
      (
        session_id,
        label,
        trajectory_summary,
        json.dumps(key_decisions) if key_decisions else None,
        json.dumps(key_errors) if key_errors else None,
        active_context,
        json.dumps(metadata) if metadata else None,
      ),
    )
    return cursor.lastrowid


def get_checkpoints(
  session_id: str,
  db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
  """Get all checkpoints for a session."""
  with get_connection(db_path) as conn:
    rows = conn.execute(
      "SELECT * FROM checkpoints WHERE session_id = ? ORDER BY timestamp DESC",
      (session_id,),
    ).fetchall()
    return [dict(row) for row in rows]


# ============================================================================
# METRICS CRUD
# ============================================================================

def record_metric(
  project_path: str,
  metric_type: str,
  metric_name: str,
  value: float,
  session_id: Optional[str] = None,
  metadata: Optional[Dict[str, Any]] = None,
  db_path: Optional[Path] = None,
) -> int:
  """Record a metric."""
  with get_connection(db_path) as conn:
    cursor = conn.execute(
      """
      INSERT INTO metrics (
        session_id, project_path, metric_type, metric_name, value, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
      """,
      (
        session_id,
        project_path,
        metric_type,
        metric_name,
        value,
        json.dumps(metadata) if metadata else None,
      ),
    )
    return cursor.lastrowid


def get_metrics(
  project_path: str,
  metric_type: Optional[str] = None,
  limit: int = 100,
  db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
  """Get metrics for a project."""
  with get_connection(db_path) as conn:
    if metric_type:
      rows = conn.execute(
        """
        SELECT * FROM metrics
        WHERE project_path = ? AND metric_type = ?
        ORDER BY timestamp DESC
        LIMIT ?
        """,
        (project_path, metric_type, limit),
      ).fetchall()
    else:
      rows = conn.execute(
        """
        SELECT * FROM metrics
        WHERE project_path = ?
        ORDER BY timestamp DESC
        LIMIT ?
        """,
        (project_path, limit),
      ).fetchall()

    return [dict(row) for row in rows]
