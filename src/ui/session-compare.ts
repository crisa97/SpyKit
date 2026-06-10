import { values } from '../state';
import { simpleDiff } from './diff';

interface Session {
  id: number;
  name: string;
  timestamp: number;
  requests: Record<number, any>;
  requestIds: number[];
}

let sessions: Session[] = [];
let nextSessionId = 1;

export function initSessionCompare(): void {
  $('.search-bar-top').append('<button id="session-btn" class="btn btn-xs btn-default" type="button" title="Session Compare" style="margin-left:4px">\u{2260} Sessions</button>');

  $(document).on('click', '#session-btn', function () {
    toggleSessionPanel();
  });
  $(document).on('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      toggleSessionPanel();
    }
  });
}

function toggleSessionPanel(): void {
  let $panel = $('#session-panel');
  if ($panel.length) {
    $panel.toggle();
    if ($panel.is(':visible')) renderSessionPanel();
    return;
  }

  $panel = $(`
<div id="session-panel" style="display:none;position:fixed;top:40px;right:0;width:450px;max-height:calc(100vh - 80px);background:#1e1e1e;border:1px solid #444;border-radius:4px;z-index:9998;overflow-y:auto;box-shadow:-2px 0 10px rgba(0,0,0,0.3)">
  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #444;background:#2a2a2a;position:sticky;top:0;z-index:1">
    <span style="font-weight:bold;color:#f0c040">\u{2260} Session Compare</span>
    <div>
      <button id="session-snapshot" class="btn btn-xs btn-default" style="padding:0 6px;margin-right:4px">+ Snapshot</button>
      <button id="session-clear" class="btn btn-xs btn-default" style="padding:0 6px;margin-right:4px">Clear</button>
      <button id="session-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
    </div>
  </div>
  <div id="session-content" style="padding:6px;font-size:11px"></div>
</div>`);
  $('body').append($panel);
  $panel.show();
  renderSessionPanel();

  $(document).on('click', '#session-close', () => $panel.hide());
  $(document).on('click', '#session-clear', () => {
    sessions = [];
    renderSessionPanel();
  });
  $(document).on('click', '#session-snapshot', () => {
    snapshotCurrent();
    renderSessionPanel();
  });
  $(document).on('click', '.session-compare-btn', function () {
    const ids = ($(this).attr('data-ids') || '').split(',').map(Number);
    if (ids.length === 2) {
      compareSessions(ids[0], ids[1]);
    }
  });
}

function snapshotCurrent(): void {
  const snapshot: Record<number, any> = {};
  const requestIds: number[] = [];
  for (const id in values.requests) {
    const nid = Number(id);
    if (!isNaN(nid) && values.requests[nid]) {
      snapshot[nid] = values.requests[nid];
      requestIds.push(nid);
    }
  }
  sessions.push({
    id: nextSessionId++,
    name: `Session ${sessions.length + 1} (${requestIds.length} req)`,
    timestamp: Date.now(),
    requests: snapshot,
    requestIds,
  });
}

function renderSessionPanel(): void {
  const $content = $('#session-content');
  if (!sessions.length) {
    $content.html('<div style="color:#888;padding:8px;text-align:center">No sessions. Click "+ Snapshot" to capture current requests.</div>');
    return;
  }

  let html = '';
  for (const s of sessions) {
    const ts = new Date(s.timestamp).toLocaleTimeString();
    html += `<div style="margin:4px 0;padding:6px;background:#1a1a2e;border:1px solid #333;border-radius:4px">`;
    html += `<div style="display:flex;justify-content:space-between;align-items:center">`;
    html += `<span style="color:#f0c040;font-weight:bold">#${s.id}: ${s.name}</span>`;
    html += `<span style="color:#888;font-size:10px">${ts}</span>`;
    html += `</div></div>`;
  }

  // Comparison controls
  if (sessions.length >= 2) {
    html += `<div style="margin:8px 0;padding:6px;background:#2a2a2a;border:1px solid #444;border-radius:4px">`;
    html += `<div style="color:#888;margin-bottom:4px">Compare:</div>`;
    html += `<select id="session-a" style="background:#1e1e1e;color:#eee;border:1px solid #555;padding:2px;margin-right:4px">`;
    for (const s of sessions) html += `<option value="${s.id}">#${s.id} ${s.name}</option>`;
    html += `</select>`;
    html += `<span style="color:#888">vs</span>`;
    html += `<select id="session-b" style="background:#1e1e1e;color:#eee;border:1px solid #555;padding:2px;margin:0 4px">`;
    for (const s of sessions) html += `<option value="${s.id}">#${s.id} ${s.name}</option>`;
    html += `</select>`;
    html += `<button id="session-do-compare" class="btn btn-xs btn-default" style="padding:0 6px">Compare</button>`;
    html += `</div>`;
  }

  if ($('#session-do-compare').length) {
    $(document).off('click', '#session-do-compare').on('click', '#session-do-compare', function () {
      const aId = parseInt($('#session-a').val() as string);
      const bId = parseInt($('#session-b').val() as string);
      if (aId && bId) compareSessions(aId, bId);
    });
  }

  $content.html(html);
}

