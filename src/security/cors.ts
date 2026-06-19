import type { Header, CORSResult } from '../types/index';
import { escapeHtml } from '../core/utils';

export function checkCORS(reqHeaders: Header[] | null, resHeaders: Header[] | null): CORSResult {
  let origin = '', acao = '', acac = '', acam = '', acah = '';
  if (reqHeaders) {
    for (const h of reqHeaders) {
      if (h.name && h.name.toLowerCase() === 'origin') origin = h.value;
    }
  }
  if (resHeaders) {
    for (const h of resHeaders) {
      if (!h.name) continue;
      const n = h.name.toLowerCase();
      if (n === 'access-control-allow-origin') acao = h.value;
      else if (n === 'access-control-allow-credentials') acac = h.value;
      else if (n === 'access-control-allow-methods') acam = h.value;
      else if (n === 'access-control-allow-headers') acah = h.value;
    }
  }
  if (!origin) return { status: '', html: '' };
  const issues: string[] = [];
  if (acao === '*') issues.push('ACAO: wildcard');
  if (acao === '*' && acac === 'true') issues.push('CRITICAL: wildcard + credentials');
  if (!acao) issues.push('Missing ACAO');
  const cls = issues.length === 0 ? 'cors-ok' : (issues.length <= 1 ? 'cors-warn' : 'cors-bad');
  const icon = issues.length === 0 ? '\u2713' : '\u26A0';
  const title = issues.length ? issues.join('; ') : 'CORS OK';
  return { status: cls, html: '<span class="' + cls + '" title="' + escapeHtml(title) + '">' + icon + ' CORS</span>', issues };
}
