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
import { type Database } from './database.js';
/**
 * Ensure Nexus directory structure exists
 */
export declare function ensureNexusDirs(): Promise<void>;
/**
 * Get project database path
 */
export declare function getProjectDbPath(projectName: string): string;
/**
 * Get global database
 */
export declare function getGlobalDb(): Promise<Database>;
/**
 * Get project database
 */
export declare function getProjectDb(projectName: string): Promise<Database>;
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
        projects: Array<{
            name: string;
            count: number;
        }>;
    };
}
/**
 * Federation query executor
 */
export declare class FederationQuery {
    private globalDb;
    private projectDbs;
    /**
     * Initialize federation
     */
    init(): Promise<void>;
    /**
     * Get database for scope
     */
    private getDbForScope;
    /**
     * List all projects
     */
    listProjects(): string[];
    /**
     * Execute federated query
     */
    query<T>(sql: string, options: FederationQueryOptions, params?: any[]): Promise<FederatedResult<T>>;
    /**
     * Close all connections
     */
    close(): void;
}
export declare function getFederationQuery(): Promise<FederationQuery>;
//# sourceMappingURL=federation.d.ts.map