function compareSessions(aId: number, bId: number): void {
  const a = sessions.find(s => s.id === aId);
  const b = sessions.find(s => s.id === bId);
  if (!a || !b) return;

  const aIds = new Set(a.requestIds);
  const bIds = new Set(b.requestIds);

  const onlyInA: number[] = [];
  const onlyInB: number[] = [];
  const inBoth: number[] = [];

  for (const id of aIds) {
    if (bIds.has(id)) inBoth.push(id);
    else onlyInA.push(id);
  }
  for (const id of bIds) {
    if (!aIds.has(id)) onlyInB.push(id);
  }

  const reqUrl = (data: any) => (data?.request?.url || 'unknown');
  const reqMethod = (data: any) => (data?.request?.method || 'GET');
  const respCode = (data: any) => (data?.response?.status || '-');
  const respBody = (data: any) => (data?.response?.content?.text || '');

  let html = `<div style="margin:8px 0">`;
  html += `<div style="color:#0c0;font-weight:bold">Added (${onlyInB.length}):</div>`;
  for (const id of onlyInB.slice(0, 20)) {
    const data = b.requests[id];
    html += `<div style="color:#0c0;padding:2px 4px;font-size:10px">+ ${reqMethod(data)} ${reqUrl(data)} <span style="color:#888">[${respCode(data)}]</span></div>`;
  }
  if (onlyInB.length > 20) html += `<div style="color:#888">...and ${onlyInB.length - 20} more</div>`;

  html += `<div style="color:#c00;margin-top:6px">Removed (${onlyInA.length}):</div>`;
  for (const id of onlyInA.slice(0, 20)) {
    const data = a.requests[id];
    html += `<div style="color:#c00;padding:2px 4px;font-size:10px">- ${reqMethod(data)} ${reqUrl(data)} <span style="color:#888">[${respCode(data)}]</span></div>`;
  }
  if (onlyInA.length > 20) html += `<div style="color:#888">...and ${onlyInA.length - 20} more</div>`;

  // Show changed responses
  let changed = 0;
  let changesHtml = '';
  for (const id of inBoth) {
    const aBody = respBody(a.requests[id]);
    const bBody = respBody(b.requests[id]);
    if (aBody && bBody && aBody !== bBody) {
      changed++;
      const data = b.requests[id];
      const preview = `<div style="margin:4px 0;padding:4px;background:#1a1a2e;border:1px solid #333;border-radius:4px">`;
      changesHtml += `<div style="margin:4px 0;padding:4px;background:#1a1a2e;border:1px solid #444;border-radius:2px">`;
      changesHtml += `<div style="color:#ffa500;font-size:10px">${reqMethod(data)} ${reqUrl(data)}</div>`;
      changesHtml += `<div style="max-height:120px;overflow-y:auto;font-size:9px">${simpleDiff(aBody.substring(0, 500), bBody.substring(0, 500))}</div>`;
      changesHtml += `</div>`;
    }
  }

  if (changed) {
    html += `<div style="color:#ffa500;margin-top:6px">Changed responses (${changed}):</div>`;
    html += changesHtml;
  }

  html += `</div>`;

  const $content = $('#session-content');
  $content.html(html);
}
