import { describe, expect, it } from "vitest";
import { getDemoUrl, getLoginUrl, getTenantUrl, getWorkspaceLoginUrl } from "./url";

describe("getDemoUrl", () => {
  it("builds the demo host from the marketing domain", () => {
    expect(
      getDemoUrl({
        protocol: "https:",
        hostname: "www.mirai-edu.space",
      })
    ).toBe("https://demo.mirai-edu.space");
  });

  it("preserves the current port when generating the demo URL", () => {
    expect(
      getDemoUrl({
        protocol: "http:",
        hostname: "mirai-edu.space",
        port: "5173",
      })
    ).toBe("http://demo.mirai-edu.space:5173");
  });
});

describe("getTenantUrl", () => {
  it("builds a tenant URL with path support", () => {
    expect(
      getTenantUrl("test", "/auth/login", {
        protocol: "https:",
        hostname: "www.mirai-edu.space",
      })
    ).toBe("https://test.mirai-edu.space/auth/login");
  });
});

describe("getLoginUrl", () => {
  it("builds the test school login URL", () => {
    expect(
      getLoginUrl({
        protocol: "https:",
        hostname: "mirai-edu.space",
      })
    ).toBe("https://test.mirai-edu.space/auth/login");
  });
});

describe("getWorkspaceLoginUrl", () => {
  it("builds a workspace login URL from a bare subdomain", () => {
    expect(
      getWorkspaceLoginUrl("school-a", {
        protocol: "https:",
        hostname: "mirai-edu.space",
      })
    ).toBe("https://school-a.mirai-edu.space/auth/login");
  });

  it("accepts a full tenant hostname", () => {
    expect(
      getWorkspaceLoginUrl("school-a.mirai-edu.space", {
        protocol: "https:",
        hostname: "www.mirai-edu.space",
      })
    ).toBe("https://school-a.mirai-edu.space/auth/login");
  });

  it("accepts a pasted full URL", () => {
    expect(
      getWorkspaceLoginUrl("https://school-a.mirai-edu.space/dashboard", {
        protocol: "https:",
        hostname: "mirai-edu.space",
      })
    ).toBe("https://school-a.mirai-edu.space/auth/login");
  });
});
