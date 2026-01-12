/**
 * @nexus/storage - Project Manager
 * Sprint 9: Multi-project management
 *
 * Handles:
 * - Project registration and detection
 * - Path-to-project mapping
 * - Project metadata and stats
 * - Pattern promotion (project → global)
 */

import { createDatabase, type Database } from './database.js';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { getGlobalDb, getProjectDbPath, getProjectDb, ensureNexusDirs } from './federation.js';

/**
 * Project metadata
 */
export interface ProjectMeta {
  id: number;
  name: string;
  root_path: string;
  description?: string;
  created_at: string;
  updated_at: string;
  last_indexed_at?: string;
  file_count: number;
  chunk_count: number;
  memory_count: number;
  pattern_count: number;
  [key: string]: any;
}

/**
 * Create project options
 */
export interface CreateProjectOptions {
  name: string;
  root_path: string;
  description?: string;
}

/**
 * Project Manager
 */
export class ProjectManager {
  private globalDb: Database | null = null;

  /**
   * Initialize project manager
   */
  async init(): Promise<void> {
    await ensureNexusDirs();
    this.globalDb = await getGlobalDb();

    // Ensure projects table exists in global db
    this.globalDb.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        root_path TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        last_indexed_at TEXT,
        file_count INTEGER DEFAULT 0,
        chunk_count INTEGER DEFAULT 0,
        memory_count INTEGER DEFAULT 0,
        pattern_count INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_projects_root_path ON projects(root_path);
    `);
  }

  /**
   * Register a new project
   */
  async registerProject(options: CreateProjectOptions): Promise<ProjectMeta> {
    if (!this.globalDb) await this.init();

    const result = this.globalDb!.run(`
      INSERT INTO projects (name, root_path, description)
      VALUES (?, ?, ?)
    `, options.name, options.root_path, options.description || null);

    const id = result.lastInsertRowid as number;

    // Create project database
    const projectDbPath = getProjectDbPath(options.name);
    await mkdir(join(projectDbPath, '..'), { recursive: true });
    const projectDb = createDatabase({ path: projectDbPath });

    // Initialize project database schema
    await this.initProjectDb(projectDb);

    return {
      id,
      name: options.name,
      root_path: options.root_path,
      description: options.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_count: 0,
      chunk_count: 0,
      memory_count: 0,
      pattern_count: 0
    };
  }

  /**
   * Initialize project database schema
   */
  private async initProjectDb(db: Database): Promise<void> {
    // Project-specific schema (similar to unified schema but scoped)
    db.exec(`
      -- Files table
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        hash TEXT NOT NULL,
        mtime INTEGER NOT NULL,
        size INTEGER NOT NULL,
        lang TEXT,
        ignored BOOLEAN DEFAULT FALSE,
        indexed_at INTEGER NOT NULL
      );

      -- Chunks table
      CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY,
        file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        content TEXT NOT NULL,
        symbol TEXT,
        kind TEXT,
        token_count INTEGER,
        UNIQUE(file_id, start_line, end_line)
      );

      -- FTS5 for chunks
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        content, symbol,
        content='chunks',
        content_rowid='id'
      );

      -- Observations (memories) with project scope
      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY,
        session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN (
          'decision', 'bugfix', 'feature', 'refactor',
          'discovery', 'change', 'preference', 'fact', 'note'
        )),
        scope TEXT DEFAULT 'repo',
        title TEXT NOT NULL,
        summary TEXT,
        narrative TEXT,
        confidence REAL DEFAULT 0.8,
        created_at INTEGER NOT NULL
      );

      -- Patterns (scoped to project)
      CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY,
        intent TEXT NOT NULL,
        title TEXT NOT NULL,
        tags_json TEXT,
        templates_json TEXT,
        usage_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  /**
   * Detect project by path
   */
  async detectProject(path: string): Promise<ProjectMeta | null> {
    if (!this.globalDb) await this.init();

    // Try exact match first
    let project = this.globalDb!.queryOne<ProjectMeta>(`
      SELECT * FROM projects WHERE root_path = ?
    `, path);

    if (project) return project;

    // Try parent directory match
    const parts = path.split('/');
    for (let i = parts.length; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('/');
      project = this.globalDb!.queryOne<ProjectMeta>(`
        SELECT * FROM projects WHERE root_path = ?
      `, parentPath);
      if (project) return project;
    }

    return null;
  }

  /**
   * List all projects
   */
  listProjects(): ProjectMeta[] {
    if (!this.globalDb) return [];

    return this.globalDb!.query<ProjectMeta>(`
      SELECT * FROM projects ORDER BY name
    `);
  }

  /**
   * Get project by name
   */
  async getProject(name: string): Promise<ProjectMeta | null> {
    if (!this.globalDb) await this.init();

    const project = this.globalDb!.queryOne<ProjectMeta>(`
      SELECT * FROM projects WHERE name = ?
    `, name);
    return project || null;
  }

  /**
   * Update project stats
   */
  async updateProjectStats(name: string): Promise<void> {
    const projectDb = await getProjectDb(name);

    const fileCount = projectDb.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM files'
    );
    const chunkCount = projectDb.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM chunks'
    );
    const memoryCount = projectDb.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM observations'
    );
    const patternCount = projectDb.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM patterns'
    );

    if (!this.globalDb) await this.init();

    this.globalDb!.run(`
      UPDATE projects
      SET file_count = ?,
          chunk_count = ?,
          memory_count = ?,
          pattern_count = ?,
          updated_at = datetime('now'),
          last_indexed_at = datetime('now')
      WHERE name = ?
    `, fileCount?.count || 0, chunkCount?.count || 0,
       memoryCount?.count || 0, patternCount?.count || 0, name);
  }

  /**
   * Promote pattern to global
   */
  async promotePattern(patternId: number, fromProject: string): Promise<void> {
    if (!this.globalDb) await this.init();

    const projectDb = await getProjectDb(fromProject);

    // Get pattern from project
    const pattern = projectDb.queryOne<{
      intent: string;
      title: string;
      tags_json: string;
      templates_json: string;
      usage_count: number;
      success_count: number;
      fail_count: number;
    }>(`
      SELECT * FROM patterns WHERE id = ?
    `, patternId);

    if (!pattern) {
      throw new Error(`Pattern ${patternId} not found in project ${fromProject}`);
    }

    // Insert into global patterns
    this.globalDb!.run(`
      INSERT INTO global_patterns (intent, title, tags_json, templates_json, usage_count, success_count, fail_count, origin_project)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, pattern.intent, pattern.title, pattern.tags_json, pattern.templates_json,
       pattern.usage_count, pattern.success_count, pattern.fail_count, fromProject);

    // Remove from project
    projectDb.run('DELETE FROM patterns WHERE id = ?', patternId);
  }

  /**
   * Close connections
   */
  close(): void {
    this.globalDb?.close();
  }
}

/**
 * Singleton project manager instance
 */
let projectManager: ProjectManager | null = null;

export async function getProjectManager(): Promise<ProjectManager> {
  if (!projectManager) {
    projectManager = new ProjectManager();
    await projectManager.init();
  }
  return projectManager;
}
