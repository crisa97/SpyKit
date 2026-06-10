import { values } from '../state';
import { getWorkspaces, saveWorkspaces } from '../core/storage';
import { escapeHtml } from '../core/utils';
import { onData } from '../network/capture';

export function renderWorkspaceList(): void {
  const workspaces = getWorkspaces();
  let html = '';
  for (let i = workspaces.length - 1; i >= 0; i--) {
    const count = workspaces[i].requests ? Object.keys(workspaces[i].requests).length : 0;
    html += '<div class="workspace-item" data-idx="' + i + '"><b>' + escapeHtml(workspaces[i].name) + '</b> (' + count + ' requests)</div>';
  }
  $('#workspace-list').html(html || '<div style="color:#888;padding:8px">No workspaces</div>');
}

export function initWorkspacesUI(): void {
  $(document).on('click', '#workspace-save', function () {
    const name = ($('#workspace-name').val() as string || '').trim();
    if (!name) return;
    const ws = { name, requests: {} as { [id: string]: any } };
    for (const id in values.requests) {
      ws.requests[id] = values.requests[id];
    }
    const workspaces = getWorkspaces();
    workspaces.push(ws);
    saveWorkspaces(workspaces);
    $('#workspace-name').val('');
    renderWorkspaceList();
  });
  $(document).on('click', '#workspaces-close', () => $('#workspaces-panel').hide());
  $(document).on('click', '.workspace-item', function (this: HTMLElement) {
    const workspaces = getWorkspaces();
    const idx = parseInt($(this).data('idx') as string);
    const ws = workspaces[idx];
    if (ws && ws.requests) {
      if (confirm('Load workspace "' + ws.name + '"? Current requests will be cleared.')) {
        $('.req').remove();
        values.requests = {};
        for (const id in ws.requests) {
          onData(ws.requests[id], parseInt(id));
        }
      }
    }
    $('#workspaces-panel').hide();
  });
  $(document).on('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'W') {
      e.preventDefault();
      $('#workspaces-panel').toggle();
      if ($('#workspaces-panel').is(':visible')) renderWorkspaceList();
    }
  });
}
