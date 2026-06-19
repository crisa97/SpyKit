import type { Header } from '../types/index';
import { SECURITY_HEADERS, INFO_DISCLOSURE_HEADERS } from '../state';
import { escapeHtml } from '../core/utils';

export function checkSecurityHeaders(headers: Header[] | null): string {
  const found: { [key: string]: string } = {};
  const foundDisclosure: { [key: string]: string } = {};
  if (headers) {
    for (const h of headers) {
      const name = h.name ? h.name.toLowerCase() : '';
      if (SECURITY_HEADERS[name]) {
        found[name] = h.value;
      }
      if (INFO_DISCLOSURE_HEADERS[name]) {
        foundDisclosure[name] = h.value;
      }
    }
  }
  let html = '';
  for (const key in SECURITY_HEADERS) {
    const h = SECURITY_HEADERS[key];
    if (found[key] !== undefined) {
      const ok = h.check(found[key]);
      html += '<span class="sec-item ' + (ok ? 'sec-ok' : 'sec-warn') + '" title="' + h.desc + '\n' + key + ': ' + escapeHtml(found[key]) + '">' + (ok ? '\u2713' : '?') + h.label + '</span>';
    } else {
      html += '<span class="sec-item sec-missing" title="' + h.desc + '\n' + key + ' is missing">\u2717' + h.label + '</span>';
    }
  }
  for (const key in INFO_DISCLOSURE_HEADERS) {
    if (foundDisclosure[key] !== undefined) {
      const h = INFO_DISCLOSURE_HEADERS[key];
      html += '<span class="sec-item sec-warn" title="' + h.desc + '\n' + key + ': ' + escapeHtml(foundDisclosure[key]) + '">\u26A0 ' + h.label + '</span>';
    }
  }
  return html;
}
