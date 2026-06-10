export interface RepeaterResult {
  index: number;
  status: number;
  bodySize: number;
  time: number;
  bodyPreview: string;
  url?: string;
  method?: string;
}

let _repeaterResults: RepeaterResult[] = [];

export function getRepeaterResults(): RepeaterResult[] { return _repeaterResults; }
export function setRepeaterResults(r: RepeaterResult[]) { _repeaterResults = r; }
export function clearRepeaterResults() { _repeaterResults = []; }

export function renderRepeaterDialog(): string {
  return `
<div id="repeater-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;max-height:80vh;background:#1e1e1e;border:1px solid #444;border-radius:6px;z-index:9999;padding:12px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-weight:bold;color:#7ab7ef">\uD83D\uDD04 Repeater</span>
    <button id="repeater-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
  </div>
  <div style="margin-bottom:6px">
    <label style="color:#aaa;font-size:11px">Number of repetitions:</label>
    <input id="repeater-count" type="number" class="form-control" value="5" min="1" max="50" style="font-size:12px;width:80px;padding:2px 6px">
  </div>
  <div style="margin-bottom:8px">
    <button id="repeater-start" class="btn btn-sm btn-primary" style="width:100%">\uD83D\uDD04 Start Repeating</button>
  </div>
  <div id="repeater-results" style="max-height:300px;overflow-y:auto;font-size:11px"></div>
  <div style="margin-top:4px;display:flex;gap:4px;justify-content:flex-end">
    <button id="repeater-export-csv" class="btn btn-xs btn-default">Export CSV</button>
    <button id="repeater-clear" class="btn btn-xs btn-default">Clear</button>
  </div>
</div>`;
}

export function repeaterResultsToCsv(results: RepeaterResult[]): string {
  let csv = 'Index,Status,Size,Time,Preview,Method,URL\n';
  for (const r of results) {
    csv += (r.index + 1) + ',' + r.status + ',' + r.bodySize + ',' + r.time + ',"' + (r.bodyPreview || '').replace(/"/g, '""') + '",' + (r.method || 'GET') + ',"' + (r.url || '') + '"\n';
  }
  return csv;
}

export function repeaterResultsToHtml(results: RepeaterResult[]): string {
  if (!results.length) return '<div style="color:#888;padding:8px;text-align:center">No results yet</div>';

  let html = '<table style="width:100%;border-collapse:collapse;font-size:10px">';
  html += '<tr style="background:#2a2a2a"><th>#</th><th>Status</th><th>Size</th><th>Time</th><th>Preview</th></tr>';

  for (const r of results) {
    const bg = r.status >= 400 ? '#2a1a1a' : (r.status >= 300 ? '#2a2a1a' : '#1a1a1a');
    html += '<tr class="repeater-result-row" data-url="' + ((r.url || '').replace(/"/g, '&quot;')) + '" data-method="' + (r.method || 'GET') + '" style="background:' + bg + ';cursor:pointer">';
    html += '<td style="padding:2px 4px;color:#888">' + (r.index + 1) + '</td>';
    html += '<td style="padding:2px 4px;color:' + (r.status >= 400 ? '#ff4444' : '#44cc44') + '">' + r.status + '</td>';
    html += '<td style="padding:2px 4px;color:#888">' + r.bodySize + '</td>';
    html += '<td style="padding:2px 4px;color:#888">' + r.time + 'ms</td>';
    html += '<td style="padding:2px 4px;color:#aaa;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + r.bodyPreview.substring(0, 60) + '</td>';
    html += '</tr>';
  }

  html += '</table>';
  return html;
}
