// src/lib/host.ts
// Host-based routing utility for multi-tenant SaaS architecture

/**
 * Marketing/landing page hostnames.
 * Customisable via VITE_MARKETING_HOSTNAME env var (comma-separated).
 */
const DEFAULT_MARKETING_HOSTS = ["mirai-edu.space", "www.mirai-edu.space"];

function getMarketingHosts(): string[] {
  const envHosts = import.meta.env.VITE_MARKETING_HOSTNAME;
  if (envHosts) {
    return envHosts
      .split(",")
      .map((h: string) => h.trim().toLowerCase())
      .filter(Boolean);
  }
  return DEFAULT_MARKETING_HOSTS;
}

/** "demo" subdomain pattern: demo.mirai-edu.space */
const DEMO_SUBDOMAIN = "demo";

export type HostKind = "marketing" | "demo" | "tenant";

export interface HostInfo {
  kind: HostKind;
  /** For tenant/demo hosts, the subdomain portion (e.g. "demo" or "schoolA") */
  subdomain: string | null;
  hostname: string;
}

/**
 * Evaluate the current hostname and return the routing context.
 *
 * - mirai-edu.space / www.mirai-edu.space → marketing landing page
 * - demo.mirai-edu.space                 → read-only demo mode
 * - <tenant>.mirai-edu.space             → tenant SaaS app
 * - localhost / 127.0.0.1 / other        → tenant SaaS app (dev)
 */
export function resolveHost(hostname: string = window.location.hostname): HostInfo {
  const host = hostname.toLowerCase();
  const marketingHosts = getMarketingHosts();

  // Exact match → marketing landing page
  if (marketingHosts.includes(host)) {
    return { kind: "marketing", subdomain: null, hostname: host };
  }

  // Extract subdomain from marketing-like apex (e.g. demo.mirai-edu.space)
  for (const apex of marketingHosts.filter((h) => !h.startsWith("www."))) {
    if (host.endsWith(`.${apex}`)) {
      const sub = host.slice(0, -(apex.length + 1)); // strip ".apex"
      if (sub === DEMO_SUBDOMAIN) {
        return { kind: "demo", subdomain: sub, hostname: host };
      }
      return { kind: "tenant", subdomain: sub, hostname: host };
    }
  }

  // Default: tenant app (covers localhost, IP addresses, custom domains)
  return { kind: "tenant", subdomain: null, hostname: host };
}
