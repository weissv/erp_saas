import { describe, expect, it } from "vitest";
import { createScopedClientProxy } from "./scopedClientProxy";

describe("createScopedClientProxy", () => {
  it("uses the default client when no scoped client exists", () => {
    let scopedClient: { read(): string } | undefined;

    const defaultClient = {
      label: "default",
      read() {
        return this.label;
      },
    };

    const proxy = createScopedClientProxy(defaultClient, () => scopedClient);

    expect(proxy.read()).toBe("default");
  });

  it("binds method calls to the scoped client when one exists", () => {
    const defaultClient = {
      label: "default",
      read() {
        return this.label;
      },
    };
    const tenantClient = {
      label: "demo",
      read() {
        return this.label;
      },
    };

    const proxy = createScopedClientProxy(defaultClient, () => tenantClient);

    expect(proxy.read()).toBe("demo");
  });
});