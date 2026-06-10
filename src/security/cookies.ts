import { escapeHtml } from '../core/utils';

interface ParsedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: string;
  httponly: boolean;
  secure: boolean;
  samesite: string;
}

export function parseCookies(headers: Array<{ name: string; value: string }>): ParsedCookie[] {
  const cookies: ParsedCookie[] = [];
  if (!headers) return cookies;
  for (const h of headers) {
    const n = h.name ? h.name.toLowerCase() : '';
    if (n === 'set-cookie') {
      const parts = h.value.split(';');
      const c: ParsedCookie = { name: '', value: '', domain: '', path: '', expires: '', httponly: false, secure: false, samesite: '' };
      for (let j = 0; j < parts.length; j++) {
        const p = parts[j].trim();
        const kv = p.split('=');
        const key = kv[0].trim().toLowerCase();
        const val = kv.slice(1).join('=');
        if (j === 0) {
          c.name = kv[0].trim();
          c.value = val;
        } else if (key === 'domain') c.domain = val;
        else if (key === 'path') c.path = val;
        else if (key === 'expires') c.expires = val;
        else if (key === 'max-age') c.expires = 'max-age=' + val;
        else if (key === 'httponly') c.httponly = true;
        else if (key === 'secure') c.secure = true;
        else if (key === 'samesite') c.samesite = val.toLowerCase();
      }
      cookies.push(c);
    }
  }
  return cookies;
}

export function cookieHtml(cookies: ParsedCookie[]): string {
  if (!cookies.length) return '';
  let html = '<table><tr><th>Name</th><th>Value</th><th>Domain</th><th title="HttpOnly — inaccessible to JavaScript">HttpOnly</th><th title="Secure — only sent over HTTPS">Secure</th><th title="SameSite — controls cross-site behavior">SameSite</th></tr>';
  for (const c of cookies) {
    const h = c.httponly ? '<span class="flag-ok">&#x2713;</span>' : '<span class="flag-missing">&#x2717;</span>';
    const s = c.secure ? '<span class="flag-ok">&#x2713;</span>' : '<span class="flag-missing">&#x2717;</span>';
    const ss = c.samesite ? (c.samesite === 'lax' || c.samesite === 'strict' ? '<span class="flag-ok">' + c.samesite + '</span>' : '<span class="flag-info">' + c.samesite + '</span>') : '<span class="flag-missing">&#x2717;</span>';
    html += '<tr><td>' + escapeHtml(c.name) + '</td><td>' + escapeHtml(c.value.substring(0, 30)) + '</td><td>' + escapeHtml(c.domain) + '</td><td>' + h + '</td><td>' + s + '</td><td>' + ss + '</td></tr>';
  }
  return html + '</table>';
}
