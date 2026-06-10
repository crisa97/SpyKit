import { values } from '../state';
import { escapeHtml } from '../core/utils';

declare const autosize: any;

export function saveToHistory(method: string, url: string, headers: string, body: string): void {
  values.restHistory = values.restHistory || [];
  values.restHistory.unshift({ method, url, headers, body, ts: Date.now() });
  if (values.restHistory.length > 20) values.restHistory.pop();
}

export function renderHistoryList(): void {
  const hist = values.restHistory || [];
  let html = '';
  for (let i = 0; i < hist.length; i++) {
    html += '<div class="history-item" data-idx="' + i + '"><b>' + hist[i].method + '</b> ' + escapeHtml(hist[i].url.substring(0, 100)) + ' <span style="color:#888">' + new Date(hist[i].ts).toLocaleTimeString() + '</span></div>';
  }
  $('#history-list').html(html || '<div style="color:#888;padding:8px">No history</div>');
}

export function initHistoryUI(): void {
  $(document).on('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'H') {
      e.preventDefault();
      const $panel = $('#history-panel');
      $panel.toggle();
      if ($panel.is(':visible')) renderHistoryList();
    }
  });
  $(document).on('click', '#history-close', () => $('#history-panel').hide());
  $(document).on('keyup', '#history-search', function (this: HTMLElement) {
    const q = ($(this).val() as string || '').toLowerCase();
    $('#history-list .history-item').each(function (this: HTMLElement) {
      $(this).toggle($(this).text().toLowerCase().indexOf(q) >= 0);
    });
  });
  $(document).on('click', '.history-item', function (this: HTMLElement) {
    const idx = parseInt($(this).data('idx') as string);
    const item = (values.restHistory || [])[idx];
    if (item) {
      $('#form-method').val(item.method);
      $('#form-url').val(item.url);
      autosize.update($('#form-url'));
      $('#form-headers').val(item.headers);
      autosize.update($('#form-headers'));
      $('#form-body').val(item.body);
      autosize.update($('#form-body'));
    }
    $('#history-panel').hide();
  });
}
