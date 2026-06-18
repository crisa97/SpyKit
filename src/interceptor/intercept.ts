import type { InterceptedRequest } from '../types/index';

let _tabId = -1;
let _attached = false;
let _enabled = false;
let _queue: InterceptedRequest[] = [];
let _onQueueChange: ((queue: InterceptedRequest[]) => void) | null = null;
let _onRequestProcessed: ((req: InterceptedRequest, action: 'forwarded' | 'dropped' | 'error') => void) | null = null;
let _listenerRegistered = false;

export function setOnQueueChange(cb: (queue: InterceptedRequest[]) => void): void {
  _onQueueChange = cb;
}

export function setOnRequestProcessed(cb: (req: InterceptedRequest, action: 'forwarded' | 'dropped' | 'error') => void): void {
  _onRequestProcessed = cb;
}

export function getInterceptedQueue(): InterceptedRequest[] {
  return _queue;
}

export function isInterceptEnabled(): boolean {
  return _enabled;
}

export function isInterceptorAttached(): boolean {
  return _attached;
}

function msg(action: string, extra: Record<string, unknown> = {}): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      spyInterceptor: true,
      tabId: _tabId,
      action,
      ...extra,
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[SpyKit] interceptor msg error:', chrome.runtime.lastError.message);
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { success: false, error: 'No response from service worker' });
    });
  });
}

function registerListener(): void {
  if (_listenerRegistered) return;
  _listenerRegistered = true;
  chrome.runtime.onMessage.addListener((message: any) => {
    if (!message.spyInterceptorEvent) return;
    switch (message.event) {
      case 'queueChanged':
        _queue = (message.data && message.data.queue) || [];
        if (_onQueueChange) _onQueueChange(_queue);
        break;
      case 'requestProcessed':
        if (_onRequestProcessed) {
          _onRequestProcessed(message.data.request, message.data.action);
        }
        break;
      case 'debuggerDetached':
        _attached = false;
        _enabled = false;
        _queue = [];
        if (_onQueueChange) _onQueueChange(_queue);
        break;
    }
  });
}

export function attachInterceptor(tab: number, callback?: (success: boolean) => void): void {
  registerListener();
  _tabId = tab;
  msg('attach').then((res) => {
    if (res.success) {
      _attached = true;
    } else {
      console.error('[SpyKit] attachInterceptor failed:', res.error);
    }
    if (callback) callback(!!res.success);
  });
}

export function detachInterceptor(): void {
  if (!_attached) return;
  _attached = false;
  _enabled = false;
  _queue = [];
  msg('detach');
}

export function toggleIntercept(enable: boolean): void {
  if (!_attached || enable === _enabled) return;
  _enabled = enable;
  if (enable) {
    msg('enableIntercept').then((res) => {
      if (!res.success) _enabled = false;
    });
  } else {
    msg('disableIntercept').then((res) => {
      if (!res.success) _enabled = true;
    });
  }
}

export function forwardRequest(id: number, modifications?: {
  url?: string;
  method?: string;
  headers?: Array<{ name: string; value: string }>;
  postData?: string;
}): void {
  const req = _queue.find(r => r.id === id);
  if (!req) return;
  const extra: Record<string, unknown> = { requestId: req.requestId };
  if (modifications) {
    if (modifications.url) extra.url = modifications.url;
    if (modifications.method) extra.method = modifications.method;
    if (modifications.headers) extra.headers = modifications.headers;
    if (modifications.postData) extra.postData = modifications.postData;
    msg('editAndForward', extra);
  } else {
    msg('forward', extra);
  }
}

export function forwardAllRequests(): void {
  msg('forwardAll');
}

export function dropRequest(id: number): void {
  const req = _queue.find(r => r.id === id);
  if (!req) return;
  msg('drop', { requestId: req.requestId });
}

export function dropAllRequests(): void {
  msg('dropAll');
}

export function editAndForwardRequest(id: number, url: string, method: string, headers: string, body: string): void {
  const req = _queue.find(r => r.id === id);
  if (!req) return;
  const parsedHeaders: Array<{ name: string; value: string }> = [];
  for (const line of headers.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      parsedHeaders.push({ name: line.substring(0, idx).trim(), value: line.substring(idx + 1).trim() });
    }
  }
  msg('editAndForward', {
    requestId: req.requestId,
    url,
    method,
    headers: parsedHeaders,
    postData: body || undefined,
  });
}
