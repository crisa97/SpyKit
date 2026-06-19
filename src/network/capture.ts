import { values, rows, ROW_HEIGHT, rootId, setRootId } from '../state';
import type { CapturedEntry } from '../types/index';
import { parseUrl, hash, formatSize, getRedColor, stripTrailingSlash, getRequestText } from '../core/utils';
import { addFilterItem } from '../ui/filters';
import { collectFindings } from '../security/findings';

let _onDataCallback: ((data: CapturedEntry, id: number) => number) | null = null;

export function setOnDataCallback(cb: (data: CapturedEntry, id: number) => number): void {
  _onDataCallback = cb;
}

export function applyFilters(): void {
  const q = values.searchQuery;
  $('.req').each(function (this: HTMLElement) {
    const $row = $(this);
    let match = true;
    if (q) {
      const id = parseInt($row.attr('id') || '');
      const data = values.requests[id];
      if (data) {
        const text = getRequestText(data);
        if (values.searchRegex) {
          try { match = new RegExp(q, 'i').test(text); } catch { match = false; }
        } else {
          match = text.indexOf(q) >= 0;
        }
      } else {
        const text = $row.find('td.url, td.method, td.status, td.type').text().toLowerCase();
        if (values.searchRegex) {
          try { match = new RegExp(q, 'i').test(text); } catch { match = false; }
        } else {
          match = text.indexOf(q) >= 0;
        }
      }
    }
    $row.toggleClass('search-hidden', !match);
  });
  $('.req').removeClass('pinned-hidden');
  if (values.showPinned) {
    $('.req:not(.pinned)').addClass('pinned-hidden');
  }
  if (values.filters.length > 0) {
    values.filters_str = values.filters.join(', ');
    $('.req:not(.search-hidden):not(.pinned-hidden)').show().filter(values.filters_str).hide();
    $('.search-hidden').hide();
  } else {
    values.filters_str = '';
    $('.req:not(.pinned-hidden)').show();
    $('.search-hidden').hide();
  }
  applyPagination();
}

export function applyPagination(): void {
  const visible = $('.req:visible').not('.pagination-hidden').toArray();
  const total = visible.length;
  const start = values.page * values.pageSize;
  const end = start + values.pageSize;
  $('.req.pagination-hidden').removeClass('pagination-hidden');
  for (let i = 0; i < visible.length; i++) {
    if (i < start || i >= end) {
      $(visible[i]).addClass('pagination-hidden').hide();
    }
  }
  const totalPages = Math.ceil(total / values.pageSize) || 1;
  if (totalPages > 1) {
    $('#page-controls').show();
    $('#page-info').text('Page ' + (values.page + 1) + ' of ' + totalPages + ' (' + total + ' requests)');
    $('#page-prev').prop('disabled', values.page === 0);
    $('#page-next').prop('disabled', values.page >= totalPages - 1);
  } else {
    $('#page-controls').hide();
  }
}

export function doSearch(): void {
  values.searchQuery = $('#search-requests').val() as string;
  values.searchRegex = $('#search-regex').is(':checked');
  if (!values.searchRegex) values.searchQuery = values.searchQuery.toLowerCase();
  values.page = 0;
  applyFilters();
}

