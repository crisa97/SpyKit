var connections = {};
var sessions = {};

function ensureSession(tabId) {
  if (!sessions[tabId]) {
    sessions[tabId] = { attached: false, enabled: false, queue: [], counter: 0 };
  }
  return sessions[tabId];
}

function normalizeHeaders(h) {
  if (!h) return [];
  if (Array.isArray(h)) return h;
  if (typeof h === 'object') {
    return Object.keys(h).map(function(name) { return { name: name, value: String(h[name]) }; });
  }
  return [];
}

// ── Port connections from DevTools panels ──
chrome.runtime.onConnect.addListener(function (port) {
  var extensionListener = function (message) {
    if (message.name === "init") {
      var tabId = message.tabId || (port.sender && port.sender.tab && port.sender.tab.id);
      if (tabId) {
        connections[tabId] = port;
        ensureSession(tabId);
      }
    }
  };

  port.onMessage.addListener(extensionListener);

  port.onDisconnect.addListener(function () {
    port.onMessage.removeListener(extensionListener);
    for (var t in connections) {
      if (connections[t] === port) {
        delete connections[t];
        break;
      }
    }
  });
});

// ── One-shot messages ──
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request && request.spyInterceptor) {
    handleInterceptorCommand(request, sendResponse);
    return true;
  }
  if (sender.tab) {
    var tabId = sender.tab.id;
    if (connections[tabId]) {
      connections[tabId].postMessage(request);
    }
  }
});

function notifyPanel(tabId, event, data) {
  try {
    chrome.runtime.sendMessage({ spyInterceptorEvent: true, event: event, data: data || {} });
  } catch(e) {
    console.error('[SpyKit] notifyPanel error:', e);
  }
}

function notifyQueueChanged(tabId) {
  var session = ensureSession(tabId);
  notifyPanel(tabId, 'queueChanged', { queue: session.queue });
}

function notifyRequestProcessed(tabId, req, action) {
  notifyPanel(tabId, 'requestProcessed', { request: req, action: action });
}

function removeFromQueue(session, requestId) {
  for (var i = 0; i < session.queue.length; i++) {
    if (session.queue[i].requestId === requestId) {
      var req = session.queue[i];
      session.queue.splice(i, 1);
      return req;
    }
  }
  return null;
}

// ── Debugger event handlers ──
var _listenersRegistered = false;

function onDebuggerEvent(source, method, params) {
  if (method !== 'Fetch.requestPaused') return;
  var tabId = source.tabId;
  var session = ensureSession(tabId);
  session.counter++;
  var req = {
    id: session.counter,
    requestId: params.requestId,
    url: params.request.url,
    method: params.request.method,
    headers: normalizeHeaders(params.request.headers),
    postData: params.request.postData,
    timestamp: Date.now()
  };
  session.queue.push(req);
  notifyQueueChanged(tabId);
}

function onDebuggerDetach(source) {
  var tabId = source.tabId;
  var session = ensureSession(tabId);
  session.attached = false;
  session.enabled = false;
  notifyPanel(tabId, 'debuggerDetached');
}

function ensureDebuggerListeners() {
  if (_listenersRegistered) return;
  _listenersRegistered = true;
  chrome.debugger.onEvent.addListener(onDebuggerEvent);
  chrome.debugger.onDetach.addListener(onDebuggerDetach);
}

// ── Drain queue (auto-forwarded by Chrome when Fetch.disable is called) ──
function drainQueue(tabId) {
  var session = ensureSession(tabId);
  var pending = session.queue.splice(0);
  if (pending.length === 0) return;
  notifyQueueChanged(tabId);
  for (var i = 0; i < pending.length; i++) {
    notifyRequestProcessed(tabId, pending[i], 'forwarded');
  }
}

