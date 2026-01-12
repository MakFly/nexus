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
import { createDatabase } from './database.js';
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
export async function ensureNexusDirs() {
    await mkdir(NEXUS_DIR, { recursive: true });
    await mkdir(PROJECTS_DIR, { recursive: true });
}
/**
 * Get project database path
 */
export function getProjectDbPath(projectName) {
    return join(PROJECTS_DIR, projectName, 'project.db');
}
/**
 * Get global database
 */
export async function getGlobalDb() {
    await ensureNexusDirs();
    return createDatabase({ path: GLOBAL_DB_PATH });
}
/**
 * Get project database
 */
export async function getProjectDb(projectName) {
    await ensureNexusDirs();
    const dbPath = getProjectDbPath(projectName);
    return createDatabase({ path: dbPath });
}
/**
 * Federation query executor
 */
export class FederationQuery {
    globalDb = null;
    projectDbs = new Map();
    /**
     * Initialize federation
     */
    async init() {
        this.globalDb = await getGlobalDb();
    }
    /**
     * Get database for scope
     */
    async getDbForScope(scope, project) {
        const dbs = [];
        if (scope === 'global' || scope === 'all') {
            if (!this.globalDb)
                await this.init();
            if (this.globalDb)
                dbs.push(this.globalDb);
        }
        if (scope === 'repo' || scope === 'all') {
            if (project) {
                if (!this.projectDbs.has(project)) {
                    this.projectDbs.set(project, await getProjectDb(project));
                }
                const db = this.projectDbs.get(project);
                if (db)
                    dbs.push(db);
            }
            else {
                // Query all projects
                const projects = this.listProjects();
                for (const proj of projects) {
                    if (!this.projectDbs.has(proj)) {
                        this.projectDbs.set(proj, await getProjectDb(proj));
                    }
                    const db = this.projectDbs.get(proj);
                    if (db)
                        dbs.push(db);
                }
            }
        }
        return dbs;
    }
    /**
     * List all projects
     */
    listProjects() {
        // This would read from filesystem or global db
        // For now, return empty array
        return [];
    }
    /**
     * Execute federated query
     */
    async query(sql, options, params = []) {
        const dbs = await this.getDbForScope(options.scope, options.project);
        const results = [];
        const sources = {
            global: 0,
            projects: []
        };
        for (const db of dbs) {
            const rows = db.query(sql, ...params);
            results.push(...rows);
            // Track sources
            if (db === this.globalDb) {
                sources.global = rows.length;
            }
            else {
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
    close() {
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
let federationQuery = null;
export async function getFederationQuery() {
    if (!federationQuery) {
        federationQuery = new FederationQuery();
        await federationQuery.init();
    }
    return federationQuery;
}
//# sourceMappingURL=federation.js.map