import { values, rows, ROW_HEIGHT, selected, dialogOpened, largeContent, largeContentEncoding, formDirty,
         setDialogOpened, setSelected, setLargeContent, setContentScriptLoaded, setFormDirty,
         rootId, mocks, splitter, splitDir, setRateLimitDelay, rateLimitDelay } from '../state';
import { format, headersToStr, getStatusHint, toCurl, downloadJSON, copyToClipboard } from '../core/utils';
import { onData, applyFilters, applyPagination, doSearch, getRequestText } from '../network/capture';
import { loadPersistedData, startAutoSave, saveBookmark, addBlockedDomain } from '../core/storage';
import { splitCheck, detailsSizeCheck } from './splitter';
import { addFilterItem } from './filters';
import { handleRESTResponse } from '../rest/client';
import { clearBodyHighlights } from './body-search';
import { checkScroll } from './scroll';
import { detectGraphQL } from '../security/graphql';
import { findJWTInText, jwtToHtml, syntaxHighlightJSON } from '../security/jwt';
import { analyzeAuth, authFindingsToHtml } from '../security/auth';
import { scanForReflections, scanResultsToHtml } from '../security/scanner';
import { checkSecurityHeaders } from '../security/headers';
import { checkCORS } from '../security/cors';
import { parseCookies, cookieHtml } from '../security/cookies';
import { scanForSecrets } from '../security/secrets';
import { genSnippets } from '../rest/export';
import { exportAsFormat, exportAsCSV, exportAsHAR } from '../rest/export';
import { requestToPostmanItem } from '../rest/postman';
import { renderFuzzerDialog, getFuzzPayloads, fuzzResultsToHtml, fuzzResultsToCsv, FuzzResult, getFuzzResults, setFuzzResults, clearFuzzResults, replaceJsonKey as fuzzReplaceJsonKey } from '../rest/fuzzer';
import { renderRepeaterDialog, repeaterResultsToHtml, repeaterResultsToCsv, getRepeaterResults, setRepeaterResults, clearRepeaterResults } from '../rest/repeater';
import { renderDecoderDialog, detectAndDecode, decodersToHtml } from '../ui/decoders';
import { renderIntruderDialog, getIntruderPayloadTypes, getIntruderPayloads, getIntruderResults, setIntruderResults, clearIntruderResults, intruderResultsToHtml, saveCustomPayloads, loadCustomPayloads, deleteCustomPayloads, replaceJsonKey } from '../rest/intruder';
import {
  isInterceptEnabled, isInterceptorAttached, toggleIntercept, getInterceptedQueue,
  forwardRequest, forwardAllRequests, dropRequest, dropAllRequests,
  setOnQueueChange, setOnRequestProcessed, editAndForwardRequest, attachInterceptor,
} from '../interceptor/intercept';
import type { InterceptedRequest, CapturedEntry } from '../types/index';
import { pageFetch } from '../rest/page-fetch';

declare const autosize: any;

let filterHtmlAdded = false;

export function getEditRequest(): (tr: JQuery) => void {
  return editRequest;
}

function buildFilterRow(): void {
  if (filterHtmlAdded) return;
  filterHtmlAdded = true;

  const filter = $('.filter');
  let first = true;
  for (const a in rows) {
    filter.append($('<div/>').addClass('filter-' + a));
    if (typeof rows[a] === 'object') {
      const $container = $('<div/>').addClass('btn-group clickable');
      const $span = $('<span/>').html((rows[a] as string[])[0]).attr({ 'data-toggle': 'dropdown' } as any).append('<small>\u25BC</small>');
      const $ul = $('<ul/>').addClass('dropdown-menu dropdown-menu-form').attr('role', 'menu').attr('id', a);
      $ul.append(
        $('<li/>').addClass('checkbox').append(
          $('<label/>').append(
            $('<input/>').attr({ type: 'checkbox', name: 'all', val: 'all', checked: true } as any)
          ).append('All')
        )
      );
      $container.append($span).append($ul);
      $('.filter-' + a).append($container);
    } else {
      const $container = $('<div/>').addClass('btn-group' + (first ? ' clickable' : ''));
      $container.append($('<span/>').append(rows[a] as string));
      $('.filter-' + a).append($container);
    }
    first = false;
  }

  filter.append($('<div/>').addClass('filter-empty'));
  const filterFixed = filter.clone();
  filter.after(filterFixed);
  filterFixed.addClass('fixed');

  addFilterItem('time', '0', 'fast');
  addFilterItem('time', '500', '> 500 ms');
  addFilterItem('time', '1000', '> 1000 ms');
  addFilterItem('size', '0', 'small');
  addFilterItem('size', '100', '> 100 k');
  addFilterItem('size', '1m', '> 1 m');
}

export function editRequest(tr: JQuery): void {
  setLargeContent(undefined);
  setDialogOpened(true);

  if (selected) {
    selected.find('.clear').addClass('visited').html('\u2713');
  }
  setSelected(tr);
  if (selected) {
    selected.find('.clear').removeClass('visited').html('\u25BA');
  }

  $('#new-request').hide();

  if (splitter) {
    const sizes = splitter.getSizes();
    if (sizes.length !== 2 || sizes[1] < 10) {
      splitter.setSizes([50, 50]);
    }
  }

  (window as any).selected = selected;

  $('.split-area')
    .css({ opacity: 0.0, display: (splitDir === 'vertical') ? 'block' : 'flex' })
    .animate({ opacity: 1 }, 100, 'swing');

  const id = selected ? parseInt(selected.attr('id') || '-1') : -1;
  const data: CapturedEntry = (id > 0) ? values.requests[id] : {} as CapturedEntry;
  if (!data.request) data.request = { method: 'GET', url: '', headers: [] };
  if (!data.response) data.response = { status: 0, headers: [], content: {} };

  $('#form-cancel').html('Cancel').addClass('btn-default').removeClass('btn-danger');
  $('#form-send').prop('disabled', false).removeClass('spin');
  $('#form-id').val(id);
  $('#form-method').val(data.request.method);

  let displayValue: string | number = data.response.status;
  if (displayValue === undefined) displayValue = '';
  else if (displayValue === 0) displayValue = 'error';
  else if (displayValue === 200) displayValue = '200 - OK';
  $('#form-status').val(displayValue as string)
    .removeClass('blink ok error')
    .addClass((data.response.status >= 200 && data.response.status < 300) ? 'ok' : 'error');

  $('.hint').css({ display: data.response.status && data.response.status !== 200 ? 'block' : 'none' });
  $('#hint').html(getStatusHint(data.response.status));

  if (data.time) {
    const time = Math.round(data.time);
    $('#form-time').val(time + ' ms');
  } else {
    $('#form-time').val('');
  }

  let focusSet = false;

  $('#form-url').val(data.request.url);
  autosize.update($('#form-url'));
  if (!focusSet && $('#form-url').is(':visible')) { $('#form-url').focus(); focusSet = true; }

  $('#form-headers').val(headersToStr(data.request.headers));
  autosize.update($('#form-headers'));
  if (!focusSet && $('#form-headers').is(':visible')) { $('#form-headers').focus(); focusSet = true; }

  if (data.request.postData) {
    const postText = typeof data.request.postData === 'string' ? data.request.postData : (data.request.postData.text || '');
    $('#form-body').val(format(postText));
  } else {
    $('#form-body').val('');
  }
  autosize.update($('#form-body'));
  if (!focusSet && $('#form-body').is(':visible')) { $('#form-body').focus(); focusSet = true; }

  $('#form-headers2').val(headersToStr(data.response.headers));
  autosize.update($('#form-headers2'));
  if (!focusSet && $('#form-headers2').is(':visible')) { $('#form-headers2').focus(); focusSet = true; }

  const mime2 = (data.response.content && data.response.content.mimeType) ? data.response.content.mimeType.toLowerCase() : '';
  const bodyText = (data.response.content && data.response.content.text) || '';
  $('#form-body2').val(format(bodyText, mime2)).show();
  $('#form-body2-image').html('');

  const sizeCompressed = data.response.bodySize || 0;
  let sizeFull = data.response.content ? data.response.content.size || 0 : 0;
  if (!sizeFull) sizeFull = sizeCompressed;
  let sizeInfo = '';
  if (sizeFull) {
    sizeInfo = Math.round(sizeFull / 1024) + ' k ' +
      ((sizeCompressed === sizeFull) ? ' not gzipped' : ' / ' + Math.round(sizeCompressed / 1024) + ' k gzipped');
  }
  $('#form-label-body2').attr('for', 'form-body2').text('Answer body: ' + sizeInfo);
  autosize.update($('#form-body2'));

  if (data.getContent) {
    data.getContent(function (content: string, encoding: string) {
      if (mime2.indexOf('image') >= 0) {
        const mimeType = data.response?.content?.mimeType || 'image/png';
        const img = '<a target="_blank" href="' + data.request.url + '"><img height="100px" src="data:' +
          mimeType.toLowerCase() + ';' + encoding + ',' + (content) + '"/></a>';
        $('#form-body2').val('').hide();
        $('#form-body2-image').empty().append($(img));
        $('#form-label-body2').attr('for', 'form-body2-image');
      } else {
        if (!content) {
          $('#form-body2').val('');
        } else if (content.length < 100 * 1024) {
          $('#form-body2').val(format(content, mime2));
          autosize.update($('#form-body2'));
        } else {
          $('#form-body2').val(format(content, mime2)).css({ height: 500, overflow: 'scroll' });
        }
      }
    });
  }
  if (!focusSet && $('#form-body2').is(':visible')) { $('#form-body2').focus(); }

  detailsSizeCheck();
  $('.details').scrollTop(0);
}

