import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

export class RalphDatabase {
  private db: Database

  constructor(dbPath: string = '~/.free-context/database.db') {
    // Expand tilde
    const expandedPath = dbPath.replace('~', process.env.HOME || '')

    // Ensure directory exists
    const dir = dirname(expandedPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    this.db = new Database(expandedPath)
    this.db.exec('PRAGMA journal_mode = WAL')
    this.initSchema()
  }

  private initSchema(): void {
    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        total_tokens INTEGER DEFAULT 0,
        max_tokens INTEGER DEFAULT 200000,
        status TEXT NOT NULL DEFAULT 'active'
      )
    `)

    // Memories table with FTS5
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        metadata TEXT
      )
    `)

    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content, category, content=memories, content_rowid=rowid
      )
    `)

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content, category)
        VALUES (new.rowid, new.content, new.category);
      END
    `)

    // Checkpoints table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        context_summary TEXT NOT NULL,
        token_count INTEGER NOT NULL,
        metadata TEXT
      )
    `)

    // Metrics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        value REAL NOT NULL,
        metadata TEXT
      )
    `)

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
      CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);
      CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
      CREATE INDEX IF NOT EXISTS idx_checkpoints_session ON checkpoints(session_id);
      CREATE INDEX IF NOT EXISTS idx_metrics_session ON metrics(session_id);
    `)
  }

  // Session operations
  createSession(session: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, project_id, start_time, total_tokens, max_tokens, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.run(session.id, session.projectId, session.startTime, 0, session.maxTokens || 200000, 'active')
  }

  getSession(id: string): any {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?')
    return stmt.get(id)
  }

  updateSessionTokens(id: string, tokens: number): void {
    const stmt = this.db.prepare('UPDATE sessions SET total_tokens = ? WHERE id = ?')
    stmt.run(tokens, id)
  }

  closeSession(id: string): void {
    const stmt = this.db.prepare('UPDATE sessions SET end_time = ?, status = ? WHERE id = ?')
    stmt.run(new Date().toISOString(), 'completed', id)
  }

  // Memory operations
  createMemory(memory: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO memories (id, session_id, category, content, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.run(memory.id, memory.sessionId, memory.category, memory.content, memory.timestamp, JSON.stringify(memory.metadata || {}))
  }

  searchMemories(query: string, limit: number = 10): any[] {
    const stmt = this.db.prepare(`
      SELECT memories.* FROM memories
      INNER JOIN memories_fts ON memories.rowid = memories_fts.rowid
      WHERE memories_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `)
    return stmt.all(query, limit)
  }

  getMemoriesBySession(sessionId: string): any[] {
    const stmt = this.db.prepare('SELECT * FROM memories WHERE session_id = ? ORDER BY timestamp DESC')
    return stmt.all(sessionId)
  }

  // Checkpoint operations
  createCheckpoint(checkpoint: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO checkpoints (id, session_id, name, timestamp, context_summary, token_count, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(checkpoint.id, checkpoint.sessionId, checkpoint.name, checkpoint.timestamp, checkpoint.contextSummary, checkpoint.tokenCount, JSON.stringify(checkpoint.metadata || {}))
  }

  getCheckpointsBySession(sessionId: string): any[] {
    const stmt = this.db.prepare('SELECT * FROM checkpoints WHERE session_id = ? ORDER BY timestamp DESC')
    return stmt.all(sessionId)
  }

  // Metrics operations
  createMetric(metric: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO metrics (id, session_id, timestamp, metric_type, value, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.run(metric.id, metric.sessionId, metric.timestamp, metric.metricType, metric.value, JSON.stringify(metric.metadata || {}))
  }

  getMetricsBySession(sessionId: string): any[] {
    const stmt = this.db.prepare('SELECT * FROM metrics WHERE session_id = ? ORDER BY timestamp DESC')
    return stmt.all(sessionId)
  }

  close(): void {
    this.db.close()
  }
}
