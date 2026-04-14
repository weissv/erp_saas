// src/lib/socketio.ts
// Singleton Socket.IO server instance used to push real-time events
// (e.g. 1C sync progress) back to connected frontends.

import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { config } from "../config";
import { isAllowedOrigin } from "../utils/origin";
import { logger } from "../utils/logger";

/** Regex for validating tenant identifiers in Socket.IO handshakes. */
const TENANT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_TENANT_ID_LENGTH = 128;

let _io: SocketIOServer | null = null;

/**
 * Initialise Socket.IO on top of the existing HTTP server.
 * Call once during application startup.
 */
export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  if (_io) return _io;

  _io = new SocketIOServer(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin ?? undefined, {
          allowedOrigins: config.corsOrigins,
          baseDomain: config.baseDomain,
        })) {
          callback(null, true);
          return;
        }

        logger.warn(`Socket.IO blocked origin: ${origin}`);
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/ws",
  });

  _io.on("connection", (socket) => {
    // Clients may join a tenant-specific room for scoped events
    const tenantId = typeof socket.handshake.query.tenantId === "string"
      ? socket.handshake.query.tenantId
      : "default";

    if (isValidTenantId(tenantId)) {
      void socket.join(`tenant:${tenantId}`);
    } else {
      logger.warn("Socket.IO connection with invalid tenantId rejected", { tenantId });
    }

    socket.on("disconnect", () => {
      // no-op
    });
  });

  logger.info("Socket.IO initialised (path: /ws)");
  return _io;
}

/**
 * Returns the Socket.IO server instance, or null if not yet initialised.
 */
export function getIO(): SocketIOServer | null {
  return _io;
}

function isValidTenantId(tenantId: string): boolean {
  return (
    tenantId.length > 0 &&
    tenantId.length < MAX_TENANT_ID_LENGTH &&
    TENANT_ID_PATTERN.test(tenantId)
  );
}
