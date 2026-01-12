/**
 * @nexus/storage - Federation Multi-Project
 * Sprint 9: Multi-project support with query federation
 *
 * Architecture:
 * - ~/.nexus/projects/{project_name}/project.db - Per-project data
 * - ~/.nexus/global.db - Shared patterns, preferences, global memories
 *
 * Query Federation:
 * - scope: "repo" → Search only in current project.db
 * - scope: "global" → Search only in global.db
 * - scope: "all" → Search in both (UNION)
 */

import { createDatabase, type Database } from './database.js';
import { join } from 'path';
import { mkdir } from 'fs/promises';

/**
 * Nexus directory structure
 */
const NEXUS_DIR = `${process.env.HOME}/.nexus`;
const PROJECTS_DIR = join(NEXUS_DIR, 'projects');
const GLOBAL_DB_PATH = join(NEXUS_DIR, 'global.db');

/**
 * Ensure Nexus directory structure exists
 */
export async function ensureNexusDirs(): Promise<void> {
  await mkdir(NEXUS_DIR, { recursive: true });
  await mkdir(PROJECTS_DIR, { recursive: true });
}

/**
 * Get project database path
 */
export function getProjectDbPath(projectName: string): string {
  return join(PROJECTS_DIR, projectName, 'project.db');
}

/**
 * Get global database
 */
export async function getGlobalDb(): Promise<Database> {
  await ensureNexusDirs();
  return createDatabase({ path: GLOBAL_DB_PATH });
}

/**
 * Get project database
 */
export async function getProjectDb(projectName: string): Promise<Database> {
  await ensureNexusDirs();
  const dbPath = getProjectDbPath(projectName);
  return createDatabase({ path: dbPath });
}

/**
 * Federation query options
 */
export interface FederationQueryOptions {
  scope: 'repo' | 'branch' | 'ticket' | 'feature' | 'global' | 'all';
  project?: string;
  branch?: string;
  ticket?: string;
  feature?: string;
}

/**
 * Federated query result
 */
export interface FederatedResult<T> {
  results: T[];
  sources: {
    global: number;
    projects: Array<{ name: string; count: number }>;
  };
}

/**
 * Federation query executor
 */
export class FederationQuery {
  private globalDb: Database | null = null;
  private projectDbs: Map<string, Database> = new Map();

  /**
   * Initialize federation
   */
  async init(): Promise<void> {
    this.globalDb = await getGlobalDb();
  }

  /**
   * Get database for scope
   */
  private async getDbForScope(
    scope: FederationQueryOptions['scope'],
    project?: string
  ): Promise<Database[]> {
    const dbs: Database[] = [];

    if (scope === 'global' || scope === 'all') {
      if (!this.globalDb) await this.init();
      if (this.globalDb) dbs.push(this.globalDb);
    }

    if (scope === 'repo' || scope === 'all') {
      if (project) {
        if (!this.projectDbs.has(project)) {
          this.projectDbs.set(project, await getProjectDb(project));
        }
        const db = this.projectDbs.get(project);
        if (db) dbs.push(db);
      } else {
        // Query all projects
        const projects = this.listProjects();
        for (const proj of projects) {
          if (!this.projectDbs.has(proj)) {
            this.projectDbs.set(proj, await getProjectDb(proj));
          }
          const db = this.projectDbs.get(proj);
          if (db) dbs.push(db);
        }
      }
    }

    return dbs;
  }

  /**
   * List all projects
   */
  listProjects(): string[] {
    // This would read from filesystem or global db
    // For now, return empty array
    return [];
  }

  /**
   * Execute federated query
   */
  async query<T>(
    sql: string,
    options: FederationQueryOptions,
    params: any[] = []
  ): Promise<FederatedResult<T>> {
    const dbs = await this.getDbForScope(options.scope, options.project);

    const results: T[] = [];
    const sources = {
      global: 0,
      projects: [] as Array<{ name: string; count: number }>
    };

    for (const db of dbs) {
      const rows = db.query<any>(sql, ...params);
      results.push(...rows);

      // Track sources
      if (db === this.globalDb) {
        sources.global = rows.length;
      } else {
        // Determine project name from db path
        const projectName = 'unknown';
        sources.projects.push({ name: projectName, count: rows.length });
      }
    }

    return { results, sources };
  }

  /**
   * Close all connections
   */
  close(): void {
    this.globalDb?.close();
    for (const db of this.projectDbs.values()) {
      db.close();
    }
    this.projectDbs.clear();
  }
}

/**
 * Singleton federation query instance
 */
let federationQuery: FederationQuery | null = null;

export async function getFederationQuery(): Promise<FederationQuery> {
  if (!federationQuery) {
    federationQuery = new FederationQuery();
    await federationQuery.init();
  }
  return federationQuery;
}
