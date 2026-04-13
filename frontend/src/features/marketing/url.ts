export interface DemoLocationLike {
  protocol: string;
  hostname: string;
  port?: string;
}

function getBaseHostname(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

export function getTenantUrl(
  subdomain: string,
  path: string = "",
  locationLike: DemoLocationLike = window.location
): string {
  const hostname = getBaseHostname(locationLike.hostname);
  const port = locationLike.port ? `:${locationLike.port}` : "";
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${locationLike.protocol}//${subdomain}.${hostname}${port}${normalizedPath}`;
}

export function getDemoUrl(locationLike: DemoLocationLike = window.location): string {
  return getTenantUrl("demo", "", locationLike);
}

export function getLoginUrl(locationLike: DemoLocationLike = window.location): string {
  return getTenantUrl("test", "/auth/login", locationLike);
}
