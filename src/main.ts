import { values, setRootId, rootId, mocks } from './state';
import type { CapturedEntry } from './types/index';
import { onData, setOnDataCallback } from './network/capture';
import { initTheme } from './ui/theme';
import { initPanel, editRequest, getEditRequest } from './ui/panel';
import { initDiffUI } from './ui/diff';
import { initHexView } from './ui/hex';
import { initMocksUI, renderMockList } from './ui/mocks';
import { initWorkspacesUI } from './ui/workspaces';
import { initRecordingUI, captureForRecording } from './ui/recording';
import { initViewportUI } from './ui/viewport';

import { initBodySearchUI } from './ui/body-search';
import { initRESTClient } from './rest/client';
import { initEnvUI, renderEnvTable, saveEnvs } from './rest/env';
import { initHistoryUI, renderHistoryList } from './rest/history';
import { initSnippetsUI, renderSnippetList } from './rest/snippets';
import { initWSPanel } from './ui/ws-panel';
import { initSessionCompare } from './ui/session-compare';
import { restorePinState } from './ui/pins';
import { detachInterceptor } from './interceptor/intercept';

// Expose values for legacy event handler access via window
(window as any).values = values;
(window as any).editRequest = editRequest;

// Set up onData callback chain
const onDataMocks = function(data: CapturedEntry, id: number): number {
  if (data && data.request && data.request.url) {
    for (const mock of mocks) {
      if (data.request.url.indexOf(mock.url) >= 0) {
        if (!data.response) data.response = { headers: [], content: {} } as any;
        data.response.status = mock.status;
        data.response.content = { text: mock.body || '', mimeType: 'application/json' };
        break;
      }
    }
  }
  return id;
};

const onDataRecording = function(data: CapturedEntry, id: number): number {
  captureForRecording(data);
  return id;
};

const onDataPins = function(data: CapturedEntry, id: number): number {
  const rowId = id || rootId;
  const tr = $('#' + rowId);
  if (tr.length) restorePinState(tr);
  return id;
};

setOnDataCallback(function(data: CapturedEntry, id: number): number {
  onDataMocks(data, id);
  onDataRecording(data, id);
  onDataPins(data, id);
  return id;
});

// Keyboard shortcuts that need editRequest reference
$(document).on('keydown', function (e) {
  if (e.key === 'Escape' && (window as any).dialogOpened) {
    $('#form-cancel').click();
    e.preventDefault();
  }
  if (e.ctrlKey && e.key === 'Enter') {
    $('#form-send').click();
    e.preventDefault();
  }
  if (e.ctrlKey && e.key === 'f' && !e.shiftKey) {
    $('#search-requests').focus();
    e.preventDefault();
  }
  if (e.ctrlKey && e.shiftKey && e.key === 'F') {
    $('#search-body').focus();
    e.preventDefault();
  }
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !$(e.target).is('input, textarea, [contenteditable]')) {
    $('#shortcuts-modal').toggle();
    e.preventDefault();
  }
  if (e.key === 'Escape' && $('#shortcuts-modal').is(':visible')) {
    $('#shortcuts-modal').hide();
    e.preventDefault();
  }
});

// Init everything
$(function () {
  console.log('SpyKit main script loaded for tab ', chrome.devtools.inspectedWindow.tabId);

  // Load mocks from storage (needs to happen before onData)
  const storedMocks = JSON.parse(localStorage.getItem('spykit-mocks') || '[]');
  mocks.splice(0, mocks.length, ...storedMocks);

  // Restore pinned state from storage
  const bookmarks = JSON.parse(localStorage.getItem('spykit-bookmarks') || '[]');

  // Initialize all UI modules
  initTheme();
  initPanel();
  initDiffUI();
  initHexView();
  initMocksUI();
  initWorkspacesUI();
  initRecordingUI();
  initViewportUI();

  initBodySearchUI();
  initRESTClient();
  initEnvUI();
  initHistoryUI();
  initSnippetsUI();
  initWSPanel();
  initSessionCompare();

  // Detach interceptor when the panel unloads
  window.addEventListener('beforeunload', () => {
    detachInterceptor();
  });

  // Mark script as loaded
  (window as any).spykitLoaded = true;
});
