import { describe, expect, it } from "vitest";
import { getDemoUrl } from "./url";

describe("getDemoUrl", () => {
  it("builds a demo host from the marketing domain", () => {
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
