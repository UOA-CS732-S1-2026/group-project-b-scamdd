const API_BASE = import.meta.env.PROD
  ? ''
  : (import.meta.env.VITE_API_URL ?? 'http://localhost:4000');

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

export type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
};

function buildUrl(path: string, query?: ApiFetchOptions['query']): string {
  const base = path.startsWith('/api')
    ? `${API_BASE}${path}`
    : `${API_BASE}/api${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === null || v === undefined) continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, query, headers, ...rest } = options;
  const init: RequestInit = {
    credentials: 'include',
    ...rest,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
  };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), init);
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? err.message : 'Network error');
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let payload: unknown;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message =
      (payload &&
      typeof payload === 'object' &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? (payload as { message: string }).message
        : null) ?? `${res.status} ${res.statusText || 'Request failed'}`;
    const details =
      payload && typeof payload === 'object' && 'details' in payload
        ? (payload as { details?: unknown }).details
        : undefined;
    throw new ApiError(res.status, message, details);
  }

  return payload as T;
}
