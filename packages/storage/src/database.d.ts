/**
 * Database - SQLite wrapper with migrations and CRUD helpers
 * Sprint 0: Foundation - Core storage layer
 */
import { Database as BunSqlite } from 'bun:sqlite';
/**
 * Database options
 */
export interface DatabaseOptions {
    path?: string;
    readonly?: boolean;
    verbose?: boolean;
}
/**
 * Query result helper types
 */
export type SqlValue = string | number | boolean | Buffer | null;
export type SqlRow = Record<string, SqlValue>;
export type SqlParams = Record<string, SqlValue> | SqlValue[];
/**
 * Database class with migration support and CRUD helpers
 */
export declare class Database {
    private db;
    private verbose;
    constructor(options?: DatabaseOptions);
    /**
     * Initialize database and run pending migrations
     */
    init(): void;
    /**
     * Ensure migrations tracking table exists
     */
    private ensureMigrationsTable;
    /**
     * Get list of applied migrations
     */
    private getAppliedMigrations;
    /**
     * Run all pending migrations
     */
    private runMigrations;
    /**
     * Execute a SELECT query and return all rows
     */
    query<T extends SqlRow = SqlRow>(sql: string, ...params: SqlValue[]): T[];
    /**
     * Execute a SELECT query and return first row
     */
    queryOne<T extends SqlRow = SqlRow>(sql: string, ...params: SqlValue[]): T | undefined;
    /**
     * Execute an INSERT query and return last insert id
     */
    insert(sql: string, params?: SqlParams): number;
    /**
     * Execute an UPDATE query and return number of changes
     */
    update(sql: string, params?: SqlParams): number;
    /**
     * Execute a DELETE query and return number of changes
     */
    delete(sql: string, params?: SqlParams): number;
    /**
     * Execute any query (INSERT/UPDATE/DELETE) and return changes + lastInsertRowid
     * Generic method for routes that need both insert ID and change count
     */
    run(sql: string, ...params: SqlValue[]): {
        changes: number;
        lastInsertRowid: number | bigint;
    };
    /**
     * Prepare a statement for repeated execution
     * Returns an object with run method that accepts parameters
     */
    prepare(sql: string): {
        run: (...params: SqlValue[]) => {
            changes: number;
            lastInsertRowid: number | bigint;
        };
    };
    /**
     * Execute arbitrary SQL (for schema changes, etc.)
     */
    exec(sql: string): void;
    /**
     * Begin a transaction
     */
    begin(): void;
    /**
     * Commit a transaction
     */
    commit(): void;
    /**
     * Rollback a transaction
     */
    rollback(): void;
    /**
     * Execute a function within a transaction
     * Using arrow function approach to preserve 'this'
     */
    transaction: <T>(fn: () => T) => T;
    /**
     * Close database connection
     */
    close(): void;
    /**
     * Get underlying bun:sqlite instance (for advanced usage)
     */
    get raw(): BunSqlite;
    /**
     * Convert params object to array for prepared statements
     */
    private paramsToArray;
    /**
     * Log query if verbose mode is enabled
     */
    private logQuery;
    /**
     * Log message if verbose mode is enabled
     */
    private log;
}
/**
 * Create and initialize a database instance
 */
export declare function createDatabase(options?: DatabaseOptions): Database;
/**
 * Get or create default database instance
 */
export declare function getDatabase(options?: DatabaseOptions): Database;
/**
 * Close default database instance
 */
export declare function closeDatabase(): void;
//# sourceMappingURL=database.d.ts.map