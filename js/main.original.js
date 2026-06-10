/*!
 * SpyKit
 * Copyright 2017, Sergey Gurin
 */

var rows = {
		clear: '×',
		pin: '☆',
		method: ['Method'],
        time: ['&nbsp; &nbsp; Time'],
        size: ['&nbsp; &nbsp; Size'],
        type: ['&nbsp; Type'],
        status: ['Status'],
        url: ['URL'],
	},

    $body = undefined,
    $scrollUp = undefined,
    $scrollUpClass = undefined,
    $scrollUpSpan = undefined,
    $requests = undefined,
    $formUrl = undefined,
    $formHeaders = undefined,
    $formHeaders2 = undefined,
    $formBody = undefined,
    $formBody2 = undefined,
    $formLabelBody2 = undefined,
    $formBody2Image = undefined,
    $details = undefined,
    $splitArea = undefined,
    $formMethodClear = undefined,
    $formStatusClear = undefined,
    $formTimeClear = undefined,

    contentScriptLoaded = false,

    largeContent = undefined,
    largeContentEncoding = undefined,

    splitter = undefined,
    splitRatio = -1,
    splitDir = undefined,
	values = {
		requests: {},
		filters: [],
		filters_str: '',
		searchQuery: '',
		searchRegex: false,
		restHistory: [],
		envs: {default: {}},
		envName: 'default',
		showPinned: false,
		page: 0,
		pageSize: 200
	},
	ROW_HEIGHT = 24,
    FORBIDEN_HEADERS_STARTS_WITH = [
        'proxy-',
        'sec-',
        ':'
    ],
    FORBIDEN_HEADERS = [
        'accept-charset',
        'accept-encoding',
        'access-control-request-headers',
        'access-control-request-method',
        'cache-control',
        'connection',
        'content-length',
        'cookie',
        'cookie2',
        'date',
        'dnt',
        'expect',
        'host',
        'keep-alive',
        'origin',
        'pragma',
        'referer',
        'te',
        'trailer',
        'transfer-encoding',
        'upgrade',
        'user-agent',
        'via'
    ],
    dialogOpened = false,
	selected = undefined,

    bodySearchTerm = '',
    bodySearchMatches = [],
    bodySearchCurrent = -1;

function getRequestText(data) {
    var text = '';
    if (!data) return text;
    text += (data.request && data.request.method) || '';
    text += (data.request && data.request.url) || '';
    text += (data.response && data.response.status) || '';
    if (data.request && data.request.headers) {
        for (var i = 0; i < data.request.headers.length; i++) {
            text += (data.request.headers[i].name || '') + (data.request.headers[i].value || '');
        }
    }
    if (data.request && data.request.postData) {
        var pd = data.request.postData;
        text += (pd.text || pd) + '';
    }
    if (data.response && data.response.headers) {
        for (var i = 0; i < data.response.headers.length; i++) {
            text += (data.response.headers[i].name || '') + (data.response.headers[i].value || '');
        }
    }
    if (data.response && data.response.content) {
        var ct = data.response.content;
        text += (ct.text || JSON.stringify(ct) || '');
    }
    return text.toLowerCase();
}

