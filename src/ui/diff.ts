import { escapeHtml } from '../core/utils';

export function simpleDiff(a: string, b: string): string {
  if (a === b) return '<span class="diff-context">' + escapeHtml(a) + '</span>';
  const linesA = (a || '').split('\n');
  const linesB = (b || '').split('\n');
  let html = '';
  const maxLen = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < maxLen; i++) {
    if (i >= linesA.length) {
      html += '<div class="diff-added">+ ' + escapeHtml(linesB[i]) + '</div>';
    } else if (i >= linesB.length) {
      html += '<div class="diff-removed">- ' + escapeHtml(linesA[i]) + '</div>';
    } else if (linesA[i] !== linesB[i]) {
      html += '<div class="diff-removed">- ' + escapeHtml(linesA[i]) + '</div>';
      html += '<div class="diff-added">+ ' + escapeHtml(linesB[i]) + '</div>';
    } else {
      html += '<div class="diff-context">  ' + escapeHtml(linesA[i]) + '</div>';
    }
  }
  return html;
}

export function initDiffUI(): void {
  $('body').append('<div class="diff-container" id="diff-container"><button class="diff-close" id="diff-close">&times;</button><div class="diff-header"><span id="diff-a-label">Response A</span><span id="diff-b-label">Response B</span></div><pre id="diff-output"></pre></div>');
  $(document).on('click', '#diff-close', () => $('#diff-container').hide());

  $(document).on('click', '.req', function (e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const id = parseInt($(this).attr('id') || '');
      const data = (window as any).values.requests[id];
      if (!data || !data.response) return;
      const body = (data.response.content && data.response.content.text) || '';
      if (!(window as any)._diffA) {
        (window as any)._diffA = { id, body, label: (data.request.method || 'GET') + ' ' + (data.request.url || '') };
        $(this).addClass('selected-for-diff');
      } else if ((window as any)._diffA.id !== id) {
        (window as any)._diffB = { id, body, label: (data.request.method || 'GET') + ' ' + (data.request.url || '') };
        $(this).addClass('selected-for-diff');
        $('#diff-a-label').text('A: ' + (window as any)._diffA.label);
        $('#diff-b-label').text('B: ' + (window as any)._diffB.label);
        $('#diff-output').html(simpleDiff((window as any)._diffA.body, (window as any)._diffB.body));
        $('#diff-container').show();
        $('.selected-for-diff').removeClass('selected-for-diff');
        (window as any)._diffA = null;
        (window as any)._diffB = null;
      }
    }
  });
}
