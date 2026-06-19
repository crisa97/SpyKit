import { SECURITY_HEADERS, INFO_DISCLOSURE_HEADERS } from '../state';
import type { CapturedEntry } from '../types/index';
import { getRequestText, escapeHtml } from '../core/utils';
import { scanForSecrets } from './secrets';
import { findJWTInText } from './jwt';
import { analyzeAuth } from './auth';
import { checkCORS } from './cors';
import { scanForReflections } from './scanner';
import { parseCookies } from './cookies';

export interface Finding {
  category: 'secret' | 'auth' | 'jwt' | 'header' | 'cors' | 'cookie' | 'scanner';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  detail: string;
  location?: string;
}

function sev(s: string): Finding['severity'] {
  if (s === 'Password' || s === 'API Key') return 'critical';
  if (s === 'JWT' || s === 'Bearer Token' || s === 'AWS Key' || s === 'GitHub Token' || s === 'OAuth Token') return 'high';
  if (s === 'Token') return 'medium';
  return 'info';
}

export function collectFindings(data: CapturedEntry): Finding[] {
  const findings: Finding[] = [];
  const body = (data.response?.content?.text) || '';
  const allText = getRequestText(data) + ' ' + body;
  const resHeaders = data.response?.headers || [];
  const reqHeaders = data.request?.headers || null;

  // 1. Secrets
  const secrets = scanForSecrets(allText);
  const secretCounts: Record<string, number> = {};
  for (const s of secrets) {
    secretCounts[s.type] = (secretCounts[s.type] || 0) + 1;
  }
  for (const type in secretCounts) {
    findings.push({
      category: 'secret',
      severity: sev(type),
      title: `${type} detectado (${secretCounts[type]})`,
      detail: `Encontrado en request/response body`,
    });
  }

  // 2. JWT
  const jwts = findJWTInText(allText);
  for (const t of jwts) {
    for (const issue of t.issues) {
      findings.push({
        category: 'jwt',
        severity: issue.startsWith('CRITICAL') ? 'critical' : 'medium',
        title: `JWT: ${issue}`,
        detail: `Algoritmo: ${t.alg}`,
      });
    }
  }

  // 3. Auth
  const authFindings = analyzeAuth(reqHeaders, resHeaders, data.request?.url || '');
  for (const f of authFindings) {
    findings.push({
      category: 'auth',
      severity: f.severity as Finding['severity'],
      title: f.detail,
      detail: f.recommendation,
      location: f.location,
    });
  }

  // 4. Security headers
  const found: Record<string, string> = {};
  if (resHeaders) {
    for (const h of resHeaders) {
      const name = h.name ? h.name.toLowerCase() : '';
      if (SECURITY_HEADERS[name]) found[name] = h.value;
    }
  }
  for (const key in SECURITY_HEADERS) {
    const h = SECURITY_HEADERS[key];
    if (found[key] !== undefined) {
      const ok = h.check(found[key]);
      if (!ok) {
        findings.push({
          category: 'header',
          severity: 'medium',
          title: `${h.label} mal configurado`,
          detail: `${key}: ${found[key]} — ${h.desc}`,
        });
      }
    } else {
      findings.push({
        category: 'header',
        severity: key === 'content-security-policy' ? 'medium' : 'high',
        title: `${h.label} faltante`,
        detail: h.desc,
      });
    }
  }

  // 5. Info disclosure headers
  if (resHeaders) {
    for (const h of resHeaders) {
      const name = h.name ? h.name.toLowerCase() : '';
      if (INFO_DISCLOSURE_HEADERS[name]) {
        findings.push({
          category: 'header',
          severity: 'info',
          title: `Info disclosure: ${name}`,
          detail: `${name}: ${h.value.substring(0, 80)} — ${INFO_DISCLOSURE_HEADERS[name].desc}`,
        });
      }
    }
  }

  // 6. CORS
  const corsResult = checkCORS(reqHeaders, resHeaders);
  if (corsResult.issues && corsResult.issues.length) {
    for (const issue of corsResult.issues) {
      findings.push({
        category: 'cors',
        severity: issue.indexOf('CRITICAL') >= 0 ? 'critical' : 'high',
        title: `CORS: ${issue}`,
        detail: 'Cross-Origin Resource Sharing misconfiguration',
      });
    }
  }

  // 7. Scanner / reflections
  const scanResults = scanForReflections(
    data.request?.url || '',
    (data.request?.postData ? (typeof data.request.postData === 'string' ? data.request.postData : data.request.postData.text || '') : ''),
    body
  );
  for (const r of scanResults) {
    findings.push({
      category: 'scanner',
      severity: r.type === 'sqli' ? 'high' : r.type === 'xss' ? 'high' : 'medium',
      title: `${r.type.toUpperCase()} reflejado`,
      detail: `Parámetro "${r.parameter}" — Payload: ${r.payload}`,
      location: r.evidence,
    });
  }

  // 8. Cookies
  const cookies = parseCookies(resHeaders);
  for (const c of cookies) {
    if (!c.secure) {
      findings.push({ category: 'cookie', severity: 'high', title: 'Cookie sin Secure', detail: `${c.name} no tiene flag Secure`, location: `Set-Cookie: ${c.name}` });
    }
    if (!c.httponly) {
      findings.push({ category: 'cookie', severity: 'medium', title: 'Cookie sin HttpOnly', detail: `${c.name} no tiene flag HttpOnly`, location: `Set-Cookie: ${c.name}` });
    }
    if (!c.samesite) {
      findings.push({ category: 'cookie', severity: 'low', title: 'Cookie sin SameSite', detail: `${c.name} no tiene SameSite`, location: `Set-Cookie: ${c.name}` });
    }
  }

  return findings;
}

