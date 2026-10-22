import type { LoginResponse } from '@portal/shared';

const API_BASE = '/api';

let accessToken: string | null = null;
let refreshPromise: Promise<LoginResponse | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  status: number;
  code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Rotates the httpOnly refresh cookie once, even if several callers ask at the same time.
 * Returns null when there is no valid session.
 */
export function refreshSession(): Promise<LoginResponse | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as LoginResponse;
        accessToken = body.accessToken;
        return body;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function refreshAccessToken(): Promise<string | null> {
  const session = await refreshSession();
  return session?.accessToken ?? null;
}

type QueryValue = string | number | boolean | undefined;

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, QueryValue> | undefined;
}

function buildPath(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const response = await fetch(`${API_BASE}${buildPath(path, options.query)}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : null,
  });

  if (response.status === 401 && !isRetry && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, options, true);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  const payload: unknown = contentType.includes('application/json') ? await response.json() : undefined;

  if (!response.ok) {
    const errorBody = payload as { message?: string; code?: string } | undefined;
    throw new ApiError(response.status, errorBody?.message ?? response.statusText, errorBody?.code);
  }

  return payload as T;
}

async function requestBlob(path: string, query?: Record<string, QueryValue>, isRetry = false): Promise<Blob> {
  const response = await fetch(`${API_BASE}${buildPath(path, query)}`, {
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return requestBlob(path, query, true);
  }

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }

  return response.blob();
}

export const api = {
  get: <T>(path: string, query?: Record<string, QueryValue>) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  getBlob: (path: string, query?: Record<string, QueryValue>) => requestBlob(path, query),
};

/** Downloads a blob endpoint (e.g. a report export) by triggering a browser save dialog. */
export async function downloadFile(
  path: string,
  filename: string,
  query?: Record<string, QueryValue>,
): Promise<void> {
  const blob = await api.getBlob(path, query);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