$(function() {

    console.log('main script loaded for tab ', chrome.devtools.inspectedWindow.tabId);

    $body = $('body');
    $scrollUp = $('#scroll-up');
    $scrollUpClass = $('.scroll-up');
    $scrollUpSpan = $('.scroll-up>span');
    $requests = $('.requests');
    $formUrl = $('#form-url');
    $formHeaders = $('#form-headers');
    $formHeaders2 = $('#form-headers2');
    $formBody = $('#form-body');
    $formBody2 = $('#form-body2');
    $formLabelBody2 = $('#form-label-body2');
    $formBody2Image = $('#form-body2-image');
    $details = $('.details');
    $splitArea = $('.split-area');
    $formMethodClear = $('.form-method-clear');
    $formStatusClear = $('.form-status-clear');
    $formTimeClear = $('.form-time-clear');

	var a;

	var filter = $('.filter');
	var first = true;
	for (a in rows) {

		$('.filter-rows').append(
			$('<label/>')
				.addClass('control-label col-lg-1 checkbox')
				.append(
					$('<input/>')
						.attr({
							'type': 'checkbox',
							'name': a,
							'value': '1',
							'checked': true
						})
				)
				.append( typeof rows[a] == 'object' ? rows[a][0] : rows[a] )
		);

		filter.append(
			$('<div/>')
				.addClass('filter-' + a)
		);

		if (typeof rows[a] == 'object') {

			$('.filter-' + a).html(

				$('<div/>')
					.addClass('btn-group clickable')
					.append(
						$('<span/>')
							.html(rows[a][0])
                            .attr({
                                'data-toggle': 'dropdown'
                            })
							.append('<small>▼</small>')
                    )
					.append(
						$('<ul/>')
							.addClass('dropdown-menu dropdown-menu-form')
							.attr('role', 'menu')
							.attr('id', a)
							.append(
								$('<li/>')
									.addClass('checkbox')
									.append(
										$('<label/>')
											.append(
												$('<input/>')
													.attr({
														'type': 'checkbox',
														'name': 'all',
														'val': 'all',
														'checked': true
													})
											)
											.append('All')
											// .append(
											// 	$('<span/>')
											// 		.attr('id', 'badge-' + a)
											// 		.addClass('badge badge-empty badge-right')
											// 		.html('0')
                                            //    )
									)
							)
					)
			);


		} else {

            if (!first) {

            	$('.filter-' + a).html(
					$('<div/>')
						.addClass('btn-group')
						.append(
							$('<span/>')
								.append(
									rows[a]
								)
						)
				);

            } else {

                $('.filter-' + a).html(
                    $('<div/>')
                        .addClass('btn-group clickable')
                        .append(
                            $('<span/>')
                                .append(
                                    rows[a]
                                )

                        )
                );

            }
		}

        first = false;
	}

	filter.append(
		$('<div/>')
			.addClass('filter-empty')
	);


	var filter_fixed = filter.clone();

	filter.after( filter_fixed );
	filter_fixed.addClass('fixed');

    filter_add_item('time', '0', 'fast', true);
    filter_add_item('time', '500', '> 500 ms', true);
    filter_add_item('time', '1000', '> 1000 ms', true);

    filter_add_item('size', '0', 'small', true);
    filter_add_item('size', '100', '> 100 k', true);
    filter_add_item('size', '1m', '> 1 m', true);

    $(document).on('click', '.dropdown-menu.dropdown-menu-form', function(e) {
        e.stopPropagation();
    });

    $(document).on('click', '.details .other-controls label', function(e) {
        e.stopPropagation();
        e.preventDefault();

        var label = $(this);
        var id = label.attr('for');
        if (!id) return;
        var edit = $('#' + id);
        var isVisible = edit.is(':visible');
        edit.slideToggle();
        $('#' + id + '-preview').slideToggle();
        label.find('.collapse-icon').text(isVisible ? '+' : '−');
    });

    $(document).on('click', 'input[name="filter"]', function() {

        var block = $(this).parents('.dropdown-menu'),
            button = block.prev(),
            sel = '.' + $(this).val();

        $('input[name="all"]', block).prop('checked',
            $('input[name="filter"]', block).length == $('input[name="filter"]:checked', block).length
        );

        var checked = $(this).prop('checked');

        if ($('input[name="all"]', block).prop('checked')) {

            $('input[name="filter"]', block).each(function() {

                var a = values.filters.indexOf( sel );

                if (a >= 0)
                    values.filters.splice(a, 1);

            });

            button.removeClass('active');

        } else {

            button.addClass('active');

            if (checked) {

                var a = values.filters.indexOf( sel );

                if (a >= 0)
                    values.filters.splice(a, 1);

            } else {
                values.filters.push( sel );
            }
        }

        values.filters = $.grep(values.filters, function(v, k){
            return $.inArray(v, values.filters) === k;
        });

        values.page = 0;
        applyFilters();
    });


    $(document).on('click', 'input[name="all"]', function() {

        var block = $(this).parents('.dropdown-menu');

        if ($(this).prop('checked')) {
            $('input[name="filter"]:not(:checked)', block).trigger('click');
        } else {
            $('input[name="filter"]:checked', block).trigger('click');
        }

    });

    function applyFilters() {
        var q = values.searchQuery;
        $('.req').each(function() {
            var $row = $(this);
            var match = true;
            if (q) {
                var id = parseInt($row.attr('id'));
                var data = values.requests[id];
                if (data) {
                    var text = getRequestText(data);
                    if (values.searchRegex) {
                        try {
                            match = new RegExp(q, 'i').test(text);
                        } catch(e) { match = false; }
                    } else {
                        match = text.indexOf(q) >= 0;
                    }
                } else {
                    var text = $row.find('td.url, td.method, td.status, td.type').text().toLowerCase();
                    if (values.searchRegex) {
                        try {
                            match = new RegExp(q, 'i').test(text);
                        } catch(e) { match = false; }
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
            values.filters_str = values.filters.join(", ");
            $('.req:not(.search-hidden):not(.pinned-hidden)').show().filter(values.filters_str).hide();
            $('.search-hidden').hide();
        } else {
            values.filters_str = '';
            $('.req:not(.pinned-hidden)').show();
            $('.search-hidden').hide();
        }
        applyPagination();
    }

    function applyPagination() {
        var visible = $('.req:visible').not('.pagination-hidden').toArray();
        var total = visible.length;
        var start = values.page * values.pageSize;
        var end = start + values.pageSize;
        $('.req.pagination-hidden').removeClass('pagination-hidden');
        for (var i = 0; i < visible.length; i++) {
            if (i < start || i >= end) {
                $(visible[i]).addClass('pagination-hidden').hide();
            }
        }
        var totalPages = Math.ceil(total / values.pageSize) || 1;
        if (totalPages > 1) {
            $('#page-controls').show();
            $('#page-info').text('Page ' + (values.page + 1) + ' of ' + totalPages + ' (' + total + ' requests)');
            $('#page-prev').prop('disabled', values.page === 0);
            $('#page-next').prop('disabled', values.page >= totalPages - 1);
        } else {
            $('#page-controls').hide();
        }
    }

    $(document).on('click', '#page-prev', function() {
        if (values.page > 0) { values.page--; applyFilters(); }
    });
    $(document).on('click', '#page-next', function() {
        values.page++;
        applyFilters();
    });

    function doSearch() {
        values.searchQuery = $('#search-requests').val();
        values.searchRegex = $('#search-regex').is(':checked');
        if (!values.searchRegex) values.searchQuery = values.searchQuery.toLowerCase();
        values.page = 0;
        applyFilters();
    }

    $(document).on('input', '#search-requests', doSearch);
    $(document).on('change', '#search-regex', doSearch);

    // Toggle pinned filter on header star click
    $(document).on('click', '.filter-pin', function() {
        values.showPinned = !values.showPinned;
        values.page = 0;
        $(this).toggleClass('active');
        applyFilters();
    });

    $('.filter-clear').bind('click', function () {

        largeContent = undefined;

        values.requests = {};
        values.searchQuery = '';
        values.showPinned = false;
        values.page = 0;
        $('.filter-pin').removeClass('active');
        $('#search-requests').val('');

        $('.req').remove();

        $('.badge-right').html('');

        $body.scrollTop(0);

        // checkScroll();

    });

    $body.on({
        scroll: function (e) {
            // scrollTop = $body.get(0).scrollTop;
            checkScroll(e.currentTarget.scrollTop);
        }
    });

    $(window).on({
		load: function() {

            splitCheck();
            checkScroll(0);
            detailsSizeCheck();

		},
		resize: function() {

		    splitCheck();
		    // checkScroll();
		    detailsSizeCheck();

		}
	});

    $(document).on('click', '#scroll-up', function() {

    	$body.scrollTop(0);

    });

    $(document).on('click', '#form-cancel', function() {

        if ($('#form-status').val() === 'pending') {

            $('#form-cancel').html('Cancel').addClass('btn-default').removeClass('btn-danger');
            $('#form-send').prop('disabled', false).removeClass('spin');
            $('#form-status')
                .val('canceled')
                .removeClass('blink')
                .removeClass('ok')
                .addClass('error');

            return;
        }

        clearBodyHighlights();
        dialogOpened = false;
        largeContent = undefined;

        $splitArea
            .animate({opacity: 0}, 100, 'swing', function () {
                $splitArea.hide();
            });

        if (selected) {
            selected.find('.clear')
                .addClass('visited')
                .html('✓');
        }
        selected = undefined;

        $('#new-request').stop().show();

        detailsSizeCheck();
    });

    $(document).on('click', '#form-send', function() {

    	try {

			var method = $('#form-method').val();
            var url = resolveEnvVars($formUrl.val());

            if (!url || url.trim().length < 1) {
                $formUrl.focus();
                return;
            }

            var headers = strToHeaders(resolveEnvVars($formHeaders.val()));
            var validHeaders = {};
            for (var i = 0; i < headers.length; i++) {
                if (!headers[i].name) continue;
                var lower = headers[i].name.toLowerCase();
                if (lower === 'cookie' || lower === 'cookie2') continue;
                var forbidden = false;
                for (var k = 0; k < FORBIDEN_HEADERS.length; k++) {
                    if (lower === FORBIDEN_HEADERS[k]) { forbidden = true; break; }
                }
                if (forbidden) continue;
                for (var k = 0; k < FORBIDEN_HEADERS_STARTS_WITH.length; k++) {
                    if (lower.substring(0, FORBIDEN_HEADERS_STARTS_WITH[k].length) === FORBIDEN_HEADERS_STARTS_WITH[k]) { forbidden = true; break; }
                }
                if (forbidden) continue;
                validHeaders[headers[i].name] = headers[i].value;
            }

            var body = $formBody.val();
            var id = Math.round(1000000 * Math.random());
            $('#form-id').val(id);
            $formHeaders2.val('');
            autosize.update($formHeaders2);
            $formBody2.val('').show();
            autosize.update($formBody2);
            $formBody2Image.html('');
            $formLabelBody2
                .attr('for', 'form-body2')
                .text('Answer body:');

            var code = [
                '(async function(){',
                'try{',
                'var r=await fetch(' + JSON.stringify(url) + ',{',
                'method:' + JSON.stringify(method) + ',',
                'headers:' + JSON.stringify(validHeaders) + ',',
                'body:' + (body ? JSON.stringify(body) : 'undefined'),
                '});',
                'var t=await r.text();',
                'var h=[];',
                'r.headers.forEach(function(v,k){h.push({name:k,value:v});});',
                'chrome.runtime.sendMessage({spyId:' + JSON.stringify(id) + ',url:r.url,res:"ok",status:r.status,headers:h,body:t});',
                '}catch(e){',
                'chrome.runtime.sendMessage({spyId:' + JSON.stringify(id) + ',url:"",res:"fail"});',
                '}',
                '})()'
            ].join('');

			var onResult = function (res, e) {
                if (e && e.isError) {
                    $('#form-status')
                        .val('error')
                        .removeClass('blink')
                        .removeClass('ok')
                        .addClass('error');
                }
            };

            $('#form-cancel').html('Abort').removeClass('btn-default').addClass('btn-danger');
            $('#form-send').prop('disabled', true).addClass('spin');
            $('#form-status')
                .val('pending')
                .addClass('blink')
                .removeClass('ok')
                .removeClass('error');

            if (chrome.devtools) {
                chrome.devtools.inspectedWindow.eval(code, {useContentScriptContext: contentScriptLoaded}, onResult);
            } else {
                eval(code);
                onResult();
            }

        } catch (e) {
    		log(e.message);
		}

    });

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function clearBodyHighlights() {
        $('.body-highlight-overlay').remove();
        $('.has-body-highlight').css('color', '').removeClass('has-body-highlight');
    }

    function highlightBodyText($ta, term) {
        var ta = $ta[0];
        if (!ta || !ta.value || !term) return;

        var text = ta.value;
        var lowerText = text.toLowerCase();
        var lowerTerm = term.toLowerCase();
        var html = '';
        var lastIdx = 0;
        var idx = 0;

        while ((idx = lowerText.indexOf(lowerTerm, idx)) >= 0) {
            html += escapeHtml(text.substring(lastIdx, idx));
            html += '<mark class="body-highlight">' + escapeHtml(text.substring(idx, idx + term.length)) + '</mark>';
            idx += term.length;
            lastIdx = idx;
        }
        html += escapeHtml(text.substring(lastIdx));

        var $parent = $ta.parent();
        $parent.css('position', 'relative');

        var overlay = $('<div class="body-highlight-overlay"></div>').html(html);

        var taStyles = window.getComputedStyle(ta);
        var pos = $ta.position();

        overlay.css({
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            width: $ta.outerWidth(),
            height: $ta.outerHeight(),
            padding: taStyles.padding,
            fontSize: taStyles.fontSize,
            fontFamily: taStyles.fontFamily,
            lineHeight: taStyles.lineHeight,
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            pointerEvents: 'none',
            color: '#ccc',
            background: 'transparent',
            border: 'none',
            wordWrap: 'break-word',
            boxSizing: 'border-box'
        });

        $parent.append(overlay);
        $ta.css('color', 'transparent').addClass('has-body-highlight');

        ta.addEventListener('scroll', function syncScroll() {
            overlay.scrollTop = ta.scrollTop;
        });
    }

    function runBodySearch() {
        var term = $('#search-body').val();
        bodySearchTerm = term;
        bodySearchMatches = [];

        clearBodyHighlights();

        if (!term) {
            $('#body-search-count').text('');
            return;
        }

        function searchTextarea($ta, label) {
            var ta = $ta[0];
            if (!ta || !ta.value) return;
            var lowerVal = ta.value.toLowerCase();
            var lowerTerm = term.toLowerCase();
            var idx = 0;
            while ((idx = lowerVal.indexOf(lowerTerm, idx)) >= 0) {
                bodySearchMatches.push({textarea: ta, pos: idx, label: label});
                idx += term.length;
            }
        }

        searchTextarea($formBody, 'Request body');
        searchTextarea($formBody2, 'Answer body');

        if (bodySearchMatches.length > 0) {
            highlightBodyText($formBody, term);
            highlightBodyText($formBody2, term);
            bodySearchCurrent = 0;
            highlightBodySearch(0);
            scrollToFirstSearchMatch();
        } else {
            bodySearchCurrent = -1;
            $('#body-search-count').text('No matches');
        }
    }

    function scrollToFirstSearchMatch() {
        if (bodySearchMatches.length > 0) {
            var m = bodySearchMatches[0];
            var $ta = $(m.textarea);
            var lineHeight = parseFloat($ta.css('line-height')) || 15;
            var lines = m.textarea.value.substring(0, m.pos).split('\n').length;
            $ta.prop('scrollTop', (lines - 1) * lineHeight - 20);
            var $panel = $ta.closest('.form-group');
            if ($panel.length) {
                var panelTop = $panel.position().top + $('.details').scrollTop();
                $('.details').animate({scrollTop: panelTop - 60}, 100);
            }
        }
    }

    $(document).on('keydown', '#search-body', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            if (bodySearchMatches.length === 0 || $('#search-body').val() !== bodySearchTerm) {
                runBodySearch();
            } else {
                bodySearchCurrent = (bodySearchCurrent + 1) % bodySearchMatches.length;
                highlightBodySearch(bodySearchCurrent);
            }
        }
    });

    $(document).on('click', '#body-search-btn', function() {
        runBodySearch();
    });

    function highlightBodySearch(index) {
        var match = bodySearchMatches[index];
        if (!match) return;
        var textarea = match.textarea;
        var pos = match.pos;
        $('#body-search-count').text(match.label + ' ' + (index + 1) + '/' + bodySearchMatches.length);
        textarea.focus();
        textarea.selectionStart = pos;
        textarea.selectionEnd = pos + bodySearchTerm.length;
        textarea.scrollTop = textarea.scrollHeight * (pos / textarea.value.length) - 50;
    }

    // Create a connection to the background page
    try {

        var backgroundPageConnection = chrome.runtime.connect({
            name: "spy"
        });

        backgroundPageConnection.postMessage({
            name: 'init',
            tabId: chrome.devtools.inspectedWindow.tabId
        });


        // message from background code
        chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

            if (!message.spyId && !message.res) {
                return;
            }

            contentScriptLoaded = true;

            if ($('#form-id').val() === message.spyId) {

                $('#form-cancel').html('Cancel').addClass('btn-default').removeClass('btn-danger');
                $('#form-send').prop('disabled', false).removeClass('spin');

                if (message.res === 'fail') {
                    $('#form-status')
                        .val('error')
                        .removeClass('blink')
                        .removeClass('ok')
                        .addClass('error');
                }

                if (message.url) {
                    $formUrl.val(message.url);
                }

                if (message.status) {
                    $('#form-status')
                        .val(message.status)
                        .removeClass('blink')
                        .addClass(message.status >= 200 && message.status < 300 ? 'ok' : 'error');
                    $('.hint').css({display: message.status !== 200 ? 'block' : 'none'});
                    $('#hint').html(getStatusHint(message.status));
                }

                if (message.headers) {
                    $formHeaders2.val(headersToStr(message.headers));
                    autosize.update($formHeaders2);
                }

                if (message.body) {
                    $formBody2.val(format(message.body));
                    autosize.update($formBody2);
                }
            }
        });

    } catch (e) {}

    $('#new-request').on('click', function() {

       editRequest($('<tr id="-1"/>'));

    });

    function syntaxHighlightJson(str) {
        if (!str) return '';
        try {
            var obj = typeof str === 'string' ? JSON.parse(str) : str;
            str = JSON.stringify(obj, null, 2);
        } catch(e) { return escapeHtml(str); }
        str = escapeHtml(str);
        return str.replace(
            /("(?:[^"\\]|\\.)*")\s*:/g,
            '<span class="syn-key">$1</span>:'
        ).replace(
            /"((?:[^"\\]|\\.)*)"/g,
            '<span class="syn-string">"$1"</span>'
        ).replace(
            /\b(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/gi,
            '<span class="syn-number">$1</span>'
        ).replace(
            /\b(true|false|null)\b/gi,
            '<span class="syn-bool">$1</span>'
        );
    }

    function toCurl(data) {
        if (!data || !data.request) return '';
        var r = data.request;
        var parts = ['curl'];
        if (r.method && r.method !== 'GET') {
            parts.push('  -X ' + r.method);
        }
        if (r.headers) {
            for (var i = 0; i < r.headers.length; i++) {
                var h = r.headers[i];
                if (!h.name || !h.value) continue;
                var n = h.name.toLowerCase();
                if (n[0] === ':' || n === 'accept-encoding' || n === 'content-length' || n === 'connection') continue;
                parts.push('  -H "' + h.name + ': ' + h.value.replace(/["\\]/g, '\\$&') + '"');
            }
        }
        if (r.postData) {
            var body = typeof r.postData.text === 'string' ? r.postData.text : JSON.stringify(r.postData);
            parts.push('  --data-binary \'' + body.replace(/'/g, "'\\''") + '\'');
            parts.push('  --compressed');
        } else {
            parts.push('  --compressed');
        }
        parts.push('  "' + (r.url || '').replace(/["\\]/g, '\\$&') + '"');
        return parts.join(' \\\n');
    }

    $(document).on('click', '#copy-curl-btn', function() {
        var format = $('#copy-format').val();
        var id = $('#form-id').val();
        var data = (id > 0) ? values.requests[id] : null;
        if (!data) {
            data = {
                request: {
                    method: $('#form-method').val(),
                    url: $formUrl.val(),
                    headers: strToHeaders($formHeaders.val()),
                    postData: $formBody.val() ? {text: $formBody.val()} : null
                }
            };
        }
        var code = format === 'curl' ? toCurl(data) : genSnippets(data, format);
        if (code) {
            try {
                navigator.clipboard.writeText(code).then(function() {
                    $('#copy-curl-btn').text('Copied!');
                    setTimeout(function() { $('#copy-curl-btn').text('Copy'); }, 2000);
                });
            } catch(e) {
                var ta = document.createElement('textarea');
                ta.value = code;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                $('#copy-curl-btn').text('Copied!');
                setTimeout(function() { $('#copy-curl-btn').text('Copy'); }, 2000);
            }
        }
    });

    $(document).on('click', '.req', function() {

        clearBodyHighlights();
        editRequest($(this));

    });

    autosize($('textarea'));

    splitCheck();

	$(document).on('click', 'a', function(e) {

		e.stopPropagation();
	});

	for(var i = 0; i < $('table').outerHeight()/ROW_HEIGHT; i++) {
        $requests.prepend($('<tr/>').attr('colspan', 10).prepend($('<td>&nbsp;</td>')));
    }

    if (chrome.devtools) {
		chrome.devtools.network.getHAR(function(log) {
            for (i in log.entries) {
                onData(log.entries[i]);
            }
            });
                chrome.devtools.network.onRequestFinished.addListener(onData);
    } else {
        var mock1 = [
            {pageref: 1, "startedDateTime":"2017-11-08T12:16:05.017Z","time":481.00678200220864,"request":{"method":"GET","url":"https://p5-vc35z6erpnux2-p7ojmh3b6sz7tts2-735738-i1-v6exp3.ds.metric.gstatic.com/v6exp3/6.gif","httpVersion":"http/2.0","headers":[{"name":"Referer","value":"https://www.google.nl/_/chrome/newtab?espv=2&ie=UTF-8"},{"name":"User-Agent","value":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.75 Safari/537.36"}],"queryString":[],"cookies":[],"headersSize":-1,"bodySize":0},"response":{status: 403, headers:[{name: 'content-length', value: 100}], content: '{"mimeType":"application/json","text":"{\n  \"fleet_id\": \"4971b022-1826-4600-bf46-f6ed4d04dca9\",\n  \"driver_id\": \"3c5a09e6-10dd-4419-b11d-354dab176163\",\n  \"name\": \"1212\",\n  \"phone_number\": \"1212\",\n  \"address\": {\n    \"country\": \"1212\",\n    \"city\": \"1212\",\n    \"street\": \"1212\",\n    \"apartment\": \"\",\n    \"postal_code\": \"\"\n  },\n  \"status\": null,\n  \"identity_number\": \"1212\",\n  \"gender\": \"FEMALE\",\n  \"work_start_date\": \"2017-11-08T00:00:00.000Z\",\n  \"paired_vehicle_id\": \"aba85c55-04ac-48fa-b3aa-d4a2070d2c8e\",\n  \"license\": {\n    \"driving_license_number\": \"1212\",\n    \"driving_license_expiration_date\": null,\n    \"driver_license_type\": \"1212\",\n    \"driver_license_image_id\": \"\"\n  },\n  \"taxi_driver_license\": {\n    \"taxi_driving_license_number\": \"\",\n    \"taxi_driving_license_expiration_date\": null,\n    \"taxi_driver_license_type\": \"\",\n    \"taxi_driver_license_image_id\": \"\"\n  },\n  \"last_archive_change_timestamp\": \"2017-11-08T08:01:02.932800504Z\",\n  \"id\": \"3c5a09e6-10dd-4419-b11d-354dab176163\",\n  \"location\": {\n    \"lng\": 0,\n    \"lat\": \"\",\n    \"display_address\": \"\"\n  },\n  \"thumbnail_url\": null,\n  \"email\": null\n}"}'},"cache":{},"timings":"done","serverIPAddress":"209.85.233.94"},
            {pageref: 1, "startedDateTime":"2017-11-08T12:16:05.017Z","time":481.00678200220864,"request":{"method":"POST","url":"https://p5-vc35z6erpnux2-p7ojmh3b6sz7tts2-735738-i1-v6exp3.ds.metric.gstatic.com/v6exp3/6.gif","httpVersion":"http/2.0","headers":[{"name":"Referer","value":"https://www.google.nl/_/chrome/newtab?espv=2&ie=UTF-8"},{"name":"User-Agent","value":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.75 Safari/537.36"}],"queryString":[],"cookies":[],"headersSize":-1,"bodySize":0},"response":{status: 203, headers:[{name: 'content-length', value: 500000}]},"cache":{},"timings":"done","serverIPAddress":"209.85.233.94"},
		];
        var mock = [
            {pageref: 1, "startedDateTime":"2017-11-08T12:16:05.017Z","time":481.00678200220864,"request":{"method":"PATCH","url":"https://p5-vc35z6erpnux2-p7ojmh3b6sz7tts2-735738-i1-v6exp3.ds.metric.gstatic.com/vasdifh asdfasfasdfiafihasiudfh aiusdfh iuashdfiua hsfiuhasiufhasidfuhasdiufhasiduh6exp3/6.gif","httpVersion":"http/2.0","headers":[{"name":"Referer","value":"https://www.google.nl/_/chrome/newtab?espv=2&ie=UTF-8"},{"name":"User-Agent","value":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.75 Safari/537.36"}],"queryString":[],"cookies":[],"headersSize":-1,"bodySize":0},"response":{status: 403, headers:[{name: 'content-length', value: 100}]},"cache":{},"timings":"done","serverIPAddress":"209.85.233.94"},
            {pageref: 1, "startedDateTime":"2017-11-08T12:16:05.017Z","time":1481.00678200220864,"request":{"method":"GET","url":"https://p5-vc35z6erpnux2-p7ojmh3b6sz7tts2-735738-i1-v6exp3.ds.metric.gstatic.com/v6exp3/6.gif","httpVersion":"http/2.0","headers":[{"name":"Referer","value":"https://www.google.nl/_/chrome/newtab?espv=2&ie=UTF-8"},{"name":"User-Agent","value":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.75 Safari/537.36"}],"queryString":[],"cookies":[],"headersSize":-1,"bodySize":0},"response":{status: 403, headers:[{name: 'content-length', value: 100}]},"cache":{},"timings":"done","serverIPAddress":"209.85.233.94"},
            {pageref: 1, "startedDateTime":"2017-11-08T12:16:05.017Z","time":481.00678200220864,"request":{"method":"GET","url":"https://p5-vc35z6erpnux2-p7ojmh3b6sz7tts2-735738-i1-v6exp3.ds.metric.gstatic.com/v6exp3/6.gif","httpVersion":"http/2.0","headers":[{"name":"Referer","value":"https://www.google.nl/_/chrome/newtab?espv=2&ie=UTF-8"},{"name":"User-Agent","value":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.75 Safari/537.36"}],"queryString":[],"cookies":[],"headersSize":-1,"bodySize":0},"response":{status: 403, headers:[{name: 'content-length', value: 100}]},"cache":{},"timings":"done","serverIPAddress":"209.85.233.94"},
            {pageref: 1, "startedDateTime":"2017-11-08T12:16:05.017Z","time":681.00678200220864,"request":{"method":"GET","url":"https://p5-vc35z6erpnux2-p7ojmh3b6sz7tts2-735738-i1-v6exp3.ds.metric.gstatic.com/v6exp3/6.gif","httpVersion":"http/2.0","headers":[{"name":"Referer","value":"https://www.google.nl/_/chrome/newtab?espv=2&ie=UTF-8"},{"name":"User-Agent","value":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.75 Safari/537.36"}],"queryString":[],"cookies":[],"headersSize":-1,"bodySize":0},"response":{status: 200, headers:[{name: 'content-length', value: 500}]},"cache":{},"timings":"done","serverIPAddress":"209.85.233.94"},
            {pageref: 1, "startedDateTime":"2017-11-08T12:16:05.017Z","time":681.00678200220864,"request":{"method":"GET","url":"https://p5-vc35z6erpnux2-p7ojmh3b6sz7tts2-735738-i1-v6exp3.ds.metric.gstatic.com/v6exp3/6.gif","httpVersion":"http/2.0","headers":[{"name":"Referer","value":"https://www.google.nl/_/chrome/newtab?espv=2&ie=UTF-8"},{"name":"User-Agent","value":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.75 Safari/537.36"}],"queryString":[],"cookies":[],"headersSize":-1,"bodySize":0},"response":{status: 200, headers:[{name: 'content-length', value: 500}]},"cache":{},"timings":"done","serverIPAddress":"209.85.233.94"},
            {pageref: 1, "startedDateTime":"2017-11-08T12:16:05.017Z","time":681.00678200220864,"request":{"method":"GET","url":"https://p5-vc35z6erpnux2-p7ojmh3b6sz7tts2-735738-i1-v6exp3.ds.metric.gstatic.com/v6exp3/6.gif","httpVersion":"http/2.0","headers":[{"name":"Referer","value":"https://www.google.nl/_/chrome/newtab?espv=2&ie=UTF-8"},{"name":"User-Agent","value":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.75 Safari/537.36"}],"queryString":[],"cookies":[],"headersSize":-1,"bodySize":0},"response":{status: 200, headers:[{name: 'content-length', value: 500}]},"cache":{},"timings":"done","serverIPAddress":"209.85.233.94"},
        ];
        for (i in mock) {
            onData(mock[i]);
        }
        // setInterval(function () {
        //     for (i in mock1) {
        //         onData(mock1[i]);
        //     }
        // }, 500);
    }

    // ── Theme toggle ──
    var isLight = localStorage.getItem('spykit-theme') === 'light';
    if (isLight) $body.addClass('light');
    $('#theme-toggle').text(isLight ? '☾' : '☀');
    $('#theme-toggle').on('click', function() {
        $body.toggleClass('light');
        var nowLight = $body.hasClass('light');
        $(this).text(nowLight ? '☾' : '☀');
        localStorage.setItem('spykit-theme', nowLight ? 'light' : 'dark');
    });

    // ── Unsaved changes tracking ──
    var formDirty = false;
    $('#form-url, #form-headers, #form-body, #form-method').on('change input', function() {
        if (!formDirty) {
            formDirty = true;
            $('#form-method').parent().append('<span class="unsaved-dot" id="unsaved-dot"></span>');
        }
    });
    $(document).on('click', '#form-send, #form-cancel', function() {
        formDirty = false;
        $('#unsaved-dot').remove();
    });

    // ── Persist requests between sessions ──
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['persistedRequests', 'restHistory', 'envs', 'envName'], function(result) {
            if (result.persistedRequests) {
                var maxId = 0;
                for (var id in result.persistedRequests) {
                    var origId = parseInt(id);
                    if (!values.requests[origId]) {
                        onData(result.persistedRequests[id], origId);
                    }
                    if (origId > maxId) maxId = origId;
                }
                if (maxId >= rootId) rootId = maxId + 1;
            }
            if (result.restHistory) values.restHistory = result.restHistory;
            if (result.envs) values.envs = result.envs;
            if (result.envName) values.envName = result.envName;
        });
        setInterval(function() {
            var toSave = {};
            var count = 0;
            for (var id in values.requests) {
                if (count++ > 200) break;
                toSave[id] = values.requests[id];
            }
            chrome.storage.local.set({
                persistedRequests: toSave,
                restHistory: values.restHistory || []
            });
        }, 30000);
    }

    // ── GraphQL detection ──
    function detectGraphQL(body) {
        if (!body) return false;
        var s = typeof body === 'string' ? body : JSON.stringify(body);
        return /(query|mutation)\s+\w/.test(s) || (s.indexOf('"query"') >= 0 && s.indexOf('"variables"') >= 0);
    }

    // Patch editRequest to add GraphQL detection
    var origEditRequest2 = editRequest;
    editRequest = function(tr) {
        origEditRequest2(tr);
        var id = tr ? tr.attr('id') : -1;
        var data = (id > 0) ? values.requests[id] : {};
        setTimeout(function() {
            var body = (data.response && data.response.content && data.response.content.text) || '';
            if (detectGraphQL(body)) {
                var $label = $('#form-label-body2');
                if (!$label.find('.gql-badge').length) {
                    $label.append(' <span class="gql-badge" title="GraphQL query detected">GQL</span>');
                }
            } else {
                $('#form-label-body2 .gql-badge').remove();
            }
        }, 50);
    };

});

function parseCurl(cmd) {
    if (!cmd || !cmd.trim()) return null;
    var result = {method: 'GET', url: '', headers: {}, body: ''};
    var parts = cmd.trim().match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p === 'curl' || p === 'curl\\') continue;
        if (p === '-X' || p === '--request') {
            result.method = (parts[++i] || 'GET').replace(/^["']|["']$/g, '');
        } else if (p === '-H' || p === '--header') {
            var hv = (parts[++i] || '').replace(/^["']|["']$/g, '');
            var idx = hv.indexOf(':');
            if (idx > 0) {
                result.headers[hv.substring(0, idx).trim()] = hv.substring(idx + 1).trim();
            }
        } else if (p === '-d' || p === '--data' || p === '--data-raw' || p === '--data-binary') {
            result.body = (parts[++i] || '').replace(/^["']|["']$/g, '');
            if (result.method === 'GET') result.method = 'POST';
        } else if (p.indexOf('://') >= 0) {
            result.url = p.replace(/^["']|["']$/g, '');
        }
    }
    return result;
}

// ── Import cURL ──
$(document).on('click', '#import-curl-btn', function() {
    var $input = $('#import-curl-input');
    if ($input.is(':visible')) {
        var cmd = $input.val().trim();
        if (cmd) {
            var parsed = parseCurl(cmd);
            if (parsed && parsed.url) {
                $formUrl.val(parsed.url);
                autosize.update($formUrl);
                $('#form-method').val(parsed.method);
                var hStr = '';
                for (var key in parsed.headers) {
                    hStr += key + ': ' + parsed.headers[key] + '\n';
                }
                $formHeaders.val(hStr.trim());
                autosize.update($formHeaders);
                $formBody.val(parsed.body);
                autosize.update($formBody);
            }
        }
        $input.hide().val('');
        $(this).text('Import cURL');
    } else {
        $input.show().focus();
        $(this).text('Parse');
    }
});
$(document).on('keydown', '#import-curl-input', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
        $('#import-curl-btn').click();
    }
});

// ── Query Params Editor ──
function parseQueryParams(url) {
    var qIdx = url.indexOf('?');
    if (qIdx < 0) return [];
    var qs = url.substring(qIdx + 1);
    var params = [];
    qs.split('&').forEach(function(p) {
        if (!p) return;
        var eq = p.indexOf('=');
        if (eq >= 0) {
            params.push({key: decodeURIComponent(p.substring(0, eq)), value: decodeURIComponent(p.substring(eq + 1))});
        } else {
            params.push({key: decodeURIComponent(p), value: ''});
        }
    });
    return params;
}
function buildQueryString(params) {
    var parts = [];
    for (var i = 0; i < params.length; i++) {
        if (params[i].key) parts.push(encodeURIComponent(params[i].key) + '=' + encodeURIComponent(params[i].value));
    }
    return parts.join('&');
}
function renderQueryEditor(params) {
    var html = '<table style="width:100%;border-collapse:collapse;font-size:11px">';
    html += '<tr><th style="text-align:left;padding:2px 4px;border-bottom:1px solid #444;color:#aaa">Key</th><th style="text-align:left;padding:2px 4px;border-bottom:1px solid #444;color:#aaa">Value</th><th style="width:30px;border-bottom:1px solid #444"></th></tr>';
    for (var i = 0; i < params.length; i++) {
        html += '<tr class="qp-row"><td><input class="qp-key form-control" value="' + escapeHtml(params[i].key) + '" style="width:100%;font-size:11px;padding:2px 4px"></td>';
        html += '<td><input class="qp-val form-control" value="' + escapeHtml(params[i].value) + '" style="width:100%;font-size:11px;padding:2px 4px"></td>';
        html += '<td><button class="qp-del btn btn-xs btn-default" style="font-size:10px;padding:0 4px">&times;</button></td></tr>';
    }
    html += '</table>';
    html += '<div style="margin-top:4px"><button id="qp-add" class="btn btn-xs btn-default">+ Add param</button></div>';
    return html;
}
function updateUrlFromParams() {
    var url = $formUrl.val();
    var qIdx = url.indexOf('?');
    var baseUrl = qIdx >= 0 ? url.substring(0, qIdx) : url;
    var params = [];
    $('#query-params-editor .qp-row').each(function() {
        var key = $(this).find('.qp-key').val().trim();
        var val = $(this).find('.qp-val').val();
        if (key) params.push({key: key, value: val});
    });
    var qs = buildQueryString(params);
    $formUrl.val(baseUrl + (qs ? '?' + qs : ''));
    autosize.update($formUrl);
}
$(document).on('click', '#query-params-btn', function() {
    var $editor = $('#query-params-editor');
    if ($editor.is(':visible')) {
        $editor.hide();
        $(this).text('🔗 Params');
        return;
    }
    var params = parseQueryParams($formUrl.val());
    $editor.html(renderQueryEditor(params)).show();
    $(this).text('🔗 Done');
});
$(document).on('click', '#qp-add', function() {
    $('#query-params-editor table').append('<tr class="qp-row"><td><input class="qp-key form-control" style="width:100%;font-size:11px;padding:2px 4px"></td><td><input class="qp-val form-control" style="width:100%;font-size:11px;padding:2px 4px"></td><td><button class="qp-del btn btn-xs btn-default" style="font-size:10px;padding:0 4px">&times;</button></td></tr>');
});
$(document).on('click', '.qp-del', function() {
    $(this).closest('.qp-row').remove();
    updateUrlFromParams();
});
$(document).on('input', '.qp-key, .qp-val', function() {
    updateUrlFromParams();
});

// ── Export HAR ──
function exportAsHAR(items) {
    var log = {log: {version: '1.2', creator: {name: 'SpyKit', version: '2.0'}, entries: []}};
    for (var i = 0; i < items.length; i++) {
        var d = items[i];
        if (!d.request) continue;
        log.log.entries.push({
            startedDateTime: d.startedDateTime || new Date().toISOString(),
            time: d.time || 0,
            request: {
                method: d.request.method || 'GET',
                url: d.request.url || '',
                httpVersion: d.request.httpVersion || 'http/2.0',
                headers: d.request.headers || [],
                queryString: d.request.queryString || [],
                cookies: d.request.cookies || [],
                headersSize: d.request.headersSize || -1,
                bodySize: d.request.bodySize || -1
            },
            response: {
                status: d.response ? d.response.status : 0,
                statusText: d.response ? d.response.statusText || '' : '',
                httpVersion: d.response ? d.response.httpVersion || 'http/2.0' : 'http/2.0',
                headers: d.response ? d.response.headers || [] : [],
                content: d.response && d.response.content ? {
                    size: d.response.content.size || 0,
                    mimeType: d.response.content.mimeType || '',
                    text: d.response.content.text || ''
                } : {size: 0, mimeType: '', text: ''},
                cookies: d.response ? d.response.cookies || [] : [],
                headersSize: d.response ? d.response.headersSize || -1 : -1,
                bodySize: d.response ? d.response.bodySize || -1 : -1,
                redirectURL: d.response ? d.response.redirectURL || '' : ''
            },
            cache: {},
            timings: d.timings || {}
        });
    }
    var output = JSON.stringify(log, null, 2);
    var blob = new Blob([output], {type: 'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'spykit.har';
    a.click();
    URL.revokeObjectURL(url);
    $('#export-dropdown').hide();
}

// Patch exportAsFormat to handle har format
var origExportAsFormat = exportAsFormat;
exportAsFormat = function(format) {
    if (format === 'har') {
        var items = [];
        $('.req:visible').each(function() {
            var id = parseInt($(this).attr('id'));
            var data = values.requests[id];
            if (data) items.push(data);
        });
        if (items.length) exportAsHAR(items);
        return;
    }
    origExportAsFormat(format);
};

// ── Shortcuts modal ──
$(document).on('click', '#shortcuts-btn', function() {
    $('#shortcuts-modal').toggle();
});
$(document).on('click', '#shortcuts-close', function() {
    $('#shortcuts-modal').hide();
});
$(document).on('keydown', function(e) {
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !$(e.target).is('input,textarea,select')) {
        e.preventDefault();
        $('#shortcuts-modal').toggle();
    }
    if (e.key === 'Escape') {
        $('#shortcuts-modal').hide();
    }
});

function headersToStr(h) {
	var res = '';
	for(var i in h) {
		if (h[i].name && h[i].value) {
			res += h[i].name + ': ' + h[i].value + '\r\n';
		}
	}
	return res;
}

function strToHeaders(headers) {
    if (!headers) {
        return [];
    }
    var res = [];
	var h = headers.split("\n");
	for (var i in h) {
		if (!h[i]) {
			continue;
		}
		var x = h[i].split(':');
		if (x.length != 2 || !x[0] || !x[1]) {
			continue;
		}
		res.push({name: x[0].trim(), value: x[1].trim()});
	}
	return res;
}

function hostname(domain) {
    if (!domain || domain.length < 1) {
        return domain;
    }
    var i = domain.indexOf(':');
    if (i >= 0) {
        domain = domain.substring(0, i);
    }
    var s = domain.split('.');
    if (s.length < 2) {
        return domain;
    }
    return s[s.length-2] + '.' + s[s.length-1];
}

function parse_url(url) {

	var res = {hostname: '(empty)', pathname: '', search: ''};
	if (!url) {
		return res;
	}
	var j = url.indexOf('//');
	if (j < 0) {
		res.pathname = url;
		return res;
	}
	var i = url.indexOf('/', j+2);
    if (i < 0) {
        res.hostname = hostname(url.substring(j+2));
        if (!res.hostname) {
            res.hostname = '(empty)';
        }
        res.pathname = '/';
        return res;
    }
    res.hostname = hostname(url.substring(j+2,i));
    if (!res.hostname) {
        res.hostname = '(empty)';
    }
	var k = url.indexOf('?', i+1);
    if (k < 0) {
        k = url.indexOf('#', i+1);
	}
	if (k < 0) {
        res.pathname = url.substring(i);
	} else {
        res.pathname = url.substring(i, k);
        res.search = url.substring(k);
	}
	return res;
}

var scrollEnabled = false;
var scrollCount = 0;

function checkScroll(scrollTop) {
    var count = Math.round(scrollTop/ROW_HEIGHT);
    if (count > 0 && count !== scrollCount) {
        scrollCount = count;
        $scrollUpSpan.html(scrollCount);
    }
    if (scrollEnabled === (count > 0)) {
    	return;
    }
    scrollEnabled = count > 0;
    if (scrollEnabled) {
        $scrollUp.show();
    } else {
        $scrollUp.hide();
    }
}

function parse_domain(str) {

	var regex = /[^.]+.[^.]+$/gi;

	return regex.exec( str.toString().toLowerCase() );
}

function parse_status(str) {

	var regex = /(\d{3})[\w\s.,-]+$/gi;

	return regex.exec( str.toString() );
}

var makeCRCTable = function(){
    var c;
    var crcTable = [];
    for(var n =0; n < 256; n++){
        c = n;
        for(var k =0; k < 8; k++){
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
};

function esc(str) {
	return str.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

function hash(str) {

	return str.toString().toLowerCase().replace(/[^0-9a-z]/g, '');
}

function replaceAll( s ) {
	return s.replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function filter_add_item(filter, id, str, add_zero) {

    if (!add_zero) {
        add_zero = '1';
    } else {
        add_zero = '0';
    }

	var f = $('.filter-' + filter + ':last'),
		ul = $('ul', f),
		badge,
		i;

	if (!$('#' + filter + '-' + id, f).is(':input')) {

		if ($('li', ul).length == 1) {

			ul.append(
				$('<li/>').addClass('divider')
			);
		}

		ul.append(
			$('<li/>')
				.addClass('checkbox')
				.append(
					$('<label/>')
						.append(
							$('<input/>')
								.attr({
									'type': 'checkbox',
									'name': 'filter',
									'value': filter + '-' + id,
									'id': filter + '-' + id,
									'checked': true
								})
						)
						.append( str )
						.append(
							$('<span/>')
								.attr('id', 'badge-' + filter + '-' + id)
								.addClass('badge badge-right')
								.html(add_zero)
						)
				)
		);

		// badge = $('#badge-' + filter, ul);
		// i = parseInt( badge.html() );
		// badge.html( i + 1 );

	} else {

		badge = $('#badge-' + filter + '-' + id, ul);
		i = parseInt( badge.html() );
		badge.html( i + 1 );
	}
}

var rootId = 1;

function addSpaces(data, count) {
	while (data.length < count) {
		data += '&nbsp;';
	}
	return data;
}

function getRedColor(value, foreground) {
	var MIN = 0.3;
	if (value < MIN) {
		return {};
	} else if (value > 1) {
		value = 1;
	} else {
		value = (value - MIN) / (1 - MIN);
	}
	var h = Math.round(value*100).toString(16);
	var color = '#ff0000' + (h.length < 2 ? '0' : '') + h;
	if (foreground) {
        return {'color': color};
    } else {
        return {'background': color};
    }
}

function formatSize(bytes) {
    if (!bytes || bytes <= 0) return '';
    if (bytes >= 1024*1024) return (bytes/1024/1024).toFixed(1) + '<small> MB</small>';
    if (bytes >= 1024) return Math.round(bytes/1024) + '<small> KB</small>';
    return bytes + '<small> B</small>';
}

function onData(data, id) {

    // console.log('onData', data);

	if (!id) {
        rootId++;
        id = rootId;
    }

	var tr_class = 'req' + id,
		url = parse_url(data.request.url),
		_url = url.pathname,
		// _url = url.hostname + url.pathname + url.search,
		tr = $('#' + id);
	if (_url && _url.substring(0,1) === '/' && _url.length > 1) {
		_url = _url.substring(1);
	}
	if ((!_url || _url.length < 2) && url.search) {
		_url = url.search;
	}

	values.requests[id] = data;
	var removeId = id - 1000;
	if (removeId >= 0) {
	    delete values.requests[removeId];
	    $('#'+removeId).remove();
    }

	tr = $('<tr/>')
		.addClass('req ' + tr_class)
		.attr('id', id)
		.css({'display': 'none'});

	for (var a in rows) {

		tr.append(
			$('<td/>')
				.addClass(a)
		);

    }

    //////////////////////////////////////////////////

	$('.clear', tr)
		.html('&nbsp;');

	$('.pin', tr)
		.html('<span class="pin-star">☆</span>');

	//////////////////////////////////////////////////

	$('.url', tr)
		.html(_url);

    var _domain = hash(url.hostname);
    filter_add_item('url', _domain, url.hostname);
    tr.addClass('url-' + _domain);

    //////////////////////////////////////////////////
    var type = 'other';
	if (data.response && data.response.headers && data.response.headers.length) {
		var headers = data.response.headers;
        for (var i = 0; i < headers.length; i++) {
            if (!headers[i].name) {
                continue;
            }
            if (headers[i].name.toLowerCase() === 'content-type') {
                type = headers[i].value;
                if (type) {
                    if (type.indexOf('image/') >= 0) {
                        type = 'image';
                    } else if (type.indexOf('javascript') >= 0) {
                        type = 'js';
                    } else if (type.indexOf('font') >= 0) {
                        type = 'font';
                    } else if (type.indexOf('json') >= 0) {
                        type = 'json';
                    } else if (type.indexOf('xml') >= 0) {
                        type = 'xml';
                    } else if (type.indexOf('css') >= 0) {
                        type = 'css';
                    } else if (type.indexOf('html') >= 0) {
                        type = 'html';
                    } else if (type.indexOf('text') >= 0) {
                        type = 'text';
                    } else {
                        type = 'other';
                    }
                }
            }
        }
    }

    var size = data.response.bodySize;
    var size_int = Math.round(size);
    if (size) {
        size = formatSize(size);
    }

    $('.type', tr)
        .html(type)
        .addClass(type);

    var _type = hash(type);
    filter_add_item('type', _type, type);
    tr.addClass('type-' + _type);

	$('.size', tr)
		.html(size)
		.css(getRedColor(size_int/(1024*1024)));

    if (size_int >= 1024*1024) {
        filter_add_item('size', '1m');
        tr.addClass('size-1000');
    } else if (size_int >= 100*1024) {
        filter_add_item('size', '100');
        tr.addClass('size-100');
    } else {
        filter_add_item('size', '0');
        tr.addClass('size-0');
    }

    //////////////////////////////////////////////////

	var status = Math.round(data.response.status);
    if (status < 0) {
        $('.status', tr)
            .html('pending');
    } else {
        $('.status', tr)
            .html(status ? status : 'error')
                .css(getRedColor((status >= 200 && status < 300) ? 0 : 1));

        filter_add_item('status', status, status ? status : 'error');
        tr.addClass('status-' + status);
    }

    //////////////////////////////////////////////////

	if (status < 0) {

        $('.time', tr)
            .html('pending');

    } else {

        var time = Math.round(data.time);
        $('.time', tr)
            .html(time + '<small> ms</small>')
            .css(getRedColor(time / 2000));

        if (time >= 1000) {
            filter_add_item('time', '1000');
            tr.addClass('time-1000');
        } else if (time >= 500) {
            filter_add_item('time', '500');
            tr.addClass('time-500');
        } else {
            filter_add_item('time', '0');
            tr.addClass('time-0');
        }

    }

    //////////////////////////////////////////////////
	var _method = hash(data.request.method);

    filter_add_item('method', _method, data.request.method);
	tr.addClass('method-' + _method);

	$('.method', tr)
		.html(data.request.method)
    	.addClass(data.request.method);

	//////////////////////////////////////////////////

	if ($('.' + tr_class).is('div')) {

		$('.' + tr_class + ':first').before(tr);

	} else {

        $requests.prepend(tr);
	}

    var searchMatch = true;
    if (values.searchQuery) {
        var text = getRequestText(data);
        if (values.searchRegex) {
            try { searchMatch = new RegExp(values.searchQuery, 'i').test(text); }
            catch(e) { searchMatch = false; }
        } else {
            searchMatch = text.indexOf(values.searchQuery) >= 0;
        }
    }
    var filterMatch = values.filters_str && tr.is(values.filters_str);
    if (filterMatch || !searchMatch) {
        tr.hide();
    } else {
        tr.show();
    }

	// checkScroll();

    var editUrl = $formUrl.val();
    if (!editUrl) {
        editUrl = '';
    }
    editUrl = stripTrailingSlash(editUrl);
    if (selected
        && ($('#form-status').val() === 'pending')
        && ($('#form-method').val() === data.request.method)
        && ((editUrl === stripTrailingSlash(data.request.url))
            || (editUrl.indexOf('//') < 0 && editUrl === stripTrailingSlash(_url)))
    ) {
        setTimeout(function () {
            editRequest(tr);
        }, 10);
    }

	return id;
}

function stripTrailingSlash(str) {
    if(str.substr(-1) === '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
}

function editRequest(tr) {

    largeContent = undefined;

    dialogOpened = true;

    if (selected) {
        selected.find('.clear')
            .addClass('visited')
            .html('✓');
    }
    selected = tr;
    if (selected) {
        selected.find('.clear')
            .removeClass('visited')
            .html('➤');
    }

    $('#new-request').hide();

    if (splitter) {
        var sizes = splitter.getSizes();
        if (sizes.length !== 2 || sizes[1] < 10) {
            splitter.setSizes([50, 50]);
        }
    }

    $splitArea
        .css({opacity: 0.0, display: (splitDir === 'vertical') ? 'block' : 'flex'})
        .animate({opacity: 1}, 100, 'swing');

    var id = selected ? selected.attr('id') : -1;
    var data = (id > 0) ? values.requests[id] : {};
    if (!data.request) {
        data.request = {method: 'GET', url: '', headers: []};
    }
    if (!data.response) {
        data.response = {headers: [], content: ''};
    }

    $('#form-cancel').html('Cancel').addClass('btn-default').removeClass('btn-danger');
    $('#form-send').prop('disabled', false).removeClass('spin');

    $('#form-id').val(id);

    $('#form-method').val(data.request.method);

    var displayValue = data.response.status;
    if (displayValue === undefined) {
        displayValue = '';
    } else if (displayValue === 0) {
        displayValue = 'error';
    } else if (displayValue === 200) {
        displayValue = '200 - OK';
    }
    $('#form-status')
        .val(displayValue)
        .removeClass('blink')
        .removeClass('ok')
        .removeClass('error')
        .addClass((data.response.status >= 200 && data.response.status < 300) ? 'ok' : 'error');

    $('.hint')
        .css({display: data.response.status && data.response.status !== 200 ? 'block' : 'none'});

    $('#hint')
        .html(getStatusHint(data.response.status));

    if (data.time) {
        var time = Math.round(data.time);
        $('#form-time')
            .val(time + ' ms');
            // .css(getRedColor(time / 2000));
    } else {
        $('#form-time')
            .val('');
    }

    var focusSet = false;

    $formUrl.val(data.request.url);
    autosize.update($formUrl);
    if (!focusSet && $formUrl.is(':visible')) {
    	$formUrl.focus();
        focusSet = true;
	}

    $formHeaders.val(headersToStr(data.request.headers));
    autosize.update($formHeaders);
    if (!focusSet && $formHeaders.is(':visible')) {
        $formHeaders.focus();
        focusSet = true;
    }

    if (data.request.postData) {
        $formBody.val(format(data.request.postData.text ? data.request.postData.text : data.request.postData));
    } else {
        $formBody.val('');
    }
    autosize.update($formBody);
    if (!focusSet && $formBody.is(':visible')) {
        $formBody.focus();
        focusSet = true;
    }

    $formHeaders2.val(headersToStr(data.response.headers));
    autosize.update($formHeaders2);
    if (!focusSet && $formHeaders2.is(':visible')) {
        $formHeaders2.focus();
        focusSet = true;
    }

    var mime2 = (data.response.content && data.response.content.mimeType) ?
        data.response.content.mimeType.toLowerCase() : '';
    $formBody2.val(format(data.response.content)).show();
    $formBody2Image.html('');
    var sizeCompressed = data.response.bodySize;
    var sizeFull = data.response.content.size;
    if (!sizeFull) {
        sizeFull = sizeCompressed;
    }
    var sizeInfo = '';
    if (sizeFull) {
        sizeInfo = Math.round(sizeFull/1024) + ' k ' +
            ((sizeCompressed === sizeFull) ? ' not gzipped' :
                ' / ' + Math.round(sizeCompressed/1024) + ' k gzipped');
    }
    $formLabelBody2
        .attr('for', 'form-body2')
        .text('Answer body: ' + sizeInfo);
    autosize.update($formBody2);
    if (data.getContent) {
        data.getContent(function (content, encoding) {
            if (mime2.indexOf('image') >= 0) {
                var img = '<a target="_blank" href="'+data.request.url+'"><img height="100px" src="data:' +
                    data.response.content.mimeType.toLowerCase() + ';' + encoding + ',' + (content) + '"/></a>';
                $formBody2.val('').hide();
                $formBody2Image.html($(img));
                $formLabelBody2.attr('for', 'form-body2-image');
            } else {
                if (!content) {
                    $formBody2.val('');
                } else if (content.length < 100*1024) {
                    $formBody2.val(format(content, mime2));
                    autosize.update($formBody2);
                } else {
                    // largeContent = content;
                    // largeContentEncoding = encoding;
                    // $formBody2.val('Content is too large.');
                    $formBody2
                        .val(format(content, mime2))
                        .css({height: 500, overflow: 'scroll'})
                }
            }
        });
    }
    if (!focusSet && $formBody2.is(':visible')) {
        $formBody2.focus();
        focusSet = true;
    }

    detailsSizeCheck();
    $details.scrollTop(0);
}

function loadLargeContent() {
    $formBody2.val(format(largeContent, largeContentEncoding));
    autosize.update($formBody2);
    largeContent = undefined;
}

function format(s, mime) {
	if (!s) {
		return s;
	}
	if (typeof s === 'string') {

        if (mime && mime.indexOf('css') >= 0) {

            try {
                s = pd.css(s);
            } catch (e) {}

        } else if (mime && mime.indexOf('xml') >= 0) {

            try {
                s = pd.xml(s);
            } catch (e) {}

        } else if (mime && mime.indexOf('json') >= 0) {

            try {
                s = pd.json(s);
            } catch (e) {}

        } else {

            try {
                s = pd.json(s);
                // s = JSON.stringify(JSON.parse(s), null, 4);
            } catch (e) {
                try {
                    s = pd.xml(s);
                } catch (e) {}
            }
        }

    } else {
        s = JSON.stringify(s, null, 4);
    }
    if (!s) {
        return s;
    }
    s = s.replace(/\\n/g, "\n")
        .replace(/\\'/g, "\'")
        .replace(/\\\//g, "\/")
        .replace(/\\"/g, '\"')
        .replace(/\\&/g, "\&")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\b/g, "\b")
        .replace(/\\f/g, "\f");
    return s;
}

function log(data) {
    if (!chrome.devtools) {
        return;
    }
    chrome.devtools.inspectedWindow.eval(
        "console.log('"+esc(JSON.stringify(data))+"');"
    );
}

function splitCheck() {

    if (!$splitArea.height()) {
        return;
    }
    var ratio = Math.round(10 * $splitArea.width() / $splitArea.height());
    if (ratio > 10) {
        dir = 'horizontal';
    } else {
        dir = 'vertical';
    }
    if (dir === splitDir || ratio === splitRatio) {
        return;
    }

    $splitArea.removeClass('split-'+splitDir);
    if (splitter) {
        splitter.destroy();
        splitter = undefined;
    }

    splitRatio = ratio;
    splitDir = dir;
    $splitArea.addClass('split-'+splitDir);
    if ($splitArea.is(':visible')) {
        $splitArea.css({display: (splitDir === 'vertical') ? 'block' : 'flex'});
    }
    splitter = Split(['.transparent', '.details'], {
        direction: dir,
        sizes: [50, 50],
        gutterSize: 20,
        snapOffset: 50,
        minSize: 0,
        onDragStart: function () {
            $splitArea.addClass('splitting');
        },
        onDrag: function () {
            detailsSizeCheck();
        },
        onDragEnd: function () {
            $splitArea.removeClass('splitting');
        }
    });
}

function detailsSizeCheck() {
    // var total = $(this).children().length;
    // $(this).children().each(function(k) {
    //
    //     var width = filter.children('div:eq(' + k + ')').width();
    //     $(this).width( width || 'auto' );
    //
    // });

    var w = $details.width();
    $details.css({paddingRight: (w < 20) ? 0 : ''});
    if (w < 220) {
        $formMethodClear.show();
        $formStatusClear.hide();
        $formTimeClear.hide();
    } else if (w < 320) {
        $formMethodClear.hide();
        $formStatusClear.show();
        $formTimeClear.hide();
    } else if (w < 420) {
        $formMethodClear.hide();
        $formStatusClear.hide();
        $formTimeClear.show();
    } else {
        $formMethodClear.hide();
        $formStatusClear.hide();
        $formTimeClear.hide();
    }

    $scrollUpClass.css({right: splitDir === 'vertical' || !dialogOpened ? '20px' : (w+40)+'px'});
}

function getStatusHint(status) {
    var statuses = {
        100: 'Continue',
        101: 'Switching Protocols',
        102: 'Processing',
        103: 'Early Hints',
        200: 'OK',
        201: 'Created',
        202: 'Accepted',
        203: 'Non-Authoritative Information',
        204: 'No Content',
        205: 'Reset Content',
        206: 'Partial Content',
        207: 'Multi-Status',
        208: 'Already Reported',
        226: 'IM Used',
        300: 'Multiple Choices',
        301: 'Moved Permanently',
        302: 'Found',
        303: 'See Other',
        304: 'Not Modified',
        305: 'Use Proxy',
        306: '(Unused)',
        307: 'Temporary Redirect',
        308: 'Permanent Redirect',
        400: 'Bad Request',
        401: 'Unauthorized',
        402: 'Payment Required',
        403: 'Forbidden',
        404: 'Not Found',
        405: 'Method Not Allowed',
        406: 'Not Acceptable',
        407: 'Proxy Authentication Required',
        408: 'Request Timeout',
        409: 'Conflict',
        410: 'Gone',
        411: 'Length Required',
        412: 'Precondition Failed',
        413: 'Payload Too Large',
        414: 'URI Too Long',
        415: 'Unsupported Media Type',
        416: 'Range Not Satisfiable',
        417: 'Expectation Failed',
        421: 'Misdirected Request',
        422: 'Unprocessable Entity',
        423: 'Locked',
        424: 'Failed Dependency',
        426: 'Upgrade Required',
        428: 'Precondition Required',
        429: 'Too Many Requests',
        431: 'Request Header Fields Too Large',
        451: 'Unavailable For Legal Reasons',
        500: 'Internal Server Error',
        501: 'Not Implemented',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Timeout',
        505: 'HTTP Version Not Supported',
        506: 'Variant Also Negotiates',
        507: 'Insufficient Storage',
        508: 'Loop Detected',
        510: 'Not Extended',
        511: 'Network Authentication Required'
    };

    var res = statuses[status];
    if (res === undefined) {
        return 'unknown status code';
    } else {
        return res;
    }
}

// ──────────────────────────────────────────────
// Fase 1: Postman Export
// ──────────────────────────────────────────────

function requestToPostmanItem(data) {
    if (!data || !data.request) return null;
    var r = data.request;
    var url = parse_url(r.url || '');
    var item = {
        name: (r.method || 'GET') + ' ' + (url.pathname || '/'),
        request: {
            method: r.method || 'GET',
            header: [],
            url: {raw: r.url || ''}
        },
        response: []
    };
    if (r.headers) {
        for (var i = 0; i < r.headers.length; i++) {
            if (r.headers[i].name && r.headers[i].value) {
                item.request.header.push({key: r.headers[i].name, value: r.headers[i].value});
            }
        }
    }
    if (url.protocol) item.request.url.protocol = url.protocol.replace(':', '');
    if (url.hostname) item.request.url.host = url.hostname.split('.');
    if (url.pathname) item.request.url.path = url.pathname.replace(/^\//, '').split('/');
    if (url.search) {
        var qs = url.search.replace(/^\?/, '').split('&');
        item.request.url.query = [];
        for (var i = 0; i < qs.length; i++) {
            var parts = qs[i].split('=');
            if (parts[0]) item.request.url.query.push({key: parts[0], value: parts.slice(1).join('=') || ''});
        }
    }
    if (r.postData) {
        var bodyText = typeof r.postData.text === 'string' ? r.postData.text : JSON.stringify(r.postData);
        item.request.body = {mode: 'raw', raw: bodyText};
        if (r.postData.mimeType && r.postData.mimeType.indexOf('json') >= 0) {
            item.request.body.options = {raw: {language: 'json'}};
        }
    }
    if (data.response) {
        var resp = {name: 'Response ' + (data.response.status || ''), status: '', code: 0, header: [], body: ''};
        resp.status = getStatusHint(data.response.status) || '';
        resp.code = data.response.status || 0;
        if (data.response.headers) {
            for (var i = 0; i < data.response.headers.length; i++) {
                if (data.response.headers[i].name && data.response.headers[i].value) {
                    resp.header.push({key: data.response.headers[i].name, value: data.response.headers[i].value});
                }
            }
        }
        resp.body = (data.response.content && data.response.content.text) || '';
        item.response.push(resp);
    }
    return item;
}

$(document).on('click', '#export-postman-btn', function() {
    var id = $('#form-id').val();
    var data = (id > 0) ? values.requests[id] : null;
    if (!data) {
        data = {
            request: {
                method: $('#form-method').val(),
                url: $formUrl.val(),
                headers: strToHeaders($formHeaders.val()),
                postData: $formBody.val() ? {text: $formBody.val()} : null
            }
        };
    }
    var item = requestToPostmanItem(data);
    if (!item) return;
    var collection = {
        info: {
            name: 'SpyKit Export',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [item]
    };
    var json = JSON.stringify(collection, null, 2);
    var blob = new Blob([json], {type: 'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'spykit-collection.json';
    a.click();
    URL.revokeObjectURL(url);
});

// ──────────────────────────────────────────────
// Fase 2a: Security Headers Inspector
// ──────────────────────────────────────────────

var SECURITY_HEADERS = {
    'strict-transport-security':     {label:'HSTS', check:function(v){return v&&v.indexOf('max-age')>=0;}, desc:'HTTP Strict Transport Security — forces HTTPS connections'},
    'x-content-type-options':        {label:'XCTO', check:function(v){return v==='nosniff';}, desc:'Prevents MIME-type sniffing'},
    'x-frame-options':               {label:'XFO',  check:function(v){return v==='DENY'||v==='SAMEORIGIN';}, desc:'Prevents clickjacking via iframes'},
    'content-security-policy':       {label:'CSP',  check:function(v){return !!v;}, desc:'Content Security Policy — controls allowed resources'},
    'x-xss-protection':              {label:'XSS',  check:function(v){return v&&v.indexOf('1')>=0;}, desc:'Cross-site scripting filter'},
    'referrer-policy':               {label:'RefP', check:function(v){return !!v;}, desc:'Controls referrer header sent with requests'},
    'permissions-policy':            {label:'PermP',check:function(v){return !!v;}, desc:'Controls browser features (camera, mic, etc.)'}
};

function checkSecurityHeaders(headers) {
    var found = {};
    if (headers) {
        for (var i = 0; i < headers.length; i++) {
            var name = headers[i].name ? headers[i].name.toLowerCase() : '';
            if (SECURITY_HEADERS[name]) {
                found[name] = headers[i].value;
            }
        }
    }
    var html = '';
    for (var key in SECURITY_HEADERS) {
        var h = SECURITY_HEADERS[key];
        if (found[key] !== undefined) {
            var ok = h.check(found[key]);
            html += '<span class="sec-item ' + (ok ? 'sec-ok' : 'sec-warn') + '" title="' + h.desc + '\n' + key + ': ' + escapeHtml(found[key]) + '">' + (ok ? '\u2713' : '?') + h.label + '</span>';
        } else {
            html += '<span class="sec-item sec-missing" title="' + h.desc + '\n' + key + ' is missing">\u2717' + h.label + '</span>';
        }
    }
    return html;
}

// ──────────────────────────────────────────────
// Fase 2b: Secret Detection
// ──────────────────────────────────────────────

var SECRET_PATTERNS = [
    {name: 'API Key', regex: /(['\"])?(sk[-_]?live|sk[-_]?test|api[-_]?key|apikey)[=:]\s*['\"]?([^&\"'\s]{8,})/gi},
    {name: 'JWT', regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g},
    {name: 'Bearer Token', regex: /bearer\s+[a-zA-Z0-9._~+/=-]{20,}/gi},
    {name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/g},
    {name: 'GitHub Token', regex: /gh[pousr]_[a-zA-Z0-9]{36,}/g},
    {name: 'Password', regex: /(password|passwd|pwd)[=:]\s*['\"]?([^&\"'\s]{4,})/gi},
    {name: 'Token', regex: /(['\"])?(token|secret|auth)[=:]\s*['\"]?([^&\"'\s]{8,})/gi}
];

function scanForSecrets(text) {
    if (!text) return [];
    var found = [];
    for (var i = 0; i < SECRET_PATTERNS.length; i++) {
        var p = SECRET_PATTERNS[i];
        p.regex.lastIndex = 0;
        var m;
        while ((m = p.regex.exec(text)) !== null) {
            found.push({type: p.name, match: m[0].substring(0, 40)});
        }
    }
    return found;
}

// ──────────────────────────────────────────────
// Fase 2c: Hex View
// ──────────────────────────────────────────────

function toHexDump(str) {
    if (!str) return '';
    var lines = [];
    for (var i = 0; i < str.length; i += 16) {
        var hex = [], ascii = [];
        var addr = ('00000000' + i.toString(16)).slice(-8);
        for (var j = 0; j < 16; j++) {
            if (i + j < str.length) {
                var code = str.charCodeAt(i + j);
                hex.push(('0' + code.toString(16)).slice(-2));
                ascii.push(code >= 32 && code <= 126 ? str[i + j] : '.');
            } else {
                hex.push('  ');
                ascii.push(' ');
            }
        }
        lines.push('<span class="hex-offset">' + addr + '</span> <span class="hex-bytes">' + hex.join(' ') + '</span>  <span class="hex-ascii">' + ascii.join('') + '</span>');
    }
    return '<div class="hex-dump">' + lines.join('\n') + '</div>';
}

// ──────────────────────────────────────────────
// Fase 2d: Cookie Inspector
// ──────────────────────────────────────────────

function parseCookies(headers) {
    var cookies = [];
    if (!headers) return cookies;
    for (var i = 0; i < headers.length; i++) {
        var n = headers[i].name ? headers[i].name.toLowerCase() : '';
        if (n === 'set-cookie') {
            var parts = headers[i].value.split(';');
            var c = {name: '', value: '', domain: '', path: '', expires: '', httponly: false, secure: false, samesite: ''};
            for (var j = 0; j < parts.length; j++) {
                var p = parts[j].trim();
                var kv = p.split('=');
                var key = kv[0].trim().toLowerCase();
                var val = kv.slice(1).join('=');
                if (j === 0) {
                    c.name = kv[0].trim();
                    c.value = val;
                } else if (key === 'domain') c.domain = val;
                else if (key === 'path') c.path = val;
                else if (key === 'expires') c.expires = val;
                else if (key === 'max-age') c.expires = 'max-age=' + val;
                else if (key === 'httponly') c.httponly = true;
                else if (key === 'secure') c.secure = true;
                else if (key === 'samesite') c.samesite = val.toLowerCase();
            }
            cookies.push(c);
        }
    }
    return cookies;
}

function cookieHtml(cookies) {
    if (!cookies.length) return '';
    var html = '<table><tr><th>Name</th><th>Value</th><th>Domain</th><th title="HttpOnly — inaccessible to JavaScript">HttpOnly</th><th title="Secure — only sent over HTTPS">Secure</th><th title="SameSite — controls cross-site behavior">SameSite</th></tr>';
    for (var i = 0; i < cookies.length; i++) {
        var c = cookies[i];
        var h = c.httponly ? '<span class="flag-ok">&#x2713;</span>' : '<span class="flag-missing">&#x2717;</span>';
        var s = c.secure ? '<span class="flag-ok">&#x2713;</span>' : '<span class="flag-missing">&#x2717;</span>';
        var ss = c.samesite ? (c.samesite === 'lax' || c.samesite === 'strict' ? '<span class="flag-ok">' + c.samesite + '</span>' : '<span class="flag-info">' + c.samesite + '</span>') : '<span class="flag-missing">&#x2717;</span>';
        html += '<tr><td>' + escapeHtml(c.name) + '</td><td>' + escapeHtml(c.value.substring(0, 30)) + '</td><td>' + escapeHtml(c.domain) + '</td><td>' + h + '</td><td>' + s + '</td><td>' + ss + '</td></tr>';
    }
    return html + '</table>';
}

// ──────────────────────────────────────────────
// Fase 2e: CORS Inspector
// ──────────────────────────────────────────────

function checkCORS(reqHeaders, resHeaders) {
    var origin = '', acao = '', acac = '', acam = '', acah = '';
    if (reqHeaders) {
        for (var i = 0; i < reqHeaders.length; i++) {
            if (reqHeaders[i].name && reqHeaders[i].name.toLowerCase() === 'origin') origin = reqHeaders[i].value;
        }
    }
    if (resHeaders) {
        for (var i = 0; i < resHeaders.length; i++) {
            if (!resHeaders[i].name) continue;
            var n = resHeaders[i].name.toLowerCase();
            if (n === 'access-control-allow-origin') acao = resHeaders[i].value;
            else if (n === 'access-control-allow-credentials') acac = resHeaders[i].value;
            else if (n === 'access-control-allow-methods') acam = resHeaders[i].value;
            else if (n === 'access-control-allow-headers') acah = resHeaders[i].value;
        }
    }
    if (!origin) return {status: '', html: ''};
    var issues = [];
    if (acao === '*') issues.push('ACAO: wildcard');
    if (acao === '*' && acac === 'true') issues.push('CRITICAL: wildcard + credentials');
    if (!acao) issues.push('Missing ACAO');
    var cls = issues.length === 0 ? 'cors-ok' : (issues.length <= 1 ? 'cors-warn' : 'cors-bad');
    var icon = issues.length === 0 ? '\u2713' : '\u26A0';
    var title = issues.length ? issues.join('; ') : 'CORS OK';
    return {status: cls, html: '<span class="' + cls + '" title="' + escapeHtml(title) + '">' + icon + ' CORS</span>', issues: issues};
}

// ──────────────────────────────────────────────
// Enhance editRequest with security + CORS + cookies
// ──────────────────────────────────────────────

var origEditRequest = editRequest;
editRequest = function(tr) {
    $('#form-body2-preview').hide().html('');
    $('#form-body2').show();
    $('.preview-bar + textarea').show();
    $('.body-preview').hide().html('');
    origEditRequest(tr);
    var id = tr ? tr.attr('id') : -1;
    var data = (id > 0) ? values.requests[id] : {};
    setTimeout(function() {
        if (data.response && data.response.headers) {
            $('#security-summary').html(checkSecurityHeaders(data.response.headers));
            var cors = checkCORS(data.request ? data.request.headers : null, data.response.headers);
            if (cors.status) {
                $('#cors-summary').html(cors.html).addClass(cors.status);
            }
            var cookies = parseCookies(data.response.headers);
            if (cookies.length) {
                $('#cookie-inspector').html(cookieHtml(cookies)).show();
            } else {
                $('#cookie-inspector').hide();
            }
        }
        var allText = getRequestText(data);
        var secrets = scanForSecrets(allText);
        if (secrets.length) {
            var counts = {};
            for (var i = 0; i < secrets.length; i++) {
                counts[secrets[i].type] = (counts[secrets[i].type] || 0) + 1;
            }
            var html = '';
            for (var type in counts) html += '<span class="sec-found">\u26A0 ' + type + ': ' + counts[type] + '</span> ';
            $('#secrets-warning').html(html);
        } else {
            $('#secrets-warning').html('');
        }
        var mime2 = (data.response.content && data.response.content.mimeType) ? data.response.content.mimeType.toLowerCase() : '';
        if (mime2 && mime2.indexOf('text') < 0 && mime2.indexOf('json') < 0 && mime2.indexOf('xml') < 0 && mime2.indexOf('html') < 0 && mime2.indexOf('javascript') < 0) {
            $('#body-hex-btn').show();
        } else {
            $('#body-hex-btn').hide();
        }
    }, 50);
};

// ──────────────────────────────────────────────
// Fase 3a: Multi-format Export (dropdown)
// ──────────────────────────────────────────────

$(document).on('click', '#export-all-btn', function() {
    $('#export-dropdown').toggle();
});
$(document).on('click', function(e) {
    if (!$(e.target).closest('#export-all-btn, #export-dropdown').length) {
        $('#export-dropdown').hide();
    }
});

function exportAsFormat(format) {
    var items = [];
    $('.req:visible').each(function() {
        var id = parseInt($(this).attr('id'));
        var data = values.requests[id];
        if (data) items.push(data);
    });
    if (!items.length) return;
    var output = '';
    if (format === 'postman') {
        var collection = {
            info: {name: 'SpyKit Export', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},
            item: []
        };
        for (var i = 0; i < items.length; i++) {
            var item = requestToPostmanItem(items[i]);
            if (item) collection.item.push(item);
        }
        output = JSON.stringify(collection, null, 2);
    } else if (format === 'python') {
        for (var i = 0; i < items.length; i++) {
            var d = items[i];
            if (!d.request) continue;
            var r = d.request;
            output += 'import requests\n\n';
            output += 'url = ' + JSON.stringify(r.url) + '\n';
            var headers = {};
            if (r.headers) for (var j = 0; j < r.headers.length; j++) {
                if (r.headers[j].name) headers[r.headers[j].name] = r.headers[j].value;
            }
            output += 'headers = ' + JSON.stringify(headers, null, 2) + '\n';
            if (r.postData) {
                var body = typeof r.postData.text === 'string' ? r.postData.text : '';
                output += 'data = ' + JSON.stringify(body) + '\n';
                output += "r = requests." + (r.method || 'GET').toLowerCase() + "(url, headers=headers, data=data)\n";
            } else {
                output += "r = requests." + (r.method || 'GET').toLowerCase() + "(url, headers=headers)\n";
            }
            output += 'print(r.text)\n\n';
        }
    } else if (format === 'fetch') {
        for (var i = 0; i < items.length; i++) {
            var d = items[i];
            if (!d.request) continue;
            var r = d.request;
            var opts = {method: r.method || 'GET'};
            if (r.headers) {
                opts.headers = {};
                for (var j = 0; j < r.headers.length; j++) {
                    if (r.headers[j].name) opts.headers[r.headers[j].name] = r.headers[j].value;
                }
            }
            if (r.postData) {
                opts.body = typeof r.postData.text === 'string' ? r.postData.text : '';
            }
            output += 'fetch(' + JSON.stringify(r.url) + ', ' + JSON.stringify(opts, null, 2) + ')\n  .then(r => r.text())\n  .then(console.log)\n  .catch(console.error);\n\n';
        }
    } else if (format === 'http') {
        for (var i = 0; i < items.length; i++) {
            var d = items[i];
            if (!d.request) continue;
            var r = d.request;
            output += (r.method || 'GET') + ' ' + r.url + ' HTTP/1.1\n';
            if (r.headers) for (var j = 0; j < r.headers.length; j++) {
                if (r.headers[j].name && r.headers[j].value) output += r.headers[j].name + ': ' + r.headers[j].value + '\n';
            }
            if (r.postData) {
                output += '\n' + (typeof r.postData.text === 'string' ? r.postData.text : '');
            }
            output += '\n###\n\n';
        }
    }
    var blob = new Blob([output], {type: 'text/plain'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'spykit.' + (format === 'postman' ? 'json' : format === 'http' ? 'http' : 'txt');
    a.click();
    URL.revokeObjectURL(url);
    $('#export-dropdown').hide();
}

$(document).on('click', '.export-dropdown > div', function() {
    exportAsFormat($(this).data('format'));
});

// ──────────────────────────────────────────────
// Fase 3d: Snippet Generator
// ──────────────────────────────────────────────

function genSnippets(data, lang) {
    if (!data || !data.request) return '';
    var r = data.request;
    if (lang === 'curl') return toCurl(data);
    if (lang === 'python') {
        var s = 'import requests\n\n';
        s += 'url = ' + JSON.stringify(r.url) + '\n';
        var h = {};
        if (r.headers) for (var i = 0; i < r.headers.length; i++) {
            if (r.headers[i].name) h[r.headers[i].name] = r.headers[i].value;
        }
        s += 'headers = ' + JSON.stringify(h, null, 2) + '\n';
        if (r.postData) {
            var body = typeof r.postData.text === 'string' ? r.postData.text : '';
            s += 'data = ' + JSON.stringify(body) + '\n';
            s += "r = requests." + (r.method || 'GET').toLowerCase() + "(url, headers=headers, data=data)\n";
        } else {
            s += "r = requests." + (r.method || 'GET').toLowerCase() + "(url, headers=headers)\n";
        }
        s += 'print(r.text)';
        return s;
    }
    if (lang === 'fetch') {
        var opts = {method: r.method || 'GET'};
        if (r.headers) {
            opts.headers = {};
            for (var i = 0; i < r.headers.length; i++) {
                if (r.headers[i].name) opts.headers[r.headers[i].name] = r.headers[i].value;
            }
        }
        if (r.postData) opts.body = typeof r.postData.text === 'string' ? r.postData.text : '';
        return 'fetch(' + JSON.stringify(r.url) + ', ' + JSON.stringify(opts, null, 2) + ')\n  .then(r => r.text())\n  .then(console.log)\n  .catch(console.error);';
    }
    if (lang === 'go') {
        var s = 'package main\n\nimport (\n\t"fmt"\n\t"io/ioutil"\n\t"net/http"\n\t"strings"\n)\n\nfunc main() {\n';
        s += '\turl := ' + JSON.stringify(r.url) + '\n';
        s += '\tmethod := "' + (r.method || 'GET') + '"\n';
        if (r.postData) {
            var body = typeof r.postData.text === 'string' ? r.postData.text : '';
            s += '\tpayload := strings.NewReader(' + JSON.stringify(body) + ')\n';
            s += '\tclient := &http.Client{}\n\treq, err := http.NewRequest(method, url, payload)\n';
        } else {
            s += '\tclient := &http.Client{}\n\treq, err := http.NewRequest(method, url, nil)\n';
        }
        s += '\tif err != nil { fmt.Println(err); return }\n';
        if (r.headers) for (var i = 0; i < r.headers.length; i++) {
            if (r.headers[i].name && r.headers[i].value) s += '\treq.Header.Set(' + JSON.stringify(r.headers[i].name) + ', ' + JSON.stringify(r.headers[i].value) + ')\n';
        }
        s += '\tres, err := client.Do(req)\n\tif err != nil { fmt.Println(err); return }\n\tdefer res.Body.Close()\n\tbody, _ := ioutil.ReadAll(res.Body)\n\tfmt.Println(string(body))\n}';
        return s;
    }
    if (lang === 'rust') {
        var s = 'use reqwest;\n\n#[tokio::main]\nasync fn main() -> Result<(), reqwest::Error> {\n';
        s += '\tlet client = reqwest::Client::new();\n';
        if (r.postData) {
            var body = typeof r.postData.text === 'string' ? r.postData.text : '';
            s += '\tlet body = ' + JSON.stringify(body) + ';\n';
        }
        s += '\tlet res = client\n';
        s += '\t\t.' + (r.method || 'GET').toLowerCase() + '(' + JSON.stringify(r.url) + ')\n';
        if (r.headers) for (var i = 0; i < r.headers.length; i++) {
            if (r.headers[i].name && r.headers[i].value) s += '\t\t.header(' + JSON.stringify(r.headers[i].name) + ', ' + JSON.stringify(r.headers[i].value) + ')\n';
        }
        if (r.postData) s += '\t\t.body(body)\n';
        s += '\t\t.send().await?;\n\tlet text = res.text().await?;\n\tprintln!("{}", text);\n\tOk(())\n}';
        return s;
    }
    if (lang === 'php') {
        var s = '<?php\n\n$url = ' + JSON.stringify(r.url) + ';\n';
        if (r.postData) {
            var body = typeof r.postData.text === 'string' ? r.postData.text : '';
            s += '$data = ' + JSON.stringify(body) + ';\n';
        }
        s += '$ch = curl_init($url);\n';
        s += 'curl_setopt($ch, CURLOPT_CUSTOMREQUEST, ' + JSON.stringify(r.method || 'GET') + ');\n';
        if (r.headers) {
            var hArr = [];
            for (var i = 0; i < r.headers.length; i++) {
                if (r.headers[i].name && r.headers[i].value) hArr.push(r.headers[i].name + ': ' + r.headers[i].value);
            }
            if (hArr.length) s += 'curl_setopt($ch, CURLOPT_HTTPHEADER, ' + JSON.stringify(hArr) + ');\n';
        }
        if (r.postData) s += 'curl_setopt($ch, CURLOPT_POSTFIELDS, $data);\n';
        s += 'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$response = curl_exec($ch);\ncurl_close($ch);\necho $response;\n';
        return s;
    }
    return '';
}

// ──────────────────────────────────────────────
// Fase 3b: Collections (save/load from storage)
// ──────────────────────────────────────────────

$(document).on('click', '.req .clear', function() {
    var $row = $(this).closest('.req');
    $row.toggleClass('selected-for-collection');
    $(this).toggleClass('visited');
});

$(document).on('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        var items = [];
        $('.req.selected-for-collection').each(function() {
            var id = parseInt($(this).attr('id'));
            if (values.requests[id]) items.push(values.requests[id]);
        });
        if (!items.length) items = values.requests;
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({savedCollection: items}, function() {
                $('#copy-curl-btn').text('Saved!').fadeOut(1500, function() { $(this).text('Copy as cURL').show(); });
            });
        }
    }
});

// ──────────────────────────────────────────────
// Fase 3c: Environment Variables
// ──────────────────────────────────────────────

function resolveEnvVars(str) {
    if (!str) return str;
    var env = values.envs[values.envName] || {};
    return str.replace(/\{\{(\w+)\}\}/g, function(m, key) {
        return env[key] !== undefined ? env[key] : m;
    });
}

function renderEnvTable() {
    var env = values.envs[values.envName] || {};
    var html = '';
    for (var key in env) {
        html += '<tr><td><input class="env-key" value="' + escapeHtml(key) + '"></td><td><input class="env-val" value="' + escapeHtml(env[key]) + '"></td><td><button class="env-del">&times;</button></td></tr>';
    }
    $('#env-rows').html(html);
}

function saveEnvs() {
    var env = {};
    $('#env-rows tr').each(function() {
        var key = $(this).find('.env-key').val().trim();
        var val = $(this).find('.env-val').val();
        if (key) env[key] = val;
    });
    values.envs[values.envName] = env;
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({environments: values.envs, activeEnv: values.envName});
    }
}

$(document).on('click', '#env-close', function() { $('#env-panel').hide(); });

$(document).on('change', '#env-rows input', saveEnvs);

$(document).on('click', '#env-add-row', function() {
    $('#env-rows').append('<tr><td><input class="env-key" placeholder="key"></td><td><input class="env-val" placeholder="value"></td><td><button class="env-del">&times;</button></td></tr>');
});

$(document).on('click', '.env-del', function() { $(this).closest('tr').remove(); saveEnvs(); });

$(document).on('change', '#env-select', function() {
    var val = $(this).val();
    if (val === '__new__') {
        var name = prompt('Environment name:');
        if (name && !values.envs[name]) {
            values.envs[name] = {};
            var opt = $('<option>').val(name).text(name);
            $(this).append(opt).val(name);
        } else if (name && values.envs[name]) {
            $(this).val(name);
        }
    }
    values.envName = $(this).val();
    renderEnvTable();
});

$(document).on('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        $('#env-panel').toggle();
        var sel = $('#env-select');
        sel.find('option:not([value="__new__"])').remove();
        for (var name in values.envs) {
            sel.append($('<option>').val(name).text(name));
        }
        sel.val(values.envName || 'default');
        renderEnvTable();
    }
});

// ──────────────────────────────────────────────
// Fase 4a: Keyboard Shortcuts
// ──────────────────────────────────────────────

$(document).on('keydown', function(e) {
    if (e.key === 'Escape' && dialogOpened) {
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
});

// ──────────────────────────────────────────────
// Fase 4d: REST Client History
// ──────────────────────────────────────────────

function saveToHistory(method, url, headers, body) {
    values.restHistory = values.restHistory || [];
    values.restHistory.unshift({method: method, url: url, headers: headers, body: body, ts: Date.now()});
    if (values.restHistory.length > 20) values.restHistory.pop();
}

// Intercept form-send to save history
var origFormSend = null;
$(document).on('click', '#form-send', function() {
    var method = $('#form-method').val();
    var url = $formUrl.val();
    var headers = $formHeaders.val();
    var body = $formBody.val();
    saveToHistory(method, url, headers, body);
});

$(document).on('dblclick', '#form-cancel', function() {
    var html = '';
    var hist = values.restHistory || [];
    for (var i = 0; i < Math.min(hist.length, 10); i++) {
        html += '<div class="hist-item" data-idx="' + i + '"><span class="hist-method">' + hist[i].method + '</span> <span class="hist-url">' + escapeHtml(hist[i].url.substring(0, 80)) + '</span></div>';
    }
    if (html) {
        var $dd = $('<div id="history-dropdown">' + html + '</div>');
        $(this).parent().append($dd);
        setTimeout(function() { $dd.remove(); }, 3000);
    }
});

$(document).on('click', '.hist-item', function() {
    var idx = parseInt($(this).data('idx'));
    var item = (values.restHistory || [])[idx];
    if (item) {
        $('#form-method').val(item.method);
        $formUrl.val(item.url);
        $formHeaders.val(item.headers);
        $formBody.val(item.body);
        autosize.update($formUrl);
        autosize.update($formHeaders);
        autosize.update($formBody);
    }
    $('#history-dropdown').remove();
});

// ──────────────────────────────────────────────
// Fase 4c: Diff View
// ──────────────────────────────────────────────

$('body').append('<div class="diff-container" id="diff-container"><button class="diff-close" id="diff-close">&times;</button><div class="diff-header"><span id="diff-a-label">Response A</span><span id="diff-b-label">Response B</span></div><pre id="diff-output"></pre></div>');

$(document).on('click', '#diff-close', function() { $('#diff-container').hide(); });

function simpleDiff(a, b) {
    if (a === b) return '<span class="diff-context">' + escapeHtml(a) + '</span>';
    var linesA = (a || '').split('\n');
    var linesB = (b || '').split('\n');
    var html = '';
    var maxLen = Math.max(linesA.length, linesB.length);
    for (var i = 0; i < maxLen; i++) {
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

$(document).on('click', '.req', function(e) {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        var id = parseInt($(this).attr('id'));
        var data = values.requests[id];
        if (!data || !data.response) return;
        var body = (data.response.content && data.response.content.text) || '';
        if (!window._diffA) {
            window._diffA = {id: id, body: body, label: (data.request.method || 'GET') + ' ' + (data.request.url || '')};
            $(this).addClass('selected-for-diff');
        } else if (window._diffA.id !== id) {
            window._diffB = {id: id, body: body, label: (data.request.method || 'GET') + ' ' + (data.request.url || '')};
            $(this).addClass('selected-for-diff');
            $('#diff-a-label').text('A: ' + window._diffA.label);
            $('#diff-b-label').text('B: ' + window._diffB.label);
            $('#diff-output').html(simpleDiff(window._diffA.body, window._diffB.body));
            $('#diff-container').show();
            $('.selected-for-diff').removeClass('selected-for-diff');
            window._diffA = null;
            window._diffB = null;
        }
    }
});

// ──────────────────────────────────────────────
// Feature: Context menu (right-click on request row)
// ──────────────────────────────────────────────
$(document).on('contextmenu', '.req', function(e) {
    e.preventDefault();
    $('.context-menu').remove();
    var id = parseInt($(this).attr('id'));
    var data = values.requests[id];
    var menu = $('<div class="context-menu" data-target-id="' + id + '"></div>');
    menu.append('<div data-action="replay">Reenviar</div>');
    menu.append('<div data-action="copy-curl">Copy as cURL</div>');
    menu.append('<div data-action="copy-url">Copy URL</div>');
    menu.append('<div data-action="open-browser">Open in browser</div>');
    if (data && data.request && data.request.url) {
        var domain = data.request.url.replace(/https?:\/\//,'').split('/')[0];
        menu.append('<div data-action="block">Block: ' + domain + '</div>');
    }
    menu.append('<div data-action="export-postman-single">Export to Postman</div>');
    menu.css({left: e.clientX + 'px', top: e.clientY + 'px'});
    $('body').append(menu);
    $(document).one('click', function() { menu.remove(); });
});
$(document).on('click', '.context-menu div', function() {
    var action = $(this).data('action');
    var targetId = parseInt($('.context-menu').data('target-id'));
    var data = values.requests[targetId];
    if (action === 'replay' && data && data.request) {
        $('.context-menu').remove();
        editRequest($('#' + targetId));
        setTimeout(function() {
            $('#form-send').click();
        }, 100);
    } else if (action === 'copy-curl' && data) {
        var curl = toCurl(data);
        copyToClipboard(curl);
    } else if (action === 'copy-url' && data && data.request) {
        copyToClipboard(data.request.url);
    } else if (action === 'open-browser' && data && data.request) {
        chrome.devtools.inspectedWindow.eval('window.open(' + JSON.stringify(data.request.url) + ',"_blank")');
    } else if (action === 'block' && data && data.request) {
        var domain = data.request.url.replace(/https?:\/\//,'').split('/')[0];
        var blocks = JSON.parse(localStorage.getItem('spykit-blocked') || '[]');
        if (blocks.indexOf(domain) < 0) blocks.push(domain);
        localStorage.setItem('spykit-blocked', JSON.stringify(blocks));
        $('.req').each(function() {
            var rid = parseInt($(this).attr('id'));
            var rd = values.requests[rid];
            if (rd && rd.request && rd.request.url && rd.request.url.indexOf(domain) >= 0) {
                $(this).addClass('search-hidden').hide();
            }
        });
        alert('Blocked: ' + domain);
    } else if (action === 'export-postman-single' && data) {
        var item = requestToPostmanItem(data);
        if (item) {
            var col = {info: {name: 'SpyKit - ' + (data.request.method || 'GET'), schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'}, item: [item]};
            downloadJSON(JSON.stringify(col, null, 2), 'spykit-request.json');
        }
    }
    $('.context-menu').remove();
});

// ──────────────────────────────────────────────
// Feature: Open in browser button
// ──────────────────────────────────────────────
$(document).on('click', '#open-browser-btn', function() {
    var url = $formUrl.val().trim();
    if (url) chrome.devtools.inspectedWindow.eval('window.open(' + JSON.stringify(url) + ',"_blank")');
});

// ──────────────────────────────────────────────
// Feature: Pinned requests (double-click on .clear)
// ──────────────────────────────────────────────
function savePinState($row) {
    var id = parseInt($row.attr('id'));
    if (!id) return;
    var bookmarks = JSON.parse(localStorage.getItem('spykit-bookmarks') || '[]');
    var idx = bookmarks.indexOf(id);
    if ($row.hasClass('pinned')) {
        if (idx < 0) bookmarks.push(id);
    } else {
        if (idx >= 0) bookmarks.splice(idx, 1);
    }
    localStorage.setItem('spykit-bookmarks', JSON.stringify(bookmarks));
}
$(document).on('dblclick', '.req .clear', function() {
    var $row = $(this).closest('.req');
    $row.toggleClass('pinned');
    $row.find('.pin-star').toggleClass('pinned');
    savePinState($row);
});
// Restore pinned state for a row
function restorePinState($row) {
    var id = parseInt($row.attr('id'));
    if (!id) return;
    var bookmarks = JSON.parse(localStorage.getItem('spykit-bookmarks') || '[]');
    if (bookmarks.indexOf(id) >= 0) {
        $row.addClass('pinned');
        $row.find('.pin-star').addClass('pinned');
    }
}
// Add pin-star td to each row via CSS pseudo or via onData override
var origOnData2 = onData;
onData = function(data, id) {
    var prevRootId = rootId;
    var result = origOnData2(data, id);
    // pin-star is added via CSS/HTML in the row
    var rowId = id || rootId;
    var tr = $('#' + rowId);
    if (tr.length) restorePinState(tr);
    return result;
};

// ──────────────────────────────────────────────
// Feature: Bookmark / Star requests
// ──────────────────────────────────────────────
$(document).on('click', '.pin-star', function(e) {
    e.stopPropagation();
    var $row = $(this).closest('.req');
    $row.toggleClass('pinned');
    $(this).toggleClass('pinned');
    savePinState($row);
});

// ──────────────────────────────────────────────
// Feature: Export CSV
// ──────────────────────────────────────────────
function exportAsCSV(items) {
    var csv = 'Method,URL,Status,Type,Size,Time\n';
    for (var i = 0; i < items.length; i++) {
        var d = items[i];
        if (!d.request) continue;
        var method = d.request.method || 'GET';
        var url = (d.request.url || '').replace(/"/g,'""');
        var status = d.response ? d.response.status : '';
        var type = (d.response && d.response.content && d.response.content.mimeType) ? d.response.content.mimeType : '';
        var size = d.response && d.response.content ? d.response.content.size : '';
        var time = d.time ? Math.round(d.time) : '';
        csv += '"' + method + '","' + url + '",' + status + ',"' + type + '",' + size + ',' + time + '\n';
    }
    downloadJSON(csv, 'spykit.csv');
}

// Patch exportAsFormat for CSV
var origExportAsFormat2 = exportAsFormat;
exportAsFormat = function(format) {
    if (format === 'csv') {
        var items = [];
        $('.req:visible').each(function() {
            var id = parseInt($(this).attr('id'));
            if (values.requests[id]) items.push(values.requests[id]);
        });
        if (items.length) exportAsCSV(items);
        return;
    }
    origExportAsFormat2(format);
};

function downloadJSON(content, filename) {
    var blob = new Blob([content], {type: 'text/plain'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────
// Feature: History search/filter REST Client
// ──────────────────────────────────────────────
$(document).on('keyup', '#history-search', function() {
    var q = $(this).val().toLowerCase();
    $('#history-list .history-item').each(function() {
        $(this).toggle($(this).text().toLowerCase().indexOf(q) >= 0);
    });
});

// Show history panel with Ctrl+Shift+H
$(document).on('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        var $panel = $('#history-panel');
        $panel.toggle();
        if ($panel.is(':visible')) renderHistoryList();
    }
});
$(document).on('click', '#history-close', function() { $('#history-panel').hide(); });

function renderHistoryList() {
    var hist = values.restHistory || [];
    var html = '';
    for (var i = 0; i < hist.length; i++) {
        html += '<div class="history-item" data-idx="' + i + '"><b>' + hist[i].method + '</b> ' + escapeHtml(hist[i].url.substring(0,100)) + ' <span style="color:#888">' + new Date(hist[i].ts).toLocaleTimeString() + '</span></div>';
    }
    $('#history-list').html(html || '<div style="color:#888;padding:8px">No history</div>');
}

// ──────────────────────────────────────────────
// Feature: Snippets for REST Client
// ──────────────────────────────────────────────
$(document).on('click', '#snippet-save', function() {
    var name = $('#snippet-name').val().trim();
    if (!name) return;
    var snippet = {
        name: name,
        method: $('#form-method').val(),
        url: $formUrl.val(),
        headers: $formHeaders.val(),
        body: $formBody.val()
    };
    var snippets = JSON.parse(localStorage.getItem('spykit-snippets') || '[]');
    snippets.push(snippet);
    localStorage.setItem('spykit-snippets', JSON.stringify(snippets));
    $('#snippet-name').val('');
    renderSnippetList();
});
$(document).on('click', '#snippets-close', function() { $('#snippets-panel').hide(); });
$(document).on('click', '.snippet-item', function() {
    var snippets = JSON.parse(localStorage.getItem('spykit-snippets') || '[]');
    var idx = parseInt($(this).data('idx'));
    var s = snippets[idx];
    if (s) {
        $('#form-method').val(s.method);
        $formUrl.val(s.url); autosize.update($formUrl);
        $formHeaders.val(s.headers); autosize.update($formHeaders);
        $formBody.val(s.body); autosize.update($formBody);
    }
    $('#snippets-panel').hide();
});
function renderSnippetList() {
    var snippets = JSON.parse(localStorage.getItem('spykit-snippets') || '[]');
    var html = '';
    for (var i = snippets.length - 1; i >= 0; i--) {
        html += '<div class="snippet-item" data-idx="' + i + '"><b>' + snippets[i].method + '</b> ' + escapeHtml(snippets[i].name) + '</div>';
    }
    $('#snippet-list').html(html || '<div style="color:#888;padding:8px">No snippets</div>');
}

// ──────────────────────────────────────────────
// Feature: Workspaces (save/load request sets)
// ──────────────────────────────────────────────
$(document).on('click', '#workspace-save', function() {
    var name = $('#workspace-name').val().trim();
    if (!name) return;
    var ws = {name: name, requests: {}};
    for (var id in values.requests) {
        ws.requests[id] = values.requests[id];
    }
    var workspaces = JSON.parse(localStorage.getItem('spykit-workspaces') || '[]');
    workspaces.push(ws);
    localStorage.setItem('spykit-workspaces', JSON.stringify(workspaces));
    $('#workspace-name').val('');
    renderWorkspaceList();
});
$(document).on('click', '#workspaces-close', function() { $('#workspaces-panel').hide(); });
$(document).on('click', '.workspace-item', function() {
    var workspaces = JSON.parse(localStorage.getItem('spykit-workspaces') || '[]');
    var idx = parseInt($(this).data('idx'));
    var ws = workspaces[idx];
    if (ws && ws.requests) {
        if (confirm('Load workspace "' + ws.name + '"? Current requests will be cleared.')) {
            $('.req').remove();
            values.requests = {};
            for (var id in ws.requests) {
                onData(ws.requests[id], parseInt(id));
            }
        }
    }
    $('#workspaces-panel').hide();
});
function renderWorkspaceList() {
    var workspaces = JSON.parse(localStorage.getItem('spykit-workspaces') || '[]');
    var html = '';
    for (var i = workspaces.length - 1; i >= 0; i--) {
        var count = workspaces[i].requests ? Object.keys(workspaces[i].requests).length : 0;
        html += '<div class="workspace-item" data-idx="' + i + '"><b>' + escapeHtml(workspaces[i].name) + '</b> (' + count + ' requests)</div>';
    }
    $('#workspace-list').html(html || '<div style="color:#888;padding:8px">No workspaces</div>');
}

// ──────────────────────────────────────────────
// Feature: Mock responses
// ──────────────────────────────────────────────
var mocks = JSON.parse(localStorage.getItem('spykit-mocks') || '[]');
$(document).on('click', '#mock-add', function() {
    var url = $('#mock-url').val().trim();
    var status = $('#mock-status').val();
    if (!url) return;
    var body = $formBody2.val();
    var headers = $formHeaders2.val();
    mocks.push({url: url, status: parseInt(status), headers: headers, body: body});
    localStorage.setItem('spykit-mocks', JSON.stringify(mocks));
    $('#mock-url').val('');
    renderMockList();
});
$(document).on('click', '#mock-close', function() { $('#mock-panel').hide(); });
$(document).on('click', '.mock-item .mock-del', function() {
    var idx = parseInt($(this).data('idx'));
    mocks.splice(idx, 1);
    localStorage.setItem('spykit-mocks', JSON.stringify(mocks));
    renderMockList();
});
function renderMockList() {
    var html = '';
    for (var i = 0; i < mocks.length; i++) {
        html += '<div class="mock-item">[' + mocks[i].status + '] ' + escapeHtml(mocks[i].url) + ' <button class="mock-del" data-idx="' + i + '" style="float:right">&times;</button></div>';
    }
    $('#mock-list').html(html || '<div style="color:#888;padding:8px">No mocks</div>');
}
// Intercept onData to apply mocks
var origOnData3 = onData;
onData = function(data, id) {
    if (data && data.request && data.request.url) {
        for (var i = 0; i < mocks.length; i++) {
            if (data.request.url.indexOf(mocks[i].url) >= 0) {
                if (!data.response) data.response = {};
                data.response.status = mocks[i].status;
                data.response.content = {text: mocks[i].body || '', mimeType: 'application/json'};
                break;
            }
        }
    }
    return origOnData3(data, id);
};
// Mock keyboard shortcut: Ctrl+Shift+M
$(document).on('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        $('#mock-panel').toggle();
        if ($('#mock-panel').is(':visible')) renderMockList();
    }
});

// ──────────────────────────────────────────────
// Feature: Rate limiter (delay between REST sends)
// ──────────────────────────────────────────────
var rateLimitDelay = 0;
var rateLastSend = 0;
$(document).on('click', '#form-rate-btn', function() {
    var delays = [0, 500, 1000, 2000];
    var idx = delays.indexOf(rateLimitDelay);
    rateLimitDelay = delays[(idx + 1) % delays.length];
    $(this).text(rateLimitDelay ? rateLimitDelay + 'ms' : '∞');
    $(this).toggleClass('active', rateLimitDelay > 0);
});
// Intercept form-send to apply rate limiter
var origFormSend2 = null;
$(document).on('click', '#form-send', function() {
    if (rateLimitDelay > 0) {
        var now = Date.now();
        var elapsed = now - rateLastSend;
        if (elapsed < rateLimitDelay) {
            alert('Rate limit: wait ' + (rateLimitDelay - elapsed) + 'ms');
            return false;
        }
        rateLastSend = now;
    }
});

// ──────────────────────────────────────────────
// Feature: Recording / Timeline
// ──────────────────────────────────────────────
var isRecording = false;
var recordedData = [];
$(document).on('click', '#record-btn', function() {
    isRecording = !isRecording;
    $(this).toggleClass('recording');
    $(this).text(isRecording ? '⏹' : '⏺');
    if (!isRecording && recordedData.length) {
        var output = '';
        for (var i = 0; i < recordedData.length; i++) {
            var d = recordedData[i];
            if (d.request) {
                output += (d.request.method || 'GET') + ' ' + (d.request.url || '') + '\n';
                if (d.response) output += '→ ' + (d.response.status || '') + '\n';
                output += '\n';
            }
        }
        copyToClipboard(output);
        recordedData = [];
    }
});
// Hook onData to record
var origOnData4 = onData;
onData = function(data, id) {
    if (isRecording && data) recordedData.push(data);
    return origOnData4(data, id);
};

// ──────────────────────────────────────────────
// Feature: Viewport breakpoints
// ──────────────────────────────────────────────
$(document).on('click', '#viewport-bar button', function() {
    $('#viewport-bar button').removeClass('active');
    $(this).addClass('active');
    var w = parseInt($(this).data('width')) || 0;
    if (w) {
        chrome.devtools.inspectedWindow.eval('window.resizeTo(' + w + ', window.outerHeight)');
    }
});

// ──────────────────────────────────────────────
// Feature: Copy share link
// ──────────────────────────────────────────────
$(document).on('click', '#share-btn', function() {
    var id = $('#form-id').val();
    var data = values.requests[id];
    if (data && data.request) {
        var shareData = {method: data.request.method, url: data.request.url, status: data.response ? data.response.status : ''};
        var json = JSON.stringify(shareData);
        copyToClipboard(json);
        $(this).text('✓').fadeOut(1000, function() { $(this).text('🔗').show(); });
    }
});

// ──────────────────────────────────────────────
// Feature: Auto-prettify JSON/XML in response
// ──────────────────────────────────────────────
// This is already handled by editRequest -> data.getContent -> format(content, mime2)
// Just add a manual re-prettify option
$(document).on('dblclick', '#form-body2', function() {
    var val = $(this).val();
    if (!val) return;
    var formatted = format(val, 'json');
    if (formatted !== val) {
        $(this).val(formatted);
        autosize.update($(this));
    }
});

// ──────────────────────────────────────────────
// Utility: copyToClipboard
// ──────────────────────────────────────────────
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
    } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}

// ──────────────────────────────────────────────
// Add keyboard shortcut: Ctrl+Shift+W for workspaces
// ──────────────────────────────────────────────
$(document).on('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        $('#workspaces-panel').toggle();
        if ($('#workspaces-panel').is(':visible')) renderWorkspaceList();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        $('#snippets-panel').toggle();
        if ($('#snippets-panel').is(':visible')) renderSnippetList();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        $('#record-btn').click();
    }
});

// ──────────────────────────────────────────────
// Add rate limiter button to details panel
// ──────────────────────────────────────────────
$('<button id="form-rate-btn" class="btn btn-xs btn-default" type="button" title="Rate limit" style="float:right;margin-right:4px">∞</button>').insertBefore('#form-send');

// ──────────────────────────────────────────────
// Add viewport bar
// ──────────────────────────────────────────────
var $viewportBar = $('<div id="viewport-bar"><button data-width="375">Mobile</button><button data-width="768">Tablet</button><button data-width="1024">Desktop</button><button data-width="0">Reset</button><span id="rate-badge" class="rate-badge" style="display:none">∞</span></div>');
$('.search-bar-top').after($viewportBar);
$viewportBar.hide();
$(document).on('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        $('#viewport-bar').toggle();
    }
});

// ──────────────────────────────────────────────
// Add open browser button in url-actions (already added in HTML)
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// Hex view toggle (Fase 2c)
// ──────────────────────────────────────────────

$(document).on('click', '#body-hex-btn', function() {
    var $preview = $('#form-body2-preview');
    var $textarea = $('#form-body2');
    var $btn = $(this);
    if ($preview.is(':visible') && $preview.find('.hex-dump').length) {
        $preview.hide();
        $textarea.show();
        $btn.text('Hex');
    } else {
        var content = $textarea.val();
        $preview.html(toHexDump(content));
        $textarea.hide();
        $preview.show();
        $btn.text('Raw');
    }
});