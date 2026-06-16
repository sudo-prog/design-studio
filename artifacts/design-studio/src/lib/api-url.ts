const base = import.meta.env.BASE_URL ?? "/";

export function getApiBase(): string {
  return base.endsWith("/") ? `${base}api` : `${base}/api`;
}

export function getApiUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${clean}`;
}
