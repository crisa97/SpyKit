import { collectFindings, findingsToGroupsHtml } from '../security/findings';
import type { Finding } from '../security/findings';
import { escapeHtml, downloadJSON } from '../core/utils';
import { values } from '../state';
import type { CapturedEntry } from '../types/index';

interface LocationInfo { method: string; url: string; id: number; }
interface GroupedFinding { title: string; detail: string; severity: Finding['severity']; locations: LocationInfo[]; }

let _groupedFindings: GroupedFinding[] = [];

export function exportGlobalFindingsCsv(): void {
  const rows: string[] = ['Severidad,Tipo,Detalle,Metodo,URL'];
  const seen = new Set<string>();
  for (const gf of _groupedFindings) {
    for (const loc of gf.locations) {
      let displayUrl = loc.url;
      try { const u = new URL(loc.url); displayUrl = u.hostname + u.pathname; } catch { /* keep full */ }
      const key = gf.title + loc.method + displayUrl;
      if (seen.has(key)) continue;
      seen.add(key);
      const sev = gf.severity;
      const title = gf.title.replace(/"/g, '""');
      const detail = (gf.detail || '').replace(/"/g, '""');
      rows.push(`"${sev}","${title}","${detail}","${loc.method}","${displayUrl}"`);
    }
  }
  downloadJSON(rows.join('\n'), 'hallazgos-globales.csv');
}

export function renderFindingsDialog(data: CapturedEntry): string {
  const findings = collectFindings(data);
  const method = data.request?.method || 'GET';
  let url = data.request?.url || '';
  if (url.length > 80) url = url.substring(0, 77) + '...';

  return `<div id="findings-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:620px;max-height:80vh;background:#1e1e1e;border:1px solid #444;border-radius:6px;z-index:9999;padding:12px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #333">
    <span style="font-weight:bold;color:#ffd700;font-size:13px">\uD83D\uDD0D Hallazgos: <span style="color:#888;font-weight:normal">${escapeHtml(method)} ${escapeHtml(url)}</span></span>
    <button id="findings-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
  </div>
  <div class="findings-body">${findingsToGroupsHtml(findings)}</div>
</div>`;
}

export function renderGlobalFindingsDialog(): string {
  interface LocationInfo { method: string; url: string; id: number; }
  interface GroupedFinding { title: string; detail: string; severity: Finding['severity']; locations: LocationInfo[]; }

  const typeMap = new Map<string, GroupedFinding>();
  let requestCount = 0;
  let totalFindingOccurrences = 0;
  let totalTypes = 0;
  let count = 0;

  for (const idStr in values.requests) {
    if (count++ > 500) break;
    const id = Number(idStr);
    const data = values.requests[id];
    if (!data || !data.request) continue;
    const findings = collectFindings(data);
    if (findings.length === 0) continue;
    requestCount++;
    for (const f of findings) {
      totalFindingOccurrences++;
      const key = f.title + '\u2223' + (f.detail || '');
      let existing = typeMap.get(key);
      if (!existing) {
        existing = { title: f.title, detail: f.detail, severity: f.severity, locations: [] };
        typeMap.set(key, existing);
        totalTypes++;
      }
      existing.locations.push({
        method: data.request.method,
        url: data.request.url,
        id,
      });
    }
  }

  const SEV_ORDER: Finding['severity'][] = ['critical', 'high', 'medium', 'low', 'info'];
  const SEV_COLOR: Record<string, string> = { critical: '#ff4444', high: '#ff8800', medium: '#4488ff', low: '#44cc44', info: '#888888' };
  const SEV_LABEL: Record<string, string> = { critical: '\uD83D\uDD34 CR\u00CDTICOS', high: '\uD83D\uDFE0 ALTOS', medium: '\uD83D\uDD35 MEDIOS', low: '\uD83D\uDFE2 BAJOS', info: '\u26AA INFORMACI\u00D3N' };

  const grouped = new Map<Finding['severity'], GroupedFinding[]>();
  for (const gf of typeMap.values()) {
    if (!grouped.has(gf.severity)) grouped.set(gf.severity, []);
    grouped.get(gf.severity)!.push(gf);
  }

  _groupedFindings = Array.from(typeMap.values());

  let bodyHtml = '';
  if (!totalTypes) {
    bodyHtml = '<div style="color:#888;padding:20px;text-align:center">No se encontraron hallazgos en ning\u00FAn request</div>';
  } else {
    for (const sev of SEV_ORDER) {
      const items = grouped.get(sev);
      if (!items || !items.length) continue;
      bodyHtml += `<div class="finding-group">`;
      bodyHtml += `<div class="finding-group-label" style="color:${SEV_COLOR[sev]}">${SEV_LABEL[sev]} <span class="finding-group-count">${items.length} tipos, ${items.reduce((s, g) => s + g.locations.length, 0)} ocurrencias</span></div>`;

      for (const gf of items) {
        bodyHtml += '<div class="finding-item" style="margin-bottom:4px">';
        bodyHtml += `<div class="finding-title" style="color:${SEV_COLOR[sev]}">${escapeHtml(gf.title)}</div>`;
        if (gf.detail) bodyHtml += `<div class="finding-detail">${escapeHtml(gf.detail)}</div>`;
        bodyHtml += `<div style="margin-top:3px;font-size:10px;color:#aaa">`;
        const seenLocations = new Set<string>();
        for (const loc of gf.locations) {
          let displayUrl = loc.url;
          try {
            const u = new URL(loc.url);
            displayUrl = u.hostname + u.pathname;
          } catch { /* keep full */ }
          const locKey = loc.method + displayUrl;
          if (seenLocations.has(locKey)) continue;
          seenLocations.add(locKey);
          bodyHtml += `<div style="padding:1px 0 1px 10px;color:#888">\u2022 ${escapeHtml(loc.method)} ${escapeHtml(displayUrl)}</div>`;
        }
        bodyHtml += `</div></div>`;
      }
      bodyHtml += '</div>';
    }
  }

  return `<div id="findings-global-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:720px;max-height:85vh;background:#1e1e1e;border:1px solid #444;border-radius:6px;z-index:9999;padding:12px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #333">
    <span style="font-weight:bold;color:#ffd700;font-size:13px">\uD83D\uDD0D Hallazgos Globales <span style="color:#888;font-weight:normal;font-size:11px">(${requestCount} requests, ${totalTypes} tipos de hallazgos)</span></span>
    <div><button id="findings-global-export" class="btn btn-xs btn-default" style="margin-right:4px">Export CSV</button><button id="findings-global-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button></div>
  </div>
  <div style="font-size:10px;color:#666;margin-bottom:6px">Cada ubicaci\u00F3n listada una sola vez por tipo de hallazgo</div>
  <div class="findings-body">${bodyHtml}</div>
</div>`;
}
