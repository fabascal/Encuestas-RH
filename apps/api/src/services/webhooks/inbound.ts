import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

const HIDDEN_HEADERS = new Set(['authorization', 'cookie', 'x-webhook-secret', 'x-webhook-token']);

export function tokenMatches(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!HIDDEN_HEADERS.has(key.toLowerCase())) clean[key] = value;
  }
  return clean;
}

export function sanitizeQuery(query: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...query };
  delete clean.token;
  return clean;
}

export function clientIp(ip: string | undefined): string | null {
  if (!ip || !isIP(ip)) return null;
  return ip;
}

/** Turns a raw request body into a JSON object when possible, always keeping the original text. */
export function interpretBody(
  raw: unknown,
  contentType: string | undefined,
): { body: unknown | null; rawBody: string | null } {
  if (raw === undefined || raw === null || raw === '') return { body: null, rawBody: null };

  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const type = (contentType ?? '').toLowerCase();

  if (type.includes('application/x-www-form-urlencoded')) {
    const fields: Record<string, string> = {};
    for (const [key, value] of new URLSearchParams(text)) fields[key] = value;
    return { body: fields, rawBody: text };
  }

  if (typeof raw === 'object') return { body: raw, rawBody: text };

  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed !== null && typeof parsed === 'object') return { body: parsed, rawBody: text };
  } catch {
    // Keep the raw text when it is not JSON.
  }
  return { body: null, rawBody: text };
}

export function bodyKeys(body: unknown): string[] {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return [];
  return Object.keys(body);
}