const SEV_ORDER: Finding['severity'][] = ['critical', 'high', 'medium', 'low', 'info'];
const SEV_LABEL: Record<Finding['severity'], string> = {
  critical: '🔴 CRÍTICOS',
  high: '🟠 ALTOS',
  medium: '🔵 MEDIOS',
  low: '🟢 BAJOS',
  info: '⚪ INFORMACIÓN',
};
const SEV_COLOR: Record<Finding['severity'], string> = {
  critical: '#ff4444',
  high: '#ff8800',
  medium: '#4488ff',
  low: '#44cc44',
  info: '#888888',
};

export function findingsToGroupsHtml(findings: Finding[]): string {
  if (!findings.length) return '<div style="color:#888;padding:12px;text-align:center">No se encontraron hallazgos</div>';

  const grouped: Record<string, Finding[]> = {};
  for (const f of findings) {
    if (!grouped[f.severity]) grouped[f.severity] = [];
    grouped[f.severity].push(f);
  }

  let html = '';
  for (const sev of SEV_ORDER) {
    const items = grouped[sev];
    if (!items || !items.length) continue;
    html += `<div class="finding-group">`;
    html += `<div class="finding-group-label" style="color:${SEV_COLOR[sev]}">${SEV_LABEL[sev]} <span class="finding-group-count">${items.length}</span></div>`;
    for (const f of items) {
      html += '<div class="finding-item">';
      html += `<div class="finding-title" style="color:${SEV_COLOR[sev]}">${escapeHtml(f.title)}</div>`;
      if (f.detail) html += `<div class="finding-detail">${escapeHtml(f.detail)}</div>`;
      if (f.location) html += `<div class="finding-location">${escapeHtml(f.location)}</div>`;
      html += '</div>';
    }
    html += '</div>';
  }
  return html;
}

export function findingsToHtml(findings: Finding[]): string {
  const body = findingsToGroupsHtml(findings);
  if (!body || body.indexOf('No se encontraron') >= 0) return '';
  return `<details class="findings-panel"><summary class="findings-summary"><span class="findings-icon">🔍</span> Hallazgos <span class="findings-badge">${findings.length}</span></summary><div class="findings-body">${body}</div></details>`;
}
