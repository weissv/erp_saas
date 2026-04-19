import { beforeEach, describe, expect, it, vi } from "vitest";
import { JWT } from "../constants";
import { csrfProtection } from "./csrf";
import { createMockNext, createMockRequest, createMockResponse } from "../test/mocks/express";

describe("csrfProtection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes safe requests", () => {
    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();
    const next = createMockNext();

    csrfProtection(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it("allows public mutating requests without auth cookie", () => {
    const req = createMockRequest({
      method: "POST",
      originalUrl: "/api/feedback",
      cookies: {},
    });
    const res = createMockResponse();
    const next = createMockNext();

    csrfProtection(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it("rejects authenticated mutating requests without origin", () => {
    const req = createMockRequest({
      method: "POST",
      originalUrl: "/api/children",
      cookies: {
        [JWT.COOKIE_NAME]: "auth-cookie",
        [JWT.CSRF_COOKIE_NAME]: "csrf-cookie",
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    csrfProtection(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing request origin" });
  });

  it("rejects authenticated mutating requests with invalid csrf token", () => {
    const req = createMockRequest({
      method: "POST",
      originalUrl: "/api/children",
      cookies: {
        [JWT.COOKIE_NAME]: "auth-cookie",
        [JWT.CSRF_COOKIE_NAME]: "csrf-cookie",
      },
      headers: {
        origin: "http://localhost:5173",
      },
    }) as any;
    req.get = vi.fn((name: string) => {
      if (name.toLowerCase() === "origin") return "http://localhost:5173";
      if (name.toLowerCase() === JWT.CSRF_HEADER_NAME) return "wrong-token";
      return undefined;
    });
    const res = createMockResponse();
    const next = createMockNext();

    csrfProtection(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "CSRF validation failed" });
  });

  it("allows authenticated mutating requests with valid origin and csrf token", () => {
    const req = createMockRequest({
      method: "POST",
      originalUrl: "/api/children",
      cookies: {
        [JWT.COOKIE_NAME]: "auth-cookie",
        [JWT.CSRF_COOKIE_NAME]: "csrf-cookie",
      },
      headers: {
        origin: "http://localhost:5173",
      },
    }) as any;
    req.get = vi.fn((name: string) => {
      if (name.toLowerCase() === "origin") return "http://localhost:5173";
      if (name.toLowerCase() === JWT.CSRF_HEADER_NAME) return "csrf-cookie";
      return undefined;
    });
    const res = createMockResponse();
    const next = createMockNext();

    csrfProtection(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it("skips technical integration routes", () => {
    const req = createMockRequest({
      method: "POST",
      originalUrl: "/api/v1/integration/push",
      cookies: {
        [JWT.COOKIE_NAME]: "auth-cookie",
      },
    });
    const res = createMockResponse();
    const next = createMockNext();

    csrfProtection(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });
});
