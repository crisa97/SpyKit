// ISOLATED world: Relay postMessage from MAIN world to background
(function() {
    var ready = false;
    var pending = [];

    window.addEventListener('message', function(event) {
        if (event.source !== window) return;
        var message = event.data;
        if (typeof message !== 'object' || message === null) return;

        // Handshake from MAIN world
        if (message.type === 'SPYKIT_READY') {
            ready = true;
            window.postMessage({ type: 'SPYKIT_ACK' }, '*');
            // Flush pending
            for (var i = 0; i < pending.length; i++) {
                try { chrome.runtime.sendMessage(pending[i]); } catch(e) {}
            }
            pending = [];
            return;
        }

        if (!message.spyId && !message.wsType) return;

        if (ready) {
            try { chrome.runtime.sendMessage(message); } catch(e) {}
        } else {
            pending.push(message);
        }
    });

    // Notify MAIN world we're ready
    window.postMessage({ type: 'SPYKIT_ISOLATED_READY' }, '*');

    // Also send init
    try { chrome.runtime.sendMessage({spyId:'init',url:'none',res:'ok'}); } catch(e) {}
})();