import { contentScriptLoaded } from '../state';

let _reqCounter = 0;
const _pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
let _listenerInit = false;

function initListener(): void {
  if (_listenerInit) return;
  _listenerInit = true;
  chrome.runtime.onMessage.addListener((message: any) => {
    if (message && message._fetchId) {
      const handler = _pending.get(message._fetchId);
      if (handler) {
        _pending.delete(message._fetchId);
        if (message._res === 'ok') {
          handler.resolve(message);
        } else {
          handler.reject(new Error(message._err || 'Request failed'));
        }
      }
    }
  });
}

export function pageFetch(
  url: string,
  method: string,
  headers?: Record<string, string>,
  body?: string,
  timeout = 30000
): Promise<{ status: number; body: string; headers: Array<{ name: string; value: string }>; url: string }> {
  initListener();

  const id = 'pf_' + (++_reqCounter) + '_' + Date.now();

  return new Promise((resolve, reject) => {
    _pending.set(id, { resolve, reject });

    const code = [
      '(async function(){',
      'try{',
      'var r=await fetch(' + JSON.stringify(url) + ',{',
      'method:' + JSON.stringify(method) + ',',
      'headers:' + JSON.stringify(headers || {}) + ',',
      'body:' + (body ? JSON.stringify(body) : 'undefined'),
      '});',
      'var t=await r.text();',
      'var h=[];',
      'r.headers.forEach(function(v,k){h.push({name:k,value:v});});',
      'chrome.runtime.sendMessage({_fetchId:' + JSON.stringify(id) + ',_res:"ok",status:r.status,headers:h,body:t,url:r.url});',
      '}catch(e){',
      'chrome.runtime.sendMessage({_fetchId:' + JSON.stringify(id) + ',_res:"fail",_err:String(e.message),url:""});',
      '}',
      '})()',
    ].join('');

    chrome.devtools.inspectedWindow.eval(
      code,
      { useContentScriptContext: contentScriptLoaded },
      (result: any, error: any) => {
        if (error && error.isError) {
          _pending.delete(id);
          reject(new Error(error.message));
        }
      }
    );

    setTimeout(() => {
      if (_pending.has(id)) {
        _pending.delete(id);
        reject(new Error('Request timed out'));
      }
    }, timeout);
  });
}
