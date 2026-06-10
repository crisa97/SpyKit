import { describe, it, expect } from 'vitest';
import { escapeHtml, formatSize, parseCurl } from '../src/core/utils';
import { toHexDump } from '../src/ui/hex';
import { scanForSecrets } from '../src/security/secrets';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('handles strings without special chars', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('formatSize', () => {
  it('formats bytes', () => {
    expect(formatSize(500)).toBe('500<small> B</small>');
  });

  it('formats kilobytes', () => {
    const result = formatSize(2048);
    expect(result).toContain('KB');
    expect(result).toContain('2');
  });

  it('formats megabytes', () => {
    const result = formatSize(2097152);
    expect(result).toContain('MB');
  });

  it('returns empty for zero or negative', () => {
    expect(formatSize(0)).toBe('');
    expect(formatSize(-1)).toBe('');
  });
});

describe('parseCurl', () => {
  it('parses a simple GET curl command', () => {
    const result = parseCurl('curl https://api.example.com/users');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.url).toBe('https://api.example.com/users');
  });

  it('parses a POST curl with headers and body', () => {
    const cmd = 'curl -X POST https://api.example.com/data -H "Content-Type: application/json" -d \'{"key":"value"}\'';
    const result = parseCurl(cmd);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('POST');
    expect(result!.url).toBe('https://api.example.com/data');
    expect(result!.headers['Content-Type']).toBe('application/json');
    expect(result!.body).toBe('{"key":"value"}');
  });

  it('returns null for empty input', () => {
    expect(parseCurl('')).toBeNull();
    expect(parseCurl('   ')).toBeNull();
  });
});

describe('toHexDump', () => {
  it('generates hex dump from string', () => {
    const result = toHexDump('Hello World');
    expect(result).toContain('hex-dump');
    expect(result).toContain('Hello World');
  });

  it('returns empty for empty input', () => {
    expect(toHexDump('')).toBe('');
  });
});

describe('scanForSecrets', () => {
  it('detects JWT tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNqPndKaE9CYFzK1xQ';
    const results = scanForSecrets(jwt);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe('JWT');
  });

  it('detects AWS keys', () => {
    const results = scanForSecrets('AKIAIOSFODNN7EXAMPLE');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe('AWS Key');
  });

  it('returns empty array for clean text', () => {
    const results = scanForSecrets('This is a normal string without secrets');
    expect(results.length).toBe(0);
  });

  it('returns empty array for empty input', () => {
    expect(scanForSecrets('')).toEqual([]);
  });
});
