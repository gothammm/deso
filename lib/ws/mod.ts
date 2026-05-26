/**
 * WebSocket support for Deso.
 *
 * Provides `wsHandler()` for upgrading HTTP requests to WebSocket
 * connections, `WsRoom` for managing a set of connected peers, and
 * `WsManager` for named room lifecycle management.
 *
 * @module
 */
import type { DesoContext } from "../context.ts";

/**
 * Event handlers for a WebSocket connection.
 *
 * Each handler receives the WebSocket instance and the Deso context,
 * allowing access to route params, store, etc.
 */
export interface WsHandlers {
  /** Called when the WebSocket connection is established. */
  open?: (ws: WebSocket, ctx: DesoContext) => void;
  /** Called when a message is received from the client. */
  message?: (ws: WebSocket, event: MessageEvent, ctx: DesoContext) => void;
  /** Called when the connection is closed. */
  close?: (ws: WebSocket, event: CloseEvent, ctx: DesoContext) => void;
  /** Called when an error occurs on the connection. */
  error?: (ws: WebSocket, event: Event, ctx: DesoContext) => void;
}

/** Internal handler type returned by {@link wsHandler}. */
export type WsHandler = (ctx: DesoContext) => Response;

/**
 * Creates a route handler that upgrades an HTTP request to a WebSocket
 * connection using `Deno.upgradeWebSocket` and registers the provided
 * event callbacks.
 *
 * @param handlers - Object with optional `open`, `message`, `close`,
 *   and `error` callbacks.
 *
 * ```ts
 * app.get("/ws", wsHandler({
 *   open(ws) { ws.send("connected"); },
 *   message(ws, ev) { console.log(ev.data); },
 * }));
 * ```
 */
export const wsHandler = (handlers: WsHandlers): WsHandler => {
  const onOpen = handlers.open;
  const onMessage = handlers.message;
  const onClose = handlers.close;
  const onError = handlers.error;

  return (ctx: DesoContext) => {
    const { socket, response } = Deno.upgradeWebSocket(ctx.req());

    if (onOpen) {
      socket.addEventListener("open", (_e) => onOpen(socket, ctx));
    }
    if (onMessage) {
      socket.addEventListener(
        "message",
        (e: MessageEvent) => onMessage(socket, e, ctx),
      );
    }
    if (onClose) {
      socket.addEventListener(
        "close",
        (e: CloseEvent) => onClose(socket, e, ctx),
      );
    }
    if (onError) {
      socket.addEventListener("error", (e) => onError(socket, e, ctx));
    }

    return response;
  };
};

/**
 * A room that tracks a set of connected WebSocket peers.
 *
 * Automatically removes sockets on `close` or `error` events.
 * Optionally invokes an `onEmpty` callback when the last socket leaves.
 */
export class WsRoom {
  #sockets = new Set<WebSocket>();
  #onEmpty?: () => void;

  /**
   * @param onEmpty - Optional callback invoked when the room becomes empty.
   */
  constructor(onEmpty?: () => void) {
    this.#onEmpty = onEmpty;
  }

  /**
   * Add a socket to the room. Registers cleanup listeners so the socket
   * is automatically removed on `close` or `error`.
   */
  add(socket: WebSocket): void {
    this.#sockets.add(socket);
    const cleanup = () => {
      this.#sockets.delete(socket);
      if (this.#sockets.size === 0 && this.#onEmpty) {
        this.#onEmpty();
      }
    };
    socket.addEventListener("close", cleanup);
    socket.addEventListener("error", cleanup);
  }

  /**
   * Send a message to every socket currently in the room.
   * Skips sockets whose `readyState` is not `OPEN`.
   *
   * @param data - Data compatible with `WebSocket.send()`.
   */
  broadcast(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    for (const socket of this.#sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }

  /** Number of connected sockets in the room. */
  get size(): number {
    return this.#sockets.size;
  }

  /** Returns a copy of the set of connected sockets. */
  sockets(): Set<WebSocket> {
    return new Set(this.#sockets);
  }
}

/**
 * Manages named `WsRoom` instances.
 *
 * Rooms are created on first access and automatically cleaned up when
 * they become empty.
 */
export class WsManager {
  #rooms = new Map<string, WsRoom>();

  /**
   * Get or create a room by name.
   * Rooms are lazily created and auto-deleted when they become empty.
   *
   * @param name - Unique room identifier.
   */
  room(name: string): WsRoom {
    const existing = this.#rooms.get(name);
    if (existing) return existing;

    const room = new WsRoom(() => this.#rooms.delete(name));
    this.#rooms.set(name, room);
    return room;
  }

  /** Manually remove a named room. */
  deleteRoom(name: string): void {
    this.#rooms.delete(name);
  }
}

/** Global singleton {@link WsManager} instance for convenience. */
export const wsManager: WsManager = new WsManager();
