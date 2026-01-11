#!/usr/bin/env python3
"""
Nexus Indexer - Python Streaming Service
Zero-buffer indexation: 1 fichier en mémoire max

Usage:
    python main.py index <path> [--db nexus.db] [--max-files 10000]
    python main.py status --db nexus.db
    python main.py clear --db nexus.db
"""

import argparse
import sys
import json
from pathlib import Path

from scanner import scan_workspace_sync
from database import init_db, get_stats, clear_index


def cmd_index(args):
    """Index un workspace en streaming."""
    db_path = Path(args.db)
    root_path = Path(args.path).resolve()

    if not root_path.exists():
        print(json.dumps({"error": f"Path not found: {root_path}"}))
        sys.exit(1)

    # Init DB
    conn = init_db(db_path)

    # Get project_id from args (if provided)
    project_id = int(args.project_id) if hasattr(args, 'project_id') and args.project_id else None

    # Index en streaming (sync)
    result = scan_workspace_sync(
        conn=conn,
        root_path=root_path,
        max_files=args.max_files,
        max_file_size=args.max_size,
        max_chunk_lines=args.chunk_lines,
        project_id=project_id,
    )

    conn.close()

    # Output JSON pour parsing par Bun
    print(json.dumps(result))


def cmd_status(args):
    """Affiche les stats de l'index."""
    db_path = Path(args.db)

    if not db_path.exists():
        print(json.dumps({"error": "Database not found"}))
        sys.exit(1)

    conn = init_db(db_path)
    stats = get_stats(conn)
    conn.close()

    print(json.dumps(stats))


def cmd_clear(args):
    """Vide l'index."""
    db_path = Path(args.db)

    if not db_path.exists():
        print(json.dumps({"error": "Database not found"}))
        sys.exit(1)

    conn = init_db(db_path)
    clear_index(conn)
    conn.close()

    print(json.dumps({"status": "cleared"}))


def main():
    parser = argparse.ArgumentParser(description="Nexus Indexer - Python Streaming")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # index command
    index_parser = subparsers.add_parser("index", help="Index a workspace")
    index_parser.add_argument("path", help="Root path to index")
    index_parser.add_argument("--db", default="apps/api/nexus.db", help="SQLite database path")
    index_parser.add_argument("--project-id", type=int, help="Project ID to associate files with")
    index_parser.add_argument("--max-files", type=int, default=10000, help="Max files to index")
    index_parser.add_argument("--max-size", type=int, default=1048576, help="Max file size in bytes (1MB)")
    index_parser.add_argument("--chunk-lines", type=int, default=80, help="Max lines per chunk")

    # status command
    status_parser = subparsers.add_parser("status", help="Show index stats")
    status_parser.add_argument("--db", default="apps/api/nexus.db", help="SQLite database path")

    # clear command
    clear_parser = subparsers.add_parser("clear", help="Clear the index")
    clear_parser.add_argument("--db", default="apps/api/nexus.db", help="SQLite database path")

    args = parser.parse_args()

    if args.command == "index":
        cmd_index(args)
    elif args.command == "status":
        cmd_status(args)
    elif args.command == "clear":
        cmd_clear(args)


if __name__ == "__main__":
    main()
