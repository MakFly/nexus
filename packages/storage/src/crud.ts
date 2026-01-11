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
export class BaseRepository<T extends SqlRow = SqlRow> implements Repository<T> {
  constructor(
    public db: Database,
    public table: string
  ) {}

  /**
   * Find record by ID
   */
  findById(id: number): T | undefined {
    return this.db.queryOne<T>(
      `SELECT * FROM ${this.table} WHERE id = ?`,
      ...[id]
    );
  }

  /**
   * Find first record matching conditions
   */
  findOne(where: SqlParams): T | undefined {
    const { sql, params } = this.buildWhereQuery(where);
    return this.db.queryOne<T>(sql, ...params);
  }

  /**
   * Find all records matching conditions
   */
  findMany(where?: SqlParams, limit?: number): T[] {
    let sql = `SELECT * FROM ${this.table}`;
    const params: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const { sql: whereSql, params: whereParams } = this.buildWhereQuery(where);
      sql += ' ' + whereSql;
      params.push(...whereParams);
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    return this.db.query<T>(sql, ...params);
  }

  /**
   * Insert new record and return insert ID
   */
  insert(data: Partial<T>): number {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`;
    return this.db.insert(sql, Object.values(data));
  }

  /**
   * Update record by ID
   */
  update(id: number, data: Partial<T>): boolean {
    const keys = Object.keys(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const sql = `UPDATE ${this.table} SET ${setClause} WHERE id = ?`;
    const changes = this.db.update(sql, [...Object.values(data), id]);
    return changes > 0;
  }

  /**
   * Delete record by ID
   */
  delete(id: number): boolean {
    const changes = this.db.delete(
      `DELETE FROM ${this.table} WHERE id = ?`,
      [id]
    );
    return changes > 0;
  }

  /**
   * Count records matching conditions
   */
  count(where?: SqlParams): number {
    let sql = `SELECT COUNT(*) as count FROM ${this.table}`;
    const params: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const { sql: whereSql, params: whereParams } = this.buildWhereQuery(where);
      sql += ' ' + whereSql;
      params.push(...whereParams);
    }

    const result = this.db.queryOne<{ count: number }>(sql, ...params);
    return result?.count ?? 0;
  }

  /**
   * Build WHERE clause from params object
   */
  private buildWhereQuery(params: SqlParams): { sql: string; params: any[] } {
    if (Array.isArray(params)) {
      return { sql: 'WHERE 1=1', params: [] };
    }

    const conditions: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) {
        conditions.push(`${key} IS NULL`);
      } else {
        conditions.push(`${key} = ?`);
        values.push(value);
      }
    }

    const sql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { sql, params: values };
  }
}

/**
 * Create a repository for a table
 */
export function createRepository<T extends SqlRow = SqlRow>(
  db: Database,
  table: string
): BaseRepository<T> {
  return new BaseRepository<T>(db, table);
}
