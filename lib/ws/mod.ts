import type { DesoContext } from "../context.ts";

export interface WsHandlers {
  open?: (ws: WebSocket, ctx: DesoContext) => void;
  message?: (ws: WebSocket, event: MessageEvent, ctx: DesoContext) => void;
  close?: (ws: WebSocket, event: CloseEvent, ctx: DesoContext) => void;
  error?: (ws: WebSocket, event: Event, ctx: DesoContext) => void;
}

export type WsHandler = (ctx: DesoContext) => Response;

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

export class WsRoom {
  #sockets = new Set<WebSocket>();
  #onEmpty?: () => void;

  constructor(onEmpty?: () => void) {
    this.#onEmpty = onEmpty;
  }

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

  broadcast(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    for (const socket of this.#sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }

  get size(): number {
    return this.#sockets.size;
  }

  sockets(): Set<WebSocket> {
    return new Set(this.#sockets);
  }
}

export class WsManager {
  #rooms = new Map<string, WsRoom>();

  room(name: string): WsRoom {
    const existing = this.#rooms.get(name);
    if (existing) return existing;

    const room = new WsRoom(() => this.#rooms.delete(name));
    this.#rooms.set(name, room);
    return room;
  }

  deleteRoom(name: string): void {
    this.#rooms.delete(name);
  }
}

export const wsManager: WsManager = new WsManager();
