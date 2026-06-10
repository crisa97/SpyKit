import type { CapturedEntry } from '../types/index';
import { getStatusHint, parseUrl } from '../core/utils';

export function requestToPostmanItem(data: CapturedEntry): any {
  if (!data || !data.request) return null;
  const r = data.request;
  const url = parseUrl(r.url || '');
  const item: any = {
    name: (r.method || 'GET') + ' ' + (url.pathname || '/'),
    request: {
      method: r.method || 'GET',
      header: [],
      url: { raw: r.url || '' },
    },
    response: [],
  };
  if (r.headers) {
    for (const h of r.headers) {
      if (h.name && h.value) {
        item.request.header.push({ key: h.name, value: h.value });
      }
    }
  }
  if (url.protocol) item.request.url.protocol = url.protocol.replace(':', '');
  if (url.hostname) item.request.url.host = url.hostname.split('.');
  if (url.pathname) item.request.url.path = url.pathname.replace(/^\//, '').split('/');
  if (url.search) {
    const qs = url.search.replace(/^\?/, '').split('&');
    item.request.url.query = [];
    for (const q of qs) {
      const parts = q.split('=');
      if (parts[0]) item.request.url.query.push({ key: parts[0], value: parts.slice(1).join('=') || '' });
    }
  }
  if (r.postData) {
    const bodyText = typeof r.postData === 'string' ? r.postData : (r.postData.text || JSON.stringify(r.postData));
    item.request.body = { mode: 'raw', raw: bodyText };
    const mimeType = typeof r.postData === 'object' ? r.postData.mimeType : '';
    if (mimeType && mimeType.indexOf('json') >= 0) {
      item.request.body.options = { raw: { language: 'json' } };
    }
  }
  if (data.response) {
    const resp: any = { name: 'Response ' + (data.response.status || ''), status: '', code: 0, header: [], body: '' };
    resp.status = getStatusHint(data.response.status) || '';
    resp.code = data.response.status || 0;
    if (data.response.headers) {
      for (const h of data.response.headers) {
        if (h.name && h.value) resp.header.push({ key: h.name, value: h.value });
      }
    }
    resp.body = (data.response.content && data.response.content.text) || '';
    item.response.push(resp);
  }
  return item;
}
