import { describe, expect, it } from "vitest";
import { getDemoUrl, getLoginUrl, getTenantUrl } from "./url";

describe("getDemoUrl", () => {
  it("builds the test-school demo host from the marketing domain", () => {
    expect(
      getDemoUrl({
        protocol: "https:",
        hostname: "www.mirai-edu.space",
      })
    ).toBe("https://test.mirai-edu.space");
  });

  it("preserves the current port when generating the demo URL", () => {
    expect(
      getDemoUrl({
        protocol: "http:",
        hostname: "mirai-edu.space",
        port: "5173",
      })
    ).toBe("http://test.mirai-edu.space:5173");
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
