/**
 * WebSocket Server for Real-time Updates
 *
 * Provides real-time communication for:
 * - Memory created/updated/deleted events
 * - Context changes
 * - Relationship suggestions
 * - Search results
 * - Automation triggers
 */

import { serve } from 'bun';
import { EventEmitter } from 'eventemitter3';
import { onEvent, EventType } from '../events/index.js';

/**
 * WebSocket message types
 */
export enum WSMessageType {
  // Client -> Server
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  SEARCH = 'search',
  GET_ACTIVE_CONTEXT = 'get_active_context',

  // Server -> Client
  EVENT = 'event',
  UPDATE = 'update',
  ERROR = 'error',
  PONG = 'pong',
}

/**
 * WebSocket subscription filter
 */
export interface SubscriptionFilter {
  eventTypes?: EventType[];
  contextId?: string;
}

/**
 * Connected client
 */
interface WSClient {
  id: string;
  ws: any; // Bun WebSocket
  subscriptions: Set<string>; // Event type subscriptions
  filters: SubscriptionFilter;
  connectedAt: Date;
}

/**
 * WebSocket server configuration
 */
export interface WebSocketServerConfig {
  port: number;
  path: string;
}

/**
 * WebSocket server class
 */
export class WebSocketServer {
  private server: any;
  private clients: Map<string, WSClient> = new Map();
  private eventEmitter: EventEmitter;
  private config: WebSocketServerConfig;

