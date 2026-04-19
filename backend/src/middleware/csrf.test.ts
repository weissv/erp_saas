import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { JWT } from "../constants";
import { csrfProtection } from "./csrf";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(csrfProtection);

  app.get("/csrf/bootstrap", (req, res) => {
    if (typeof req.csrfToken === "function") {
      res.cookie(JWT.COOKIE_NAME, "auth-cookie");
      res.cookie(JWT.CSRF_COOKIE_NAME, req.csrfToken(), {
        httpOnly: false,
        sameSite: "lax",
      });
    }

    res.json({ ok: true });
  });

  app.post("/public", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/protected", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/v1/integration/push", (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

describe("csrfProtection", () => {
  it("rejects public mutating requests without csrf bootstrap", async () => {
    const response = await request(createApp())
      .post("/public")
      .set("Origin", "http://localhost:5173")
      .send({ ok: true });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "CSRF validation failed" });
  });

  it("rejects authenticated mutating requests without origin", async () => {
    const bootstrap = await request(createApp()).get("/csrf/bootstrap");

    const response = await request(createApp())
      .post("/protected")
      .set("Cookie", bootstrap.headers["set-cookie"]);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Missing request origin" });
  });

  it("rejects authenticated mutating requests with invalid csrf token", async () => {
    const bootstrap = await request(createApp()).get("/csrf/bootstrap");

    const response = await request(createApp())
      .post("/protected")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", "wrong-token")
      .set("Cookie", bootstrap.headers["set-cookie"]);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "CSRF validation failed" });
  });

  it("allows authenticated mutating requests with valid origin and csrf token", async () => {
    const bootstrap = await request(createApp()).get("/csrf/bootstrap");
    const setCookies = bootstrap.headers["set-cookie"] as unknown as string[];
    const csrfCookie = setCookies.find((cookie) => cookie.startsWith(`${JWT.CSRF_COOKIE_NAME}=`));
    const csrfToken = csrfCookie?.split(";")[0].split("=")[1];

    const response = await request(createApp())
      .post("/protected")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrfToken || "")
      .set("Cookie", setCookies);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("allows public mutating requests after csrf bootstrap", async () => {
    const bootstrap = await request(createApp()).get("/csrf/bootstrap");
    const setCookies = bootstrap.headers["set-cookie"] as unknown as string[];
    const csrfCookie = setCookies.find((cookie) => cookie.startsWith(`${JWT.CSRF_COOKIE_NAME}=`));
    const csrfToken = csrfCookie?.split(";")[0].split("=")[1];

    const publicCookies = setCookies.filter((cookie) => !cookie.startsWith(`${JWT.COOKIE_NAME}=`));

    const response = await request(createApp())
      .post("/public")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrfToken || "")
      .set("Cookie", publicCookies)
      .send({ ok: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("skips technical integration routes", async () => {
    const response = await request(createApp()).post("/api/v1/integration/push").send({ ok: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
