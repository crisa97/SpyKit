export interface AuthFinding {
  type: 'bearer' | 'basic' | 'cookie' | 'apikey' | 'oauth';
  location: string;
  detail: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export function analyzeAuth(requestHeaders: Array<{ name: string; value: string }> | null, responseHeaders: Array<{ name: string; value: string }> | null, url: string): AuthFinding[] {
  const findings: AuthFinding[] = [];

  // Check Authorization header
  if (requestHeaders) {
    for (const h of requestHeaders) {
      const lower = h.name.toLowerCase();
      if (lower === 'authorization') {
        if (h.value.startsWith('Bearer ')) {
          const token = h.value.substring(7);
          findings.push({
            type: 'bearer',
            location: 'Authorization header',
            detail: 'Bearer token present (' + token.substring(0, 20) + '...)',
            severity: token.length > 100 ? 'high' : 'medium',
            recommendation: 'Ensure Bearer tokens are short-lived and transmitted over HTTPS only',
          });
        } else if (h.value.startsWith('Basic ')) {
          findings.push({
            type: 'basic',
            location: 'Authorization header',
            detail: 'Basic auth credentials present',
            severity: 'high',
            recommendation: 'Use token-based auth (OAuth2/Bearer) instead of Basic auth. Basic auth sends credentials in plaintext (Base64).',
          });
        }
      }
    }
  }

  // Check response cookies for Secure/HttpOnly flags
  if (responseHeaders) {
    for (const h of responseHeaders) {
      if (h.name.toLowerCase() === 'set-cookie') {
        const lower = h.value.toLowerCase();
        const name = h.value.split('=')[0];

        if (!lower.includes('secure')) {
          findings.push({
            type: 'cookie',
            location: 'Set-Cookie: ' + name,
            detail: 'Cookie "' + name + '" missing Secure flag',
            severity: 'high',
            recommendation: 'Add the Secure flag to prevent cookie transmission over HTTP',
          });
        }

        if (!lower.includes('httponly')) {
          findings.push({
            type: 'cookie',
            location: 'Set-Cookie: ' + name,
            detail: 'Cookie "' + name + '" missing HttpOnly flag',
            severity: 'medium',
            recommendation: 'Add the HttpOnly flag to prevent XSS-based cookie theft',
          });
        }

        const samesiteMatch = lower.match(/samesite=(lax|strict|none)/);
        if (!samesiteMatch) {
          findings.push({
            type: 'cookie',
            location: 'Set-Cookie: ' + name,
            detail: 'Cookie "' + name + '" missing SameSite attribute',
            severity: 'low',
            recommendation: 'Add SameSite=Lax or SameSite=Strict for CSRF protection',
          });
        } else if (samesiteMatch[1] === 'none') {
          findings.push({
            type: 'cookie',
            location: 'Set-Cookie: ' + name,
            detail: 'Cookie "' + name + '" has SameSite=None (no CSRF protection)',
            severity: 'medium',
            recommendation: 'Use SameSite=Lax or SameSite=Strict unless cross-site usage is required',
          });
        }
      }
    }
  }

  // Check URL for API keys
  if (url) {
    const apikeyMatch = url.match(/[?&](api[_-]?key|token|secret)=([^&]+)/i);
    if (apikeyMatch) {
      findings.push({
        type: 'apikey',
        location: 'URL query parameter',
        detail: 'API key/token exposed in URL: ' + apikeyMatch[1] + '=' + apikeyMatch[2].substring(0, 8) + '...',
        severity: 'critical',
        recommendation: 'API keys should be sent in headers (Authorization), never in URL query strings',
      });
    }
  }

  return findings;
}

export function authFindingsToHtml(findings: AuthFinding[]): string {
  if (!findings.length) return '';

  let html = '<div class="auth-analysis" style="margin-top:6px;padding:6px;background:#1a1a2e;border:1px solid #ff8800;border-radius:4px">';
  html += '<div style="font-weight:bold;color:#ff8800;margin-bottom:4px">\uD83D\uDD11 Auth Analysis (' + findings.length + ' issues)</div>';

  for (const f of findings) {
    const color = f.severity === 'critical' ? '#ff4444' : (f.severity === 'high' ? '#ff8800' : (f.severity === 'medium' ? '#ffaa00' : '#888'));
    html += '<div style="margin:4px 0;padding:4px;background:#16213e;border-radius:3px;font-size:11px">';
    html += '<span style="color:' + color + ';font-weight:bold">[' + f.severity.toUpperCase() + '] ' + f.type.toUpperCase() + '</span>';
    html += '<div style="color:#eee;margin-top:2px">' + f.detail + '</div>';
    html += '<div style="color:#aaa;margin-top:2px;font-size:10px">\u2139\uFE0F ' + f.recommendation + '</div>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}
