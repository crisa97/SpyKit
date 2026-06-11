import type { InterceptedRequest } from '../types/index';

let tabId = -1;
let isAttached = false;
let isEnabled = false;
const interceptedQueue: InterceptedRequest[] = [];
let requestCounter = 0;
let onQueueChange: ((queue: InterceptedRequest[]) => void) | null = null;
let onRequestProcessed: ((req: InterceptedRequest, action: 'forwarded' | 'dropped') => void) | null = null;

export function setOnQueueChange(cb: (queue: InterceptedRequest[]) => void): void {
  onQueueChange = cb;
}

export function setOnRequestProcessed(cb: (req: InterceptedRequest, action: 'forwarded' | 'dropped') => void): void {
  onRequestProcessed = cb;
}

export function getInterceptedQueue(): InterceptedRequest[] {
  return interceptedQueue;
}

export function isInterceptEnabled(): boolean {
  return isEnabled;
}

export function isInterceptorAttached(): boolean {
  return isAttached;
}

export function attachInterceptor(tab: number, callback?: (success: boolean) => void): void {
  tabId = tab;
  chrome.debugger.attach({ tabId }, '1.3', () => {
    if (chrome.runtime.lastError) {
      console.warn('[SpyKit] debugger attach failed:', chrome.runtime.lastError.message);
      if (callback) callback(false);
      return;
    }
    isAttached = true;
    chrome.debugger.onEvent.addListener(onDebuggerEvent);
    chrome.debugger.onDetach.addListener(onDetach);
    if (callback) callback(true);
  });
}

export function detachInterceptor(): void {
  if (!isAttached) return;
  if (isEnabled) {
    chrome.debugger.sendCommand({ tabId }, 'Fetch.disable', () => {
      chrome.runtime.lastError;
    });
  }
  chrome.debugger.detach({ tabId }, () => {
    chrome.runtime.lastError;
    isAttached = false;
    isEnabled = false;
    chrome.debugger.onEvent.removeListener(onDebuggerEvent);
    chrome.debugger.onDetach.removeListener(onDetach);
  });
}

export function toggleIntercept(enable: boolean): void {
  if (!isAttached || enable === isEnabled) return;
  isEnabled = enable;
  if (enable) {
    chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', {
      patterns: [{ requestStage: 'Request' }],
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[SpyKit] Fetch.enable failed:', chrome.runtime.lastError.message);
        isEnabled = false;
      }
    });
  } else {
    chrome.debugger.sendCommand({ tabId }, 'Fetch.disable', () => {
      chrome.runtime.lastError;
    });
  }
}

function onDetach(): void {
  isAttached = false;
  isEnabled = false;
  chrome.debugger.onEvent.removeListener(onDebuggerEvent);
  chrome.debugger.onDetach.removeListener(onDetach);
}

function normalizeHeaders(h: any): Array<{ name: string; value: string }> {
  if (!h) return [];
  if (Array.isArray(h)) return h as Array<{ name: string; value: string }>;
  if (typeof h === 'object') {
    return Object.keys(h).map(name => ({ name, value: String(h[name]) }));
  }
  return [];
}

function onDebuggerEvent(source: chrome.debugger.Debuggee, method: string, params: any): void {
  if (method !== 'Fetch.requestPaused') return;
  const req: InterceptedRequest = {
    id: ++requestCounter,
    requestId: params.requestId,
    url: params.request.url,
    method: params.request.method,
    headers: normalizeHeaders(params.request.headers),
    postData: params.request.postData,
    timestamp: Date.now(),
  };
  interceptedQueue.push(req);
  if (onQueueChange) onQueueChange(interceptedQueue);
}

export function forwardRequest(id: number, modifications?: {
  url?: string;
  method?: string;
  headers?: Array<{ name: string; value: string }>;
  postData?: string;
}): void {
  const idx = interceptedQueue.findIndex(r => r.id === id);
  if (idx < 0) return;
  const req = interceptedQueue[idx];
  const p: any = { requestId: req.requestId };
  if (modifications) {
    if (modifications.url !== undefined) p.url = modifications.url;
    if (modifications.method !== undefined) p.method = modifications.method;
    if (modifications.headers !== undefined) p.headers = modifications.headers;
    if (modifications.postData !== undefined) p.postData = modifications.postData;
  }
  chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', p, () => {
    chrome.runtime.lastError;
  });
  if (onRequestProcessed) onRequestProcessed(req, 'forwarded');
  interceptedQueue.splice(idx, 1);
  if (onQueueChange) onQueueChange(interceptedQueue);
}

export function forwardAllRequests(): void {
  const copy = [...interceptedQueue];
  for (const req of copy) forwardRequest(req.id);
}

export function dropRequest(id: number): void {
  const idx = interceptedQueue.findIndex(r => r.id === id);
  if (idx < 0) return;
  const req = interceptedQueue[idx];
  chrome.debugger.sendCommand({ tabId }, 'Fetch.failRequest', {
    requestId: req.requestId,
    errorReason: 'BlockedByClient',
  }, () => {
    chrome.runtime.lastError;
  });
  if (onRequestProcessed) onRequestProcessed(req, 'dropped');
  interceptedQueue.splice(idx, 1);
  if (onQueueChange) onQueueChange(interceptedQueue);
}

export function dropAllRequests(): void {
  const copy = [...interceptedQueue];
  for (const req of copy) dropRequest(req.id);
}

export function editAndForwardRequest(id: number, url: string, method: string, headers: string, body: string): void {
  const parsedHeaders: Array<{ name: string; value: string }> = [];
  for (const line of headers.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      parsedHeaders.push({ name: line.substring(0, idx).trim(), value: line.substring(idx + 1).trim() });
    }
  }
  forwardRequest(id, {
    url,
    method,
    headers: parsedHeaders,
    postData: body || undefined,
  });
}
