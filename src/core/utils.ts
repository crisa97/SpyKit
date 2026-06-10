export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + '<small> MB</small>';
  if (bytes >= 1024) return Math.round(bytes / 1024) + '<small> KB</small>';
  return bytes + '<small> B</small>';
}

export function hash(str: string): string {
  return str.toString().toLowerCase().replace(/[^0-9a-z]/g, '');
}

export function esc(str: string): string {
  return str.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

export function replaceAll(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function addSpaces(data: string, count: number): string {
  while (data.length < count) {
    data += '&nbsp;';
  }
  return data;
}

export function getRedColor(value: number, foreground?: boolean): JQuery.PlainObject<string> {
  const MIN = 0.3;
  if (value < MIN) return {};
  let v = value;
  if (v > 1) v = 1;
  else v = (v - MIN) / (1 - MIN);
  const h = Math.round(v * 100).toString(16);
  const color = '#ff0000' + (h.length < 2 ? '0' : '') + h;
  if (foreground) return { color };
  return { background: color };
}

export function hostname(domain: string): string {
  if (!domain || domain.length < 1) return domain;
  const i = domain.indexOf(':');
  if (i >= 0) domain = domain.substring(0, i);
  const s = domain.split('.');
  if (s.length < 2) return domain;
  return s[s.length - 2] + '.' + s[s.length - 1];
}

export function parseUrl(url: string): { hostname: string; pathname: string; search: string; protocol?: string } {
  const res = { hostname: '(empty)', pathname: '', search: '', protocol: undefined as string | undefined };
  if (!url) return res;
  const j = url.indexOf('//');
  if (j < 0) {
    res.pathname = url;
    return res;
  }
  res.protocol = url.substring(0, j - 1);
  const i = url.indexOf('/', j + 2);
  if (i < 0) {
    res.hostname = hostname(url.substring(j + 2)) || '(empty)';
    res.pathname = '/';
    return res;
  }
  res.hostname = hostname(url.substring(j + 2, i)) || '(empty)';
  const k = url.indexOf('?', i + 1) >= 0 ? url.indexOf('?', i + 1) : url.indexOf('#', i + 1);
  if (k < 0) {
    res.pathname = url.substring(i);
  } else {
    res.pathname = url.substring(i, k);
    res.search = url.substring(k);
  }
  return res;
}

export function stripTrailingSlash(str: string): string {
  if (str.substr(-1) === '/') return str.substr(0, str.length - 1);
  return str;
}

export function makeCRCTable(): number[] {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

export function getStatusHint(status: number): string {
  const statuses: { [key: number]: string } = {
    100: 'Continue', 101: 'Switching Protocols', 102: 'Processing', 103: 'Early Hints',
    200: 'OK', 201: 'Created', 202: 'Accepted', 203: 'Non-Authoritative Information',
    204: 'No Content', 205: 'Reset Content', 206: 'Partial Content', 207: 'Multi-Status',
    208: 'Already Reported', 226: 'IM Used', 300: 'Multiple Choices', 301: 'Moved Permanently',
    302: 'Found', 303: 'See Other', 304: 'Not Modified', 305: 'Use Proxy', 306: '(Unused)',
    307: 'Temporary Redirect', 308: 'Permanent Redirect', 400: 'Bad Request',
    401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden', 404: 'Not Found',
    405: 'Method Not Allowed', 406: 'Not Acceptable', 407: 'Proxy Authentication Required',
    408: 'Request Timeout', 409: 'Conflict', 410: 'Gone', 411: 'Length Required',
    412: 'Precondition Failed', 413: 'Payload Too Large', 414: 'URI Too Long',
    415: 'Unsupported Media Type', 416: 'Range Not Satisfiable', 417: 'Expectation Failed',
    421: 'Misdirected Request', 422: 'Unprocessable Entity', 423: 'Locked',
    424: 'Failed Dependency', 426: 'Upgrade Required', 428: 'Precondition Required',
    429: 'Too Many Requests', 431: 'Request Header Fields Too Large',
    451: 'Unavailable For Legal Reasons', 500: 'Internal Server Error',
    501: 'Not Implemented', 502: 'Bad Gateway', 503: 'Service Unavailable',
    504: 'Gateway Timeout', 505: 'HTTP Version Not Supported', 506: 'Variant Also Negotiates',
    507: 'Insufficient Storage', 508: 'Loop Detected', 510: 'Not Extended',
    511: 'Network Authentication Required',
  };
  return statuses[status] || 'unknown status code';
}

export function copyToClipboard(text: string): void {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

export function downloadJSON(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function headersToStr(h: Array<{ name: string; value: string }>): string {
  let res = '';
  for (const item of h) {
    if (item.name && item.value) {
      res += item.name + ': ' + item.value + '\r\n';
    }
  }
  return res;
}

export function strToHeaders(headers: string): Array<{ name: string; value: string }> {
  if (!headers) return [];
  const res: Array<{ name: string; value: string }> = [];
  const h = headers.split('\n');
  for (const line of h) {
    if (!line) continue;
    const x = line.split(':');
    if (x.length !== 2 || !x[0] || !x[1]) continue;
    res.push({ name: x[0].trim(), value: x[1].trim() });
  }
  return res;
}

export function parseCurl(cmd: string): { method: string; url: string; headers: { [key: string]: string }; body: string } | null {
  if (!cmd || !cmd.trim()) return null;
  const result = { method: 'GET', url: '', headers: {} as { [key: string]: string }, body: '' };
  const parts = cmd.trim().match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === 'curl' || p === 'curl\\') continue;
    if (p === '-X' || p === '--request') {
      result.method = (parts[++i] || 'GET').replace(/^["']|["']$/g, '');
    } else if (p === '-H' || p === '--header') {
      const hv = (parts[++i] || '').replace(/^["']|["']$/g, '');
      const idx = hv.indexOf(':');
      if (idx > 0) {
        result.headers[hv.substring(0, idx).trim()] = hv.substring(idx + 1).trim();
      }
    } else if (p === '-d' || p === '--data' || p === '--data-raw' || p === '--data-binary') {
      result.body = (parts[++i] || '').replace(/^["']|["']$/g, '');
      if (result.method === 'GET') result.method = 'POST';
    } else if (p.indexOf('://') >= 0) {
      result.url = p.replace(/^["']|["']$/g, '');
    }
  }
  return result;
}

export function toCurl(data: any): string {
  if (!data || !data.request) return '';
  const r = data.request;
  const parts = ['curl'];
  if (r.method && r.method !== 'GET') parts.push('  -X ' + r.method);
  if (r.headers) {
    for (const h of r.headers) {
      if (!h.name || !h.value) continue;
      const n = h.name.toLowerCase();
      if (n[0] === ':' || n === 'accept-encoding' || n === 'content-length' || n === 'connection') continue;
      parts.push('  -H "' + h.name + ': ' + h.value.replace(/["\\]/g, '\\$&') + '"');
    }
  }
  if (r.postData) {
    const body = typeof r.postData.text === 'string' ? r.postData.text : JSON.stringify(r.postData);
    parts.push("  --data-binary '" + body.replace(/'/g, "'\\''") + "'");
    parts.push('  --compressed');
  } else {
    parts.push('  --compressed');
  }
  parts.push('  "' + (r.url || '').replace(/["\\]/g, '\\$&') + '"');
  return parts.join(' \\\n');
}

export function format(s: unknown, mime?: string): string {
  if (!s) return s as string;
  let text: string;
  if (typeof s === 'string') {
    text = s;
    if (mime) {
      const pd = (window as unknown as { pd?: { css: (x: string) => string; xml: (x: string) => string; json: (x: string) => string } }).pd;
      try {
        if (mime.indexOf('css') >= 0 && pd) text = pd.css(text);
        else if (mime.indexOf('xml') >= 0 && pd) text = pd.xml(text);
        else if (mime.indexOf('json') >= 0 && pd) text = pd.json(text);
        else if (pd) { try { text = pd.json(text); } catch { try { text = pd.xml(text); } catch { /* ignore */ } } }
      } catch { /* ignore */ }
    } else {
      const pd = (window as unknown as { pd?: { json: (x: string) => string } }).pd;
      if (pd) { try { text = pd.json(text); } catch { /* ignore */ } }
    }
  } else {
    text = JSON.stringify(s, null, 4);
  }
  return text.replace(/\\n/g, '\n')
    .replace(/\\'/g, "'")
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"')
    .replace(/\\&/g, '&')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f');
}
