import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { csrfProtection } from "../middleware/csrf";

vi.mock("../prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

import authRoutes from "./auth.routes";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(csrfProtection);
  app.use("/api/auth", authRoutes);
  return app;
}

describe("auth.routes csrf cookies", () => {
  it("issues a csrf cookie on /me even for anonymous sessions", async () => {
    const response = await request(createApp()).get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: null });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("csrf_token=")])
    );
  });

  it("clears auth and csrf cookies on logout", async () => {
    const response = await request(createApp())
      .post("/api/auth/logout")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", "csrf")
      .set("Cookie", ["auth_token=token", "csrf_token=csrf"]);

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("auth_token="),
        expect.stringContaining("csrf_token="),
      ])
    );
  });
});