export function initPanel(): void {
  buildFilterRow();

  const $body = $('body');

  // Expose editRequest globally for onData callback
  (window as any).editRequest = editRequest;

  $(document).on('click', '.dropdown-menu.dropdown-menu-form', function (e) {
    e.stopPropagation();
  });

  $(document).on('click', '.details .other-controls label', function (e) {
    e.stopPropagation();
    e.preventDefault();
    const label = $(this);
    const id = label.attr('for');
    if (!id) return;
    const edit = $('#' + id);
    const isVisible = edit.is(':visible');
    edit.slideToggle();
    $('#' + id + '-preview').slideToggle();
    label.find('.collapse-icon').text(isVisible ? '+' : '\u2212');
  });

  $(document).on('click', 'input[name="filter"]', function (this: HTMLElement) {
    const block = $(this).parents('.dropdown-menu');
    const button = block.prev();
    const sel = '.' + ($(this).val() as string);

    $('input[name="all"]', block).prop('checked',
      $('input[name="filter"]', block).length === $('input[name="filter"]:checked', block).length
    );
    const checked = $(this).prop('checked');
    if ($('input[name="all"]', block).prop('checked')) {
      $('input[name="filter"]', block).each(function () {
        const a = values.filters.indexOf(sel);
        if (a >= 0) values.filters.splice(a, 1);
      });
      button.removeClass('active');
    } else {
      button.addClass('active');
      if (checked) {
        const a = values.filters.indexOf(sel);
        if (a >= 0) values.filters.splice(a, 1);
      } else {
        values.filters.push(sel);
      }
    }
    values.filters = $.grep(values.filters, function () { return true; });
    values.page = 0;
    applyFilters();
  });

  $(document).on('click', 'input[name="all"]', function (this: HTMLElement) {
    const block = $(this).parents('.dropdown-menu');
    if ($(this).prop('checked')) {
      $('input[name="filter"]:not(:checked)', block).trigger('click');
    } else {
      $('input[name="filter"]:checked', block).trigger('click');
    }
  });

  $(document).on('input', '#search-requests', doSearch);
  $(document).on('change', '#search-regex', doSearch);

  $(document).on('click', '.filter-pin', function (this: HTMLElement) {
    values.showPinned = !values.showPinned;
    values.page = 0;
    $(this).toggleClass('active');
    applyFilters();
  });

  $('.filter-clear').on('click', function () {
    setLargeContent(undefined);
    values.requests = {};
    values.searchQuery = '';
    values.showPinned = false;
    values.page = 0;
    $('.filter-pin').removeClass('active');
    $('#search-requests').val('');
    $('.req').remove();
    $('.badge-right').html('');
    $body.scrollTop(0);
  });

  $body.on('scroll', function (this: HTMLElement) {
    checkScroll(this.scrollTop);
  });

  $(window).on('load', function () {
    splitCheck();
    checkScroll(0);
    detailsSizeCheck();
  });

  $(window).on('resize', function () {
    splitCheck();
    detailsSizeCheck();
  });

  $(document).on('click', '#scroll-up', function () {
    $body.scrollTop(0);
  });

  $(document).on('click', '#form-cancel', function () {
    if ($('#form-status').val() === 'pending') {
      $('#form-cancel').html('Cancel').addClass('btn-default').removeClass('btn-danger');
      $('#form-send').prop('disabled', false).removeClass('spin');
      $('#form-status').val('canceled').removeClass('blink').removeClass('ok').addClass('error');
      return;
    }
    clearBodyHighlights();
    setDialogOpened(false);
    setLargeContent(undefined);

    $('.split-area').animate({ opacity: 0 }, 100, 'swing', function () {
      $('.split-area').hide();
    });

    if (selected) {
      selected.find('.clear').addClass('visited').html('\u2713');
    }
    setSelected(undefined);
    $('#new-request').stop().show();
    detailsSizeCheck();
  });

  $(document).on('click', '#new-request', function () {
    editRequest($('<tr id="-1"/>'));
  });

  $(document).on('click', '#copy-curl-btn', function () {
    const fmt = $('#copy-format').val() as string;
    const id = parseInt($('#form-id').val() as string);
    const data = (id > 0) ? values.requests[id] : null;
    let entry: CapturedEntry;
    if (data) {
      entry = data;
    } else {
      entry = {
        request: {
          method: $('#form-method').val() as string,
          url: $('#form-url').val() as string,
          headers: [],
          postData: $('#form-body').val() ? { text: $('#form-body').val() as string } : null,
        },
      } as any;
    }
    const code = fmt === 'curl' ? toCurl(entry) : genSnippets(entry, fmt);
    if (code) {
      try {
        navigator.clipboard.writeText(code).then(() => {
          $('#copy-curl-btn').text('Copied!');
          setTimeout(() => $('#copy-curl-btn').text('Copy'), 2000);
        });
      } catch {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        $('#copy-curl-btn').text('Copied!');
        setTimeout(() => $('#copy-curl-btn').text('Copy'), 2000);
      }
    }
  });

  $(document).on('click', '.req', function (this: HTMLElement) {
    clearBodyHighlights();
    ((window as any).editRequest || editRequest)($(this));
  });

  autosize($('textarea'));
  splitCheck();

  $(document).on('click', 'a', function (e) {
    e.stopPropagation();
  });

  for (let i = 0; i < ($('table').outerHeight() || 0) / ROW_HEIGHT; i++) {
    $('.requests').prepend($('<tr/>').attr('colspan', 10).prepend($('<td>&nbsp;</td>')));
  }

  // ── Unsaved changes tracking ──
  $('#form-url, #form-headers, #form-body, #form-method').on('change input', function () {
    if (!formDirty) {
      setFormDirty(true);
      $('#form-method').parent().append('<span class="unsaved-dot" id="unsaved-dot"></span>');
    }
  });
  $(document).on('click', '#form-send, #form-cancel', function () {
    setFormDirty(false);
    $('#unsaved-dot').remove();
  });

  // ── Message from background ──
  try {
    const backgroundPageConnection = chrome.runtime.connect({ name: 'spy' });
    backgroundPageConnection.postMessage({
      name: 'init',
      tabId: chrome.devtools.inspectedWindow.tabId,
    });
    chrome.runtime.onMessage.addListener(function (message: any) {
      if (!message.spyId && !message.res) return;
      setContentScriptLoaded(true);
      handleRESTResponse(message);
    });
  } catch { /* ignore */ }

  // ── Network capture ──
  try {
    if (chrome.devtools) {
      chrome.devtools.network.getHAR(function (log: any) {
        for (const entry of log.entries) {
          onData(entry);
        }
      });
      chrome.devtools.network.onRequestFinished.addListener(function (entry: any) {
        onData(entry);
      });
    }
  } catch { /* ignore */ }

  // ── Post-edit security analysis (GraphQL + JWT) ──
  function runRequestAnalysis(data: CapturedEntry | null): void {
    if (!data) return;
    const body = $('#form-body2').val() as string || data.response?.content?.text || '';
    const allText = getRequestText(data) + ' ' + body;

    // Security header badges + CORS + Cookies
    const resHeaders = data.response?.headers || [];
    const reqHeaders = data.request?.headers || null;
    $('#security-summary').html(checkSecurityHeaders(resHeaders));
    const corsResult = checkCORS(reqHeaders, resHeaders);
    if (corsResult.status) {
      $('#cors-summary').html(corsResult.html).addClass(corsResult.status);
    }
    const cookies = parseCookies(resHeaders);
    if (cookies.length) {
      $('#cookie-inspector').html(cookieHtml(cookies)).show();
    } else {
      $('#cookie-inspector').hide();
    }

    // GraphQL badge
    if (detectGraphQL(body)) {
      const $label = $('#form-label-body2');
      if (!$label.find('.gql-badge').length) {
        $label.append(' <span class="gql-badge" title="GraphQL query detected">GQL</span>');
      }
    } else {
      $('#form-label-body2 .gql-badge').remove();
    }

    // JWT Inspector
    const jwts = findJWTInText(allText);
    const $container = $('#jwt-inspector-container');
    if (jwts.length) {
      if (!$container.length) {
        $('#security-summary').after('<div id="jwt-inspector-container"></div>');
      }
      $('#jwt-inspector-container').html(jwtToHtml(jwts));
    } else {
      $container.remove();
    }

    // Auth Analysis
    const authFindings = analyzeAuth(
      data.request?.headers || null,
      data.response?.headers || null,
      data.request?.url || ''
    );
    const $authContainer = $('#auth-analysis-container');
    if (authFindings.length) {
      if (!$authContainer.length) {
        $('#jwt-inspector-container').after('<div id="auth-analysis-container"></div>');
      }
      $('#auth-analysis-container').html(authFindingsToHtml(authFindings));
    } else {
      $authContainer.remove();
    }

    // Passive Reflection Scan
    const scanResults = scanForReflections(
      data.request?.url || '',
      (data.request?.postData ? (typeof data.request.postData === 'string' ? data.request.postData : data.request.postData.text || '') : ''),
      body
    );
    const $scanContainer = $('#scan-results-container');
    if (scanResults.length) {
      if (!$scanContainer.length) {
        $('#auth-analysis-container').after('<div id="scan-results-container"></div>');
      }
      $('#scan-results-container').html(scanResultsToHtml(scanResults));
    } else {
      $scanContainer.remove();
    }

    // Secrets detection
    const secrets = scanForSecrets(allText);
    if (secrets.length) {
      const counts: { [key: string]: number } = {};
      for (const s of secrets) {
        counts[s.type] = (counts[s.type] || 0) + 1;
      }
      let warnHtml = '';
      for (const type in counts) {
        warnHtml += '<span class="sec-found">\u26A0 ' + type + ': ' + counts[type] + '</span> ';
      }
      $('#secrets-warning').html(warnHtml);
    } else {
      $('#secrets-warning').html('');
    }

    // Hex button show/hide
    const mimeCheck = (data.response?.content?.mimeType || '').toLowerCase();
    const isText = mimeCheck.indexOf('text') >= 0 || mimeCheck.indexOf('json') >= 0 || mimeCheck.indexOf('xml') >= 0 || mimeCheck.indexOf('html') >= 0 || mimeCheck.indexOf('javascript') >= 0;
    if (mimeCheck && !isText) {
      $('#body-hex-btn').show();
    } else {
      $('#body-hex-btn').hide();
    }
  }

  const origEditReq = editRequest;
  const patchedEditReq = function (tr: JQuery) {
    const id = tr ? parseInt(tr.attr('id') || '-1') : -1;
    const data = (id > 0) ? values.requests[id] : null;

    // Wrap getContent to re-run analysis when async body loads
    if (data && data.getContent) {
      const origGetContent = data.getContent;
      data.getContent = function (callback: (content: string, encoding: string) => void) {
        origGetContent(function (content: string, encoding: string) {
          callback(content, encoding);
          runRequestAnalysis(data);
        });
      };
    }

    origEditReq(tr);

    // Fast path: analysis runs 50ms later (body already available)
    setTimeout(() => {
      runRequestAnalysis(data);
    }, 50);
  };
  (window as any).editRequest = patchedEditReq;

  // ── Persist data ──
  loadPersistedData();
  startAutoSave();

  // ── Export dropdown ──
  $(document).on('click', '#export-all-btn', function () {
    $('#export-dropdown').toggle();
  });
  $(document).on('click', function (e) {
    if (!$(e.target).closest('#export-all-btn, #export-dropdown').length) {
      $('#export-dropdown').hide();
    }
  });
  $(document).on('click', '.export-dropdown > div', function (this: HTMLElement) {
    exportAsFormat($(this).data('format') as string);
  });

  // ── Export Postman single ──
  $(document).on('click', '#export-postman-btn', function () {
    const id = parseInt($('#form-id').val() as string);
    const data = (id > 0) ? values.requests[id] : null;
    let entry: CapturedEntry;
    if (data) {
      entry = data;
    } else {
      entry = {
        request: {
          method: $('#form-method').val() as string,
          url: $('#form-url').val() as string,
          headers: [],
          postData: $('#form-body').val() ? { text: $('#form-body').val() as string } : null,
        },
      } as any;
    }
    const item = requestToPostmanItem(entry);
    if (!item) return;
    const collection = {
      info: { name: 'SpyKit Export', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: [item],
    };
    downloadJSON(JSON.stringify(collection, null, 2), 'spykit-collection.json');
  });

  // ── Context menu ──
  $(document).on('contextmenu', '.req', function (e) {
    e.preventDefault();
    $('.context-menu').remove();
    const id = parseInt($(this).attr('id') || '');
    const data = values.requests[id];
    const menu = $('<div class="context-menu" data-target-id="' + id + '"></div>');
    menu.append('<div data-action="replay">Reenviar</div>');
    menu.append('<div data-action="copy-curl">Copy as CURL</div>');
    menu.append('<div data-action="copy-url">Copy URL</div>');
    menu.append('<div data-action="open-browser">Open in browser</div>');
    if (data && data.request && data.request.url) {
      const domain = data.request.url.replace(/https?:\/\//, '').split('/')[0];
      menu.append('<div data-action="block">Block: ' + domain + '</div>');
    }
    menu.append('<div data-action="export-postman-single">Export to Postman</div>');
    menu.css({ left: e.clientX + 'px', top: e.clientY + 'px' });
    $('body').append(menu);
    $(document).one('click', function () { menu.remove(); });
  });

  $(document).on('click', '.context-menu div', function (this: HTMLElement) {
    const action = $(this).data('action') as string;
    const targetId = parseInt($('.context-menu').data('target-id') as string);
    const data = values.requests[targetId];

    if (action === 'replay' && data && data.request) {
      $('.context-menu').remove();
      editRequest($('#' + targetId));
      setTimeout(() => { $('#form-send').click(); }, 100);
    } else if (action === 'copy-curl' && data) {
      copyToClipboard(toCurl(data));
    } else if (action === 'copy-url' && data && data.request) {
      copyToClipboard(data.request.url);
    } else if (action === 'open-browser' && data && data.request) {
      chrome.devtools.inspectedWindow.eval('window.open(' + JSON.stringify(data.request.url) + ',"_blank")');
    } else if (action === 'block' && data && data.request) {
      const domain = data.request.url.replace(/https?:\/\//, '').split('/')[0];
      addBlockedDomain(domain);
      $('.req').each(function (this: HTMLElement) {
        const rid = parseInt($(this).attr('id') || '');
        const rd = values.requests[rid];
        if (rd && rd.request && rd.request.url && rd.request.url.indexOf(domain) >= 0) {
          $(this).addClass('search-hidden').hide();
        }
      });
      alert('Blocked: ' + domain);
    } else if (action === 'export-postman-single' && data) {
      const item = requestToPostmanItem(data);
      if (item) {
        const col = { info: { name: 'SpyKit - ' + (data.request.method || 'GET'), schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [item] };
        downloadJSON(JSON.stringify(col, null, 2), 'spykit-request.json');
      }
    }
    $('.context-menu').remove();
  });

  // ── Open in browser ──
  $(document).on('click', '#open-browser-btn', function () {
    const url = ($('#form-url').val() as string || '').trim();
    if (url) chrome.devtools.inspectedWindow.eval('window.open(' + JSON.stringify(url) + ',"_blank")');
  });

  // ── Pinned requests ──
  $(document).on('dblclick', '.req .clear', function (this: HTMLElement) {
    const $row = $(this).closest('.req');
    $row.toggleClass('pinned');
    $row.find('.pin-star').toggleClass('pinned');
    const id = parseInt($row.attr('id') || '');
    if (id) saveBookmark(id, $row.hasClass('pinned'));
  });

  $(document).on('click', '.pin-star', function (this: HTMLElement) {
    const $row = $(this).closest('.req');
    $row.toggleClass('pinned');
    $(this).toggleClass('pinned');
    const id = parseInt($row.attr('id') || '');
    if (id) saveBookmark(id, $row.hasClass('pinned'));
  });

  // ── Collection select toggle ──
  $(document).on('click', '.req .clear', function (this: HTMLElement) {
    const $row = $(this).closest('.req');
    $row.toggleClass('selected-for-collection');
    $(this).toggleClass('visited');
  });

  $(document).on('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      const items: CapturedEntry[] = [];
      $('.req.selected-for-collection').each(function (this: HTMLElement) {
        const id = parseInt($(this).attr('id') || '');
        if (values.requests[id]) items.push(values.requests[id]);
      });
      if (!items.length) {
        for (const id in values.requests) items.push(values.requests[id]);
      }
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ savedCollection: items }, function () {
          $('#copy-curl-btn').text('Saved!').fadeOut(1500, function () { $(this).text('Copy').show(); });
        });
      }
    }
  });

  // ── Auto-prettify double-click ──
  $(document).on('dblclick', '#form-body2', function (this: HTMLElement) {
    const val = $(this).val() as string;
    if (!val) return;
    const formatted = format(val, 'json');
    if (formatted !== val) {
      $(this).val(formatted);
      autosize.update($(this));
    }
  });

  // ── Rate limiter button ──
  $('<button id="form-rate-btn" class="btn btn-xs btn-default" type="button" title="Rate limit" style="float:right;margin-right:4px">\u221E</button>').insertBefore('#form-send');

  $(document).on('click', '#form-rate-btn', function (this: HTMLElement) {
    const delays = [0, 500, 1000, 2000];
    const idx = delays.indexOf(rateLimitDelay);
    const newDelay = delays[(idx + 1) % delays.length];
    setRateLimitDelay(newDelay);
    $(this).text(newDelay ? newDelay + 'ms' : '\u221E');
    $(this).toggleClass('active', newDelay > 0);
  });

  // ── Viewport bar ──
  const $viewportBar = $('<div id="viewport-bar"><button data-width="375">Mobile</button><button data-width="768">Tablet</button><button data-width="1024">Desktop</button><button data-width="0">Reset</button><span id="rate-badge" class="rate-badge" style="display:none">\u221E</span></div>');
  $('.search-bar-top').after($viewportBar);
  $viewportBar.hide();

  // ── Fuzzer + Repeater + Decoder buttons in URL actions ──
  $('.url-actions').append('<button id="intruder-btn" class="btn btn-xs btn-default" type="button" title="Intruder">\uD83C\uDFAF Intruder</button>');
  $('.url-actions').append('<button id="fuzzer-btn" class="btn btn-xs btn-default" type="button" title="Fuzz parameters">\u26A1 Fuzz</button>');
  $('.url-actions').append('<button id="repeater-btn" class="btn btn-xs btn-default" type="button" title="Repeater">\uD83D\uDD04 Repeat</button>');
  $('.url-actions').append('<button id="decoder-btn" class="btn btn-xs btn-default" type="button" title="Inline decoders">\uD83D\uDD0D Decode</button>');

  // ── Intruder ──
  $(document).on('click', '#intruder-btn', function () {
    const existing = $('#intruder-dialog');
    if (existing.length) { existing.remove(); return; }
    $('body').append(renderIntruderDialog());
    updateIntruderCount();

    // Auto-detect position: JSON body → JSON Body Key, else → URL Parameter
    const body = ($('#form-body').val() as string || '').trim();
    let isJson = false;
    try { isJson = !!(body && JSON.parse(body)); } catch { isJson = false; }
    if (isJson) {
      $('#intruder-position').val('json-body-key');
      // Auto-fill first JSON key as field
      try {
        const obj = JSON.parse(body);
        const keys = Object.keys(obj);
        if (keys.length) $('#intruder-field').val(keys[0]);
      } catch { /* ignore */ }
    } else {
      $('#intruder-position').val('url-param');
      // Auto-fill field from URL param
      const url = $('#form-url').val() as string;
      const qIdx = url.indexOf('?');
      if (qIdx >= 0) {
        const qs = url.substring(qIdx + 1);
        const firstParam = qs.split('&')[0]?.split('=')[0] || '';
        $('#intruder-field').val(decodeURIComponent(firstParam));
      }
    }

    // Populate custom payloads dropdown
    const custom = loadCustomPayloads();
    const $load = $('#intruder-load-custom');
    $load.find('option:not(:first)').remove();
    for (const name of Object.keys(custom)) {
      $load.append('<option value="' + name + '">' + name + '</option>');
    }

    $('#intruder-close').on('click', function () { $('#intruder-dialog').remove(); });
  });

  $(document).on('change', '#intruder-position, #intruder-payload-type', function () {
    const ptype = $('#intruder-payload-type').val() as string;
    $('#intruder-custom-area').toggle(ptype === '__custom__');
    updateIntruderCount();
  });

  $(document).on('input', '#intruder-custom-payloads', updateIntruderCount);

  function updateIntruderCount(): void {
    const ptype = $('#intruder-payload-type').val() as string;
    const count = ptype === '__custom__'
      ? ($('#intruder-custom-payloads').val() as string || '').split('\n').filter((l: string) => l.trim()).length
      : getIntruderPayloads(ptype).length;
    $('#intruder-count').val(count + ' payloads');
  }

  $(document).on('click', '#intruder-save-custom', function () {
    const name = prompt('Name for this payload list:');
    if (!name) return;
    const payloads = ($('#intruder-custom-payloads').val() as string || '').split('\n').map((l: string) => l.trim()).filter(Boolean);
    saveCustomPayloads(name, payloads);
    $('#intruder-load-custom').append('<option value="' + name + '">' + name + '</option>');
    alert('Saved "' + name + '" (' + payloads.length + ' payloads)');
  });

  $(document).on('change', '#intruder-load-custom', function () {
    const name = $('#intruder-load-custom').val() as string;
    if (!name) return;
    const custom = loadCustomPayloads();
    const payloads = custom[name];
    if (payloads) {
      $('#intruder-custom-payloads').val(payloads.join('\n'));
      $('#intruder-payload-type').val('__custom__').trigger('change');
    }
  });

  let intruderCancel = false;
  let fuzzerCancel = false;

  $(document).on('click', '#intruder-stop', function () {
    intruderCancel = true;
    $('#intruder-stop').prop('disabled', true).text('⏹ Stopping...');
  });

  $(document).on('click', '#intruder-start', async function () {
    const position = $('#intruder-position').val() as string;
    const field = $('#intruder-field').val() as string;
    const ptype = $('#intruder-payload-type').val() as string;
    const concurrent = parseInt($('#intruder-concurrent').val() as string) || 5;

    let payloads: string[];
    if (ptype === '__custom__') {
      payloads = ($('#intruder-custom-payloads').val() as string || '').split('\n').map((l: string) => l.trim()).filter(Boolean);
    } else {
      payloads = getIntruderPayloads(ptype);
    }
    if (!payloads.length) { alert('No payloads'); return; }
    if (!field && (position === 'url-param' || position === 'header')) { alert('Enter a field name'); return; }

    const method = $('#form-method').val() as string;
    let baseUrl = $('#form-url').val() as string;
    const headers = $('#form-headers').val() as string;
    const body = $('#form-body').val() as string;

    $('#intruder-start').prop('disabled', true);
    $('#intruder-stop').show().prop('disabled', false).text('⏹ Stop');
    intruderCancel = false;
    $('#intruder-progress').show();
    clearIntruderResults();
    const results: FuzzResult[] = [];
    const total = payloads.length;
    let completed = 0;

    async function sendPayload(payload: string, idx: number): Promise<void> {
      let targetUrl = baseUrl;
      let targetBody = body;

      if (position === 'url-param') {
        const paramEnc = encodeURIComponent(field);
        const payloadEnc = encodeURIComponent(payload);
        if (targetUrl.indexOf('?' + paramEnc + '=') >= 0 || targetUrl.indexOf('&' + paramEnc + '=') >= 0) {
          targetUrl = targetUrl.replace(new RegExp('([?&])' + paramEnc + '=[^&]*'), '$1' + paramEnc + '=' + payloadEnc);
        } else if (targetUrl.indexOf('?') >= 0) {
          targetUrl += '&' + paramEnc + '=' + payloadEnc;
        } else {
          targetUrl += '?' + paramEnc + '=' + payloadEnc;
        }
      } else if (position === 'url-path') {
        targetUrl = baseUrl.replace(/\/[^/]*$/, '/' + encodeURIComponent(payload));
      } else if (position === 'body') {
        targetBody = body.replace(new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), payload);
      } else if (position === 'json-body-key') {
        const append = ($('#intruder-append').is(':checked'));
        targetBody = replaceJsonKey(body, field, payload, append);
      } else if (position === 'header') {
        const hdrRegex = new RegExp('(' + field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\s*:\\s*[^\\r\\n]+', 'i');
        const hdrReplace = '$1: ' + payload;
        const newHeaders = headers.replace(hdrRegex, hdrReplace);
        // We'll use the original headers and try to inject via fetch
      }

      const startTime = performance.now();
      try {
        const result = await pageFetch(targetUrl, method, headers ? { 'Content-Type': 'application/json' } : undefined, method !== 'GET' ? targetBody : undefined);
        const elapsed = Math.round(performance.now() - startTime);
        results.push({
          method, url: targetUrl, parameter: field, payload,
          status: result.status,
          bodySize: result.body.length,
          responseTime: elapsed,
          diff: result.body.length,
        });
      } catch {
        results.push({
          method, url: targetUrl, parameter: field, payload,
          status: 0, bodySize: 0, responseTime: 0, diff: 0,
        });
      }

      completed++;
      const pct = Math.round(completed / total * 100);
      $('#intruder-progress-text').text(completed + ' / ' + total);
      $('#intruder-progress-pct').text(pct + '%');
      $('#intruder-progress-bar').css('width', pct + '%');
      const hideNoise = $('#intruder-hide-noise').is(':checked');
      const displayResults = hideNoise ? results.filter(r => r.status !== 0 && r.status !== 404 && r.status !== 410) : results;
      $('#intruder-results').html(intruderResultsToHtml(displayResults));
    }

    // Batch concurrent
    for (let i = 0; i < payloads.length && !intruderCancel; i += concurrent) {
      const batch = payloads.slice(i, i + concurrent);
      await Promise.all(batch.map((p, j) => sendPayload(p, i + j)));
    }

    setIntruderResults(results);
    $('#intruder-start').prop('disabled', false).text('\u26A1 Start Attack');
    $('#intruder-stop').hide();
    if (intruderCancel) {
      $('#intruder-progress-text').text('Stopped: ' + completed + ' / ' + total);
    } else {
      $('#intruder-progress-text').text('Done: ' + total + ' / ' + total);
      $('#intruder-progress-bar').css('width', '100%');
    }
  });

  $(document).on('click', '#intruder-export', function () {
    const results = getIntruderResults();
    if (!results.length) { alert('No results to export'); return; }
    let csv = 'Index,Method,URL,Parameter,Payload,Status,Size,Time,Diff\n';
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      csv += (i + 1) + ',' + r.method + ',"' + r.url + '",' + r.parameter + ',"' + r.payload + '",' + r.status + ',' + r.bodySize + ',' + r.responseTime + ',' + r.diff + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'intruder-results.csv';
    a.click();
  });

  $(document).on('click', '#intruder-clear', function () {
    clearIntruderResults();
    $('#intruder-results').empty();
    $('#intruder-progress').hide();
  });

  $(document).on('change', '#intruder-hide-noise', function () {
    const results = getIntruderResults();
    if (!results.length) return;
    const hideNoise = $('#intruder-hide-noise').is(':checked');
    const displayResults = hideNoise ? results.filter(r => r.status !== 0 && r.status !== 404 && r.status !== 410) : results;
    $('#intruder-results').html(intruderResultsToHtml(displayResults));
  });

  // ── Fuzzer ──
  $(document).on('click', '#fuzzer-btn', function () {
    const existingDialog = $('#fuzzer-dialog');
    if (existingDialog.length) { existingDialog.remove(); return; }

    $('body').append(renderFuzzerDialog());
    clearFuzzResults();

    // Auto-detect position + field
    const body = ($('#form-body').val() as string || '').trim();
    let isJson = false;
    try { isJson = !!(body && JSON.parse(body)); } catch { isJson = false; }
    if (isJson) {
      $('#fuzzer-position').val('json-body-key');
      try {
        const obj = JSON.parse(body);
        const keys = Object.keys(obj);
        if (keys.length) $('#fuzzer-param').val(keys[0]);
      } catch { /* ignore */ }
    } else {
      $('#fuzzer-position').val('url-param');
      const url = $('#form-url').val() as string;
      const qIdx = url.indexOf('?');
      if (qIdx >= 0) {
        const qs = url.substring(qIdx + 1);
        const firstParam = qs.split('&')[0]?.split('=')[0] || '';
        $('#fuzzer-param').val(decodeURIComponent(firstParam));
      }
    }

    $('#fuzzer-close').on('click', function () { $('#fuzzer-dialog').remove(); });
  });

  $(document).on('click', '#fuzzer-stop', function () {
    fuzzerCancel = true;
    $('#fuzzer-stop').prop('disabled', true).text('⏹ Stopping...');
  });

  $(document).on('click', '#fuzzer-start', async function () {
    const param = $('#fuzzer-param').val() as string;
    const type = $('#fuzzer-type').val() as string;
    const position = $('#fuzzer-position').val() as string;
    const append = ($('#fuzzer-append').is(':checked'));
    if (!param && position !== 'url-path' && type !== 'subdomain') { alert('Enter a field name'); return; }

    const payloads = getFuzzPayloads(type);
    if (!payloads.length) { alert('No payloads available for selected type'); return; }
    const method = $('#form-method').val() as string;
    let baseUrl = $('#form-url').val() as string;
    const headers = $('#form-headers').val() as string;
    const body = $('#form-body').val() as string;

    // Ensure baseUrl ends with / for url-path position
    if (position === 'url-path' && !baseUrl.endsWith('/')) {
      baseUrl += '/';
    }

    $('#fuzzer-start').prop('disabled', true);
    $('#fuzzer-stop').show().prop('disabled', false).text('⏹ Stop');
    fuzzerCancel = false;
    $('#fuzzer-progress').show();
    clearFuzzResults();
    const results: FuzzResult[] = [];
    const total = payloads.length;

    for (let i = 0; i < payloads.length && !fuzzerCancel; i++) {
      const payload = payloads[i];
      let targetUrl = baseUrl;
      let targetBody = body;

      if (type === 'subdomain') {
        try {
          const urlObj = new URL(baseUrl);
          const parts = urlObj.hostname.split('.');
          if (parts.length >= 2) {
            parts[0] = payload;
          } else {
            parts.unshift(payload);
          }
          urlObj.hostname = parts.join('.');
          targetUrl = urlObj.toString();
        } catch {
          targetUrl = baseUrl;
        }
      } else if (position === 'url-param') {
        const paramEncoded = encodeURIComponent(param);
        if (targetUrl.indexOf('?' + paramEncoded + '=') >= 0 || targetUrl.indexOf('&' + paramEncoded + '=') >= 0) {
          targetUrl = targetUrl.replace(new RegExp('([?&])' + paramEncoded + '=[^&]*'), '$1' + paramEncoded + '=' + encodeURIComponent(payload));
        } else if (targetUrl.indexOf('?') >= 0) {
          targetUrl += '&' + paramEncoded + '=' + encodeURIComponent(payload);
        } else {
          targetUrl += '?' + paramEncoded + '=' + encodeURIComponent(payload);
        }
      } else if (position === 'json-body-key') {
        targetBody = fuzzReplaceJsonKey(body, param, payload, append);
      } else if (position === 'url-path') {
        targetUrl = baseUrl + payload;
      }

      const startTime = performance.now();
      try {
        const result = await pageFetch(targetUrl, method, headers ? { 'Content-Type': 'application/json' } : undefined, method !== 'GET' ? targetBody : undefined);
        const elapsed = Math.round(performance.now() - startTime);

        results.push({
          method, url: targetUrl, parameter: param, payload,
          status: result.status,
          bodySize: result.body.length,
          responseTime: elapsed,
          diff: result.body.length,
        });
      } catch {
        results.push({
          method, url: targetUrl, parameter: param, payload,
          status: 0, bodySize: 0, responseTime: 0, diff: 0,
        });
      }

      const pct = Math.round((i + 1) / total * 100);
      $('#fuzzer-progress-text').text((i + 1) + ' / ' + total);
      $('#fuzzer-progress-pct').text(pct + '%');
      $('#fuzzer-progress-bar').css('width', pct + '%');
      if (i % 5 === 0 || i === total - 1) {
        const hideNoise = $('#fuzzer-hide-noise').is(':checked');
        const displayResults = hideNoise ? results.filter(r => r.status !== 0 && r.status !== 404 && r.status !== 410) : results;
        $('#fuzzer-results').html(fuzzResultsToHtml(displayResults));
      }
    }

    setFuzzResults(results);
    $('#fuzzer-start').prop('disabled', false).text('\u26A1 Start Fuzzing');
    $('#fuzzer-stop').hide();
    if (fuzzerCancel) {
      $('#fuzzer-progress-text').text('Stopped: ' + results.length + ' / ' + total);
    } else {
      $('#fuzzer-progress-text').text('Done: ' + total + ' / ' + total);
      $('#fuzzer-progress-bar').css('width', '100%');
    }
    const hideNoise = $('#fuzzer-hide-noise').is(':checked');
    const displayResults = hideNoise ? results.filter(r => r.status !== 0 && r.status !== 404 && r.status !== 410) : results;
    $('#fuzzer-results').html(fuzzResultsToHtml(displayResults));
  });

  $(document).on('click', '#fuzzer-export-csv', function () {
    const results = getFuzzResults();
    if (!results.length) { alert('No results to export'); return; }
    const csv = fuzzResultsToCsv(results);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fuzzer-results.csv';
    a.click();
  });

  $(document).on('click', '#fuzzer-clear', function () {
    clearFuzzResults();
    $('#fuzzer-results').empty();
    $('#fuzzer-progress').hide();
  });

  $(document).on('change', '#fuzzer-hide-noise', function () {
    const results = getFuzzResults();
    if (!results.length) return;
    const hideNoise = $('#fuzzer-hide-noise').is(':checked');
    const displayResults = hideNoise ? results.filter(r => r.status !== 0 && r.status !== 404 && r.status !== 410) : results;
    $('#fuzzer-results').html(fuzzResultsToHtml(displayResults));
  });

  // ── Repeater ──
  $(document).on('click', '#repeater-btn', function () {
    const existingDialog = $('#repeater-dialog');
    if (existingDialog.length) { existingDialog.remove(); return; }
    $('body').append(renderRepeaterDialog());
    clearRepeaterResults();
    $('#repeater-close').on('click', function () { $('#repeater-dialog').remove(); });
  });

  $(document).on('click', '#repeater-start', async function () {
    const count = parseInt($('#repeater-count').val() as string) || 5;
    const method = $('#form-method').val() as string;
    const url = $('#form-url').val() as string;
    const headers = $('#form-headers').val() as string;
    const body = $('#form-body').val() as string;

    $('#repeater-start').prop('disabled', true).text('Repeating...');
    clearRepeaterResults();
    const results: any[] = [];
    const total = count;

    for (let i = 0; i < count; i++) {
      const startTime = performance.now();
      try {
        const result = await pageFetch(url, method, headers ? { 'Content-Type': 'application/json' } : undefined, method !== 'GET' ? body : undefined);
        const elapsed = Math.round(performance.now() - startTime);
        results.push({ index: i, status: result.status, bodySize: result.body.length, time: elapsed, bodyPreview: result.body.substring(0, 100), url, method });
      } catch {
        results.push({ index: i, status: 0, bodySize: 0, time: 0, bodyPreview: 'Error', url, method });
      }
      setRepeaterResults(results);
      $('#repeater-results').html(repeaterResultsToHtml(results));
      $('#repeater-start').text('Repeating... (' + (i + 1) + '/' + total + ')');
    }
    $('#repeater-start').prop('disabled', false).text('\uD83D\uDD04 Start Repeating');
  });

  $(document).on('click', '#repeater-export-csv', function () {
    const results = getRepeaterResults();
    if (!results.length) { alert('No results to export'); return; }
    const csv = repeaterResultsToCsv(results);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'repeater-results.csv';
    a.click();
  });

  $(document).on('click', '#repeater-clear', function () {
    clearRepeaterResults();
    $('#repeater-results').empty();
  });

  // ── Decoder ──
  $(document).on('click', '#decoder-btn', function () {
    const existingDialog = $('#decoder-dialog');
    if (existingDialog.length) { existingDialog.remove(); return; }
    $('body').append(renderDecoderDialog());

    // Auto-fill with selected response body (full)
    const bodyText = $('#form-body2').val() as string;
    if (bodyText) $('#decoder-input').val(bodyText);

    $('#decoder-close').on('click', function () { $('#decoder-dialog').remove(); });
    $('#decoder-detect').on('click', function () {
      const input = $('#decoder-input').val() as string;
      const results = detectAndDecode(input);
      $('#decoder-output').html(decodersToHtml(results) || '<div style="color:#888;padding:8px">No encodings detected</div>');
    });
    $('#decoder-jwt').on('click', function () {
      const input = ($('#decoder-input').val() as string || '').trim();
      const tokens = findJWTInText(input);
      if (tokens.length) {
        let html = '';
        for (const t of tokens) {
          const prettyHeader = syntaxHighlightJSON(JSON.stringify(t.header, null, 2));
          const prettyPayload = syntaxHighlightJSON(JSON.stringify(t.payload, null, 2));
          html += '<div style="margin:4px 0;padding:4px;background:#16213e;border-radius:3px">';
          html += '<div style="color:#ffd700;font-weight:bold;margin-bottom:4px">\uD83D\uDD12 JWT (' + t.alg + ')</div>';
          html += '<div style="font-size:10px;color:#888;word-break:break-all;margin-bottom:4px">' + t.raw.substring(0, 80) + '...</div>';
          html += '<details style="font-size:11px;margin-top:2px"><summary style="cursor:pointer;color:#888">Header</summary><pre style="margin:2px 0;padding:4px;background:#0f0f23;border-radius:3px;font-size:10px;overflow-x:auto">' + prettyHeader + '</pre></details>';
          html += '<details style="font-size:11px;margin-top:2px"><summary style="cursor:pointer;color:#888">Payload</summary><pre style="margin:2px 0;padding:4px;background:#0f0f23;border-radius:3px;font-size:10px;overflow-x:auto">' + prettyPayload + '</pre></details>';
          if (t.issues.length) {
            for (const issue of t.issues) {
              html += '<div style="color:#ffaa00;font-size:10px;margin-top:2px">\u26A0 ' + issue + '</div>';
            }
          }
          html += '</div>';
        }
        $('#decoder-output').html(html);
      } else {
        $('#decoder-output').html('<div style="color:#888;padding:8px">No JWT tokens found</div>');
      }
    });
    $('#decoder-base64').on('click', function () {
      try {
        const decoded = atob(($('#decoder-input').val() as string || '').trim());
        $('#decoder-output').html('<div style="color:#7ab7ef;font-weight:bold">Base64 Decoded:</div><pre style="background:#0f0f23;padding:4px;color:#eee;font-size:11px;word-break:break-all">' + decoded.substring(0, 500) + '</pre>');
      } catch { $('#decoder-output').html('<div style="color:#ff4444">Invalid Base64 input</div>'); }
    });
    $('#decoder-url').on('click', function () {
      try {
        const decoded = decodeURIComponent($('#decoder-input').val() as string || '');
        $('#decoder-output').html('<div style="color:#7ab7ef;font-weight:bold">URL Decoded:</div><pre style="background:#0f0f23;padding:4px;color:#eee;font-size:11px;word-break:break-all">' + decoded.substring(0, 500) + '</pre>');
      } catch { $('#decoder-output').html('<div style="color:#ff4444">Invalid URL encoding</div>'); }
    });
    $('#decoder-hex').on('click', function () {
      try {
        const hex = ($('#decoder-input').val() as string || '').replace(/\s/g, '');
        if (/^[0-9A-Fa-f]+$/.test(hex) && hex.length % 2 === 0) {
          const decoded = hex.match(/.{2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || '';
          $('#decoder-output').html('<div style="color:#7ab7ef;font-weight:bold">Hex Decoded:</div><pre style="background:#0f0f23;padding:4px;color:#eee;font-size:11px;word-break:break-all">' + decoded.substring(0, 500) + '</pre>');
        } else {
          $('#decoder-output').html('<div style="color:#ff4444">Invalid hex input</div>');
        }
      } catch { $('#decoder-output').html('<div style="color:#ff4444">Invalid hex input</div>'); }
    });
  });

  // ── Shortcuts modal ──
  $(document).on('click', '#shortcuts-btn', function () {
    $('#shortcuts-modal').toggle();
  });
  $(document).on('click', '#shortcuts-close', function () {
    $('#shortcuts-modal').hide();
  });

  // ── Clickable result rows (Burp-style: click to load into editor) ──
  $(document).on('dblclick', '.fuzz-result-row', function (this: HTMLElement) {
    const url = $(this).data('url') as string;
    const method = $(this).data('method') as string;
    if (url) {
      $('#form-method').val(method || 'GET');
      $('#form-url').val(url);
      autosize.update($('#form-url'));
      $('#form-status').val('');
      $('#form-headers2').val('');
      $('#form-body2').val('');
    }
  });

  $(document).on('dblclick', '.repeater-result-row', function (this: HTMLElement) {
    const url = $(this).data('url') as string;
    const method = $(this).data('method') as string;
    if (url) {
      $('#form-method').val(method || 'GET');
      $('#form-url').val(url);
      autosize.update($('#form-url'));
    }
  });

  // ── Interceptor ──
  setOnQueueChange(renderInterceptQueue);
  renderInterceptQueue();
  setOnRequestProcessed((req, action) => {
    const entry: CapturedEntry = {
      request: {
        method: req.method,
        url: req.url,
        headers: Array.isArray(req.headers) ? req.headers : [],
        postData: req.postData ? { text: req.postData } : undefined,
      },
      response: {
        status: action === 'forwarded' ? -1 : 0,
        statusText: action === 'forwarded' ? 'Forwarded' : 'Dropped',
        headers: [],
        bodySize: 0,
      },
      time: 0,
    };
    onData(entry);
  });

  $(document).on('click', '#intercept-btn', function () {
    try {
      const $btn = $(this);
      if (!isInterceptorAttached()) {
        let tabId: number;
        try {
          tabId = chrome.devtools.inspectedWindow.tabId;
        } catch (e: any) {
          console.error('[SpyKit] Cannot access inspectedWindow:', e.message);
          alert('[SpyKit] Extension context was invalidated.\n\nPlease close and reopen DevTools to continue using the Interceptor.');
          return;
        }
        $btn.text('\u23F3 Attaching...').prop('disabled', true);
        attachInterceptor(tabId, (success) => {
          if (success) {
            toggleIntercept(true);
            $btn.toggleClass('active', true).text('\u23F8 Intercept').prop('disabled', false);
            $('#intercept-panel').show();
            updateFilterFixedTop();
          } else {
            $btn.text('\u23F8 Intercept').prop('disabled', false);
            if (chrome.runtime.lastError?.message?.includes('Extension context invalidated')) {
              alert('[SpyKit] Extension was reloaded.\n\nPlease close and reopen DevTools, then try again.');
            } else {
              alert(
                '[SpyKit] Could not attach debugger.\n\n' +
                'To use Intercept:\n' +
                '1. Close DevTools\n' +
                '2. Go to chrome://extensions\n' +
                '3. Enable "Developer mode"\n' +
                '4. Click "Service Worker" for SpyKit\n' +
                '5. Check the console for errors\n' +
                '6. Reload the extension\n' +
                '7. Reopen DevTools and try again\n\n' +
                'If the issue persists, try restarting the browser.'
              );
            }
          }
        });
        return;
      }
      const enable = !isInterceptEnabled();
      toggleIntercept(enable);
      $btn.toggleClass('active', enable);
      if (enable && getInterceptedQueue().length === 0) {
        $('#intercept-panel').show();
      }
      if (!enable && getInterceptedQueue().length === 0) {
        $('#intercept-panel').hide();
      }
      updateFilterFixedTop();
    } catch (e: any) {
      if (e.message && e.message.includes('Extension context invalidated')) {
        alert('[SpyKit] Extension was reloaded. Please close and reopen DevTools to continue.');
      } else {
        console.error('[SpyKit] intercept-btn error:', e);
      }
    }
  });

  $(document).on('click', '#intercept-forward-all', forwardAllRequests);
  $(document).on('click', '#intercept-drop-all', dropAllRequests);

  $(document).on('click', '.intercept-forward', function (e) {
    e.stopPropagation();
    const id = parseInt($(this).attr('data-id') as string);
    forwardRequest(id);
  });

  $(document).on('click', '.intercept-drop', function (e) {
    e.stopPropagation();
    const id = parseInt($(this).attr('data-id') as string);
    dropRequest(id);
  });

  $(document).on('click', '.intercept-item', function () {
    const id = parseInt($(this).attr('data-id') as string);
    if (isNaN(id)) return;
    const queue = getInterceptedQueue();
    const req = queue.find(r => r.id === id);
    if (!req) return;
    console.log('[SpyKit] .intercept-item clicked, req:', req);
    $('#intercept-edit-id').val(String(id));
    $('#intercept-edit-url').val(req.url);
    $('#intercept-edit-method').val(req.method);
    const headers = req.headers || [];
    const hdrStr = Array.isArray(headers) ? headers.map(h => h.name + ': ' + h.value).join('\n') : '';
    $('#intercept-edit-headers').val(hdrStr);
    $('#intercept-edit-body').val(req.postData || '');
    $('#intercept-edit-overlay').show();
  });

  $(document).on('click', '#intercept-edit-close, #intercept-edit-cancel', function () {
    $('#intercept-edit-overlay').hide();
  });

  $(document).on('click', '#intercept-edit-forward', function () {
    const id = parseInt($('#intercept-edit-id').val() as string);
    const url = $('#intercept-edit-url').val() as string;
    const method = $('#intercept-edit-method').val() as string;
    const headers = $('#intercept-edit-headers').val() as string;
    const body = $('#intercept-edit-body').val() as string;
    console.log('[SpyKit] #intercept-edit-forward clicked:', { id, url, method, headers, body });
    editAndForwardRequest(id, url, method, headers, body);
    $('#intercept-edit-overlay').hide();
  });

  $(document).on('click', '#intercept-edit-drop', function () {
    const id = parseInt($('#intercept-edit-id').val() as string);
    dropRequest(id);
    $('#intercept-edit-overlay').hide();
  });
}

function updateFilterFixedTop(): void {
  const panelHeight = $('#intercept-panel').is(':visible') ? $('#intercept-panel').outerHeight() || 0 : 0;
  $('.filter.fixed').css('top', 32 + panelHeight);
}

function renderInterceptQueue(): void {
  const queue = getInterceptedQueue();
  const $container = $('#intercept-queue');
  const $panel = $('#intercept-panel');

  if (queue.length === 0) {
    if (!isInterceptEnabled()) {
      $panel.hide();
    }
    $container.empty();
    $('#intercept-count').text('0');
    updateFilterFixedTop();
    return;
  }

  $panel.show();
  $('#intercept-count').text(queue.length);

  const now = Date.now();
  let html = '';
  for (const req of queue) {
    const ago = Math.round((now - req.timestamp) / 1000);
    const timeStr = ago < 60 ? ago + 's' : Math.round(ago / 60) + 'm';
    html += '<div class="intercept-item" data-id="' + req.id + '">';
    html += '<span class="method ' + req.method + '">' + req.method + '</span>';
    html += '<span class="url" title="' + escapeHtml(req.url) + '">' + escapeHtml(truncateUrl(req.url)) + '</span>';
    html += '<span class="time">' + timeStr + '</span>';
    html += '<span class="actions">';
    html += '<button class="btn btn-xs btn-success intercept-forward" data-id="' + req.id + '">Fwd</button>';
    html += '<button class="btn btn-xs btn-danger intercept-drop" data-id="' + req.id + '">Drop</button>';
    html += '</span>';
    html += '</div>';
  }
  $container.html(html);
  updateFilterFixedTop();
}

$(document).on('keydown', '#intercept-edit-overlay', function (e) {
  if (e.key === 'Escape') {
    $('#intercept-edit-overlay').hide();
  }
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length + (u.search ? u.search.length : 0);
    if (path > 80) return u.origin + u.pathname.substring(0, 40) + '...' + u.pathname.slice(-20) + u.search;
    return url;
  } catch {
    return url.length > 100 ? url.substring(0, 97) + '...' : url;
  }
}
