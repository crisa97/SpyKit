import { describe, it, expect } from 'vitest';
import { decodeJWT, findJWTInText } from '../src/security/jwt';

const VALID_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.4ZcKqLh7OoQq8qLh7OoQq8qLh7OoQq8qLh7OoQq8qLh7Oo';
const NONE_ALG_JWT = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.';
const EXPIRED_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjF9.M4UXvGj0C_cUT2H3BjFJq0HToKQ5U4zKj0Z0y0Z0y0Z0';

describe('decodeJWT', () => {
  it('decodes a valid JWT', () => {
    const result = decodeJWT(VALID_JWT);
    expect(result).not.toBeNull();
    expect(result!.alg).toBe('HS256');
    expect(result!.payload.sub).toBe('1234567890');
    expect(result!.payload.name).toBe('John Doe');
  });

  it('detects "none" algorithm', () => {
    const result = decodeJWT(NONE_ALG_JWT);
    expect(result).not.toBeNull();
    expect(result!.alg).toBe('none');
    expect(result!.issues.some(i => i.toLowerCase().includes('critical'))).toBe(true);
  });

  it('detects expired tokens', () => {
    const result = decodeJWT(EXPIRED_JWT);
    expect(result).not.toBeNull();
    expect(result!.issues.some(i => i.toLowerCase().includes('expired'))).toBe(true);
  });

  it('returns null for invalid format', () => {
    expect(decodeJWT('not-a-jwt')).toBeNull();
    expect(decodeJWT('')).toBeNull();
  });
});

describe('findJWTInText', () => {
  it('finds JWTs in text', () => {
    const text = 'Bearer ' + VALID_JWT;
    const results = findJWTInText(text);
    expect(results.length).toBe(1);
    expect(results[0].alg).toBe('HS256');
  });

  it('returns empty for text without JWTs', () => {
    expect(findJWTInText('no tokens here')).toEqual([]);
  });

  it('returns empty for empty input', () => {
    expect(findJWTInText('')).toEqual([]);
  });
});
