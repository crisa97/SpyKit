import { escapeHtml } from '../core/utils';

export function parseQueryParams(url: string): Array<{ key: string; value: string }> {
  const qIdx = url.indexOf('?');
  if (qIdx < 0) return [];
  const qs = url.substring(qIdx + 1);
  const params: Array<{ key: string; value: string }> = [];
  qs.split('&').forEach(function (p) {
    if (!p) return;
    const eq = p.indexOf('=');
    if (eq >= 0) {
      params.push({ key: decodeURIComponent(p.substring(0, eq)), value: decodeURIComponent(p.substring(eq + 1)) });
    } else {
      params.push({ key: decodeURIComponent(p), value: '' });
    }
  });
  return params;
}

export function buildQueryString(params: Array<{ key: string; value: string }>): string {
  const parts: string[] = [];
  for (const p of params) {
    if (p.key) parts.push(encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value));
  }
  return parts.join('&');
}

export function renderQueryEditor(params: Array<{ key: string; value: string }>): string {
  let html = '<table style="width:100%;border-collapse:collapse;font-size:11px">';
  html += '<tr><th style="text-align:left;padding:2px 4px;border-bottom:1px solid #444;color:#aaa">Key</th><th style="text-align:left;padding:2px 4px;border-bottom:1px solid #444;color:#aaa">Value</th><th style="width:30px;border-bottom:1px solid #444"></th></tr>';
  for (const p of params) {
    html += '<tr class="qp-row"><td><input class="qp-key form-control" value="' + escapeHtml(p.key) + '" style="width:100%;font-size:11px;padding:2px 4px"></td>';
    html += '<td><input class="qp-val form-control" value="' + escapeHtml(p.value) + '" style="width:100%;font-size:11px;padding:2px 4px"></td>';
    html += '<td><button class="qp-del btn btn-xs btn-default" style="font-size:10px;padding:0 4px">&times;</button></td></tr>';
  }
  html += '</table>';
  html += '<div style="margin-top:4px"><button id="qp-add" class="btn btn-xs btn-default">+ Add param</button></div>';
  return html;
}

export function updateUrlFromParams(): void {
  const url = $('#form-url').val() as string;
  const qIdx = url.indexOf('?');
  const baseUrl = qIdx >= 0 ? url.substring(0, qIdx) : url;
  const params: Array<{ key: string; value: string }> = [];
  $('#query-params-editor .qp-row').each(function (this: HTMLElement) {
    const key = ($(this).find('.qp-key').val() as string || '').trim();
    const val = $(this).find('.qp-val').val() as string || '';
    if (key) params.push({ key, value: val });
  });
  const qs = buildQueryString(params);
  $('#form-url').val(baseUrl + (qs ? '?' + qs : ''));
  try { (window as any).autosize?.update($('#form-url')); } catch {}
}

export function initQueryParamsUI(): void {
  $(document).on('click', '#query-params-btn', function (this: HTMLElement) {
    const $editor = $('#query-params-editor');
    if ($editor.is(':visible')) {
      $editor.hide();
      $(this).text('\uD83D\uDD17 Params');
      return;
    }
    const params = parseQueryParams($('#form-url').val() as string);
    $editor.html(renderQueryEditor(params)).show();
    $(this).text('\uD83D\uDD17 Done');
  });
  $(document).on('click', '#qp-add', function () {
    $('#query-params-editor table').append('<tr class="qp-row"><td><input class="qp-key form-control" style="width:100%;font-size:11px;padding:2px 4px"></td><td><input class="qp-val form-control" style="width:100%;font-size:11px;padding:2px 4px"></td><td><button class="qp-del btn btn-xs btn-default" style="font-size:10px;padding:0 4px">&times;</button></td></tr>');
  });
  $(document).on('click', '.qp-del', function (this: HTMLElement) {
    $(this).closest('.qp-row').remove();
    updateUrlFromParams();
  });
  $(document).on('input', '.qp-key, .qp-val', updateUrlFromParams);
}
