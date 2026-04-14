const DEFAULT_ALLOWED_ORIGIN_PATTERNS = [/\.onrender\.com$/i, /\.trycloudflare\.com$/i, /\.loca\.lt$/i];

interface AllowedOriginOptions {
  allowedOrigins: readonly string[];
  baseDomain: string;
  extraPatterns?: readonly RegExp[];
}

function normalizeBaseDomain(baseDomain: string): string {
  return baseDomain.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
}

export function isBaseDomainHost(hostname: string, baseDomain: string): boolean {
  const normalizedHostname = hostname.trim().toLowerCase();
  const normalizedBaseDomain = normalizeBaseDomain(baseDomain);

  if (!normalizedHostname || !normalizedBaseDomain) {
    return false;
  }

  return (
    normalizedHostname === normalizedBaseDomain ||
    normalizedHostname.endsWith(`.${normalizedBaseDomain}`)
  );
}

export function isAllowedOrigin(origin: string | undefined, options: AllowedOriginOptions): boolean {
  if (!origin) {
    return true;
  }

  if (options.allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    if (isBaseDomainHost(url.hostname, options.baseDomain)) {
      return true;
    }
  } catch {
    return false;
  }

  return [...DEFAULT_ALLOWED_ORIGIN_PATTERNS, ...(options.extraPatterns ?? [])].some((pattern) =>
    pattern.test(origin),
  );
}
