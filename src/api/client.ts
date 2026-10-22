import { API_URL, REQUEST_TIMEOUT_MS } from '../config';
import { getToken } from '../auth/tokenStorage';
import { ApiError, ApiErrorKind } from './errors';

let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | null | undefined>;
  body?: unknown;
  idempotencyKey?: string;
  auth?: boolean;
};

function kindFor(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 400 || status === 422) return 'validation';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  return 'unknown';
}

function extractMessage(data: any, status: number): string {
  const m = data?.message;

  if (Array.isArray(m)) return m.join('\n');
  if (typeof m === 'string') return m;

  return `Erreur ${status}`;
}

export async function request<T>(
  path: string,
  opts: Options = {},
): Promise<T> {
  const {
    method = 'GET',
    query,
    body,
    idempotencyKey,
    auth = true,
  } = opts;

  const url = new URL(API_URL + path);

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let hadToken = false;

  if (auth) {
    const token = await getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
      hadToken = true;
    }
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  let res: Response;

  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw controller.signal.aborted
      ? new ApiError('timeout', 'Délai dépassé')
      : new ApiError('network', 'Connexion impossible');
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();

  let data: any;

  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    const kind = kindFor(res.status);

    if (kind === 'unauthorized' && hadToken) {
      onUnauthorized?.();
    }

    throw new ApiError(
      kind,
      extractMessage(data, res.status),
      res.status,
    );
  }

  return data as T;
}