export function onData(data: CapturedEntry, id?: number): number {
  if (!id) {
    setRootId(rootId + 1);
    id = rootId;
  }

  const url = parseUrl(data.request.url);
  let _url = url.pathname;
  if (_url && _url.substring(0, 1) === '/' && _url.length > 1) {
    _url = _url.substring(1);
  }
  if ((!_url || _url.length < 2) && url.search) {
    _url = url.search;
  }

  values.requests[id] = data;
  const removeId = id - 1000;
  if (removeId >= 0) {
    delete values.requests[removeId];
    $('#' + removeId).remove();
  }

  let tr = $('#' + id);
  if (tr.length) tr.remove();

  tr = $('<tr/>')
    .addClass('req req' + id)
    .attr('id', id)
    .css({ display: 'none' });

  for (const a in rows) {
    tr.append($('<td/>').addClass(a));
  }

  $('.clear', tr).html('&nbsp;');
  $('.pin', tr).html('<span class="pin-star">☆</span>');

  // Show findings icon only if findings exist
  const findings = collectFindings(data);
  if (findings.length) {
    $('.findings', tr).html('<span class="findings-icon" title="Tiene hallazgos">🔍</span>');
  } else {
    $('.findings', tr).html('&nbsp;');
  }

  $('.url', tr).html(_url);

  const _domain = hash(url.hostname);
  addFilterItem('url', _domain, url.hostname);
  tr.addClass('url-' + _domain);

  let type = 'other';
  if (data.response && data.response.headers && data.response.headers.length) {
    const headers = data.response.headers;
    for (const h of headers) {
      if (!h.name) continue;
      if (h.name.toLowerCase() === 'content-type') {
        type = h.value;
        if (type) {
          if (type.indexOf('image/') >= 0) type = 'image';
          else if (type.indexOf('javascript') >= 0) type = 'js';
          else if (type.indexOf('font') >= 0) type = 'font';
          else if (type.indexOf('json') >= 0) type = 'json';
          else if (type.indexOf('xml') >= 0) type = 'xml';
          else if (type.indexOf('css') >= 0) type = 'css';
          else if (type.indexOf('html') >= 0) type = 'html';
          else if (type.indexOf('text') >= 0) type = 'text';
          else type = 'other';
        }
      }
    }
  }

  const size = data.response ? (data.response.bodySize ?? 0) : 0;
  const sizeInt = Math.round(size);

  $('.type', tr)
    .html(type)
    .addClass(type);

  const _type = hash(type);
  addFilterItem('type', _type, type);
  tr.addClass('type-' + _type);

  $('.size', tr)
    .html(formatSize(size))
    .css(getRedColor(sizeInt / (1024 * 1024)));

  if (sizeInt >= 1024 * 1024) {
    addFilterItem('size', '1m', '');
    tr.addClass('size-1000');
  } else if (sizeInt >= 100 * 1024) {
    addFilterItem('size', '100', '');
    tr.addClass('size-100');
  } else {
    addFilterItem('size', '0', '');
    tr.addClass('size-0');
  }

  const status = Math.round(data.response ? data.response.status : 0);
  if (status < 0) {
    $('.status', tr).html('pending');
  } else {
    $('.status', tr)
      .html(status ? String(status) : 'error')
      .css(getRedColor((status >= 200 && status < 300) ? 0 : 1));
    addFilterItem('status', String(status), status ? String(status) : 'error');
    tr.addClass('status-' + status);
  }

  if (status < 0) {
    $('.time', tr).html('pending');
  } else {
    const time = Math.round(data.time || 0);
    $('.time', tr)
      .html(time + '<small> ms</small>')
      .css(getRedColor(time / 2000));
    if (time >= 1000) {
      addFilterItem('time', '1000', '');
      tr.addClass('time-1000');
    } else if (time >= 500) {
      addFilterItem('time', '500', '');
      tr.addClass('time-500');
    } else {
      addFilterItem('time', '0', '');
      tr.addClass('time-0');
    }
  }

  const _method = hash(data.request.method);
  addFilterItem('method', _method, data.request.method);
  tr.addClass('method-' + _method);
  $('.method', tr)
    .html(data.request.method)
    .addClass(data.request.method);

  if ($('.req' + id).is('div')) {
    $('.req' + id + ':first').before(tr);
  } else {
    $('.requests').prepend(tr);
  }

  const searchMatch = (() => {
    if (!values.searchQuery) return true;
    const text = getRequestText(data);
    if (values.searchRegex) {
      try { return new RegExp(values.searchQuery, 'i').test(text); } catch { return false; }
    }
    return text.indexOf(values.searchQuery) >= 0;
  })();
  const filterMatch = values.filters_str && tr.is(values.filters_str);
  if (filterMatch || !searchMatch) {
    tr.hide();
  } else {
    tr.show();
  }

  const editUrl = ($('#form-url').val() as string || '');
  const stripped = stripTrailingSlash(editUrl);
  if ((window as any).selected
    && ($('#form-status').val() === 'pending')
    && ($('#form-method').val() === data.request.method)
    && ((stripped === stripTrailingSlash(data.request.url))
        || (stripped.indexOf('//') < 0 && stripped === stripTrailingSlash(_url)))) {
    setTimeout(() => {
      if ((window as any).editRequest) {
        ((window as any).editRequest as (tr: JQuery) => void)(tr);
      }
    }, 10);
  }

  if (_onDataCallback) {
    _onDataCallback(data, id);
  }

  return id;
}
