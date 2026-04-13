export interface DemoLocationLike {
  protocol: string;
  hostname: string;
  port?: string;
}

export function getDemoUrl(locationLike: DemoLocationLike = window.location): string {
  const hostname = locationLike.hostname.replace(/^www\./, "");
  const port = locationLike.port ? `:${locationLike.port}` : "";
  return `${locationLike.protocol}//demo.${hostname}${port}`;
}
