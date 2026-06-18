import type { InterceptedRequest } from '../types/index';

let tabId = -1;
let isAttached = false;
let isEnabled = false;
const interceptedQueue: InterceptedRequest[] = [];
let requestCounter = 0;
let onQueueChange: ((queue: InterceptedRequest[]) => void) | null = null;
let onRequestProcessed: ((req: InterceptedRequest, action: 'forwarded' | 'dropped' | 'error') => void) | null = null;

export function setOnQueueChange(cb: (queue: InterceptedRequest[]) => void): void {
  onQueueChange = cb;
}

export function setOnRequestProcessed(cb: (req: InterceptedRequest, action: 'forwarded' | 'dropped' | 'error') => void): void {
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
  try {
    if (!chrome.debugger) {
      console.error('[SpyKit] chrome.debugger API not available');
      if (callback) callback(false);
      return;
    }
    chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) {
        console.warn('[SpyKit] debugger attach failed:', chrome.runtime.lastError.message);
        if (callback) callback(false);
        return;
      }
      isAttached = true;
      try {
        chrome.debugger.onEvent.addListener(onDebuggerEvent);
        chrome.debugger.onDetach.addListener(onDetach);
      } catch (e: any) {
        console.error('[SpyKit] Failed to add debugger listeners:', e.message);
        isAttached = false;
        if (callback) callback(false);
        return;
      }
      if (callback) callback(true);
    });
  } catch (e: any) {
    console.error('[SpyKit] attachInterceptor exception:', e.message);
    if (callback) callback(false);
  }
}

export function detachInterceptor(): void {
  if (!isAttached) return;
  isAttached = false;
  const copy = [...interceptedQueue];
  interceptedQueue.length = 0;
  try {
    if (onQueueChange) onQueueChange(interceptedQueue);
    if (isEnabled && copy.length > 0) {
      console.log('[SpyKit] Detaching with', copy.length, 'pending requests, auto-forwarding');
      let i = 0;
      const next = () => {
        if (i >= copy.length) {
          doDetach();
          return;
        }
        const req = copy[i];
        chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', { requestId: req.requestId }, () => {
          if (chrome.runtime.lastError) {
            console.error('[SpyKit] Detach auto-forward failed:', chrome.runtime.lastError.message);
          }
          i++;
          setTimeout(next, 30);
        });
      };
      next();
    } else {
      doDetach();
    }
  } catch (e: any) {
    console.error('[SpyKit] detachInterceptor exception:', e.message);
    doDetach();
  }
}

function doDetach(): void {
  isEnabled = false;
  chrome.debugger.sendCommand({ tabId }, 'Fetch.disable', () => { chrome.runtime.lastError; });
  chrome.debugger.detach({ tabId }, () => {
    chrome.runtime.lastError;
    chrome.debugger.onEvent.removeListener(onDebuggerEvent);
    chrome.debugger.onDetach.removeListener(onDetach);
  });
}

export function toggleIntercept(enable: boolean): void {
  if (!isAttached || enable === isEnabled) return;
  isEnabled = enable;
  try {
    if (enable) {
      chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', {
        patterns: [{ requestStage: 'Request' }],
      }, (result) => {
        if (chrome.runtime.lastError) {
          console.error('[SpyKit] Fetch.enable failed:', chrome.runtime.lastError.message);
          isEnabled = false;
        }
      });
    } else {
      const copy = [...interceptedQueue];
      interceptedQueue.length = 0;
      if (onQueueChange) onQueueChange(interceptedQueue);
      if (copy.length > 0) {
        console.log('[SpyKit] Disabling intercept, auto-forwarding', copy.length, 'pending requests');
        let i = 0;
        const next = () => {
          if (i >= copy.length) {
            chrome.debugger.sendCommand({ tabId }, 'Fetch.disable', () => { chrome.runtime.lastError; });
            return;
          }
          const req = copy[i];
          chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', { requestId: req.requestId }, () => {
            if (chrome.runtime.lastError) {
              console.error('[SpyKit] Auto-forward failed:', chrome.runtime.lastError.message);
            }
            i++;
            setTimeout(next, 30);
          });
        };
        next();
      } else {
        chrome.debugger.sendCommand({ tabId }, 'Fetch.disable', () => { chrome.runtime.lastError; });
      }
    }
  } catch (e: any) {
    console.error('[SpyKit] toggleIntercept exception:', e.message);
    isEnabled = false;
  }
}

