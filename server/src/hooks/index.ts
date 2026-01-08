/**
 * Internal Hook System for Free Context MCP
 *
 * Provides a flexible hook system that allows executing custom logic
 * before (pre) and after (post) tool execution. Hooks can be used for:
 * - Logging
 * - Validation
 * - Data transformation
 * - Event emission
 * - Automation triggers
 */

import { emitEvent, EventType } from '../events/index.js';

/**
 * Hook context passed to hook functions
 */
export interface HookContext {
  toolName: string;
  args: unknown;
  startTime: Date;
}

/**
 * Hook result after tool execution
 */
export interface HookResult {
  toolName: string;
  args: unknown;
  result: unknown;
  startTime: Date;
  endTime: Date;
  success: boolean;
  error?: Error;
}

/**
 * Hook function types
 */
export type PreHookFunction = (context: HookContext) => void | Promise<void>;
export type PostHookFunction = (result: HookResult) => void | Promise<void>;

/**
 * Hook registration with optional filter
 */
export interface HookRegistration {
  fn: PreHookFunction | PostHookFunction;
  toolName?: string | string[]; // undefined = all tools
  priority?: number; // Higher priority runs first
}

/**
 * Hook system class
 */
class HookSystem {
  private preHooks: Map<string, HookRegistration[]> = new Map();
  private postHooks: Map<string, HookRegistration[]> = new Map();
  private globalPreHooks: HookRegistration[] = [];
  private globalPostHooks: HookRegistration[] = [];

  /**
   * Register a pre-hook (executed before tool call)
   */
  registerPreHook(
    toolName: string | string[] | undefined,
    fn: PreHookFunction,
    priority = 0
  ): void {
    const registration: HookRegistration = { fn, toolName, priority };

    if (toolName === undefined) {
      this.globalPreHooks.push(registration);
      this.sortHooks(this.globalPreHooks);
    } else {
      const names = Array.isArray(toolName) ? toolName : [toolName];
      for (const name of names) {
        if (!this.preHooks.has(name)) {
          this.preHooks.set(name, []);
        }
        this.preHooks.get(name)!.push(registration);
        this.sortHooks(this.preHooks.get(name)!);
      }
    }
  }

  /**
   * Register a post-hook (executed after tool call)
   */
  registerPostHook(
    toolName: string | string[] | undefined,
    fn: PostHookFunction,
    priority = 0
  ): void {
    const registration: HookRegistration = { fn, toolName, priority };

    if (toolName === undefined) {
      this.globalPostHooks.push(registration);
      this.sortHooks(this.globalPostHooks);
    } else {
      const names = Array.isArray(toolName) ? toolName : [toolName];
      for (const name of names) {
        if (!this.postHooks.has(name)) {
          this.postHooks.set(name, []);
        }
        this.postHooks.get(name)!.push(registration);
        this.sortHooks(this.postHooks.get(name)!);
      }
    }
  }

