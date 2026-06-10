import { handleWSMessage, WSConnectionsToHtml, clearWSConnections } from '../network/websocket';

export function initWSPanel(): void {
  // Add WebSocket button to search bar
  $('.search-bar-top').append('<button id="ws-btn" class="btn btn-xs btn-default" type="button" title="WebSocket Inspector" style="margin-left:4px">\u{1F310} WS</button>');

  $(document).on('click', '#ws-btn', function () {
    toggleWSPanel();
  });

  // Handle WebSocket messages from background/content script
  chrome.runtime.onMessage.addListener(function (message: any) {
    if (message.wsType) {
      handleWSMessage(message);
      if ($('#ws-panel').is(':visible')) {
        renderWSContent();
      }
    }
  });

  // Add keyboard shortcut: Ctrl+Shift+W (already used by workspaces, use Ctrl+Shift+9)
  $(document).on('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === '9') {
      e.preventDefault();
      toggleWSPanel();
    }
  });
}

function toggleWSPanel(): void {
  let $panel = $('#ws-panel');
  if ($panel.length) {
    $panel.toggle();
    if ($panel.is(':visible')) renderWSContent();
    return;
  }

  $panel = $(`
<div id="ws-panel" class="ws-panel" style="display:none;position:fixed;top:40px;right:0;width:400px;max-height:calc(100vh - 80px);background:#1e1e1e;border:1px solid #444;border-radius:4px;z-index:9998;overflow-y:auto;box-shadow:-2px 0 10px rgba(0,0,0,0.3)">
  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #444;background:#2a2a2a;position:sticky;top:0;z-index:1">
    <span style="font-weight:bold;color:#7ab7ef">\u{1F310} WebSocket Inspector</span>
    <div>
      <button id="ws-clear" class="btn btn-xs btn-default" style="padding:0 6px;margin-right:4px">Clear</button>
      <button id="ws-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
    </div>
  </div>
  <div id="ws-content" style="padding:6px;font-size:11px"></div>
</div>`);
  $('body').append($panel);
  $panel.show();
  renderWSContent();

  $(document).on('click', '#ws-close', () => $panel.hide());
  $(document).on('click', '#ws-clear', () => {
    clearWSConnections();
    renderWSContent();
  });
}

function renderWSContent(): void {
  $('#ws-content').html(WSConnectionsToHtml());
}
