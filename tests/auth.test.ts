import { describe, it, expect } from 'vitest';
import { analyzeAuth } from '../src/security/auth';

describe('analyzeAuth', () => {
  it('detects missing Secure flag on cookies', () => {
    const findings = analyzeAuth([], [{ name: 'Set-Cookie', value: 'session=abc123; HttpOnly' }], 'https://example.com');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some(f => f.type === 'cookie' && f.detail.includes('Secure'))).toBe(true);
  });

  it('detects missing HttpOnly flag on cookies', () => {
    const findings = analyzeAuth([], [{ name: 'Set-Cookie', value: 'session=abc123; Secure' }], 'https://example.com');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some(f => f.type === 'cookie' && f.detail.includes('HttpOnly'))).toBe(true);
  });

  it('detects Basic auth', () => {
    const findings = analyzeAuth([{ name: 'Authorization', value: 'Basic dXNlcjpwYXNz' }], [], 'https://example.com');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some(f => f.type === 'basic')).toBe(true);
  });

  it('detects API key in URL', () => {
    const findings = analyzeAuth([], [], 'https://example.com/api?api_key=sk_live_abc123def456');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some(f => f.type === 'apikey')).toBe(true);
  });

  it('detects Bearer token', () => {
    const findings = analyzeAuth([{ name: 'Authorization', value: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNqPndKaE9CYFzK1xQ' }], [], 'https://example.com');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some(f => f.type === 'bearer')).toBe(true);
  });

  it('returns no findings for clean headers', () => {
    const findings = analyzeAuth(
      [{ name: 'Content-Type', value: 'application/json' }],
      [{ name: 'Content-Length', value: '42' }],
      'https://example.com'
    );
    expect(findings.length).toBe(0);
  });
});
