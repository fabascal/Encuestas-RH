import { describe, expect, it } from 'vitest';
import { bodyKeys, interpretBody, sanitizeHeaders, sanitizeQuery, tokenMatches } from './inbound.js';

describe('webhook inbound', () => {
  it('accepts only the exact token', () => {
    const secret = 'a'.repeat(24);
    expect(tokenMatches(secret, secret)).toBe(true);
    expect(tokenMatches(`${secret}x`, secret)).toBe(false);
    expect(tokenMatches(undefined, secret)).toBe(false);
    expect(tokenMatches('short', secret)).toBe(false);
  });

  it('parses json and form bodies and keeps the raw text', () => {
    expect(interpretBody('{"Estacion":"RANCHO"}', 'application/json')).toEqual({
      body: { Estacion: 'RANCHO' },
      rawBody: '{"Estacion":"RANCHO"}',
    });
    expect(interpretBody('estacion=RANCHO&correo=a%40b.com', 'application/x-www-form-urlencoded')).toEqual({
      body: { estacion: 'RANCHO', correo: 'a@b.com' },
      rawBody: 'estacion=RANCHO&correo=a%40b.com',
    });
    expect(interpretBody('hola', 'text/plain')).toEqual({ body: null, rawBody: 'hola' });
    expect(interpretBody('', 'application/json')).toEqual({ body: null, rawBody: null });
  });

  it('strips secrets from stored headers and query', () => {
    expect(sanitizeHeaders({ authorization: 'x', cookie: 'y', 'x-webhook-secret': 'z', 'user-agent': 'AppsScript' })).toEqual({
      'user-agent': 'AppsScript',
    });
    expect(sanitizeQuery({ token: 'secret', form: 'encuesta' })).toEqual({ form: 'encuesta' });
    expect(bodyKeys({ a: 1, b: 2 })).toEqual(['a', 'b']);
    expect(bodyKeys(['a'])).toEqual([]);
  });
});
