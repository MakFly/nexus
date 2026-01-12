/**
 * @nexus/storage - Project Manager
 * Sprint 9: Multi-project management
 *
 * Handles:
 * - Project registration and detection
 * - Path-to-project mapping
 * - Project metadata and stats
 * - Pattern promotion (project → global)
 */
/**
 * Project metadata
 */
export interface ProjectMeta {
    id: number;
    name: string;
    root_path: string;
    description?: string;
    created_at: string;
    updated_at: string;
    last_indexed_at?: string;
    file_count: number;
    chunk_count: number;
    memory_count: number;
    pattern_count: number;
    [key: string]: any;
}
/**
 * Create project options
 */
export interface CreateProjectOptions {
    name: string;
    root_path: string;
    description?: string;
}
/**
 * Project Manager
 */
export declare class ProjectManager {
    private globalDb;
    /**
     * Initialize project manager
     */
    init(): Promise<void>;
    /**
     * Register a new project
     */
    registerProject(options: CreateProjectOptions): Promise<ProjectMeta>;
    /**
     * Initialize project database schema
     */
    private initProjectDb;
    /**
     * Detect project by path
     */
    detectProject(path: string): Promise<ProjectMeta | null>;
    /**
     * List all projects
     */
    listProjects(): ProjectMeta[];
    /**
     * Get project by name
     */
    getProject(name: string): Promise<ProjectMeta | null>;
    /**
     * Update project stats
     */
    updateProjectStats(name: string): Promise<void>;
    /**
     * Promote pattern to global
     */
    promotePattern(patternId: number, fromProject: string): Promise<void>;
    /**
     * Close connections
     */
    close(): void;
}
export declare function getProjectManager(): Promise<ProjectManager>;
//# sourceMappingURL=project-manager.d.ts.map