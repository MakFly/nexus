"""
Ralph V3 - Minimal Context Management System for AI Coding Agents

A malloc/free pattern for LLM context windows.

Architecture:
- SQLite FTS5 for storage and search
- Progressive disclosure for token efficiency (x10)
- 3 hooks: context, capture, summary
- MCP server with 4 tools
"""

__version__ = "3.0.0"
