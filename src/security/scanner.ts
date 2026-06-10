export interface ScanResult {
  type: 'sqli' | 'xss' | 'path-traversal';
  parameter: string;
  payload: string;
  reflected: boolean;
  evidence: string;
}

const SQLI_PAYLOADS = [
  "' OR '1'='1",
  "' UNION SELECT NULL--",
  "'; DROP TABLE users--",
  '" OR "1"="1',
  "' OR 1=1--",
  "1' AND '1'='1",
];

const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '"><script>alert(1)</script>',
  'javascript:alert(1)',
  '<svg onload=alert(1)>',
];

const PATH_TRAVERSAL_PAYLOADS = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc/passwd',
  '....//....//....//etc/passwd',
];

export function scanForReflections(url: string, body: string, responseBody: string): ScanResult[] {
  const results: ScanResult[] = [];
  if (!responseBody) return results;

  const params = extractParams(url, body);

  for (const param of params) {
    // Test SQLi
    for (const payload of SQLI_PAYLOADS) {
      const testValue = payload;
      const responseLower = responseBody.toLowerCase();
      const payloadLower = payload.toLowerCase();
      if (responseLower.includes(payloadLower) || responseLower.includes(encodeURIComponent(payload).toLowerCase())) {
        results.push({
          type: 'sqli',
          parameter: param.name,
          payload,
          reflected: true,
          evidence: responseBody.substring(
            Math.max(0, responseBody.toLowerCase().indexOf(payloadLower)),
            Math.min(responseBody.length, responseBody.toLowerCase().indexOf(payloadLower) + 80)
          ),
        });
      }
    }

    // Test XSS
    for (const payload of XSS_PAYLOADS) {
      if (responseBody.includes(payload) || responseBody.includes(encodeURIComponent(payload))) {
        results.push({
          type: 'xss',
          parameter: param.name,
          payload,
          reflected: true,
          evidence: responseBody.substring(
            Math.max(0, responseBody.indexOf(payload)),
            Math.min(responseBody.length, responseBody.indexOf(payload) + 80)
          ),
        });
      }
    }

    // Test Path Traversal
    for (const payload of PATH_TRAVERSAL_PAYLOADS) {
      if (responseBody.includes(payload)) {
        results.push({
          type: 'path-traversal',
          parameter: param.name,
          payload,
          reflected: true,
          evidence: responseBody.substring(
            Math.max(0, responseBody.indexOf(payload)),
            Math.min(responseBody.length, responseBody.indexOf(payload) + 80)
          ),
        });
      }
    }
  }

  return results;
}

function extractParams(url: string, body: string): Array<{ name: string; value: string }> {
  const params: Array<{ name: string; value: string }> = [];

  // URL query params
  const qIdx = url.indexOf('?');
  if (qIdx >= 0) {
    const qs = url.substring(qIdx + 1);
    for (const part of qs.split('&')) {
      const eq = part.indexOf('=');
      if (eq >= 0) {
        params.push({ name: decodeURIComponent(part.substring(0, eq)), value: decodeURIComponent(part.substring(eq + 1)) });
      } else {
        params.push({ name: decodeURIComponent(part), value: '' });
      }
    }
  }

  // Body params (simple JSON or form-encoded)
  if (body) {
    try {
      const parsed = JSON.parse(body);
      for (const key of Object.keys(parsed)) {
        if (typeof parsed[key] === 'string') {
          params.push({ name: key, value: parsed[key] });
        }
      }
    } catch {
      // Try form-encoded
      for (const part of body.split('&')) {
        const eq = part.indexOf('=');
        if (eq >= 0) {
          params.push({ name: decodeURIComponent(part.substring(0, eq)), value: decodeURIComponent(part.substring(eq + 1)) });
        }
      }
    }
  }

  return params;
}

export function scanResultsToHtml(results: ScanResult[]): string {
  if (!results.length) return '';

  let html = '<div class="scan-results" style="margin-top:6px;padding:6px;background:#1a1a2e;border:1px solid #ff4444;border-radius:4px">';
  html += '<div style="font-weight:bold;color:#ff4444;margin-bottom:4px">\u26A0 Reflection Scanner Results (' + results.length + ')</div>';

  for (const r of results) {
    const typeColor = r.type === 'sqli' ? '#ff4444' : (r.type === 'xss' ? '#ff8800' : '#ffaa00');
    html += '<div style="margin:4px 0;padding:4px;background:#16213e;border-radius:3px;font-size:11px">';
    html += '<span style="color:' + typeColor + ';font-weight:bold">[' + r.type.toUpperCase() + ']</span> ';
    html += '<span style="color:#eee">Param: <b>' + r.parameter + '</b></span>';
    html += '<div style="color:#888;margin-top:2px;word-break:break-all">Payload: ' + r.payload + '</div>';
    if (r.evidence) {
      html += '<div style="color:#aaa;margin-top:2px;font-family:monospace;font-size:10px;word-break:break-all">Evidence: ' + r.evidence.substring(0, 100) + '</div>';
    }
    html += '</div>';
  }

  html += '</div>';
  return html;
}
