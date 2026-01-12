/**
 * Database - SQLite wrapper with migrations and CRUD helpers
 * Sprint 0: Foundation - Core storage layer
 */
import { Database as BunSqlite } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';
// Migration files - resolve from package root (works in both src/ and dist/)
const MIGRATIONS_DIR = join(import.meta.dir, '..', 'src', 'migrations');
/**
 * Database class with migration support and CRUD helpers
 */
export class Database {
    db;
    verbose;
    constructor(options = {}) {
        const { path = ':memory:', verbose = false } = options;
        this.verbose = verbose;
        // bun:sqlite constructor only takes path string
        this.db = new BunSqlite(path);
        // Enable WAL mode for better concurrency
        this.db.exec('PRAGMA journal_mode = WAL');
        this.db.exec('PRAGMA foreign_keys = ON');
    }
    /**
     * Initialize database and run pending migrations
     */
    init() {
        this.ensureMigrationsTable();
        this.runMigrations();
    }
    /**
     * Ensure migrations tracking table exists
     */
    ensureMigrationsTable() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at INTEGER NOT NULL
      )
    `);
    }
    /**
     * Get list of applied migrations
     */
    getAppliedMigrations() {
        const rows = this.db.query('SELECT name FROM _migrations').all();
        return new Set(rows.map(r => r.name));
    }
    /**
     * Run all pending migrations
     */
    runMigrations() {
        const applied = this.getAppliedMigrations();
        // For now, hardcode the migration files
        // In production, scan the migrations directory
        const migrations = ['001_unified_schema.sql', '002_memory_system.sql', '003_projects.sql', '004_automation.sql', '005_settings.sql', '006_compression.sql'];
        for (const migration of migrations) {
            if (applied.has(migration)) {
                if (this.verbose)
                    console.log(`[DB] Migration ${migration} already applied`);
                continue;
            }
            this.log(`[DB] Applying migration: ${migration}`);
            const sql = readFileSync(join(MIGRATIONS_DIR, migration), 'utf-8');
            this.db.exec(sql);
            // Record migration
            this.db.run('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)', [migration, Date.now()]);
            this.log(`[DB] Migration ${migration} applied`);
        }
    }
    /**
     * Execute a SELECT query and return all rows
     */
    query(sql, ...params) {
        this.logQuery(sql, params);
        const stmt = this.db.query(sql);
        const result = stmt.all(...params);
        return result;
    }
    /**
     * Execute a SELECT query and return first row
     */
    queryOne(sql, ...params) {
        this.logQuery(sql, params);
        const stmt = this.db.query(sql);
        const result = stmt.get(...params);
        return result;
    }
    /**
     * Execute an INSERT query and return last insert id
     */
    insert(sql, params) {
        this.logQuery(sql, params);
        const stmt = this.db.query(sql);
        const result = stmt.run(...this.paramsToArray(params));
        return result.lastInsertRowid;
    }
    /**
     * Execute an UPDATE query and return number of changes
     */
    update(sql, params) {
        this.logQuery(sql, params);
        const stmt = this.db.query(sql);
        const result = stmt.run(...this.paramsToArray(params));
        return result.changes;
    }
    /**
     * Execute a DELETE query and return number of changes
     */
    delete(sql, params) {
        this.logQuery(sql, params);
        const stmt = this.db.query(sql);
        const result = stmt.run(...this.paramsToArray(params));
        return result.changes;
    }
    /**
     * Execute any query (INSERT/UPDATE/DELETE) and return changes + lastInsertRowid
     * Generic method for routes that need both insert ID and change count
     */
    run(sql, ...params) {
        this.logQuery(sql, params);
        const stmt = this.db.query(sql);
        const result = stmt.run(...params);
        return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
    /**
     * Prepare a statement for repeated execution
     * Returns an object with run method that accepts parameters
     */
    prepare(sql) {
        this.logQuery(sql);
        const stmt = this.db.query(sql);
        return {
            run: (...params) => {
                const result = stmt.run(...params);
                return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
            }
        };
    }
    /**
     * Execute arbitrary SQL (for schema changes, etc.)
     */
    exec(sql) {
        this.logQuery(sql);
        this.db.exec(sql);
    }
    /**
     * Begin a transaction
     */
    begin() {
        this.db.exec('BEGIN TRANSACTION');
    }
    /**
     * Commit a transaction
     */
    commit() {
        this.db.exec('COMMIT');
    }
    /**
     * Rollback a transaction
     */
    rollback() {
        this.db.exec('ROLLBACK');
    }
    /**
     * Execute a function within a transaction
     * Using arrow function approach to preserve 'this'
     */
    transaction = (fn) => {
        this.begin();
        try {
            const result = fn();
            this.commit();
            return result;
        }
        catch (e) {
            this.rollback();
            throw e;
        }
    };
    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
    /**
     * Get underlying bun:sqlite instance (for advanced usage)
     */
    get raw() {
        return this.db;
    }
    /**
     * Convert params object to array for prepared statements
     */
    paramsToArray(params) {
        if (!params)
            return [];
        if (Array.isArray(params))
            return params;
        return Object.values(params);
    }
    /**
     * Log query if verbose mode is enabled
     */
    logQuery(sql, params) {
        if (!this.verbose)
            return;
        const paramsStr = params ? JSON.stringify(params) : '';
        console.log(`[DB] Query: ${sql.substring(0, 100)}... ${paramsStr}`);
    }
    /**
     * Log message if verbose mode is enabled
     */
    log(msg) {
        if (!this.verbose)
            return;
        console.log(msg);
    }
}
/**
 * Create and initialize a database instance
 */
export function createDatabase(options) {
    const db = new Database(options);
    db.init();
    return db;
}
/**
 * Default database singleton (lazy initialized)
 */
let defaultDb = null;
/**
 * Get or create default database instance
 */
export function getDatabase(options) {
    if (!defaultDb) {
        defaultDb = createDatabase(options);
    }
    return defaultDb;
}
/**
 * Close default database instance
 */
export function closeDatabase() {
    if (defaultDb) {
        defaultDb.close();
        defaultDb = null;
    }
}
//# sourceMappingURL=database.js.map