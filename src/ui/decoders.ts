import { findJWTInText, decodeJWT } from '../security/jwt';

export interface DecodeResult {
  label: string;
  input: string;
  output: string;
  error?: string;
  raw?: string;
}

export function detectAndDecode(text: string): DecodeResult[] {
  const results: DecodeResult[] = [];
  if (!text) return results;

  // JWT detection (must be first, so it shows up prominently)
  try {
    const jwts = findJWTInText(text);
    for (const t of jwts) {
      const prettyHeader = JSON.stringify(t.header, null, 2);
      const prettyPayload = JSON.stringify(t.payload, null, 2);
      const output = '[Header]\n' + prettyHeader + '\n\n[Payload]\n' + prettyPayload + '\n\n[Signature]\n' + t.signature;
      results.push({ label: 'JWT (' + t.alg + ')', input: t.raw, output, raw: t.raw });
    }
  } catch { /* ignore */ }

  // Base64 (skip if already decoded as JWT part)
  try {
    const trimmed = text.trim();
    if (/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed) && trimmed.length % 4 === 0) {
      const decoded = atob(trimmed);
      if (decoded.length > 0 && /^[\x20-\x7E\s]*$/.test(decoded)) {
        results.push({ label: 'Base64', input: text, output: decoded });
      }
    }
  } catch { /* ignore */ }

  // URL encoding
  try {
    if (/%[0-9A-Fa-f]{2}/.test(text)) {
      const decoded = decodeURIComponent(text);
      if (decoded !== text) {
        results.push({ label: 'URL', input: text, output: decoded });
      }
    }
  } catch { /* ignore */ }

  // HTML entities
  try {
    const div = document.createElement('div');
    div.innerHTML = text;
    const decoded = div.textContent || div.innerText || '';
    if (decoded !== text && /&[#a-zA-Z0-9]+;/.test(text)) {
      results.push({ label: 'HTML', input: text, output: decoded });
    }
  } catch { /* ignore */ }

  // Hex decoding
  try {
    const trimmed = text.trim().replace(/\s/g, '');
    if (/^[0-9A-Fa-f]{2,}$/.test(trimmed) && trimmed.length % 2 === 0) {
      const decoded = trimmed.match(/.{2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || '';
      if (decoded.length > 0 && /^[\x20-\x7E\s]*$/.test(decoded)) {
        results.push({ label: 'Hex', input: text, output: decoded });
      }
    }
  } catch { /* ignore */ }

  return results;
}

export function decodersToHtml(results: DecodeResult[]): string {
  if (!results.length) return '';

  let html = '<div class="decoders-panel" style="margin-top:6px;padding:6px;background:#1a1a2e;border:1px solid #7ab7ef;border-radius:4px">';
  html += '<div style="font-weight:bold;color:#7ab7ef;margin-bottom:4px">\uD83D\uDD0D Detected Encodings</div>';

  for (const r of results) {
    html += '<div style="margin:4px 0;padding:4px;background:#16213e;border-radius:3px;font-size:11px">';
    html += '<span style="color:#7ab7ef;font-weight:bold">[' + r.label + ']</span>';
    if (r.error) {
      html += '<div style="color:#ff4444;margin-top:2px">Error: ' + r.error + '</div>';
    } else if (r.output.length > 500) {
      html += '<textarea readonly class="form-control" style="margin-top:4px;width:100%;height:150px;font-family:monospace;font-size:11px;resize:vertical;background:#0f0f23;color:#eee;border:1px solid #444;padding:4px">' + r.output.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea>';
    } else {
      html += '<div style="color:#eee;margin-top:2px;word-break:break-all;font-family:monospace;font-size:10px">' + r.output.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
    }
    html += '</div>';
  }

  html += '</div>';
  return html;
}

export function renderDecoderDialog(): string {
  return `
<div id="decoder-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;max-height:80vh;background:#1e1e1e;border:1px solid #444;border-radius:6px;z-index:9999;padding:12px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-weight:bold;color:#7ab7ef">\uD83D\uDD0D Inline Decoder</span>
    <button id="decoder-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
  </div>
  <textarea id="decoder-input" class="form-control" rows="3" placeholder="Paste text to decode (Base64, URL, HTML, Hex, JWT)..." style="font-family:monospace;font-size:11px"></textarea>
  <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
    <button id="decoder-detect" class="btn btn-sm btn-primary">\uD83D\uDD0D Auto-Detect</button>
    <button id="decoder-jwt" class="btn btn-xs btn-default">JWT</button>
    <button id="decoder-base64" class="btn btn-xs btn-default">Base64</button>
    <button id="decoder-url" class="btn btn-xs btn-default">URL</button>
    <button id="decoder-hex" class="btn btn-xs btn-default">Hex</button>
  </div>
  <div id="decoder-output" style="margin-top:6px;font-size:11px;max-height:none"></div>
</div>`;
}
