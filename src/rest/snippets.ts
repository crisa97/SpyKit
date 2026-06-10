import { escapeHtml } from '../core/utils';
import { getSnippets, saveSnippets } from '../core/storage';

declare const autosize: any;

export function renderSnippetList(): void {
  const snippets = getSnippets();
  let html = '';
  for (let i = snippets.length - 1; i >= 0; i--) {
    html += '<div class="snippet-item" data-idx="' + i + '"><b>' + snippets[i].method + '</b> ' + escapeHtml(snippets[i].name) + '</div>';
  }
  $('#snippet-list').html(html || '<div style="color:#888;padding:8px">No snippets</div>');
}

export function initSnippetsUI(): void {
  $(document).on('click', '#snippet-save', function () {
    const name = ($('#snippet-name').val() as string || '').trim();
    if (!name) return;
    const snippet = {
      name,
      method: $('#form-method').val() as string,
      url: $('#form-url').val() as string,
      headers: $('#form-headers').val() as string,
      body: $('#form-body').val() as string,
    };
    const snippets = getSnippets();
    snippets.push(snippet);
    saveSnippets(snippets);
    $('#snippet-name').val('');
    renderSnippetList();
  });
  $(document).on('click', '#snippets-close', () => $('#snippets-panel').hide());
  $(document).on('click', '.snippet-item', function (this: HTMLElement) {
    const snippets = getSnippets();
    const idx = parseInt($(this).data('idx') as string);
    const s = snippets[idx];
    if (s) {
      $('#form-method').val(s.method);
      $('#form-url').val(s.url);
      autosize.update($('#form-url'));
      $('#form-headers').val(s.headers);
      autosize.update($('#form-headers'));
      $('#form-body').val(s.body);
      autosize.update($('#form-body'));
    }
    $('#snippets-panel').hide();
  });
  $(document).on('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      $('#snippets-panel').toggle();
      if ($('#snippets-panel').is(':visible')) renderSnippetList();
    }
  });
}
