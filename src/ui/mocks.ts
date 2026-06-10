import { mocks } from '../state';
import { getMocks, saveMocks } from '../core/storage';
import { escapeHtml } from '../core/utils';

export function renderMockList(): void {
  let html = '';
  for (let i = 0; i < mocks.length; i++) {
    html += '<div class="mock-item">[' + mocks[i].status + '] ' + escapeHtml(mocks[i].url) + ' <button class="mock-del" data-idx="' + i + '" style="float:right">&times;</button></div>';
  }
  $('#mock-list').html(html || '<div style="color:#888;padding:8px">No mocks</div>');
}

export function initMocksUI(): void {
  mocks.splice(0, mocks.length, ...getMocks());

  $(document).on('click', '#mock-add', function () {
    const url = ($('#mock-url').val() as string || '').trim();
    const status = parseInt($('#mock-status').val() as string);
    if (!url) return;
    const body = $('#form-body2').val() as string;
    const headers = $('#form-headers2').val() as string;
    mocks.push({ url, status, headers, body });
    saveMocks(mocks);
    $('#mock-url').val('');
    renderMockList();
  });
  $(document).on('click', '#mock-close', () => $('#mock-panel').hide());
  $(document).on('click', '.mock-item .mock-del', function (this: HTMLElement) {
    const idx = parseInt($(this).data('idx') as string);
    mocks.splice(idx, 1);
    saveMocks(mocks);
    renderMockList();
  });
  $(document).on('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      $('#mock-panel').toggle();
      if ($('#mock-panel').is(':visible')) renderMockList();
    }
  });
}