function onDetach(): void {
  isAttached = false;
  isEnabled = false;
  const copy = [...interceptedQueue];
  interceptedQueue.length = 0;
  if (onQueueChange) onQueueChange(interceptedQueue);
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

function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

function removeFromQueue(id: number): InterceptedRequest | null {
  const idx = interceptedQueue.findIndex(r => r.id === id);
  if (idx < 0) return null;
  const req = interceptedQueue[idx];
  interceptedQueue.splice(idx, 1);
  if (onQueueChange) onQueueChange(interceptedQueue);
  return req;
}

function sendCommandWithCleanup(cmd: string, params: any, req: InterceptedRequest, action: 'forwarded' | 'dropped'): void {
  if (!isAttached) return;
  try {
    chrome.debugger.sendCommand({ tabId }, cmd, params, () => {
      if (chrome.runtime.lastError) {
        console.error('[SpyKit]', cmd, 'failed:', chrome.runtime.lastError.message);
        if (onRequestProcessed) onRequestProcessed(req, 'error');
        return;
      }
      if (onRequestProcessed) onRequestProcessed(req, action);
    });
  } catch (e: any) {
    console.error('[SpyKit]', cmd, 'exception:', e.message);
    if (onRequestProcessed) onRequestProcessed(req, 'error');
  }
}

export function forwardRequest(id: number, modifications?: {
  url?: string;
  method?: string;
  headers?: Array<{ name: string; value: string }>;
  postData?: string;
}): void {
  const req = removeFromQueue(id);
  if (!req) return;
  const p: any = { requestId: req.requestId };
  if (modifications) {
    if (modifications.url !== undefined) p.url = modifications.url;
    if (modifications.method !== undefined) p.method = modifications.method;
    if (modifications.headers !== undefined) p.headers = modifications.headers;
    if (modifications.postData !== undefined) p.postData = toBase64(modifications.postData);
  }
  sendCommandWithCleanup('Fetch.continueRequest', p, req, 'forwarded');
}

export function forwardAllRequests(): void {
  const copy = [...interceptedQueue];
  if (copy.length === 0) return;
  interceptedQueue.length = 0;
  if (onQueueChange) onQueueChange(interceptedQueue);
  let i = 0;
  const next = () => {
    if (i >= copy.length) return;
    const req = copy[i];
    const p: any = { requestId: req.requestId };
    chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', p, () => {
      if (chrome.runtime.lastError) {
        console.error('[SpyKit] Forward All failed:', chrome.runtime.lastError.message);
      }
      if (onRequestProcessed) onRequestProcessed(req, 'forwarded');
    });
    i++;
    setTimeout(next, 50);
  };
  next();
}

export function dropRequest(id: number): void {
  const req = removeFromQueue(id);
  if (!req) return;
  sendCommandWithCleanup('Fetch.failRequest', { requestId: req.requestId, errorReason: 'BlockedByClient' }, req, 'dropped');
}

export function dropAllRequests(): void {
  const copy = [...interceptedQueue];
  if (copy.length === 0) return;
  interceptedQueue.length = 0;
  if (onQueueChange) onQueueChange(interceptedQueue);
  let i = 0;
  const next = () => {
    if (i >= copy.length) return;
    const req = copy[i];
    chrome.debugger.sendCommand({ tabId }, 'Fetch.failRequest', { requestId: req.requestId, errorReason: 'BlockedByClient' }, () => {
      if (chrome.runtime.lastError) {
        console.error('[SpyKit] Drop All failed:', chrome.runtime.lastError.message);
      }
      if (onRequestProcessed) onRequestProcessed(req, 'dropped');
    });
    i++;
    setTimeout(next, 50);
  };
  next();
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
