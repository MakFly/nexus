/**
 * API client for communicating with the Free Context backend
 * Uses fetch API with proper error handling and TypeScript typing
 */

import type {
  ApiResponse,
  BulkOperationResult,
  Context,
  Memory,
  MemoryFilters,
  PaginatedResponse,
  SearchFilters,
  SearchResult,
  SearchFirstResponse,
} from "@/types";

/**
 * Base configuration for API requests
 * Uses environment variable for flexible deployment
 */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Wrapper for fetch with consistent error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...DEFAULT_HEADERS,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData,
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error",
      0,
      error,
    );
  }
}

/**
 * Contexts API
 */
export const contextsApi = {
  /**
   * Fetch all contexts
   */
  getAll: async (): Promise<Array<Context>> => {
    const response = await fetchApi<{
      success: boolean;
      data: { contexts: Array<Context>; total: number };
    }>("/contexts");
    // Tags are already arrays from Drizzle ORM, no need to parse
    return response.data.contexts;
  },

  /**
   * Fetch a single context by ID
   */
  getById: async (id: string): Promise<Context> => {
    const response = await fetchApi<{
      success: boolean;
      data: { context: Context };
    }>(`/contexts/${id}`);
    return response.data.context;
  },

  /**
   * Create a new context
   */
  create: async (
    data: Omit<Context, "id" | "createdAt" | "updatedAt">,
  ): Promise<Context> => {
    const response = await fetchApi<{
      success: boolean;
      data: { context: Context };
    }>("/contexts", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data.context;
  },

  /**
   * Update an existing context
   */
  update: async (id: string, data: Partial<Context>): Promise<Context> => {
    const response = await fetchApi<{
      success: boolean;
      data: { context: Context };
    }>(`/contexts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.data.context;
  },

  /**
   * Delete a context
   */
  delete: async (id: string): Promise<void> => {
    await fetchApi<{ success: boolean }>(`/contexts/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Get statistics for a context
   */
  getStats: async (
    id: string,
  ): Promise<{
    memoryCount: number;
    typeDistribution: Record<string, number>;
  }> => {
    return fetchApi(`/contexts/${id}/stats`);
  },
};

/**
 * Memories API
 */
export const memoriesApi = {
  /**
   * Fetch all memories with optional filters
   */
  getAll: async (filters?: MemoryFilters): Promise<Array<Memory>> => {
    const params = new URLSearchParams();
    if (filters?.contextId) params.append("contextId", filters.contextId);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.tags) params.append("tags", filters.join(","));
    if (filters?.searchQuery) params.append("q", filters.searchQuery);
    if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.append("dateTo", filters.dateTo);

    const queryString = params.toString();
    const response = await fetchApi<{
      success: boolean;
      data: { memories: Array<Memory>; total: number };
    }>(`/memories${queryString ? `?${queryString}` : ""}`);
    // Tags are already arrays from Drizzle ORM
    return response.data.memories;
  },

  /**
   * Fetch paginated memories
   */
  getPaginated: async (
    page = 1,
    pageSize = 20,
    filters?: MemoryFilters,
  ): Promise<PaginatedResponse<Memory>> => {
    const params = new URLSearchParams();
    if (filters?.contextId) params.append("contextId", filters.contextId);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.tags) params.append("tags", filters.join(","));
    if (filters?.searchQuery) params.append("q", filters.searchQuery);
    // Backend uses limit/offset, not page/pageSize
    params.append("limit", String(pageSize));
    params.append("offset", String((page - 1) * pageSize));

    const queryString = params.toString();
    const response = await fetchApi<{
      success: boolean;
      data: { memories: Array<Memory>; total: number };
    }>(`/memories${queryString ? `?${queryString}` : ""}`);

    // Transform backend response to frontend format
    return {
      items: response.data.memories,
      total: response.data.total,
      page,
      pageSize,
      totalPages: Math.ceil(response.data.total / pageSize),
    };
  },

  /**
   * Fetch a single memory by ID
   */
  getById: async (id: string): Promise<Memory> => {
    const response = await fetchApi<{
      success: boolean;
      data: { memory: Memory };
    }>(`/memories/${id}`);
    return response.data.memory;
  },

  /**
   * Create a new memory
   */
  create: async (
    data: Omit<Memory, "id" | "createdAt" | "updatedAt">,
  ): Promise<Memory> => {
    const response = await fetchApi<{
      success: boolean;
      data: { memory: Memory };
    }>("/memories", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data.memory;
  },

  /**
   * Update an existing memory
   */
  update: async (id: string, data: Partial<Memory>): Promise<Memory> => {
    const response = await fetchApi<{
      success: boolean;
      data: { memory: Memory };
    }>(`/memories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.data.memory;
  },

  /**
   * Delete a memory
   */
  delete: async (id: string): Promise<void> => {
    await fetchApi<{ success: boolean }>(`/memories/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Bulk delete memories
   */
  bulkDelete: async (ids: Array<string>): Promise<BulkOperationResult> => {
    return fetchApi<BulkOperationResult>("/memories/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  /**
   * Get memories for a specific context
   */
  getByContext: async (contextId: string): Promise<Array<Memory>> => {
    const response = await fetchApi<{
      success: boolean;
      data: { memories: Array<Memory> };
    }>(`/contexts/${contextId}/memories`);
    // Tags are already arrays from Drizzle ORM
    return response.data.memories;
  },
};

/**
 * Search API
 */
export const searchApi = {
  /**
   * Search-First: Execute search with compact excerpts (POST)
   * This is the recommended method for searching memories
   * Returns lightweight results to minimize token usage
   */
  searchFirst: async (
    query: string,
    filters?: SearchFilters,
  ): Promise<SearchFirstResponse> => {
    const response = await fetchApi<{
      success: boolean;
      data: SearchFirstResponse;
    }>("/search", {
      method: "POST",
      body: JSON.stringify({
        query,
        contextId: filters?.contextId,
        type:
          filters?.type && filters.type !== "all" ? filters.type : undefined,
        limit: filters?.limit || 10,
        mode: filters?.mode || "compact",
      }),
    });
    return response.data;
  },

  /**
   * Legacy: Execute a search query (GET)
   * @deprecated Use searchFirst() instead for better token efficiency
   */
  search: async (
    query: string,
    filters?: SearchFilters,
  ): Promise<Array<SearchResult>> => {
    const params = new URLSearchParams();
    params.append("q", query);
    if (filters?.type && filters.type !== "all") {
      params.append("type", filters.type);
    }
    if (filters?.contextId) {
      params.append("contextId", filters.contextId);
    }
    if (filters?.dateFrom) {
      params.append("dateFrom", filters.dateFrom);
    }
    if (filters?.dateTo) {
      params.append("dateTo", filters.dateTo);
    }
    if (filters?.tags && filters.tags.length > 0) {
      params.append("tags", filters.tags.join(","));
    }
    if (filters?.priority) {
      params.append("priority", filters.priority);
    }

    const queryString = params.toString();
    return fetchApi<Array<SearchResult>>(
      `/search${queryString ? `?${queryString}` : ""}`,
    );
  },

  /**
   * Get search suggestions
   */
  suggestions: async (query: string, limit = 5): Promise<Array<string>> => {
    return fetchApi<Array<string>>(
      `/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
  },

  /**
   * Get recent searches
   */
  recent: async (
    limit = 10,
  ): Promise<Array<{ query: string; timestamp: string }>> => {
    return fetchApi(`/search/recent?limit=${limit}`);
  },
};

/**
 * System API (health, version, etc.)
 */
export const systemApi = {
  /**
   * Check API health
   */
  health: async (): Promise<{ status: string; version: string }> => {
    return fetchApi("/health");
  },

  /**
   * Get system stats
   */
  stats: async (): Promise<{
    totalContexts: number;
    totalMemories: number;
    storageUsed: number;
  }> => {
    return fetchApi("/stats");
  },
};

/**
 * Export all APIs as a single object for convenience
 */
export const api = {
  contexts: contextsApi,
  memories: memoriesApi,
  search: searchApi,
  system: systemApi,
};
