export function createScopedClientProxy<T extends object>(
  defaultClient: T,
  resolveScopedClient: () => T | undefined,
): T {
  return new Proxy(defaultClient, {
    get(_target, property) {
      const client = resolveScopedClient() ?? defaultClient;
      const value = Reflect.get(client, property, client);
      return typeof value === "function" ? value.bind(client) : value;
    },
  }) as T;
}