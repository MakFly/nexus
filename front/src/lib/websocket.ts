/**
 * WebSocket Client for Free Context
 *
 * Provides real-time updates for:
 * - Memory created/updated/deleted
 * - Context changes
 * - Relationship suggestions
 * - Automation triggers
 */

enum WSMessageType {
  // Client -> Server
  SUBSCRIBE = "subscribe",
  UNSUBSCRIBE = "unsubscribe",
  SEARCH = "search",
  GET_ACTIVE_CONTEXT = "get_active_context",

  // Server -> Client
  EVENT = "event",
  UPDATE = "update",
  ERROR = "error",
  PONG = "pong",
}

type WSMessage =
  | { type: WSMessageType.SUBSCRIBE; eventTypes?: string[]; filters?: any }
  | { type: WSMessageType.UNSUBSCRIBE; eventTypes?: string[] }
  | {
      type: WSMessageType.SEARCH;
      query: string;
      contextId?: string;
      limit?: number;
    }
  | { type: WSMessageType.GET_ACTIVE_CONTEXT }
  | { type: WSMessageType.EVENT; data: any }
  | { type: WSMessageType.UPDATE; data: any }
  | { type: WSMessageType.ERROR; error: string }
  | { type: WSMessageType.PONG };

type EventListener = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private isConnected = false;
  private isConnecting = false;

  constructor() {
    // WebSocket URL from environment or default
    const wsHost = import.meta.env.VITE_WS_URL || "localhost:3002";
    this.url = `ws://${wsHost}`;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("[WS] Connected to server");
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit("connected", {});
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.log("[WS] Disconnected from server");
        this.isConnected = false;
        this.isConnecting = false;
        this.emit("disconnected", {});

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(
            `[WS] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
          );
          setTimeout(
            () => this.connect(),
            this.reconnectDelay * this.reconnectAttempts,
          );
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error("[WS] Error:", error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error("[WS] Failed to connect:", error);
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Send message to server
   */
  private send(message: WSMessage): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("[WS] Cannot send message: not connected");
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WSMessage;

      switch (message.type) {
        case WSMessageType.EVENT:
          this.emit("event", message.data);
          // Also emit specific event type
          if (message.data.type) {
            this.emit(message.data.type, message.data);
          }
          break;

        case WSMessageType.UPDATE:
          this.emit("update", message.data);
          if (message.data.type) {
            this.emit(`update:${message.data.type}`, message.data);
          }
          break;

        case WSMessageType.ERROR:
          this.emit("error", { error: message.error });
          break;

        case WSMessageType.PONG:
          // Handle pong if needed
          break;

        default:
          console.warn("[WS] Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("[WS] Failed to parse message:", error);
    }
  }

  /**
   * Subscribe to events
   */
  subscribe(eventTypes: string[], filters?: any): void {
    this.send({
      type: WSMessageType.SUBSCRIBE,
      eventTypes,
      filters,
    });
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventTypes?: string[]): void {
    this.send({
      type: WSMessageType.UNSUBSCRIBE,
      eventTypes,
    });
  }

  /**
   * Perform a search through WebSocket
   */
  search(
    query: string,
    options?: { contextId?: string; limit?: number },
  ): void {
    this.send({
      type: WSMessageType.SEARCH,
      query,
      ...options,
    });
  }

  /**
   * Get active context
   */
  getActiveContext(): void {
    this.send({
      type: WSMessageType.GET_ACTIVE_CONTEXT,
    });
  }

  /**
   * Register event listener
   */
  on(event: string, listener: EventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.off(event, listener);
    };
  }

  /**
   * Unregister event listener
   */
  off(event: string, listener: EventListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[WS] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

/**
 * Get WebSocket client instance
 */
export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
}

/**
 * Initialize WebSocket connection
 */
export function initWebSocket(): void {
  const client = getWebSocketClient();
  if (!client.connected) {
    client.connect();
  }
}

export { WSMessageType };
export type { WSMessage };