  /**
   * Sort hooks by priority (highest first)
   */
  private sortHooks(hooks: HookRegistration[]): void {
    hooks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Execute all pre-hooks for a tool
   */
  async executePreHooks(context: HookContext): Promise<void> {
    const toolSpecific = this.preHooks.get(context.toolName) || [];
    const hooks = [...this.globalPreHooks, ...toolSpecific];

    // Emit tool called event
    emitEvent(
      EventType.TOOL_CALLED,
      {
        toolName: context.toolName,
        args: context.args,
      }
    );

    // Execute all pre-hooks
    for (const hook of hooks) {
      try {
        await (hook.fn as PreHookFunction)(context);
      } catch (error) {
        console.error(`[Hook Error] Pre-hook failed for ${context.toolName}:`, error);
        // Continue executing other hooks even if one fails
      }
    }
  }

  /**
   * Execute all post-hooks for a tool
   */
  async executePostHooks(result: HookResult): Promise<void> {
    const toolSpecific = this.postHooks.get(result.toolName) || [];
    const hooks = [...this.globalPostHooks, ...toolSpecific];

    // Emit tool succeeded/failed event
    if (result.success) {
      emitEvent(
        EventType.TOOL_SUCCEEDED,
        {
          toolName: result.toolName,
          args: result.args,
          duration: result.endTime.getTime() - result.startTime.getTime(),
        }
      );
    } else {
      emitEvent(
        EventType.TOOL_FAILED,
        {
          toolName: result.toolName,
          args: result.args,
          error: result.error?.message,
        }
      );
    }

    // Execute all post-hooks
    for (const hook of hooks) {
      try {
        await (hook.fn as PostHookFunction)(result);
      } catch (error) {
        console.error(`[Hook Error] Post-hook failed for ${result.toolName}:`, error);
        // Continue executing other hooks even if one fails
      }
    }
  }

  /**
   * Remove all hooks for a specific tool
   */
  removeHooks(toolName: string): void {
    this.preHooks.delete(toolName);
    this.postHooks.delete(toolName);
  }

  /**
   * Clear all hooks
   */
  clearAllHooks(): void {
    this.preHooks.clear();
    this.postHooks.clear();
    this.globalPreHooks = [];
    this.globalPostHooks = [];
  }

  /**
   * Get statistics about registered hooks
   */
  getStats(): {
    totalPreHooks: number;
    totalPostHooks: number;
    hooksByTool: Record<string, { pre: number; post: number }>;
  } {
    const hooksByTool: Record<string, { pre: number; post: number }> = {};

    // Count tool-specific hooks
    for (const [toolName, hooks] of this.preHooks.entries()) {
      if (!hooksByTool[toolName]) hooksByTool[toolName] = { pre: 0, post: 0 };
      hooksByTool[toolName].pre += hooks.length;
    }
    for (const [toolName, hooks] of this.postHooks.entries()) {
      if (!hooksByTool[toolName]) hooksByTool[toolName] = { pre: 0, post: 0 };
      hooksByTool[toolName].post += hooks.length;
    }

    // Count global hooks
    const totalPreHooks = this.globalPreHooks.length +
      Array.from(this.preHooks.values()).reduce((sum, hooks) => sum + hooks.length, 0);
    const totalPostHooks = this.globalPostHooks.length +
      Array.from(this.postHooks.values()).reduce((sum, hooks) => sum + hooks.length, 0);

    return {
      totalPreHooks,
      totalPostHooks,
      hooksByTool,
    };
  }
}

/**
 * Global hook system instance
 */
export const hookSystem = new HookSystem();

/**
 * Wrapper function to execute a tool with hooks
 *
 * Usage:
 * ```typescript
 * const result = await withHooks(
 *   'add_memory',
 *   args,
 *   async () => {
 *     // Actual tool implementation
 *     return await addMemory(args);
 *   }
 * );
 * ```
 */
export async function withHooks<T>(
  toolName: string,
  args: unknown,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = new Date();

  // Execute pre-hooks
  await hookSystem.executePreHooks({
    toolName,
    args,
    startTime,
  });

  // Execute the actual function
  let result: T;
  let success = true;
  let error: Error | undefined;

  try {
    result = await fn();
  } catch (e) {
    success = false;
    error = e instanceof Error ? e : new Error(String(e));
    throw e; // Re-throw the error
  } finally {
    // Execute post-hooks
    const endTime = new Date();
    await hookSystem.executePostHooks({
      toolName,
      args,
      result: success ? result : undefined,
      startTime,
      endTime,
      success,
      error,
    });
  }

  return result;
}

/**
 * Convenience function to register a pre-hook
 */
export function registerPreHook(
  toolName: string | string[] | undefined,
  fn: PreHookFunction,
  priority?: number
): void {
  hookSystem.registerPreHook(toolName, fn, priority);
}

/**
 * Convenience function to register a post-hook
 */
export function registerPostHook(
  toolName: string | string[] | undefined,
  fn: PostHookFunction,
  priority?: number
): void {
  hookSystem.registerPostHook(toolName, fn, priority);
}

/**
 * Built-in hooks
 */

/**
 * Logging hook - logs all tool calls
 */
export function createLoggingHook(): PreHookFunction {
  return (context) => {
    console.log(`[Hook] Tool called: ${context.toolName}`);
    if (context.args) {
      console.log(`[Hook] Args:`, JSON.stringify(context.args, null, 2));
    }
  };
}

/**
 * Performance monitoring hook - measures execution time
 */
export function createPerformanceHook(): PostHookFunction {
  return (result) => {
    const duration = result.endTime.getTime() - result.startTime.getTime();
    if (duration > 1000) {
      console.warn(
        `[Hook] Slow tool execution: ${result.toolName} took ${duration}ms`
      );
    }
  };
}

/**
 * Memory tracking hook - emits events for memory operations
 */
export function createMemoryTrackingHook(): PostHookFunction {
  return (result) => {
    if (!result.success) return;

    const memoryTools = ['add_memory', 'update_memory', 'delete_memory'];
    if (memoryTools.includes(result.toolName)) {
      const operation = result.toolName.split('_')[0]; // add, update, delete
      const eventType = operation === 'add'
        ? EventType.MEMORY_CREATED
        : operation === 'update'
        ? EventType.MEMORY_UPDATED
        : EventType.MEMORY_DELETED;

      if (result.result && typeof result.result === 'object') {
        // Extract memory data from result if available
        const data = result.result as Record<string, unknown>;
        emitEvent(eventType, data);
      }
    }
  };
}

/**
 * Context tracking hook - emits events for context operations
 */
export function createContextTrackingHook(): PostHookFunction {
  return (result) => {
    if (!result.success) return;

    const contextTools = ['create_context', 'update_context', 'delete_context'];
    if (contextTools.includes(result.toolName)) {
      const operation = result.toolName.split('_')[0];
      const eventType = operation === 'create'
        ? EventType.CONTEXT_CREATED
        : operation === 'update'
        ? EventType.CONTEXT_UPDATED
        : EventType.CONTEXT_DELETED;

      if (result.result && typeof result.result === 'object') {
        const data = result.result as Record<string, unknown>;
        emitEvent(eventType, data);
      }
    }
  };
}
