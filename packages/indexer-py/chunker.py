"""
File chunker - Split content into manageable chunks
"""

import re
from typing import Generator


# Language detection par extension
LANGUAGE_MAP = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".py": "python",
    ".pyi": "python",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".rb": "ruby",
    ".php": "php",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".hpp": "cpp",
    ".cc": "cpp",
    ".cs": "csharp",
    ".swift": "swift",
    ".scala": "scala",
    ".lua": "lua",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".sql": "sql",
    ".md": "markdown",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".xml": "xml",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".sass": "sass",
    ".less": "less",
    ".vue": "vue",
    ".svelte": "svelte",
}

# Patterns pour extraire les symboles par langage
SYMBOL_PATTERNS = {
    "typescript": re.compile(r"(?:function|class|interface|type|const|let|export)\s+(\w+)"),
    "javascript": re.compile(r"(?:function|class|const|let|export)\s+(\w+)"),
    "python": re.compile(r"(?:def|class|async def)\s+(\w+)"),
    "rust": re.compile(r"(?:fn|struct|enum|impl|trait|mod)\s+(\w+)"),
    "go": re.compile(r"(?:func|type|struct)\s+(\w+)"),
    "java": re.compile(r"(?:class|interface|enum|void|public|private)\s+(\w+)"),
}


def detect_language(filename: str) -> str | None:
    """Détecte le langage à partir de l'extension."""
    for ext, lang in LANGUAGE_MAP.items():
        if filename.endswith(ext):
            return lang
    return None


def extract_symbol(content: str, language: str | None) -> tuple[str | None, str | None]:
    """
    Extrait le premier symbole (fonction/classe) du contenu.
    Retourne (symbol_name, kind).
    """
    if not language or language not in SYMBOL_PATTERNS:
        return None, None

    pattern = SYMBOL_PATTERNS[language]
    match = pattern.search(content)

    if not match:
        return None, None

    symbol = match.group(1)

    # Determine kind
    if any(kw in content[:100] for kw in ["function ", "fn ", "def ", "func "]):
        kind = "function"
    elif any(kw in content[:100] for kw in ["class ", "struct ", "interface ", "trait "]):
        kind = "class"
    else:
        kind = "block"

    return symbol, kind


def chunk_content(
    content: str,
    max_lines: int = 80,
    overlap: int = 5,
    min_lines: int = 3,
    language: str | None = None,
) -> Generator[dict, None, None]:
    """
    Générateur de chunks - ne garde JAMAIS tous les chunks en mémoire.

    Yields des dicts avec: start_line, end_line, content, symbol, kind
    """
    lines = content.split("\n")
    total_lines = len(lines)

    if total_lines == 0:
        return

    start = 0
    prev_start = -1  # Pour détecter les boucles infinies

    while start < total_lines:
        # Protection contre boucle infinie
        if start == prev_start:
            break
        prev_start = start

        end = min(start + max_lines, total_lines)
        chunk_lines = lines[start:end]

        # Skip tiny chunks sauf si c'est le premier
        if len(chunk_lines) >= min_lines or start == 0:
            chunk_text = "\n".join(chunk_lines)

            # Extract symbol
            symbol, kind = extract_symbol(chunk_text, language)

            yield {
                "start_line": start + 1,  # 1-indexed
                "end_line": end,
                "content": chunk_text,
                "symbol": symbol,
                "kind": kind or "block",
                "token_count": len(chunk_text) // 4,  # Approximation
            }

        # Si on a atteint la fin, on sort
        if end >= total_lines:
            break

        # Move with overlap (mais jamais en arrière)
        new_start = end - overlap
        if new_start <= start:
            new_start = start + 1  # Avance d'au moins 1 ligne
        start = new_start
