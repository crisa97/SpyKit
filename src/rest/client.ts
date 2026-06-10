import { values, FORBIDEN_HEADERS, FORBIDEN_HEADERS_STARTS_WITH, contentScriptLoaded, setContentScriptLoaded } from '../state';
import { resolveEnvVars } from './env';
import { strToHeaders, format, headersToStr, getStatusHint } from '../core/utils';
import { saveToHistory } from './history';

declare const autosize: any;

export function initRESTClient(): void {
  $(document).on('click', '#form-send', function (this: HTMLElement) {
    try {
      const method = $('#form-method').val() as string;
      const url = resolveEnvVars($('#form-url').val() as string);

      if (!url || url.trim().length < 1) {
        $('#form-url').focus();
        return;
      }

      const headers = strToHeaders(resolveEnvVars($('#form-headers').val() as string));
      const validHeaders: { [key: string]: string } = {};
      for (const h of headers) {
        if (!h.name) continue;
        const lower = h.name.toLowerCase();
        if (lower === 'cookie' || lower === 'cookie2') continue;
        let forbidden = false;
        for (const fb of FORBIDEN_HEADERS) {
          if (lower === fb) { forbidden = true; break; }
        }
        if (forbidden) continue;
        for (const fb of FORBIDEN_HEADERS_STARTS_WITH) {
          if (lower.substring(0, fb.length) === fb) { forbidden = true; break; }
        }
        if (forbidden) continue;
        validHeaders[h.name] = h.value;
      }

      const body = $('#form-body').val() as string;
      const id = Math.round(1000000 * Math.random());

      saveToHistory(method, $('#form-url').val() as string, $('#form-headers').val() as string, body);

      $('#form-id').val(id);
      $('#form-headers2').val('');
      autosize.update($('#form-headers2'));
      $('#form-body2').val('').show();
      autosize.update($('#form-body2'));
      $('#form-body2-image').html('');
      $('#form-label-body2')
        .attr('for', 'form-body2')
        .text('Answer body:');

      const code = [
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
        '})()',
      ].join('');

      const onResult = function (res: any, e: any) {
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
        chrome.devtools.inspectedWindow.eval(code, { useContentScriptContext: contentScriptLoaded }, onResult);
      } else {
        eval(code);
        onResult(null, null);
      }
    } catch (e: any) {
      console.log(e.message);
    }
  });

  // Intercept to apply rate limit
  $(document).on('click', '#form-send', function () {
    const state = (window as any).SpyKitState || { rateLimitDelay: 0, rateLastSend: 0 };
    if (state.rateLimitDelay > 0) {
      const now = Date.now();
      const elapsed = now - state.rateLastSend;
      if (elapsed < state.rateLimitDelay) {
        alert('Rate limit: wait ' + (state.rateLimitDelay - elapsed) + 'ms');
        return false;
      }
      state.rateLastSend = now;
    }
    return true;
  });
}

export function handleRESTResponse(message: any): void {
  setContentScriptLoaded(true);

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
      $('#form-url').val(message.url);
    }

    if (message.status) {
      $('#form-status')
        .val(message.status)
        .removeClass('blink')
        .addClass(message.status >= 200 && message.status < 300 ? 'ok' : 'error');
      $('.hint').css({ display: message.status !== 200 ? 'block' : 'none' });
      $('#hint').html(getStatusHint(message.status));
    }

    if (message.headers) {
      $('#form-headers2').val(headersToStr(message.headers));
      autosize.update($('#form-headers2'));
    }

    if (message.body) {
      $('#form-body2').val(format(message.body));
      autosize.update($('#form-body2'));
    }
  }
}
