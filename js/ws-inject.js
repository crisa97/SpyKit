// WebSocket interceptor - MAIN world
// Waits for ISOLATED world ready signal before sending messages
(function() {
    var origWebSocket = window.WebSocket;
    var wsIdCounter = 0;
    var isolatedReady = false;
    var pending = [];

    function sendToIsolated(message) {
        if (isolatedReady) {
            window.postMessage(message, '*');
        } else {
            pending.push(message);
        }
    }

    window.addEventListener('message', function(event) {
        if (event.source !== window) return;
        var message = event.data;
        if (typeof message !== 'object' || message === null) return;

        if (message.type === 'SPYKIT_ISOLATED_READY') {
            isolatedReady = true;
            window.postMessage({ type: 'SPYKIT_READY' }, '*');
            for (var i = 0; i < pending.length; i++) {
                window.postMessage(pending[i], '*');
            }
            pending = [];
        }
    });

    function PatchedWebSocket(url, protocols) {
        var ws = new origWebSocket(url, protocols);
        var wsId = 'ws_' + (++wsIdCounter);

        sendToIsolated({
            wsType: 'open',
            wsId: wsId,
            url: url,
            timestamp: Date.now()
        });

        var origSend = ws.send.bind(ws);
        ws.send = function(data) {
            sendToIsolated({
                wsType: 'send',
                wsId: wsId,
                data: typeof data === 'string' ? data : '(binary)',
                dataLength: typeof data === 'string' ? data.length : (data.byteLength || data.size || 0),
                timestamp: Date.now()
            });
            return origSend(data);
        };

        var origAddEventListener = ws.addEventListener.bind(ws);
        ws.addEventListener = function(type, listener, options) {
            if (type === 'message') {
                origAddEventListener(type, function(event) {
                    sendToIsolated({
                        wsType: 'message',
                        wsId: wsId,
                        data: typeof event.data === 'string' ? event.data : '(binary)',
                        dataLength: typeof event.data === 'string' ? event.data.length : (event.data.byteLength || event.data.size || 0),
                        timestamp: Date.now()
                    });
                    listener.call(this, event);
                }, options);
            } else {
                origAddEventListener(type, listener, options);
            }
        };

        ws.onclose = function(event) {
            sendToIsolated({
                wsType: 'close',
                wsId: wsId,
                code: event.code,
                reason: event.reason,
                timestamp: Date.now()
            });
        };

        ws.onerror = function(event) {
            sendToIsolated({
                wsType: 'error',
                wsId: wsId,
                timestamp: Date.now()
            });
        };

        return ws;
    }

    PatchedWebSocket.prototype = origWebSocket.prototype;
    PatchedWebSocket.CONNECTING = 0;
    PatchedWebSocket.OPEN = 1;
    PatchedWebSocket.CLOSING = 2;
    PatchedWebSocket.CLOSED = 3;

    window.WebSocket = PatchedWebSocket;
})();