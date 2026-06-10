// Relay postMessage to background
window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    var message = event.data;
    if (typeof message !== 'object' || message === null) return;
    if (!message.spyId && !message.wsType) return;
    chrome.runtime.sendMessage(message);
});

chrome.runtime.sendMessage({spyId:'init',url:'none',res:'ok'});

// Inject WebSocket interceptor into page context
var script = document.createElement('script');
script.textContent = '(' + function() {
    var origWebSocket = window.WebSocket;
    var wsIdCounter = 0;

    function PatchedWebSocket(url, protocols) {
        var ws = new origWebSocket(url, protocols);
        var wsId = 'ws_' + (++wsIdCounter);

        window.postMessage({
            wsType: 'open',
            wsId: wsId,
            url: url,
            timestamp: Date.now()
        }, '*');

        var origSend = ws.send.bind(ws);
        ws.send = function(data) {
            window.postMessage({
                wsType: 'send',
                wsId: wsId,
                data: typeof data === 'string' ? data : '(binary)',
                dataLength: typeof data === 'string' ? data.length : (data.byteLength || data.size || 0),
                timestamp: Date.now()
            }, '*');
            return origSend(data);
        };

        var origAddEventListener = ws.addEventListener.bind(ws);
        ws.addEventListener = function(type, listener, options) {
            if (type === 'message') {
                origAddEventListener(type, function(event) {
                    window.postMessage({
                        wsType: 'message',
                        wsId: wsId,
                        data: typeof event.data === 'string' ? event.data : '(binary)',
                        dataLength: typeof event.data === 'string' ? event.data.length : (event.data.byteLength || event.data.size || 0),
                        timestamp: Date.now()
                    }, '*');
                    listener.call(this, event);
                }, options);
            } else {
                origAddEventListener(type, listener, options);
            }
        };

        ws.onclose = function(event) {
            window.postMessage({
                wsType: 'close',
                wsId: wsId,
                code: event.code,
                reason: event.reason,
                timestamp: Date.now()
            }, '*');
        };

        ws.onerror = function(event) {
            window.postMessage({
                wsType: 'error',
                wsId: wsId,
                timestamp: Date.now()
            }, '*');
        };

        return ws;
    }

    PatchedWebSocket.prototype = origWebSocket.prototype;
    PatchedWebSocket.CONNECTING = 0;
    PatchedWebSocket.OPEN = 1;
    PatchedWebSocket.CLOSING = 2;
    PatchedWebSocket.CLOSED = 3;

    window.WebSocket = PatchedWebSocket;
}.toString() + ')();';

document.documentElement.appendChild(script);
script.remove();