  constructor(config: WebSocketServerConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Start the WebSocket server
   */
  start(): void {
    this.server = serve({
      port: this.config.port,
      fetch: (req: Request) => {
        // Only handle WebSocket upgrade requests
        const upgradeHeader = req.headers.get('upgrade');
        if (upgradeHeader !== 'websocket') {
          return new Response('Expected WebSocket', { status: 426 });
        }

        return this.handleUpgrade(req);
      },
      websocket: {
        message: (ws: any, message: string | Buffer) => this.handleMessage(ws, message),
        open: (ws: any) => this.handleOpen(ws),
        close: (ws: any) => this.handleClose(ws),
      },
    });

    console.log(`[WS] WebSocket server running on ws://localhost:${this.config.port}`);

    // Subscribe to internal events
    this.subscribeToEvents();
  }

  /**
   * Handle WebSocket upgrade
   */
  private handleUpgrade(req: Request): Response {
    const success = this.server.upgrade(req);

    if (!success) {
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    return new Response(); // Success
  }

  /**
   * Handle new WebSocket connection
   */
  private handleOpen(ws: any): void {
    const clientId = this.generateClientId();
    const client: WSClient = {
      id: clientId,
      ws,
      subscriptions: new Set(),
      filters: {},
      connectedAt: new Date(),
    };

    this.clients.set(clientId, client);

    console.log(`[WS] Client connected: ${clientId}`);

    // Send welcome message
    this.send(client, {
      type: WSMessageType.EVENT,
      data: {
        event: 'connected',
        clientId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Handle WebSocket message
   */
  private async handleMessage(ws: any, message: string | Buffer): Promise<void> {
    const client = this.findClientByWs(ws);
    if (!client) return;

    try {
      const data = JSON.parse(message.toString());
      await this.processMessage(client, data);
    } catch (error) {
      this.sendError(client, 'Invalid message format');
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(ws: any): void {
    const client = this.findClientByWs(ws);
    if (client) {
      console.log(`[WS] Client disconnected: ${client.id}`);
      this.clients.delete(client.id);
    }
  }

  /**
   * Process client message
   */
  private async processMessage(client: WSClient, data: any): Promise<void> {
    switch (data.type) {
      case WSMessageType.SUBSCRIBE:
        this.handleSubscribe(client, data);
        break;

      case WSMessageType.UNSUBSCRIBE:
        this.handleUnsubscribe(client, data);
        break;

      case WSMessageType.SEARCH:
        await this.handleSearch(client, data);
        break;

      case WSMessageType.GET_ACTIVE_CONTEXT:
        this.handleGetActiveContext(client);
        break;

      default:
        this.sendError(client, `Unknown message type: ${data.type}`);
    }
  }

  /**
   * Handle subscription request
   */
  private handleSubscribe(client: WSClient, data: any): void {
    const { eventTypes, filters } = data;

    if (eventTypes && Array.isArray(eventTypes)) {
      eventTypes.forEach((type: string) => client.subscriptions.add(type));
    } else {
      // Subscribe to all events
      Object.values(EventType).forEach(type => client.subscriptions.add(type));
    }

    if (filters) {
      client.filters = { ...client.filters, ...filters };
    }

    this.send(client, {
      type: WSMessageType.EVENT,
      data: {
        event: 'subscribed',
        subscriptions: Array.from(client.subscriptions),
      },
    });
  }

  /**
   * Handle unsubscribe request
   */
  private handleUnsubscribe(client: WSClient, data: any): void {
    const { eventTypes } = data;

    if (eventTypes && Array.isArray(eventTypes)) {
      eventTypes.forEach((type: string) => client.subscriptions.delete(type));
    } else {
      client.subscriptions.clear();
    }

    this.send(client, {
      type: WSMessageType.EVENT,
      data: {
        event: 'unsubscribed',
        subscriptions: Array.from(client.subscriptions),
      },
    });
  }

  /**
   * Handle search request
   */
  private async handleSearch(client: WSClient, data: any): Promise<void> {
    try {
      const { smartSearch } = await import('../automations/smart-search.js');
      const results = await smartSearch(data.query, {
        contextId: data.contextId,
        type: data.type,
        limit: data.limit || 10,
      });

      this.send(client, {
        type: WSMessageType.UPDATE,
        data: {
          type: 'search_results',
          query: data.query,
          results,
        },
      });
    } catch (error) {
      this.sendError(client, `Search failed: ${error}`);
    }
  }

  /**
   * Handle get active context request
   */
  private handleGetActiveContext(client: WSClient): void {
    const { getActiveContext } = require('../automations/auto-context.js');
    const activeContextId = getActiveContext();

    this.send(client, {
      type: WSMessageType.UPDATE,
      data: {
        type: 'active_context',
        contextId: activeContextId,
      },
    });
  }

  /**
   * Subscribe to internal events
   */
  private subscribeToEvents(): void {
    // Subscribe to all events
    onEvent('*', (event) => {
      this.broadcastEvent(event);
    });
  }

  /**
   * Broadcast event to subscribed clients
   */
  private broadcastEvent(event: any): void {
    for (const client of this.clients.values()) {
      // Check if client is subscribed to this event type
      if (!client.subscriptions.has(event.type) && !client.subscriptions.has('*')) {
        continue;
      }

      // Apply filters
      if (client.filters.contextId && event.data?.contextId !== client.filters.contextId) {
        continue;
      }

      this.send(client, {
        type: WSMessageType.EVENT,
        data: event,
      });
    }
  }

  /**
   * Send message to client
   */
  private send(client: WSClient, data: any): void {
    try {
      client.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error(`[WS] Failed to send to client ${client.id}:`, error);
    }
  }

  /**
   * Send error to client
   */
  private sendError(client: WSClient, message: string): void {
    this.send(client, {
      type: WSMessageType.ERROR,
      data: { error: message },
    });
  }

  /**
   * Find client by WebSocket
   */
  private findClientByWs(ws: any): WSClient | undefined {
    for (const client of this.clients.values()) {
      if (client.ws === ws) {
        return client;
      }
    }
    return undefined;
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get server stats
   */
  getStats(): {
    connectedClients: number;
    totalSubscriptions: number;
    clients: Array<{
      id: string;
      subscriptions: number;
      connectedAt: Date;
    }>;
  } {
    return {
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.clients.values()).reduce(
        (sum, client) => sum + client.subscriptions.size,
        0
      ),
      clients: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        subscriptions: client.subscriptions.size,
        connectedAt: client.connectedAt,
      })),
    };
  }

  /**
   * Stop the server
   */
  stop(): void {
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();

    if (this.server) {
      this.server.stop();
    }

    console.log('[WS] WebSocket server stopped');
  }
}

/**
 * Create and start a WebSocket server
 */
export function createWebSocketServer(config?: Partial<WebSocketServerConfig>): WebSocketServer {
  const finalConfig: WebSocketServerConfig = {
    port: 3002,
    path: '/ws',
    ...config,
  };

  const server = new WebSocketServer(finalConfig);
  server.start();

  return server;
}
