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

vi.mock("../middleware/tenantResolver", () => ({
  extractTenantSubdomain: () => null,
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
    const bootstrap = await request(createApp()).get("/api/auth/me");
    const setCookies = bootstrap.headers["set-cookie"] as unknown as string[];
    const csrfCookie = setCookies.find((cookie) => cookie.startsWith("csrf_token="));
    const csrfToken = csrfCookie?.split(";")[0].split("=")[1];

    const response = await request(createApp())
      .post("/api/auth/logout")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrfToken || "")
      .set("Cookie", [`auth_token=token`, ...setCookies]);

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("auth_token="),
        expect.stringContaining("_csrf="),
        expect.stringContaining("csrf_token="),
      ])
    );
  });
});
