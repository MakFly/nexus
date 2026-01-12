/**
 * CRUD Helpers - Generic repository helpers for common operations
 * Sprint 0: Foundation - Reusable data access patterns
 */
import type { Database, SqlParams, SqlRow } from './database.js';
/**
 * Generic repository interface
 */
export interface Repository<T extends SqlRow> {
    table: string;
    findById(id: number): T | undefined;
    findOne(where: SqlParams): T | undefined;
    findMany(where?: SqlParams, limit?: number): T[];
    insert(data: Partial<T>): number;
    update(id: number, data: Partial<T>): boolean;
    delete(id: number): boolean;
    count(where?: SqlParams): number;
}
/**
 * Generic repository implementation
 */
export declare class BaseRepository<T extends SqlRow = SqlRow> implements Repository<T> {
    db: Database;
    table: string;
    constructor(db: Database, table: string);
    /**
     * Find record by ID
     */
    findById(id: number): T | undefined;
    /**
     * Find first record matching conditions
     */
    findOne(where: SqlParams): T | undefined;
    /**
     * Find all records matching conditions
     */
    findMany(where?: SqlParams, limit?: number): T[];
    /**
     * Insert new record and return insert ID
     */
    insert(data: Partial<T>): number;
    /**
     * Update record by ID
     */
    update(id: number, data: Partial<T>): boolean;
    /**
     * Delete record by ID
     */
    delete(id: number): boolean;
    /**
     * Count records matching conditions
     */
    count(where?: SqlParams): number;
    /**
     * Build WHERE clause from params object
     */
    private buildWhereQuery;
}
/**
 * Create a repository for a table
 */
export declare function createRepository<T extends SqlRow = SqlRow>(db: Database, table: string): BaseRepository<T>;
//# sourceMappingURL=crud.d.ts.map