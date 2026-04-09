// src/io.ts
// Socket.io server instance, attached to the HTTP server.
// Clients join a room `tenant:<tenantId>` on connection so that
// per-tenant events (1C sync progress, etc.) are properly scoped.

import { Server as IOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { config } from "./config";

let io: IOServer | null = null;

/**
 * Creates and returns the Socket.io server (call once during bootstrap).
 */
export function createIOServer(httpServer: HTTPServer): IOServer {
  if (io) return io;

  io = new IOServer(httpServer, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    // Clients must emit "join-tenant" with their tenantId after connecting
    socket.on("join-tenant", (tenantId: string) => {
      if (typeof tenantId === "string" && tenantId.length > 0 && tenantId.length < 128) {
        void socket.join(`tenant:${tenantId}`);
      }
    });
  });

  return io;
}

/**
 * Returns the existing Socket.io server (or null if not yet created).
 */
export function getIO(): IOServer | null {
  return io;
}
