"""
SQLite database operations - Compatible avec le schema Nexus existant
"""

import sqlite3
import time
from pathlib import Path
from typing import Any


def init_db(db_path: Path) -> sqlite3.Connection:
    """
    Initialise la connexion SQLite.
    Crée les tables si elles n'existent pas.
    """
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row  # Pour accéder aux colonnes par nom

    # Enable WAL mode for better concurrency
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    # Create tables if not exist (compatible avec schema Nexus)
    conn.executescript("""
        -- Files table
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            hash TEXT NOT NULL,
            mtime INTEGER,
            size INTEGER,
            lang TEXT,
            indexed_at INTEGER NOT NULL,
            project_id INTEGER,
            ignored BOOLEAN DEFAULT FALSE
        );

        CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
        CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
        CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);

        -- Chunks table
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
            start_line INTEGER NOT NULL,
            end_line INTEGER NOT NULL,
            content TEXT NOT NULL,
            symbol TEXT,
            kind TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);

        -- FTS5 virtual table for full-text search
        CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
            content,
            content='chunks',
            content_rowid='id'
        );

        -- Triggers to keep FTS in sync
        CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
            INSERT INTO chunks_fts(rowid, content) VALUES (new.id, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
            INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.id, old.content);
        END;

        CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
            INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.id, old.content);
            INSERT INTO chunks_fts(rowid, content) VALUES (new.id, new.content);
        END;
    """)

    conn.commit()
    return conn


def get_file_by_path(conn: sqlite3.Connection, path: str) -> dict | None:
    """Récupère un fichier par son path."""
    cursor = conn.execute(
        "SELECT id, path, hash, size, lang FROM files WHERE path = ?",
        (path,)
    )
    row = cursor.fetchone()
    if row:
        return dict(row)
    return None


def upsert_file(
    conn: sqlite3.Connection,
    path: str,
    content_hash: str,
    size: int,
    lang: str | None,
    mtime: int | None = None,
    project_id: int | None = None,
) -> int:
    """Insert ou update un fichier. Retourne l'ID."""
    now = int(time.time() * 1000)

    # Try update first
    cursor = conn.execute(
        """
        UPDATE files SET hash = ?, mtime = ?, size = ?, lang = ?, indexed_at = ?, project_id = ?
        WHERE path = ?
        """,
        (content_hash, mtime, size, lang, now, project_id, path)
    )

    if cursor.rowcount > 0:
        # Updated, get the ID
        cursor = conn.execute("SELECT id FROM files WHERE path = ?", (path,))
        return cursor.fetchone()[0]

    # Insert new
    cursor = conn.execute(
        """
        INSERT INTO files (path, hash, mtime, size, lang, indexed_at, project_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (path, content_hash, mtime, size, lang, now, project_id)
    )
    return cursor.lastrowid


def delete_chunks_for_file(conn: sqlite3.Connection, file_id: int) -> None:
    """Supprime tous les chunks d'un fichier."""
    conn.execute("DELETE FROM chunks WHERE file_id = ?", (file_id,))


def insert_chunk(
    conn: sqlite3.Connection,
    file_id: int,
    start_line: int,
    end_line: int,
    content: str,
    symbol: str | None = None,
    kind: str | None = None,
) -> int:
    """Insert un chunk. Retourne l'ID."""
    cursor = conn.execute(
        """
        INSERT INTO chunks (file_id, start_line, end_line, content, symbol, kind)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (file_id, start_line, end_line, content, symbol, kind)
    )
    return cursor.lastrowid


def get_stats(conn: sqlite3.Connection) -> dict[str, Any]:
    """Retourne les statistiques de l'index."""
    files_count = conn.execute("SELECT COUNT(*) FROM files").fetchone()[0]
    chunks_count = conn.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]

    # Languages distribution
    langs = conn.execute(
        "SELECT lang, COUNT(*) as count FROM files WHERE lang IS NOT NULL GROUP BY lang ORDER BY count DESC LIMIT 10"
    ).fetchall()

    return {
        "files": files_count,
        "chunks": chunks_count,
        "languages": {row["lang"]: row["count"] for row in langs},
    }


def clear_index(conn: sqlite3.Connection) -> None:
    """Vide complètement l'index."""
    conn.execute("DELETE FROM chunks")
    conn.execute("DELETE FROM files")
    conn.commit()


def search_fts(
    conn: sqlite3.Connection,
    query: str,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    """
    Recherche FTS5 avec BM25 ranking.
    Retourne les chunks matchant la query.
    """
    # Escape query for FTS5
    escaped_query = query if " " not in query else f'"{query}"'

    cursor = conn.execute(
        """
        SELECT
            c.id,
            f.path,
            c.start_line,
            c.end_line,
            c.content,
            c.symbol,
            c.kind,
            -bm25(chunks_fts) as score
        FROM chunks_fts
        JOIN chunks c ON chunks_fts.rowid = c.id
        JOIN files f ON c.file_id = f.id
        WHERE chunks_fts MATCH ?
        ORDER BY score DESC
        LIMIT ? OFFSET ?
        """,
        (escaped_query, limit, offset)
    )

    return [dict(row) for row in cursor.fetchall()]
