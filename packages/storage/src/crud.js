/**
 * CRUD Helpers - Generic repository helpers for common operations
 * Sprint 0: Foundation - Reusable data access patterns
 */
/**
 * Generic repository implementation
 */
export class BaseRepository {
    db;
    table;
    constructor(db, table) {
        this.db = db;
        this.table = table;
    }
    /**
     * Find record by ID
     */
    findById(id) {
        return this.db.queryOne(`SELECT * FROM ${this.table} WHERE id = ?`, ...[id]);
    }
    /**
     * Find first record matching conditions
     */
    findOne(where) {
        const { sql, params } = this.buildWhereQuery(where);
        return this.db.queryOne(sql, ...params);
    }
    /**
     * Find all records matching conditions
     */
    findMany(where, limit) {
        let sql = `SELECT * FROM ${this.table}`;
        const params = [];
        if (where && Object.keys(where).length > 0) {
            const { sql: whereSql, params: whereParams } = this.buildWhereQuery(where);
            sql += ' ' + whereSql;
            params.push(...whereParams);
        }
        if (limit) {
            sql += ` LIMIT ${limit}`;
        }
        return this.db.query(sql, ...params);
    }
    /**
     * Insert new record and return insert ID
     */
    insert(data) {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`;
        return this.db.insert(sql, Object.values(data));
    }
    /**
     * Update record by ID
     */
    update(id, data) {
        const keys = Object.keys(data);
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const sql = `UPDATE ${this.table} SET ${setClause} WHERE id = ?`;
        const changes = this.db.update(sql, [...Object.values(data), id]);
        return changes > 0;
    }
    /**
     * Delete record by ID
     */
    delete(id) {
        const changes = this.db.delete(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
        return changes > 0;
    }
    /**
     * Count records matching conditions
     */
    count(where) {
        let sql = `SELECT COUNT(*) as count FROM ${this.table}`;
        const params = [];
        if (where && Object.keys(where).length > 0) {
            const { sql: whereSql, params: whereParams } = this.buildWhereQuery(where);
            sql += ' ' + whereSql;
            params.push(...whereParams);
        }
        const result = this.db.queryOne(sql, ...params);
        return result?.count ?? 0;
    }
    /**
     * Build WHERE clause from params object
     */
    buildWhereQuery(params) {
        if (Array.isArray(params)) {
            return { sql: 'WHERE 1=1', params: [] };
        }
        const conditions = [];
        const values = [];
        for (const [key, value] of Object.entries(params)) {
            if (value === null || value === undefined) {
                conditions.push(`${key} IS NULL`);
            }
            else {
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
export function createRepository(db, table) {
    return new BaseRepository(db, table);
}
//# sourceMappingURL=crud.js.map