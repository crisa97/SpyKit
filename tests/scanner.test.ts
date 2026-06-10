import { describe, it, expect } from 'vitest';
import { scanForReflections } from '../src/security/scanner';

describe('scanForReflections', () => {
  it('detects reflected XSS in response', () => {
    const url = 'https://example.com/search?q=<script>alert(1)</script>';
    const results = scanForReflections(url, '', '<html><body><script>alert(1)</script></body></html>');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.type === 'xss')).toBe(true);
  });

  it('returns empty for clean responses', () => {
    const results = scanForReflections('https://example.com/search?q=hello', '', '<html><body>Hello World</body></html>');
    expect(results.length).toBe(0);
  });

  it('extracts URL parameters correctly', () => {
    const url = 'https://example.com/test?id=1&name=hello';
    const results = scanForReflections(url, '', 'nothing reflected');
    expect(results.length).toBe(0);
  });
});
