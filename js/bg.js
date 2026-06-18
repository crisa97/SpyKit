var connections = {};

chrome.runtime.onConnect.addListener(function (port) {
  var extensionListener = function (message, sender, sendResponse) {
    if (message.name === "init") {
      var tabId = message.tabId || (sender.tab && sender.tab.id);
      if (tabId) connections[tabId] = port;
      return;
    }
  };

  port.onMessage.addListener(extensionListener);

  port.onDisconnect.addListener(function (port) {
    port.onMessage.removeListener(extensionListener);

    var tabs = Object.keys(connections);
    for (var i = 0; i < tabs.length; i++) {
      if (connections[tabs[i]] === port) {
        delete connections[tabs[i]];
        break;
      }
    }
  });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (sender.tab) {
    var tabId = sender.tab.id;
    if (connections[tabId]) {
      connections[tabId].postMessage(request);
    }
  }
});
