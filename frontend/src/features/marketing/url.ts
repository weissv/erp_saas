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

export function getWorkspaceLoginUrl(
  workspace: string,
  locationLike: DemoLocationLike = window.location,
): string | null {
  const normalizedWorkspace = workspace
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/:\d+$/, "")
    .replace(/\.+$/, "");

  if (!normalizedWorkspace) {
    return null;
  }

  const baseHostname = getBaseHostname(locationLike.hostname);
  const port = locationLike.port ? `:${locationLike.port}` : "";

  if (normalizedWorkspace === baseHostname) {
    return `${locationLike.protocol}//${baseHostname}${port}/auth/login`;
  }

  if (normalizedWorkspace.endsWith(`.${baseHostname}`)) {
    const subdomain = normalizedWorkspace.slice(0, -(baseHostname.length + 1));
    return subdomain
      ? getTenantUrl(subdomain, "/auth/login", locationLike)
      : `${locationLike.protocol}//${baseHostname}${port}/auth/login`;
  }

  return getTenantUrl(normalizedWorkspace, "/auth/login", locationLike);
}
