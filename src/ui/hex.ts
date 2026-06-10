export function toHexDump(str: string): string {
  if (!str) return '';
  const lines: string[] = [];
  for (let i = 0; i < str.length; i += 16) {
    const hex: string[] = [];
    const ascii: string[] = [];
    const addr = ('00000000' + i.toString(16)).slice(-8);
    for (let j = 0; j < 16; j++) {
      if (i + j < str.length) {
        const code = str.charCodeAt(i + j);
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

export function initHexView(): void {
  $(document).on('click', '#body-hex-btn', function (this: HTMLElement) {
    const $preview = $('#form-body2-preview');
    const $textarea = $('#form-body2');
    const $btn = $(this);
    if ($preview.is(':visible') && $preview.find('.hex-dump').length) {
      $preview.hide();
      $textarea.show();
      $btn.text('Hex');
    } else {
      const content = $textarea.val() as string;
      $preview.html(toHexDump(content));
      $textarea.hide();
      $preview.show();
      $btn.text('Raw');
    }
  });
}
