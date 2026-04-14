import { describe, expect, it } from "vitest";
import { isAllowedOrigin, isBaseDomainHost } from "./origin";

describe("isBaseDomainHost", () => {
  it("accepts the base domain itself", () => {
    expect(isBaseDomainHost("mirai-edu.space", "mirai-edu.space")).toBe(true);
  });

  it("accepts subdomains of the base domain", () => {
    expect(isBaseDomainHost("demo.mirai-edu.space", "mirai-edu.space")).toBe(true);
    expect(isBaseDomainHost("school-a.mirai-edu.space", "mirai-edu.space")).toBe(true);
  });

  it("rejects unrelated domains", () => {
    expect(isBaseDomainHost("example.com", "mirai-edu.space")).toBe(false);
  });
});

describe("isAllowedOrigin", () => {
  const options = {
    allowedOrigins: ["https://mirai-edu.space", "http://mirai-edu.space"],
    baseDomain: "mirai-edu.space",
  };

  it("accepts configured exact origins", () => {
    expect(isAllowedOrigin("https://mirai-edu.space", options)).toBe(true);
  });

  it("accepts the demo tenant origin", () => {
    expect(isAllowedOrigin("https://demo.mirai-edu.space", options)).toBe(true);
  });

  it("accepts tenant subdomains", () => {
    expect(isAllowedOrigin("https://school-a.mirai-edu.space", options)).toBe(true);
  });

  it("accepts development tunnel origins", () => {
    expect(isAllowedOrigin("https://project.trycloudflare.com", options)).toBe(true);
  });

  it("rejects unknown origins", () => {
    expect(isAllowedOrigin("https://attacker.example", options)).toBe(false);
  });
});
