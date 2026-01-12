/**
 * @nexus/storage - SQLite database layer with migrations
 * Sprint 0: Foundation
 * Sprint 9: Federation and Multi-Project support
 */
// Database
export { Database, createDatabase, getDatabase, closeDatabase } from './database.js';
// CRUD helpers
export { BaseRepository as Repository, createRepository } from './crud.js';
// Hash utilities (async API)
export { hash, hashSync, verify, hashContent, initHash } from './hash.js';
// Federation (Sprint 9)
export { getGlobalDb, getProjectDb, getProjectDbPath, ensureNexusDirs, getFederationQuery, FederationQuery } from './federation.js';
// Project Manager (Sprint 9)
export { getProjectManager, ProjectManager } from './project-manager.js';
//# sourceMappingURL=index.js.map