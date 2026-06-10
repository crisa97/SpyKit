export interface WSMessage {
  wsId: string;
  url: string;
  type: 'open' | 'send' | 'message' | 'close' | 'error';
  data?: string;
  dataLength?: number;
  code?: number;
  reason?: string;
  timestamp: number;
  direction: 'sent' | 'received' | 'event';
}

export interface WSConnection {
  wsId: string;
  url: string;
  messages: WSMessage[];
  opened: number;
  closed?: number;
  active: boolean;
}

const connections = new Map<string, WSConnection>();

export function handleWSMessage(msg: any): void {
  const wsId = msg.wsId;
  if (!connections.has(wsId)) {
    if (msg.wsType === 'open') {
      connections.set(wsId, {
        wsId,
        url: msg.url || 'unknown',
        messages: [],
        opened: msg.timestamp || Date.now(),
        active: true,
      });
    }
    return;
  }

  const conn = connections.get(wsId)!;
  let direction: 'sent' | 'received' | 'event' = 'event';

  if (msg.wsType === 'send') direction = 'sent';
  else if (msg.wsType === 'message') direction = 'received';

  conn.messages.push({
    wsId,
    url: conn.url,
    type: msg.wsType,
    data: msg.data,
    dataLength: msg.dataLength,
    code: msg.code,
    reason: msg.reason,
    timestamp: msg.timestamp || Date.now(),
    direction,
  });

  if (msg.wsType === 'close') {
    conn.active = false;
    conn.closed = msg.timestamp || Date.now();
  }
}

export function getWSConnections(): WSConnection[] {
  return Array.from(connections.values());
}

export function clearWSConnections(): void {
  connections.clear();
}

export function WSConnectionsToHtml(): string {
  const conns = getWSConnections();
  if (!conns.length) return '<div style="color:#888;padding:8px;text-align:center">No WebSocket connections captured</div>';

  let html = '';
  for (const conn of conns) {
    const color = conn.active ? '#44cc44' : '#888';
    const duration = conn.closed ? (conn.closed - conn.opened) + 'ms' : 'active';
    const sent = conn.messages.filter(m => m.direction === 'sent').length;
    const recv = conn.messages.filter(m => m.direction === 'received').length;

    html += `<div style="margin:4px 0;padding:6px;background:#1a1a2e;border:1px solid #333;border-radius:4px">`;
    html += `<div style="display:flex;justify-content:space-between;align-items:center">`;
    html += `<span style="color:${color};font-weight:bold">\u{1F310} ${new URL(conn.url).hostname}</span>`;
    html += `<span style="color:#888;font-size:10px">${sent} \u2191 / ${recv} \u2193 | ${duration}</span>`;
    html += `</div>`;
    html += `<div style="color:#888;font-size:10px;word-break:break-all">${conn.url}</div>`;

    if (conn.messages.length) {
      html += `<div style="max-height:200px;overflow-y:auto;margin-top:4px">`;
      for (const msg of conn.messages.slice(-20)) {
        const ts = new Date(msg.timestamp).toLocaleTimeString();
        const dirIcon = msg.direction === 'sent' ? '\u2191' : (msg.direction === 'received' ? '\u2193' : '\u25CB');
        const dirColor = msg.direction === 'sent' ? '#7ab7ef' : (msg.direction === 'received' ? '#44cc44' : '#888');
        const dataPreview = msg.data ? (msg.data.length > 80 ? msg.data.substring(0, 80) + '...' : msg.data) : '';

        html += `<div style="font-size:10px;padding:2px 0;border-bottom:1px solid #222">`;
        html += `<span style="color:${dirColor}">${dirIcon}</span> `;
        html += `<span style="color:#888">${ts}</span> `;
        html += `<span style="color:#eee;font-family:monospace">${dataPreview}</span>`;
        if (msg.type === 'close') html += ` <span style="color:#ffaa00">[closed code=${msg.code}]</span>`;
        html += `</div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }

  return html;
}
