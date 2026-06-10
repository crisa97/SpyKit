import { parseCurl } from '../core/utils';

declare const autosize: any;

export function initCurlImportUI(): void {
  $(document).on('click', '#import-curl-btn', function (this: HTMLElement) {
    const $input = $('#import-curl-input');
    if ($input.is(':visible')) {
      const cmd = ($input.val() as string || '').trim();
      if (cmd) {
        const parsed = parseCurl(cmd);
        if (parsed && parsed.url) {
          $('#form-url').val(parsed.url);
          autosize.update($('#form-url'));
          $('#form-method').val(parsed.method);
          let hStr = '';
          for (const key in parsed.headers) {
            hStr += key + ': ' + parsed.headers[key] + '\n';
          }
          $('#form-headers').val(hStr.trim());
          autosize.update($('#form-headers'));
          $('#form-body').val(parsed.body);
          autosize.update($('#form-body'));
        }
      }
      $input.hide().val('');
      $(this).text('Import cURL');
    } else {
      $input.show().focus();
      $(this).text('Parse');
    }
  });
  $(document).on('keydown', '#import-curl-input', function (e) {
    if (e.key === 'Enter' && e.ctrlKey) {
      $('#import-curl-btn').click();
    }
  });
}
