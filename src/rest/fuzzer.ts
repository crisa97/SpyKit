export interface FuzzResult {
  method: string;
  url: string;
  parameter: string;
  payload: string;
  status: number;
  bodySize: number;
  responseTime: number;
  diff: number;
}

const SQLI_FUZZ_PAYLOADS = [
  "'", "''", "1'", "' OR '1'='1", "' OR 1=1--", '" OR "1"="1',
  "' UNION SELECT NULL--", "'; DROP TABLE users--", "1 AND 1=1", "1 AND 1=2",
  "' AND '1'='1", "' AND '1'='2", "admin'--", "admin' #",
];

const XSS_FUZZ_PAYLOADS = [
  '<script>alert(1)</script>', '<img src=x onerror=alert(1)>',
  '"><script>alert(1)</script>', '<svg onload=alert(1)>',
  'javascript:alert(1)', '<body onload=alert(1)>',
  '"><img src=x onerror=alert(1)>', "';alert(1);//",
];

const PATH_TRAVERSAL_PAYLOADS = [
  '../../../etc/passwd', '..\\..\\..\\windows\\win.ini',
  '%2e%2e%2f%2e%2e%2fetc/passwd', '....//....//....//etc/passwd',
  '..%252f..%252f..%252fetc/passwd',
];

export function getFuzzPayloads(type: string): string[] {
  switch (type) {
    case 'sqli': return SQLI_FUZZ_PAYLOADS;
    case 'xss': return XSS_FUZZ_PAYLOADS;
    case 'path': return PATH_TRAVERSAL_PAYLOADS;
    default: return [];
  }
}

let _fuzzResults: FuzzResult[] = [];

export function getFuzzResults(): FuzzResult[] { return _fuzzResults; }
export function setFuzzResults(r: FuzzResult[]) { _fuzzResults = r; }
export function clearFuzzResults() { _fuzzResults = []; }

export function replaceJsonKey(body: string, key: string, newValue: string, append?: boolean): string {
  try {
    const obj = JSON.parse(body);
    const keys = key.split('.');
    let current: any = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined) return body;
      current = current[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    if (current[lastKey] === undefined) return body;
    current[lastKey] = append ? String(current[lastKey]) + newValue : newValue;
    return JSON.stringify(obj, null, 2);
  } catch {
    return body;
  }
}

export function renderFuzzerDialog(): string {
  return `
<div id="fuzzer-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:550px;max-height:85vh;background:#1e1e1e;border:1px solid #444;border-radius:6px;z-index:9999;padding:12px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-weight:bold;color:#ffd700">\uD83D\uDD0D Fuzzer</span>
    <button id="fuzzer-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:6px">
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Position:</label>
      <select id="fuzzer-position" class="form-control" style="font-size:12px;padding:2px 6px">
        <option value="url-param">URL Parameter</option>
        <option value="json-body-key">JSON Body Key</option>
      </select>
    </div>
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Target field:</label>
      <input id="fuzzer-param" class="form-control" placeholder="parameter_name" style="font-size:12px;padding:2px 6px">
    </div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:6px">
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Payload type:</label>
      <select id="fuzzer-type" class="form-control" style="font-size:12px;padding:2px 6px">
        <option value="sqli">SQL Injection</option>
        <option value="xss">Cross-Site Scripting (XSS)</option>
        <option value="path">Path Traversal</option>
      </select>
    </div>
    <div style="flex:1;align-self:flex-end">
      <label style="display:block;font-size:11px;color:#aaa"><input type="checkbox" id="fuzzer-append" style="margin-right:4px"> Same value</label>
    </div>
  </div>
  <div style="margin-bottom:8px;display:flex;gap:4px">
    <button id="fuzzer-start" class="btn btn-sm btn-danger" style="flex:1">\u26A1 Start Fuzzing</button>
  </div>
  <div id="fuzzer-progress" style="display:none;margin-bottom:6px">
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#888">
      <span id="fuzzer-progress-text">0 / 0</span>
      <span id="fuzzer-progress-pct">0%</span>
    </div>
    <div style="height:4px;background:#333;border-radius:2px;margin-top:2px">
      <div id="fuzzer-progress-bar" style="height:100%;width:0%;background:#ffd700;border-radius:2px;transition:width 0.3s"></div>
    </div>
  </div>
  <div id="fuzzer-results" style="max-height:300px;overflow-y:auto;font-size:11px"></div>
  <div style="margin-top:4px;display:flex;gap:4px;justify-content:flex-end">
    <button id="fuzzer-export-csv" class="btn btn-xs btn-default">Export CSV</button>
    <button id="fuzzer-clear" class="btn btn-xs btn-default">Clear</button>
  </div>
</div>`;
}

export function fuzzResultsToCsv(results: FuzzResult[]): string {
  let csv = 'Index,Method,URL,Parameter,Payload,Status,Size,Time,Diff\n';
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    csv += (i + 1) + ',' + r.method + ',"' + r.url + '",' + r.parameter + ',"' + r.payload.replace(/"/g, '""') + '",' + r.status + ',' + r.bodySize + ',' + r.responseTime + ',' + r.diff + '\n';
  }
  return csv;
}

export function fuzzResultsToHtml(results: FuzzResult[]): string {
  if (!results.length) return '<div style="color:#888;padding:8px;text-align:center">No results yet</div>';

  let html = '<table style="width:100%;border-collapse:collapse;font-size:10px">';
  html += '<tr style="background:#2a2a2a"><th style="padding:4px;text-align:left">#</th><th style="padding:4px;text-align:left">Payload</th><th style="padding:4px;text-align:right">Status</th><th style="padding:4px;text-align:right">Size</th><th style="padding:4px;text-align:right">Time</th><th style="padding:4px;text-align:right">Diff</th></tr>';

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const bg = r.status !== 200 ? '#2a1a1a' : (r.diff > 100 ? '#1a2a1a' : '#1a1a1a');
    html += '<tr class="fuzz-result-row" data-url="' + r.url.replace(/"/g, '&quot;') + '" data-method="' + r.method + '" data-payload="' + r.payload.replace(/"/g, '&quot;') + '" style="background:' + bg + ';cursor:pointer">';
    html += '<td style="padding:2px 4px;color:#888">' + (i + 1) + '</td>';
    html += '<td style="padding:2px 4px;color:#eee;font-family:monospace;word-break:break-all;max-width:200px">' + r.payload.substring(0, 40) + '</td>';
    html += '<td style="padding:2px 4px;text-align:right;color:' + (r.status >= 400 ? '#ff4444' : '#44cc44') + '">' + r.status + '</td>';
    html += '<td style="padding:2px 4px;text-align:right;color:#888">' + r.bodySize + '</td>';
    html += '<td style="padding:2px 4px;text-align:right;color:#888">' + r.responseTime + 'ms</td>';
    html += '<td style="padding:2px 4px;text-align:right;color:' + (r.diff > 100 ? '#ffaa00' : '#888') + '">' + r.diff + '</td>';
    html += '</tr>';
  }

  html += '</table>';
  return html;
}
