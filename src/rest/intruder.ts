import { fuzzResultsToHtml, FuzzResult } from './fuzzer';

const CUSTOM_PAYLOADS_KEY = 'spykit-intruder-payloads';

export interface IntruderConfig {
  targetField: string;
  position: 'url-param' | 'url-path' | 'body' | 'header';
  payloadType: string;
  payloads: string[];
  method: string;
  url: string;
  headers: string;
  body: string;
}

export function saveCustomPayloads(name: string, payloads: string[]): void {
  const stored = JSON.parse(localStorage.getItem(CUSTOM_PAYLOADS_KEY) || '{}');
  stored[name] = payloads;
  localStorage.setItem(CUSTOM_PAYLOADS_KEY, JSON.stringify(stored));
}

export function loadCustomPayloads(): Record<string, string[]> {
  return JSON.parse(localStorage.getItem(CUSTOM_PAYLOADS_KEY) || '{}');
}

export function deleteCustomPayloads(name: string): void {
  const stored = JSON.parse(localStorage.getItem(CUSTOM_PAYLOADS_KEY) || '{}');
  delete stored[name];
  localStorage.setItem(CUSTOM_PAYLOADS_KEY, JSON.stringify(stored));
}

const INTRUDER_PAYLOADS: Record<string, string[]> = {
  'SQL Injection': ["'", "' OR '1'='1", "' OR 1=1--", '" OR "1"="1', "' UNION SELECT NULL--", "'; DROP TABLE users--", "1 AND 1=1", "1 AND 1=2", "' AND '1'='1", "' AND '1'='2", "admin'--", "admin' #"],
  'XSS': ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', '<svg onload=alert(1)>', 'javascript:alert(1)', '<body onload=alert(1)>', "';alert(1);//"],
  'Path Traversal': ['../../../etc/passwd', '..\\\\..\\\\..\\\\windows\\\\win.ini', '%2e%2e%2f%2e%2e%2fetc/passwd', '....//....//....//etc/passwd'],
  'Numbers 0-100': Array.from({ length: 101 }, (_, i) => String(i)),
  'Common Usernames': ['admin', 'root', 'user', 'test', 'guest', 'administrator', 'sa', 'oracle', 'postgres', 'jenkins', 'tomcat', 'manager', 'demo'],
  'Common Passwords': ['password', '123456', 'admin', 'admin123', 'root', 'test', 'passw0rd', 'qwerty', 'letmein', 'welcome', 'P@ssw0rd'],
  'Blank/Null': ['', 'null', 'undefined', '0', '-1', 'true', 'false', 'NaN'],
};

export function getIntruderPayloadTypes(): string[] {
  return Object.keys(INTRUDER_PAYLOADS).concat('Custom...');
}

export function getIntruderPayloads(type: string): string[] {
  return INTRUDER_PAYLOADS[type] || [];
}

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

export function renderIntruderDialog(): string {
  return `
<div id="intruder-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;max-height:85vh;background:#1e1e1e;border:1px solid #444;border-radius:6px;z-index:9999;padding:12px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-weight:bold;color:#ff6b35">\uD83C\uDFAF Intruder</span>
    <button id="intruder-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:6px">
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Target position:</label>
      <select id="intruder-position" class="form-control" style="font-size:12px;padding:2px 6px">
        <option value="url-param">URL Parameter</option>
        <option value="url-path">URL Path</option>
        <option value="body">Request Body (literal replace)</option>
        <option value="json-body-key">JSON Body Key</option>
        <option value="header">Header Value</option>
      </select>
    </div>
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Field name (for param/header):</label>
      <input id="intruder-field" class="form-control" placeholder="parameter_name" style="font-size:12px;padding:2px 6px">
    </div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:6px">
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Payload type:</label>
      <select id="intruder-payload-type" class="form-control" style="font-size:12px;padding:2px 6px">
        ${Object.keys(INTRUDER_PAYLOADS).map(t => `<option value="${t}">${t}</option>`).join('')}
        <option value="__custom__">Custom...</option>
      </select>
    </div>
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Payloads to send:</label>
      <input id="intruder-count" class="form-control" readonly style="font-size:12px;padding:2px 6px;background:#2a2a2a">
    </div>
  </div>
  <div style="margin-bottom:6px">
    <label><input type="checkbox" id="intruder-append" style="margin-right:4px"> Same value (payload appended to existing value instead of replacing it)</label>
  </div>
  <div id="intruder-custom-area" style="display:none;margin-bottom:6px">
    <label style="color:#aaa;font-size:11px">Custom payloads (one per line):</label>
    <textarea id="intruder-custom-payloads" class="form-control" rows="3" placeholder="payload1&#10;payload2&#10;payload3" style="font-family:monospace;font-size:11px"></textarea>
    <div style="margin-top:4px;display:flex;gap:4px">
      <button id="intruder-save-custom" class="btn btn-xs btn-default">Save as...</button>
      <select id="intruder-load-custom" style="background:#1e1e1e;color:#eee;border:1px solid #555;padding:2px;font-size:10px">
        <option value="">Load saved...</option>
      </select>
    </div>
  </div>
  <div style="margin-bottom:8px;display:flex;gap:4px">
    <button id="intruder-start" class="btn btn-sm btn-danger" style="flex:1">⚡ Start Attack</button>
    <button id="intruder-stop" class="btn btn-sm btn-default" style="display:none;flex:0.4">⏹ Stop</button>
    <label style="color:#aaa;font-size:11px;align-self:center">
      Concurrent: <input id="intruder-concurrent" type="number" value="5" min="1" max="20" style="width:50px;background:#1e1e1e;color:#eee;border:1px solid #555;padding:2px;font-size:11px">
    </label>
  </div>
  <div id="intruder-progress" style="display:none;margin-bottom:6px">
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#888">
      <span id="intruder-progress-text">0 / 0</span>
      <span id="intruder-progress-pct">0%</span>
    </div>
    <div style="height:4px;background:#333;border-radius:2px;margin-top:2px">
      <div id="intruder-progress-bar" style="height:100%;width:0%;background:#ff6b35;border-radius:2px;transition:width 0.3s"></div>
    </div>
  </div>
  <div id="intruder-results" style="max-height:300px;overflow-y:auto;font-size:11px"></div>
  <div style="margin-top:4px;display:flex;gap:4px;justify-content:flex-end;align-items:center">
    <label style="color:#888;font-size:10px;margin-right:auto"><input type="checkbox" id="intruder-hide-noise" style="margin-right:3px">Hide 0/404</label>
    <button id="intruder-export" class="btn btn-xs btn-default">Export CSV</button>
    <button id="intruder-clear" class="btn btn-xs btn-default">Clear</button>
  </div>
</div>`;
}

let _intruderResults: FuzzResult[] = [];

export function getIntruderResults(): FuzzResult[] {
  return _intruderResults;
}

export function setIntruderResults(r: FuzzResult[]): void {
  _intruderResults = r;
}

export function clearIntruderResults(): void {
  _intruderResults = [];
}

export function intruderResultsToHtml(results: FuzzResult[]): string {
  return fuzzResultsToHtml(results);
}
