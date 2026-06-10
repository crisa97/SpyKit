export interface JWTToken {
  raw: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  alg: string;
  valid: boolean;
  issues: string[];
}

export function decodeJWT(token: string): JWTToken | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    const signature = parts[2];

    const issues: string[] = [];
    const alg = (header.alg as string) || 'unknown';

    if (alg === 'none') issues.push('CRITICAL: Algorithm is "none" — token can be forged');
    if (alg === 'HS256' || alg === 'HS384' || alg === 'HS512') issues.push('Symmetric algorithm (' + alg + ') — verify secret strength');
    if (!alg || alg === '') issues.push('Missing algorithm');

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) issues.push('Token EXPIRED (exp: ' + new Date(payload.exp * 1000).toISOString() + ')');
    if (payload.nbf && payload.nbf > now) issues.push('Token not yet valid (nbf: ' + new Date(payload.nbf * 1000).toISOString() + ')');

    return { raw: token, header, payload, signature, alg, valid: issues.length === 0, issues };
  } catch {
    return null;
  }
}

export function findJWTInText(text: string): JWTToken[] {
  if (!text) return [];
  const pattern = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
  const tokens: JWTToken[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const decoded = decodeJWT(match[0]);
    if (decoded) tokens.push(decoded);
  }
  return tokens;
}

export function jwtToHtml(tokens: JWTToken[]): string {
  if (!tokens.length) return '';

  let html = '<div class="jwt-inspector" style="margin-top:8px;padding:6px;background:#1a1a2e;border:1px solid #333;border-radius:4px">';
  html += '<div style="font-weight:bold;color:#ffd700;margin-bottom:4px">\uD83D\uDD12 JWT Tokens Found</div>';

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const algColor = t.alg === 'none' ? '#ff4444' : (t.alg.startsWith('HS') ? '#ffaa00' : '#44cc44');
    const algIcon = t.alg === 'none' ? '\u2717' : (t.alg.startsWith('HS') ? '\u26A0' : '\u2713');

    html += '<div style="margin:4px 0;padding:4px;background:#16213e;border-radius:3px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center">';
    html += '<span style="color:#eee;font-family:monospace;font-size:11px;word-break:break-all;max-width:60%">' + t.raw.substring(0, 60) + '...</span>';
    html += '<span style="color:' + algColor + ';font-weight:bold;font-size:12px">' + algIcon + ' ' + t.alg + '</span>';
    html += '</div>';

    // Header
    html += '<details style="margin-top:4px;font-size:11px"><summary style="cursor:pointer;color:#888">Header</summary>';
    html +='<pre style="margin:2px 0;padding:4px;background:#0f0f23;border-radius:3px;color:#7ab7ef;font-size:10px;overflow-x:auto">' + syntaxHighlightJSON(JSON.stringify(t.header, null, 2)) + '</pre></details>';

    // Payload
    html += '<details style="margin-top:4px;font-size:11px"><summary style="cursor:pointer;color:#888">Payload</summary>';
    html +='<pre style="margin:2px 0;padding:4px;background:#0f0f23;border-radius:3px;color:#7ab7ef;font-size:10px;overflow-x:auto">' + syntaxHighlightJSON(JSON.stringify(t.payload, null, 2)) + '</pre></details>';

    // Issues
    if (t.issues.length) {
      html += '<div style="margin-top:4px">';
      for (const issue of t.issues) {
        const color = issue.startsWith('CRITICAL') ? '#ff4444' : '#ffaa00';
        html += '<div style="color:' + color + ';font-size:11px">\u26A0 ' + issue + '</div>';
      }
      html += '</div>';
    }

    html += '</div>';
  }

  html += '</div>';
  return html;
}

export function syntaxHighlightJSON(str: string): string {
  if (!str) return '';
  str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return str
    .replace(/"((?:[^"\\]|\\.)*)"\s*:/g, '<span style="color:#ffd700">$1</span>:')
    .replace(/"((?:[^"\\]|\\.)*)"/g, '<span style="color:#44cc44">"$1"</span>')
    .replace(/\b(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, '<span style="color:#7ab7ef">$1</span>')
    .replace(/\b(true|false|null)\b/gi, '<span style="color:#cc44cc">$1</span>');
}