// ── Handle interceptor commands from panel ──
function handleInterceptorCommand(request, sendResponse) {
  var tabId = request.tabId;
  if (!tabId) {
    sendResponse({ success: false, error: 'No tabId provided' });
    return;
  }

  var session = ensureSession(tabId);
  var action = request.action;

  switch (action) {

    case 'attach':
      if (session.attached) {
        sendResponse({ success: true });
        return;
      }
      ensureDebuggerListeners();
      chrome.debugger.attach({ tabId: tabId }, '1.3', function() {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        session.attached = true;
        sendResponse({ success: true });
      });
      break;

    case 'detach':
      if (session.enabled) {
        drainQueue(tabId);
        chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.disable', function() {
          chrome.runtime.lastError;
          session.enabled = false;
          session.attached = false;
          chrome.debugger.detach({ tabId: tabId }, function() {
            chrome.runtime.lastError;
            sendResponse({ success: true });
          });
        });
      } else {
        session.attached = false;
        chrome.debugger.detach({ tabId: tabId }, function() {
          chrome.runtime.lastError;
          sendResponse({ success: true });
        });
      }
      break;

    case 'enableIntercept':
      if (!session.attached) {
        sendResponse({ success: false, error: 'Debugger not attached' });
        return;
      }
      chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.enable', {
        patterns: [{ requestStage: 'Request' }]
      }, function() {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        session.enabled = true;
        sendResponse({ success: true });
      });
      break;

    case 'disableIntercept':
      drainQueue(tabId);
      chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.disable', function() {
        chrome.runtime.lastError;
        session.enabled = false;
        sendResponse({ success: true });
      });
      break;

    case 'forward': {
      var req = removeFromQueue(session, request.requestId);
      if (!req) {
        sendResponse({ success: false, error: 'Request not found in queue' });
        return;
      }
      notifyQueueChanged(tabId);
      chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.continueRequest', {
        requestId: req.requestId
      }, function() {
        if (chrome.runtime.lastError) {
          console.error('[SpyKit] Forward failed:', chrome.runtime.lastError.message);
          notifyRequestProcessed(tabId, req, 'error');
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        notifyRequestProcessed(tabId, req, 'forwarded');
        sendResponse({ success: true });
      });
      break;
    }

    case 'forwardAll': {
      var pending = session.queue.splice(0);
      notifyQueueChanged(tabId);
      if (pending.length === 0) {
        sendResponse({ success: true });
        return;
      }
      var completed = 0;
      for (var fi = 0; fi < pending.length; fi++) {
        (function(req) {
          chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.continueRequest', {
            requestId: req.requestId
          }, function() {
            if (chrome.runtime.lastError) {
              console.error('[SpyKit] Forward All failed:', chrome.runtime.lastError.message);
              notifyRequestProcessed(tabId, req, 'error');
            } else {
              notifyRequestProcessed(tabId, req, 'forwarded');
            }
            completed++;
            if (completed === pending.length) {
              sendResponse({ success: true });
            }
          });
        })(pending[fi]);
      }
      break;
    }

    case 'drop': {
      var req = removeFromQueue(session, request.requestId);
      if (!req) {
        sendResponse({ success: false, error: 'Request not found in queue' });
        return;
      }
      notifyQueueChanged(tabId);
      chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.failRequest', {
        requestId: req.requestId, errorReason: 'BlockedByClient'
      }, function() {
        if (chrome.runtime.lastError) {
          console.error('[SpyKit] Drop failed:', chrome.runtime.lastError.message);
          notifyRequestProcessed(tabId, req, 'error');
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        notifyRequestProcessed(tabId, req, 'dropped');
        sendResponse({ success: true });
      });
      break;
    }

    case 'dropAll': {
      var pending = session.queue.splice(0);
      notifyQueueChanged(tabId);
      for (var di = 0; di < pending.length; di++) {
        (function(req) {
          chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.failRequest', {
            requestId: req.requestId, errorReason: 'BlockedByClient'
          }, function() {
            chrome.runtime.lastError;
            notifyRequestProcessed(tabId, req, 'dropped');
          });
        })(pending[di]);
      }
      sendResponse({ success: true });
      break;
    }

    case 'editAndForward': {
      var req = removeFromQueue(session, request.requestId);
      if (!req) {
        sendResponse({ success: false, error: 'Request not found in queue' });
        return;
      }
      notifyQueueChanged(tabId);
      var p = { requestId: req.requestId };
      if (request.url) p.url = request.url;
      if (request.method) p.method = request.method;
      if (request.headers) p.headers = request.headers;
      if (request.postData) {
        p.postData = btoa(unescape(encodeURIComponent(request.postData)));
      }
      chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.continueRequest', p, function() {
        if (chrome.runtime.lastError) {
          console.error('[SpyKit] Edit & Forward failed:', chrome.runtime.lastError.message);
          notifyRequestProcessed(tabId, req, 'error');
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        notifyRequestProcessed(tabId, req, 'forwarded');
        sendResponse({ success: true });
      });
      break;
    }

    case 'getStatus':
      sendResponse({
        success: true,
        attached: session.attached,
        enabled: session.enabled,
        queueLength: session.queue.length
      });
      break;
  }
}

console.log('[SpyKit] Service Worker loaded');
