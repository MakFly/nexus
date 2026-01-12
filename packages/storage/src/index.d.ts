/**
 * @nexus/storage - SQLite database layer with migrations
 * Sprint 0: Foundation
 * Sprint 9: Federation and Multi-Project support
 */
export type { SqlValue, SqlRow, SqlParams, DatabaseOptions } from './database.js';
export { Database, createDatabase, getDatabase, closeDatabase } from './database.js';
export { BaseRepository as Repository, createRepository } from './crud.js';
export { hash, hashSync, verify, hashContent, initHash } from './hash.js';
export { getGlobalDb, getProjectDb, getProjectDbPath, ensureNexusDirs, getFederationQuery, FederationQuery, type FederationQueryOptions, type FederatedResult } from './federation.js';
export { getProjectManager, ProjectManager, type ProjectMeta, type CreateProjectOptions } from './project-manager.js';
//# sourceMappingURL=index.d.ts.map