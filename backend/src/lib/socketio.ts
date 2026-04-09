// src/lib/socketio.ts
// Singleton Socket.IO server instance used to push real-time events
// (e.g. 1C sync progress) back to connected frontends.

import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { config } from "../config";

let _io: SocketIOServer | null = null;

/**
 * Initialise Socket.IO on top of the existing HTTP server.
 * Call once during application startup.
 */
export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  if (_io) return _io;

  _io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/ws",
  });

  _io.on("connection", (socket) => {
    // Clients may join a tenant-specific room for scoped events
    const tenantId = (socket.handshake.query.tenantId as string) || "default";
    void socket.join(`tenant:${tenantId}`);

    socket.on("disconnect", () => {
      // no-op
    });
  });

  console.log("🔌 Socket.IO initialised (path: /ws)");
  return _io;
}

/**
 * Returns the Socket.IO server instance, or null if not yet initialised.
 */
export function getIO(): SocketIOServer | null {
  return _io;
}
