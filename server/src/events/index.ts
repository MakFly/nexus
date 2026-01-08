/**
 * Event System for Free Context MCP
 *
 * Provides an event-driven architecture for internal and external hooks.
 * Events are emitted on all significant actions (memory created, context updated, etc.)
 * and can be consumed by internal hooks or logged for external hooks.
 */

import EventEmitter from 'eventemitter3';

/**
 * Event types emitted by the system
 */
export enum EventType {
  // Memory events
  MEMORY_CREATED = 'memory:created',
  MEMORY_UPDATED = 'memory:updated',
  MEMORY_DELETED = 'memory:deleted',

  // Context events
  CONTEXT_CREATED = 'context:created',
  CONTEXT_UPDATED = 'context:updated',
  CONTEXT_DELETED = 'context:deleted',

  // Search events
  SEARCH_PERFORMED = 'search:performed',

  // Relationship events
  RELATIONSHIP_FOUND = 'relationship:found',
  RELATIONSHIP_CREATED = 'relationship:created',
  RELATIONSHIP_DELETED = 'relationship:deleted',

  // Automation events
  AUTOMATION_TRIGGERED = 'automation:triggered',
  AUTOMATION_SUCCEEDED = 'automation:succeeded',
  AUTOMATION_FAILED = 'automation:failed',

  // Tool events
  TOOL_CALLED = 'tool:called',
  TOOL_SUCCEEDED = 'tool:succeeded',
  TOOL_FAILED = 'tool:failed',
}

/**
 * Event payload structure
 */
export interface Event {
  type: EventType;
  data: Record<string, unknown>;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Event listener function type
 */
export type EventListener = (event: Event) => void | Promise<void>;

/**
 * Global event emitter instance
 */
class EventSystem {
  private emitter: EventEmitter;
  private eventHistory: Event[] = [];
  private maxHistorySize = 1000;

  constructor() {
    this.emitter = new EventEmitter();
  }

  /**
   * Emit an event to all registered listeners
   */
  emit(event: Omit<Event, 'timestamp'>): Event {
    const fullEvent: Event = {
      ...event,
      timestamp: new Date(),
    };

    // Add to history
    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Emit to all listeners
    this.emitter.emit(event.type, fullEvent);
    this.emitter.emit('*', fullEvent); // Wildcard for all events

    return fullEvent;
  }

  /**
   * Register a listener for a specific event type
   */
  on(eventType: EventType | '*', listener: EventListener): void {
    this.emitter.on(eventType, listener);
  }

  /**
   * Register a one-time listener for a specific event type
   */
  once(eventType: EventType | '*', listener: EventListener): void {
    this.emitter.once(eventType, listener);
  }

  /**
   * Remove a listener for a specific event type
   */
  off(eventType: EventType | '*', listener: EventListener): void {
    this.emitter.off(eventType, listener);
  }

  /**
   * Remove all listeners for a specific event type
   */
  removeAllListeners(eventType?: EventType | '*'): void {
    if (eventType) {
      this.emitter.removeAllListeners(eventType);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  /**
   * Get event history
   */
  getHistory(limit?: number): Event[] {
    if (limit) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  /**
   * Get event history filtered by type
   */
  getHistoryByType(eventType: EventType, limit?: number): Event[] {
    const filtered = this.eventHistory.filter((e) => e.type === eventType);
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }


  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get statistics about events
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};

    for (const event of this.eventHistory) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    }

    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
    };
  }
}

/**
 * Global event system instance
 */
export const eventSystem = new EventSystem();

/**
 * Convenience function to emit events
 */
export function emitEvent(
  type: EventType,
  data: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Event {
  return eventSystem.emit({ type, data, metadata });
}

/**
 * Convenience function to register event listeners
 */
export function onEvent(
  eventType: EventType | '*',
  listener: EventListener
): void {
  eventSystem.on(eventType, listener);
}

/**
 * Convenience function to remove event listeners
 */
export function offEvent(
  eventType: EventType | '*',
  listener: EventListener
): void {
  eventSystem.off(eventType, listener);
}
